import socketRepository from '../repositories/socket.repository.js';
import { validateProformaEstado } from '../utils/state-validator.js';

class ProformaService {

    // ========================================
    // NOTIFICACIONES DE PROFORMAS
    // ========================================

    /**
     * Notificar creación de proforma
     * Fase 2: Ahora valida el estado contra la BD centralizada
     */
    async notifyProformaCreated(proformaData) {
        // Destructuring con valores por defecto para evitar undefined
        let {
            id,
            numero,
            cliente_id,
            cliente = {},
            total,
            items = [],
            fecha_creacion,
            fecha_vencimiento,
            estado = 'PENDIENTE',
            canal_origen = 'web'
        } = proformaData;

        // Fase 2: Validar estado contra estados centralizados
        const validation = await validateProformaEstado(estado);
        if (!validation.valid) {
            console.warn(`⚠️  Estado inválido en proforma: ${estado}. Usando fallback: PENDIENTE`);
            estado = 'PENDIENTE';
        } else {
            console.log(`✅ Estado de proforma validado: ${estado}`);
        }

        console.log(`\n📦 Nova proforma creada: ${numero} - Cliente ${cliente_id}`);
        console.log(`   ├─ ID: ${id}`);
        console.log(`   ├─ Cliente: ${cliente?.nombre || 'Sin nombre'} ${cliente?.apellido || ''}`);
        console.log(`   ├─ Total: ${total}`);
        console.log(`   ├─ Items: ${items.length}`);
        console.log(`   ├─ Estado: ${estado}`);
        console.log(`   ├─ Fecha Creación: ${fecha_creacion}`);
        console.log(`   └─ Fecha Vencimiento: ${fecha_vencimiento || 'Sin vencimiento'}\n`);

        // 1. Notificar al cliente que creó la proforma
        console.log(`📱 Enviando a cliente ${cliente_id}...`);
        socketRepository.emitToUser(cliente_id, 'proforma_created_confirmation', {
            proforma_id: id,
            numero: numero,
            total: total || 0,
            items_count: items?.length || 0,
            items: items || [],
            fecha_creacion: fecha_creacion,
            fecha_vencimiento: fecha_vencimiento || null,
            estado: estado,
            message: '✅ Tu pedido ha sido recibido y está en revisión',
            type: 'success',
            timestamp: new Date().toISOString()
        });
        // 2. Notificar a todo el staff/managers sobre nueva proforma pendiente
        console.log(`👥 Enviando a managers...`);
        socketRepository.emitToRoom('managers', 'proforma.creada', {
            id: id,
            proforma_id: id,
            numero: numero,
            cliente: cliente || {},
            cliente_id: cliente_id,
            total: total || 0,
            items_count: items?.length || 0,
            items: items || [],
            fecha_creacion: fecha_creacion,
            fecha_vencimiento: fecha_vencimiento || null,
            canal_origen: canal_origen,
            estado: estado,
            message: `Nueva proforma ${numero} pendiente de aprobación - Cliente: ${cliente?.nombre} ${cliente?.apellido}`,
            type: 'info',
            timestamp: new Date().toISOString()
        });
        // 3. Notificar a otros roles
        console.log(`📣 Enviando a preventistas, cajeros y admins...`);
        socketRepository.emitToRoom('preventistas', 'proforma.creada', {
            id: id,
            proforma_id: id,
            numero: numero,
            cliente: cliente || {},
            cliente_id: cliente_id,
            total: total || 0,
            items_count: items?.length || 0,
            items: items || [],
            fecha_creacion: fecha_creacion,
            message: `Nueva proforma ${numero}`,
            type: 'info',
            timestamp: new Date().toISOString()
        });

        socketRepository.emitToRoom('cajeros', 'proforma.creada', {
            id: id,
            proforma_id: id,
            numero: numero,
            cliente: cliente || {},
            cliente_id: cliente_id,
            total: total || 0,
            items_count: items?.length || 0,
            fecha_creacion: fecha_creacion,
            message: `Nueva proforma ${numero}`,
            type: 'info',
            timestamp: new Date().toISOString()
        });

        socketRepository.emitToRoom('admins', 'proforma.creada', {
            id: id,
            proforma_id: id,
            numero: numero,
            cliente: cliente || {},
            cliente_id: cliente_id,
            total: total || 0,
            items_count: items?.length || 0,
            items: items || [],
            fecha_creacion: fecha_creacion,
            message: `Nueva proforma ${numero}`,
            type: 'info',
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Notificaciones enviadas: cliente ${cliente_id} + managers + preventistas + cajeros + admins\n`);
        return true;
    }

    /**
     * Notificar aprobación de proforma
     */
    notifyProformaApproved(proformaData) {
        const { id, numero, cliente_id, usuario_aprobador, comentarios, fecha_aprobacion, total } = proformaData;

        console.log(`✅ Proforma APROBADA: ${numero} por ${usuario_aprobador?.name}`);

        // 1. Notificar al cliente
        socketRepository.emitToUser(cliente_id, 'proforma.aprobada', {
            proforma_id: id,
            numero: numero,
            total: total,
            approved_by: usuario_aprobador?.name,
            comments: comentarios,
            fecha_aprobacion: fecha_aprobacion,
            message: '🎉 ¡Tu pedido ha sido aprobado! Procederemos con la preparación.',
            type: 'success',
            action_required: false,
            timestamp: new Date().toISOString()
        });

        // 2. Notificar a managers (para tracking)
        socketRepository.emitToRoom('managers', 'proforma.aprobada', {
            proforma_id: id,
            numero: numero,
            cliente_id: cliente_id,
            approved_by: usuario_aprobador,
            fecha_aprobacion: fecha_aprobacion,
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Cliente ${cliente_id} notificado de aprobación`);
        return true;
    }

    /**
     * Notificar rechazo de proforma
     */
    notifyProformaRejected(proformaData) {
        const { id, numero, cliente_id, usuario_rechazador, motivo_rechazo, fecha_rechazo } = proformaData;

        console.log(`❌ Proforma RECHAZADA: ${numero} - Motivo: ${motivo_rechazo}`);

        // 1. Notificar al cliente
        socketRepository.emitToUser(cliente_id, 'proforma.rechazada', {
            proforma_id: id,
            numero: numero,
            rejected_by: usuario_rechazador?.name,
            reason: motivo_rechazo,
            fecha_rechazo: fecha_rechazo,
            message: `❌ Tu pedido ${numero} ha sido rechazado`,
            type: 'error',
            action_required: true,
            timestamp: new Date().toISOString()
        });

        // 2. Notificar a managers
        socketRepository.emitToRoom('managers', 'proforma.rechazada', {
            proforma_id: id,
            numero: numero,
            cliente_id: cliente_id,
            rejected_by: usuario_rechazador,
            reason: motivo_rechazo,
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Cliente ${cliente_id} notificado de rechazo`);
        return true;
    }

    /**
     * Notificar conversión de proforma a venta
     */
    notifyProformaConverted(conversionData) {
        const { proforma_id, proforma_numero, venta_id, venta_numero, cliente_id, total, fecha_conversion } = conversionData;

        console.log(`🔄 Proforma ${proforma_numero} convertida a venta ${venta_numero}`);

        // Notificar al cliente
        socketRepository.emitToUser(cliente_id, 'proforma.convertida', {
            proforma_id: proforma_id,
            proforma_numero: proforma_numero,
            venta_id: venta_id,
            venta_numero: venta_numero,
            total: total,
            fecha_conversion: fecha_conversion,
            message: `✅ Tu pedido ${proforma_numero} ha sido procesado como venta ${venta_numero}`,
            type: 'success',
            timestamp: new Date().toISOString()
        });

        return true;
    }

    /**
     * Notificar actualización de coordinación de entrega
     */
    notifyProformaCoordination(coordinationData) {
        const {
            id,
            numero,
            cliente_id,
            usuario_actualizo,
            numero_intentos_contacto,
            resultado_ultimo_intento,
            fecha_entrega_confirmada,
            hora_entrega_confirmada,
            entregado_en,
            entregado_a,
            observaciones_entrega,
            coordinacion_actualizada_en
        } = coordinationData;

        console.log(`\n📍 Coordinación de Proforma Actualizada: ${numero}`);
        console.log(`   ├─ ID: ${id}`);
        console.log(`   ├─ Usuario: ${usuario_actualizo?.name}`);
        console.log(`   ├─ Intentos: ${numero_intentos_contacto}`);
        console.log(`   ├─ Resultado: ${resultado_ultimo_intento}`);
        console.log(`   ├─ Fecha confirmada: ${fecha_entrega_confirmada}`);
        console.log(`   ├─ Hora confirmada: ${hora_entrega_confirmada}`);
        console.log(`   ├─ Entregado en: ${entregado_en}`);
        console.log(`   ├─ Entregado a: ${entregado_a}`);
        console.log(`   └─ Observaciones: ${observaciones_entrega || 'Sin observaciones'}\n`);

        // 1. Notificar al cliente
        if (cliente_id) {
            socketRepository.emitToUser(cliente_id, 'proforma.coordinacion.actualizada', {
                proforma_id: id,
                numero: numero,
                numero_intentos_contacto: numero_intentos_contacto || 0,
                resultado_ultimo_intento: resultado_ultimo_intento,
                fecha_entrega_confirmada: fecha_entrega_confirmada,
                hora_entrega_confirmada: hora_entrega_confirmada,
                entregado_en: entregado_en,
                entregado_a: entregado_a,
                observaciones_entrega: observaciones_entrega,
                message: entregado_en
                    ? `✅ Tu pedido fue entregado a ${entregado_a}`
                    : `📍 Se ha actualizado la coordinación de tu entrega`,
                type: entregado_en ? 'success' : 'info',
                action_required: false,
                timestamp: new Date().toISOString()
            });
            console.log(`📱 Notificación enviada a cliente ${cliente_id}`);
        }

        // 2. Notificar a preventistas
        socketRepository.emitToRoom('preventistas', 'proforma.coordinacion.actualizada', {
            proforma_id: id,
            numero: numero,
            cliente_id: cliente_id,
            usuario_actualizo: usuario_actualizo,
            numero_intentos_contacto: numero_intentos_contacto || 0,
            resultado_ultimo_intento: resultado_ultimo_intento,
            fecha_entrega_confirmada: fecha_entrega_confirmada,
            hora_entrega_confirmada: hora_entrega_confirmada,
            entregado_en: entregado_en,
            entregado_a: entregado_a,
            coordinacion_actualizada_en: coordinacion_actualizada_en,
            timestamp: new Date().toISOString()
        });

        // 3. Notificar a managers
        socketRepository.emitToRoom('managers', 'proforma.coordinacion.actualizada', {
            proforma_id: id,
            numero: numero,
            cliente_id: cliente_id,
            usuario_actualizo: usuario_actualizo,
            numero_intentos_contacto: numero_intentos_contacto || 0,
            resultado_ultimo_intento: resultado_ultimo_intento,
            fecha_entrega_confirmada: fecha_entrega_confirmada,
            hora_entrega_confirmada: hora_entrega_confirmada,
            entregado_en: entregado_en,
            entregado_a: entregado_a,
            coordinacion_actualizada_en: coordinacion_actualizada_en,
            timestamp: new Date().toISOString()
        });

        // 4. Notificar a admins
        socketRepository.emitToRoom('admins', 'proforma.coordinacion.actualizada', {
            proforma_id: id,
            numero: numero,
            cliente_id: cliente_id,
            usuario_actualizo: usuario_actualizo,
            numero_intentos_contacto: numero_intentos_contacto || 0,
            resultado_ultimo_intento: resultado_ultimo_intento,
            fecha_entrega_confirmada: fecha_entrega_confirmada,
            hora_entrega_confirmada: hora_entrega_confirmada,
            entregado_en: entregado_en,
            entregado_a: entregado_a,
            observaciones_entrega: observaciones_entrega,
            coordinacion_actualizada_en: coordinacion_actualizada_en,
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Notificaciones enviadas: cliente ${cliente_id} + preventistas + managers + admins\n`);
        return true;
    }

    // ========================================
    // NOTIFICACIONES DE STOCK
    // ========================================

    /**
     * Notificar actualización de stock
     */
    notifyStockUpdated(productData) {
        const { producto_id, nombre, sku, stock_anterior, stock_nuevo, disponible } = productData;

        console.log(`📦 Stock actualizado: ${nombre} (${stock_anterior} → ${stock_nuevo})`);

        // Broadcast a todos los clientes conectados
        socketRepository.emitToAll('product_stock_updated', {
            producto_id: producto_id,
            nombre: nombre,
            sku: sku,
            stock_anterior: stock_anterior,
            stock_nuevo: stock_nuevo,
            disponible: disponible,
            timestamp: new Date().toISOString()
        });

        return true;
    }

    /**
     * Notificar reserva de stock
     */
    notifyStockReserved(reservationData) {
        const { proforma_id, proforma_numero, cliente_id, items, fecha_reserva } = reservationData;

        console.log(`🔒 Stock reservado para proforma ${proforma_numero}`);

        // Notificar al cliente
        socketRepository.emitToUser(cliente_id, 'stock_reserved', {
            proforma_id: proforma_id,
            proforma_numero: proforma_numero,
            items: items,
            fecha_reserva: fecha_reserva,
            message: 'Stock reservado por 24 horas',
            type: 'info',
            timestamp: new Date().toISOString()
        });

        return true;
    }

    /**
     * Notificar que reserva está por vencer
     */
    notifyReservationExpiring(reservationData) {
        const { proforma_id, proforma_numero, cliente_id, expires_at, minutes_remaining } = reservationData;

        console.log(`⏰ Reserva por vencer: Proforma ${proforma_numero} - ${minutes_remaining} min restantes`);

        // Notificar al cliente con urgencia
        socketRepository.emitToUser(cliente_id, 'stock_reservation_expiring', {
            proforma_id: proforma_id,
            proforma_numero: proforma_numero,
            expires_at: expires_at,
            minutes_remaining: minutes_remaining,
            message: `⚠️ Tu reserva de stock expira en ${minutes_remaining} minutos`,
            type: 'warning',
            action_required: true,
            timestamp: new Date().toISOString()
        });

        return true;
    }

    // ========================================
    // NOTIFICACIONES DE PAGOS
    // ========================================

    /**
     * Notificar pago recibido
     */
    notifyPaymentReceived(paymentData) {
        const { pago_id, cliente_id, monto, metodo_pago, fecha_pago } = paymentData;

        console.log(`💰 Pago recibido: $${monto} - Cliente ${cliente_id}`);

        // Notificar al cliente
        if (cliente_id) {
            socketRepository.emitToUser(cliente_id, 'payment_confirmed', {
                pago_id: pago_id,
                monto: monto,
                metodo_pago: metodo_pago,
                fecha_pago: fecha_pago,
                message: `Pago de $${monto} recibido correctamente`,
                type: 'success',
                timestamp: new Date().toISOString()
            });
        }

        // Notificar a managers
        socketRepository.emitToRoom('managers', 'new_payment_received', {
            pago_id: pago_id,
            cliente_id: cliente_id,
            monto: monto,
            metodo_pago: metodo_pago,
            fecha_pago: fecha_pago,
            timestamp: new Date().toISOString()
        });

        return true;
    }

    // ========================================
    // NOTIFICACIONES GENÉRICAS
    // ========================================

    /**
     * Notificar a un usuario específico
     */
    notifyUser(userData) {
        const { user_id, event, data } = userData;

        console.log(`📨 Notificación personalizada a usuario ${user_id}: ${event}`);

        socketRepository.emitToUser(user_id, event, {
            ...data,
            timestamp: new Date().toISOString()
        });

        return true;
    }

    /**
     * Notificar a un rol/grupo
     */
    notifyRole(roleData) {
        const { role, event, data } = roleData;

        console.log(`📨 Notificación a rol ${role}: ${event}`);

        const room = `${role}s`; // managers, clientes, etc.
        socketRepository.emitToRoom(room, event, {
            ...data,
            timestamp: new Date().toISOString()
        });

        return true;
    }

    /**
     * Broadcast a todos
     */
    broadcast(broadcastData) {
        const { event, data } = broadcastData;

        console.log(`📢 Broadcast: ${event}`);

        socketRepository.emitToAll(event, {
            ...data,
            timestamp: new Date().toISOString()
        });

        return true;
    }
}

export default new ProformaService();
