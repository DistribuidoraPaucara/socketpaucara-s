import notificationService from '../services/notification.service.js';
import proformaNotificationService from '../services/proforma.notification.service.js';
import socketRepository from '../repositories/socket.repository.js';

class NotificationController {
    // Manejar notificaciones genéricas desde Laravel
    async handleNotification(req, res) {
        try {
            // Soportar múltiples formatos para compatibilidad
            const { event, data, userId, userType, notification } = req.body;

            // Determinar el evento a enviar
            const eventName = event || req.body.event || 'notification';

            // Determinar los datos a enviar
            let notificationData = data || notification || req.body;

            console.log('\n═══════════════════════════════════════════════════════════');
            console.log('📡 NOTIFICACIÓN RECIBIDA DESDE LARAVEL');
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`   Evento: ${eventName}`);
            console.log(`   Datos recibidos:`, JSON.stringify(notificationData, null, 2));
            console.log('═══════════════════════════════════════════════════════════\n');

            let notificationSent = false;

            // ✅ Manejar eventos específicos de proformas
            if (eventName === 'notify/proforma-created' || eventName === 'proforma.creada') {
                notificationSent = proformaNotificationService.notifyProformaCreated(notificationData);
            } else if (eventName === 'notify/proforma-approved' || eventName === 'proforma.aprobada') {
                notificationSent = proformaNotificationService.notifyProformaApproved(notificationData);
            } else if (eventName === 'notify/proforma-rejected' || eventName === 'proforma.rechazada') {
                notificationSent = proformaNotificationService.notifyProformaRejected(notificationData);
            } else if (eventName === 'notify/proforma-converted' || eventName === 'proforma.convertida') {
                notificationSent = proformaNotificationService.notifyProformaConverted(notificationData);
            } else if (eventName === 'notify/cliente-proforma-converted') {
                // ✅ NUEVO: Notificación DIRECTA al cliente cuando su proforma se convierte
                // Se envía sin depender de si el cliente tiene user_id o no
                notificationSent = proformaNotificationService.notifyClientProformaConverted(notificationData);
            } else if (eventName === 'notify/proforma-updated' || eventName === 'proforma.actualizada') {
                // ✅ NUEVO: Notificación cuando se actualiza una proforma
                notificationSent = proformaNotificationService.notifyProformaUpdated(notificationData);
            } else if (eventName === 'notify/stock-reserved') {
                notificationSent = proformaNotificationService.notifyStockReserved(notificationData);
            } else if (eventName === 'notify/reservation-expiring') {
                notificationSent = proformaNotificationService.notifyReservationExpiring(notificationData);
            }
            // ✅ NUEVO: Manejar asignación de entrega consolidada al chofer
            else if (eventName === 'notify/entrega-asignada' || eventName === 'entrega.asignada' || eventName === 'entrega-asignada') {
                console.log('🚚 NUEVA ENTREGA CONSOLIDADA ASIGNADA AL CHOFER');
                console.log(`   Entrega ID: ${notificationData.entrega_id}`);
                console.log(`   Número: ${notificationData.numero_entrega}`);
                console.log(`   Chofer ID: ${notificationData.chofer_id}`);
                console.log(`   User ID: ${notificationData.user_id}`);
                console.log(`   Vehículo: ${notificationData.vehiculo?.placa}`);
                console.log(`   Peso Total: ${notificationData.peso_kg} kg`);

                // ✅ Emitir al chofer específicamente en su canal privado (por user_id)
                if (notificationData.user_id) {
                    socketRepository.emitToUser(notificationData.user_id, 'entrega.asignada', {
                        entrega_id: notificationData.entrega_id,
                        numero_entrega: notificationData.numero_entrega,
                        chofer_id: notificationData.chofer_id,
                        chofer_nombre: notificationData.chofer_nombre,
                        vehiculo: notificationData.vehiculo,
                        peso_kg: notificationData.peso_kg,
                        volumen_m3: notificationData.volumen_m3,
                        estado: notificationData.estado,
                        fecha_asignacion: notificationData.fecha_asignacion,
                        mensaje: '🚚 Se te ha asignado una nueva entrega consolidada. Por favor inicia la carga de mercadería.',
                        type: 'success',
                        timestamp: new Date().toISOString(),
                        notificationType: 'entrega_consolidada_asignada'
                    });
                    console.log(`   ✅ Notificación enviada al chofer: user_${notificationData.user_id}`);
                }

                // También notificar a admin/logística
                socketRepository.emitToRoom('admins', 'entrega.asignada', {
                    ...notificationData,
                    tipo: 'entrega_consolidada_asignada'
                });
                socketRepository.emitToRoom('logisticas', 'entrega.asignada', {
                    ...notificationData,
                    tipo: 'entrega_consolidada_asignada'
                });
                notificationSent = true;
            }
            // ✅ NUEVO: Manejar notificación de ventas en preparación de carga (para CLIENTES)
            else if (eventName === 'notify/venta-preparacion-carga' || eventName === 'venta.preparacion_carga' || eventName === 'venta.preparacion-carga') {
                console.log('\n═══════════════════════════════════════════════════════════');
                console.log('📦 VENTA EN PREPARACION DE CARGA - NOTIFICANDO A CLIENTE');
                console.log('═══════════════════════════════════════════════════════════');
                console.log(`   User ID (Cliente): ${notificationData.user_id}`);
                console.log(`   Entrega ID: ${notificationData.entrega_id}`);
                console.log(`   Número Entrega: ${notificationData.numero_entrega}`);
                console.log(`   Cantidad de Ventas: ${notificationData.cantidad_ventas}`);
                console.log(`   Ventas: ${notificationData.ventas_numeros?.join(', ')}`);
                console.log(`   Chofer: ${notificationData.chofer?.nombre}`);
                console.log(`   Vehículo: ${notificationData.vehiculo?.placa}`);
                console.log('═══════════════════════════════════════════════════════════\n');

                // ✅ CRÍTICO: Emitir al CLIENTE en su canal privado (user_id)
                if (notificationData.user_id) {
                    socketRepository.emitToUser(notificationData.user_id, 'venta.preparacion-carga', {
                        entrega_id: notificationData.entrega_id,
                        numero_entrega: notificationData.numero_entrega,
                        estado_entrega: notificationData.estado_entrega,
                        ventas_ids: notificationData.ventas_ids,
                        ventas_numeros: notificationData.ventas_numeros,
                        cantidad_ventas: notificationData.cantidad_ventas,
                        chofer: notificationData.chofer,
                        vehiculo: notificationData.vehiculo,
                        peso_kg: notificationData.peso_kg,
                        volumen_m3: notificationData.volumen_m3,
                        mensaje: notificationData.mensaje || 'Tu venta está en preparación de carga',
                        type: 'info',
                        timestamp: new Date().toISOString(),
                        notificationType: 'venta_preparacion_carga'
                    });
                    console.log(`   ✅ Notificación enviada al cliente: user_${notificationData.user_id}`);
                } else {
                    console.log(`   ⚠️ No hay user_id en los datos - No se puede notificar al cliente`);
                }

                notificationSent = true;
            }
            // ✅ Manejar eventos específicos de entregas (acciones del chofer)
            else if (eventName === 'entrega.llegada-confirmada') {
                console.log('✅ Chofer llegó al destino');
                // Broadcast a admin, cliente y chofer
                notificationService.notifyAll('entrega.llegada-confirmada', {
                    ...notificationData,
                    tipo: 'entrega_action',
                    accion: 'chofer_llego'
                });
                notificationSent = true;
            } else if (eventName === 'entrega.confirmada') {
                console.log('✅ Entrega confirmada exitosamente');
                // Broadcast a admin, cliente y chofer
                notificationService.notifyAll('entrega.confirmada', {
                    ...notificationData,
                    tipo: 'entrega_action',
                    accion: 'entrega_confirmada'
                });
                notificationSent = true;
            } else if (eventName === 'entrega.novedad-reportada') {
                console.log('⚠️ Novedad reportada en entrega');
                // Notificar a admin y logística
                notificationService.notifyAll('entrega.novedad-reportada', {
                    ...notificationData,
                    tipo: 'entrega_action',
                    accion: 'novedad_reportada',
                    prioridad: 'high'
                });
                notificationSent = true;
            }
            // ✅ NUEVO: Manejar notificación de ventas listo para entrega (para CLIENTES)
            else if (eventName === 'notify/venta-listo-para-entrega' || eventName === 'venta.listo-para-entrega') {
                console.log('\n═══════════════════════════════════════════════════════════');
                console.log('📦 VENTA LISTO PARA ENTREGA - NOTIFICANDO A CLIENTE');
                console.log('═══════════════════════════════════════════════════════════');
                console.log(`   User ID (Cliente): ${notificationData.user_id}`);
                console.log(`   Entrega ID: ${notificationData.entrega_id}`);
                console.log(`   Número Entrega: ${notificationData.numero_entrega}`);
                console.log(`   Cantidad de Ventas: ${notificationData.cantidad_ventas}`);
                console.log(`   Ventas: ${notificationData.ventas_numeros?.join(', ')}`);
                console.log(`   Estado Anterior: ${notificationData.estado_logistico_anterior}`);
                console.log(`   Estado Nuevo: ${notificationData.estado_logistico_nuevo}`);
                console.log(`   Chofer: ${notificationData.chofer?.nombre}`);
                console.log(`   Vehículo: ${notificationData.vehiculo?.placa}`);
                console.log('═══════════════════════════════════════════════════════════\n');

                // ✅ CRÍTICO: Emitir al CLIENTE en su canal privado (user_id)
                if (notificationData.user_id) {
                    socketRepository.emitToUser(notificationData.user_id, 'venta.listo-para-entrega', {
                        entrega_id: notificationData.entrega_id,
                        numero_entrega: notificationData.numero_entrega,
                        estado_entrega: notificationData.estado_entrega,
                        estado_logistico_anterior: notificationData.estado_logistico_anterior,
                        estado_logistico_nuevo: notificationData.estado_logistico_nuevo,
                        ventas_ids: notificationData.ventas_ids,
                        ventas_numeros: notificationData.ventas_numeros,
                        cantidad_ventas: notificationData.cantidad_ventas,
                        chofer: notificationData.chofer,
                        vehiculo: notificationData.vehiculo,
                        peso_kg: notificationData.peso_kg,
                        volumen_m3: notificationData.volumen_m3,
                        mensaje: notificationData.mensaje || 'Tu venta está lista para ser enviada',
                        type: 'success',
                        timestamp: new Date().toISOString(),
                        notificationType: 'venta_listo_para_entrega'
                    });
                    console.log(`   ✅ Notificación enviada al cliente: user_${notificationData.user_id}`);
                } else {
                    console.log(`   ⚠️ No hay user_id en los datos - No se puede notificar al cliente`);
                }

                notificationSent = true;
            }
            // ✅ NUEVO: Manejar notificación de ventas listo para entrega (para ADMINS Y CAJEROS)
            else if (eventName === 'notify/venta-listo-para-entrega-admin') {
                console.log('\n═══════════════════════════════════════════════════════════');
                console.log('📦 VENTAS LISTO PARA ENTREGA - NOTIFICANDO A ADMINS Y CAJEROS');
                console.log('═══════════════════════════════════════════════════════════');
                console.log(`   Entrega ID: ${notificationData.entrega_id}`);
                console.log(`   Número Entrega: ${notificationData.numero_entrega}`);
                console.log(`   Cantidad de Ventas: ${notificationData.cantidad_ventas}`);
                console.log(`   Ventas: ${notificationData.ventas_numeros?.join(', ')}`);
                console.log(`   Clientes Únicos: ${notificationData.clientes_unicos}`);
                console.log(`   Clientes: ${notificationData.clientes_nombres}`);
                console.log(`   Estado Anterior: ${notificationData.estado_logistico_anterior}`);
                console.log(`   Estado Nuevo: ${notificationData.estado_logistico_nuevo}`);
                console.log(`   Chofer: ${notificationData.chofer?.nombre}`);
                console.log(`   Vehículo: ${notificationData.vehiculo?.placa}`);
                console.log('═══════════════════════════════════════════════════════════\n');

                // ✅ Emitir a ADMINS
                socketRepository.emitToRoom('admins', 'venta.listo-para-entrega-admin', {
                    entrega_id: notificationData.entrega_id,
                    numero_entrega: notificationData.numero_entrega,
                    estado_entrega: notificationData.estado_entrega,
                    estado_logistico_anterior: notificationData.estado_logistico_anterior,
                    estado_logistico_nuevo: notificationData.estado_logistico_nuevo,
                    ventas_ids: notificationData.ventas_ids,
                    ventas_numeros: notificationData.ventas_numeros,
                    cantidad_ventas: notificationData.cantidad_ventas,
                    clientes_unicos: notificationData.clientes_unicos,
                    clientes_nombres: notificationData.clientes_nombres,
                    chofer: notificationData.chofer,
                    vehiculo: notificationData.vehiculo,
                    peso_kg: notificationData.peso_kg,
                    volumen_m3: notificationData.volumen_m3,
                    mensaje: notificationData.mensaje,
                    type: 'success',
                    timestamp: new Date().toISOString(),
                    notificationType: 'venta_listo_para_entrega_admin'
                });
                console.log(`   ✅ Notificación enviada a admins`);

                // ✅ Emitir a CAJEROS
                socketRepository.emitToRoom('cobradores', 'venta.listo-para-entrega-admin', {
                    entrega_id: notificationData.entrega_id,
                    numero_entrega: notificationData.numero_entrega,
                    estado_entrega: notificationData.estado_entrega,
                    estado_logistico_anterior: notificationData.estado_logistico_anterior,
                    estado_logistico_nuevo: notificationData.estado_logistico_nuevo,
                    ventas_ids: notificationData.ventas_ids,
                    ventas_numeros: notificationData.ventas_numeros,
                    cantidad_ventas: notificationData.cantidad_ventas,
                    clientes_unicos: notificationData.clientes_unicos,
                    clientes_nombres: notificationData.clientes_nombres,
                    chofer: notificationData.chofer,
                    vehiculo: notificationData.vehiculo,
                    peso_kg: notificationData.peso_kg,
                    volumen_m3: notificationData.volumen_m3,
                    mensaje: notificationData.mensaje,
                    type: 'success',
                    timestamp: new Date().toISOString(),
                    notificationType: 'venta_listo_para_entrega_admin'
                });
                console.log(`   ✅ Notificación enviada a cajeros`);

                // ✅ Emitir a MANAGERS
                socketRepository.emitToRoom('managers', 'venta.listo-para-entrega-admin', {
                    entrega_id: notificationData.entrega_id,
                    numero_entrega: notificationData.numero_entrega,
                    estado_entrega: notificationData.estado_entrega,
                    estado_logistico_anterior: notificationData.estado_logistico_anterior,
                    estado_logistico_nuevo: notificationData.estado_logistico_nuevo,
                    ventas_ids: notificationData.ventas_ids,
                    ventas_numeros: notificationData.ventas_numeros,
                    cantidad_ventas: notificationData.cantidad_ventas,
                    clientes_unicos: notificationData.clientes_unicos,
                    clientes_nombres: notificationData.clientes_nombres,
                    chofer: notificationData.chofer,
                    vehiculo: notificationData.vehiculo,
                    peso_kg: notificationData.peso_kg,
                    volumen_m3: notificationData.volumen_m3,
                    mensaje: notificationData.mensaje,
                    type: 'success',
                    timestamp: new Date().toISOString(),
                    notificationType: 'venta_listo_para_entrega_admin'
                });
                console.log(`   ✅ Notificación enviada a managers`);

                notificationSent = true;
            }
            // ✅ NUEVO: Manejar notificación de venta en tránsito (para CLIENTES)
            else if (eventName === 'notify/venta-en-transito') {
                console.log('\n═══════════════════════════════════════════════════════════');
                console.log('🚚 VENTA EN TRÁNSITO - NOTIFICANDO A CLIENTE');
                console.log('═══════════════════════════════════════════════════════════');
                console.log(`   User ID (Cliente): ${notificationData.user_id}`);
                console.log(`   Entrega ID: ${notificationData.entrega_id}`);
                console.log(`   Número Entrega: ${notificationData.numero_entrega}`);
                console.log(`   Cantidad de Ventas: ${notificationData.cantidad_ventas}`);
                console.log(`   Chofer: ${notificationData.chofer?.nombre}`);
                console.log(`   Vehículo: ${notificationData.vehiculo?.placa}`);
                console.log('═══════════════════════════════════════════════════════════\n');

                // ✅ Emitir al CLIENTE en su canal privado (user_id)
                if (notificationData.user_id) {
                    socketRepository.emitToUser(notificationData.user_id, 'venta.en-transito', {
                        entrega_id: notificationData.entrega_id,
                        numero_entrega: notificationData.numero_entrega,
                        estado_entrega: notificationData.estado_entrega,
                        ventas_ids: notificationData.ventas_ids,
                        ventas_numeros: notificationData.ventas_numeros,
                        cantidad_ventas: notificationData.cantidad_ventas,
                        chofer: notificationData.chofer,
                        vehiculo: notificationData.vehiculo,
                        mensaje: notificationData.mensaje,
                        type: 'info',
                        timestamp: new Date().toISOString(),
                        notificationType: 'venta_en_transito'
                    });
                    console.log(`   ✅ Notificación enviada al cliente: user_${notificationData.user_id}`);
                }

                notificationSent = true;
            }
            // ✅ NUEVO: Manejar notificación genérica de cambio de estado de venta
            else if (eventName === 'notify/venta-estado-cambio' || eventName === 'venta.estado-cambio') {
                console.log('\n═══════════════════════════════════════════════════════════');
                console.log('📊 VENTA ESTADO CAMBIÓ');
                console.log('═══════════════════════════════════════════════════════════');
                console.log(`   Venta ID: ${notificationData.venta_id}`);
                console.log(`   Venta Número: ${notificationData.venta_numero}`);
                console.log(`   Cliente: ${notificationData.cliente?.nombre}`);
                console.log(`   Estado Anterior: ${notificationData.estado_anterior?.nombre}`);
                console.log(`   Estado Nuevo: ${notificationData.estado_nuevo?.nombre}`);
                console.log(`   Entrega ID: ${notificationData.entrega?.id}`);
                console.log(`   Razón: ${notificationData.razon}`);
                console.log('═══════════════════════════════════════════════════════════\n');

                // ✅ Emitir al CLIENTE (por user_id)
                if (notificationData.user_id) {
                    socketRepository.emitToUser(notificationData.user_id, 'venta.estado-cambio', {
                        venta_id: notificationData.venta_id,
                        venta_numero: notificationData.venta_numero,
                        cliente_id: notificationData.cliente_id,
                        cliente_nombre: notificationData.cliente?.nombre,
                        estado_anterior: notificationData.estado_anterior,
                        estado_nuevo: notificationData.estado_nuevo,
                        entrega: notificationData.entrega,
                        razon: notificationData.razon,
                        total: notificationData.total,
                        timestamp: new Date().toISOString(),
                        type: 'info',
                        notificationType: 'venta_estado_cambio'
                    });
                    console.log(`   ✅ Notificación enviada al cliente: user_${notificationData.user_id}`);
                }

                // ✅ Emitir a ADMINS y LOGÍSTICA
                socketRepository.emitToRoom('admins', 'venta.estado-cambio', {
                    venta_id: notificationData.venta_id,
                    venta_numero: notificationData.venta_numero,
                    cliente_id: notificationData.cliente_id,
                    cliente_nombre: notificationData.cliente?.nombre,
                    estado_anterior: notificationData.estado_anterior,
                    estado_nuevo: notificationData.estado_nuevo,
                    entrega: notificationData.entrega,
                    razon: notificationData.razon,
                    total: notificationData.total,
                    timestamp: new Date().toISOString(),
                    type: 'info',
                    notificationType: 'venta_estado_cambio'
                });
                console.log('   ✅ Notificación enviada a admins');

                socketRepository.emitToRoom('logisticas', 'venta.estado-cambio', {
                    venta_id: notificationData.venta_id,
                    venta_numero: notificationData.venta_numero,
                    cliente_id: notificationData.cliente_id,
                    cliente_nombre: notificationData.cliente?.nombre,
                    estado_anterior: notificationData.estado_anterior,
                    estado_nuevo: notificationData.estado_nuevo,
                    entrega: notificationData.entrega,
                    razon: notificationData.razon,
                    total: notificationData.total,
                    timestamp: new Date().toISOString(),
                    type: 'info',
                    notificationType: 'venta_estado_cambio'
                });
                console.log('   ✅ Notificación enviada a logística');

                // ✅ Emitir a CAJEROS (para control de pagos)
                socketRepository.emitToRoom('cajeros', 'venta.estado-cambio', {
                    venta_id: notificationData.venta_id,
                    venta_numero: notificationData.venta_numero,
                    cliente_id: notificationData.cliente_id,
                    cliente_nombre: notificationData.cliente?.nombre,
                    estado_anterior: notificationData.estado_anterior,
                    estado_nuevo: notificationData.estado_nuevo,
                    entrega: notificationData.entrega,
                    razon: notificationData.razon,
                    total: notificationData.total,
                    timestamp: new Date().toISOString(),
                    type: 'info',
                    notificationType: 'venta_estado_cambio'
                });
                console.log('   ✅ Notificación enviada a cajeros');

                notificationSent = true;
            }
            // ✅ NUEVO: Manejar cambio de estado de entrega (notifica a ADMINS y CAJEROS)
            else if (eventName === 'notify/entrega-estado-cambio') {
                console.log('\n═══════════════════════════════════════════════════════════');
                console.log('📊 CAMBIO DE ESTADO DE ENTREGA - ADMINS Y CAJEROS');
                console.log('═══════════════════════════════════════════════════════════');
                console.log(`   Entrega ID: ${notificationData.entrega_id}`);
                console.log(`   Número: ${notificationData.numero_entrega}`);
                console.log(`   Estado Nuevo: ${notificationData.estado_nuevo}`);
                console.log(`   Chofer: ${notificationData.chofer?.nombre}`);
                console.log(`   Cantidad Ventas: ${notificationData.cantidad_ventas}`);
                console.log(`   Monto Total: ${notificationData.monto_total}`);
                console.log(`   Destinatario: ${notificationData.destinatario}`);
                console.log('═══════════════════════════════════════════════════════════\n');

                // Emitir a ADMINS
                if (notificationData.destinatario === 'admins') {
                    socketRepository.emitToRoom('admins', 'entrega.estado-cambio', {
                        entrega_id: notificationData.entrega_id,
                        numero_entrega: notificationData.numero_entrega,
                        estado_nuevo: notificationData.estado_nuevo,
                        chofer: notificationData.chofer,
                        vehiculo: notificationData.vehiculo,
                        cantidad_ventas: notificationData.cantidad_ventas,
                        monto_total: notificationData.monto_total,
                        fecha_cambio: notificationData.fecha_cambio,
                        mensaje: `Entrega ${notificationData.numero_entrega} cambió a ${notificationData.estado_nuevo}`,
                        type: 'info',
                        timestamp: new Date().toISOString(),
                        notificationType: 'entrega_estado_cambio'
                    });
                    console.log(`   ✅ Notificación enviada a admins`);
                }
                // Emitir a CAJEROS
                else if (notificationData.destinatario === 'cajeros') {
                    socketRepository.emitToRoom('cajeros', 'entrega.estado-cambio', {
                        entrega_id: notificationData.entrega_id,
                        numero_entrega: notificationData.numero_entrega,
                        estado_nuevo: notificationData.estado_nuevo,
                        chofer: notificationData.chofer,
                        vehiculo: notificationData.vehiculo,
                        cantidad_ventas: notificationData.cantidad_ventas,
                        monto_total: notificationData.monto_total,
                        fecha_cambio: notificationData.fecha_cambio,
                        mensaje: `Entrega ${notificationData.numero_entrega} cambió a ${notificationData.estado_nuevo}`,
                        type: 'info',
                        timestamp: new Date().toISOString(),
                        notificationType: 'entrega_estado_cambio'
                    });
                    console.log(`   ✅ Notificación enviada a cajeros`);
                }
                // ✅ NUEVO: Emitir al CREADOR de la entrega
                else if (notificationData.destinatario === 'creador') {
                    if (notificationData.user_id) {
                        socketRepository.emitToUser(notificationData.user_id, 'entrega.estado-cambio', {
                            entrega_id: notificationData.entrega_id,
                            numero_entrega: notificationData.numero_entrega,
                            estado_nuevo: notificationData.estado_nuevo,
                            chofer: notificationData.chofer,
                            vehiculo: notificationData.vehiculo,
                            cantidad_ventas: notificationData.cantidad_ventas,
                            monto_total: notificationData.monto_total,
                            fecha_cambio: notificationData.fecha_cambio,
                            mensaje: `Entrega ${notificationData.numero_entrega} cambió a ${notificationData.estado_nuevo}`,
                            type: 'info',
                            timestamp: new Date().toISOString(),
                            notificationType: 'entrega_estado_cambio'
                        });
                        console.log(`   ✅ Notificación enviada al creador (user_id: ${notificationData.user_id})`);
                    } else {
                        console.warn(`   ⚠️ No hay user_id para enviar notificación al creador`);
                    }
                }

                notificationSent = true;
            }
            // ✅ NUEVO: Manejar asignación de venta a entrega
            else if (eventName === 'notify/venta-asignada-entrega') {
                console.log('\n═══════════════════════════════════════════════════════════');
                console.log('📦 VENTA ASIGNADA A ENTREGA');
                console.log('═══════════════════════════════════════════════════════════');
                console.log(`   Venta Folio: ${notificationData.venta_numero}`);
                console.log(`   Entrega Folio: ${notificationData.entrega_numero}`);
                console.log(`   Cliente: ${notificationData.cliente_nombre}`);
                console.log(`   Chofer: ${notificationData.chofer_nombre}`);
                console.log(`   Estado: ${notificationData.estado_logistico_nombre}`);
                console.log('═══════════════════════════════════════════════════════════\n');

                // 1️⃣ Notificar al CLIENTE propietario de la venta
                if (notificationData.user_id) {
                    socketRepository.emitToUser(notificationData.user_id, 'venta.asignada-entrega', {
                        venta_id: notificationData.venta_id,
                        venta_numero: notificationData.venta_numero,
                        entrega_id: notificationData.entrega_id,
                        entrega_numero: notificationData.entrega_numero,
                        cliente_nombre: notificationData.cliente_nombre,
                        chofer_nombre: notificationData.chofer_nombre,
                        vehiculo_placa: notificationData.vehiculo_placa,
                        estado_logistico_nombre: notificationData.estado_logistico_nombre,
                        total: notificationData.total,
                        mensaje: notificationData.mensaje,
                        fecha_asignacion: notificationData.fecha_asignacion,
                        type: 'info',
                        timestamp: new Date().toISOString(),
                        notificationType: 'venta_asignada_entrega'
                    });
                    console.log(`   ✅ Notificación enviada al cliente (user_id: ${notificationData.user_id})`);
                }

                // 2️⃣ Notificar al PREVENTISTA (si existe)
                if (notificationData.preventista_id) {
                    socketRepository.emitToUser(notificationData.preventista_id, 'venta.asignada-entrega', {
                        venta_id: notificationData.venta_id,
                        venta_numero: notificationData.venta_numero,
                        entrega_id: notificationData.entrega_id,
                        entrega_numero: notificationData.entrega_numero,
                        cliente_nombre: notificationData.cliente_nombre,
                        chofer_nombre: notificationData.chofer_nombre,
                        vehiculo_placa: notificationData.vehiculo_placa,
                        estado_logistico_nombre: notificationData.estado_logistico_nombre,
                        total: notificationData.total,
                        mensaje: notificationData.mensaje,
                        fecha_asignacion: notificationData.fecha_asignacion,
                        type: 'info',
                        timestamp: new Date().toISOString(),
                        notificationType: 'venta_asignada_entrega'
                    });
                    console.log(`   ✅ Notificación enviada al preventista (user_id: ${notificationData.preventista_id})`);
                }

                notificationSent = true;
            }
            // ✅ NUEVO: Manejar reporte de carga generado
            else if (eventName === 'notify/reporte-cargo-generado') {
                console.log('\n═══════════════════════════════════════════════════════════');
                console.log('📋 REPORTE DE CARGA GENERADO');
                console.log('═══════════════════════════════════════════════════════════');
                console.log(`   Entrega: ${notificationData.entrega_numero}`);
                console.log(`   Reporte: ${notificationData.reporte_numero}`);
                console.log(`   Chofer: ${notificationData.chofer_nombre}`);
                console.log(`   Ventas: ${notificationData.ventas_count}`);
                console.log('═══════════════════════════════════════════════════════════\n');

                // Notificar a ADMINS (para supervisión de carga)
                socketRepository.emitToRoom('admins', 'reporte.cargo-generado', {
                    entrega_id: notificationData.entrega_id,
                    entrega_numero: notificationData.entrega_numero,
                    reporte_id: notificationData.reporte_id,
                    reporte_numero: notificationData.reporte_numero,
                    estado: notificationData.estado,
                    chofer_nombre: notificationData.chofer_nombre,
                    vehiculo_placa: notificationData.vehiculo_placa,
                    ventas_count: notificationData.ventas_count,
                    fecha_generacion: notificationData.fecha_generacion,
                    mensaje: `Reporte ${notificationData.reporte_numero} generado para Entrega ${notificationData.entrega_numero}`,
                    type: 'info',
                    timestamp: new Date().toISOString(),
                    notificationType: 'reporte_cargo_generado'
                });
                console.log(`   ✅ Notificación enviada a admins`);

                notificationSent = true;
            }
            // ✅ NUEVO: Manejar notificación de entrega en tránsito (para ADMINS Y CAJEROS)
            else if (eventName === 'notify/entrega-en-transito-admin') {
                console.log('\n═══════════════════════════════════════════════════════════');
                console.log('🚚 ENTREGA EN TRÁNSITO - NOTIFICANDO A ADMINS Y CAJEROS');
                console.log('═══════════════════════════════════════════════════════════');
                console.log(`   Entrega ID: ${notificationData.entrega_id}`);
                console.log(`   Número Entrega: ${notificationData.numero_entrega}`);
                console.log(`   Cantidad de Ventas: ${notificationData.cantidad_ventas}`);
                console.log(`   Clientes Únicos: ${notificationData.clientes_unicos}`);
                console.log(`   Chofer: ${notificationData.chofer?.nombre}`);
                console.log(`   Vehículo: ${notificationData.vehiculo?.placa}`);
                console.log('═══════════════════════════════════════════════════════════\n');

                // ✅ Emitir a ADMINS, CAJEROS Y MANAGERS
                socketRepository.emitToRoom('admins', 'entrega.en-transito-admin', {
                    entrega_id: notificationData.entrega_id,
                    numero_entrega: notificationData.numero_entrega,
                    estado_entrega: notificationData.estado_entrega,
                    ventas_numeros: notificationData.ventas_numeros,
                    cantidad_ventas: notificationData.cantidad_ventas,
                    clientes_unicos: notificationData.clientes_unicos,
                    clientes_nombres: notificationData.clientes_nombres,
                    chofer: notificationData.chofer,
                    vehiculo: notificationData.vehiculo,
                    mensaje: notificationData.mensaje,
                    type: 'info',
                    timestamp: new Date().toISOString(),
                    notificationType: 'entrega_en_transito_admin'
                });
                console.log(`   ✅ Notificación enviada a admins`);

                socketRepository.emitToRoom('cobradores', 'entrega.en-transito-admin', {
                    entrega_id: notificationData.entrega_id,
                    numero_entrega: notificationData.numero_entrega,
                    estado_entrega: notificationData.estado_entrega,
                    ventas_numeros: notificationData.ventas_numeros,
                    cantidad_ventas: notificationData.cantidad_ventas,
                    clientes_unicos: notificationData.clientes_unicos,
                    clientes_nombres: notificationData.clientes_nombres,
                    chofer: notificationData.chofer,
                    vehiculo: notificationData.vehiculo,
                    mensaje: notificationData.mensaje,
                    type: 'info',
                    timestamp: new Date().toISOString(),
                    notificationType: 'entrega_en_transito_admin'
                });
                console.log(`   ✅ Notificación enviada a cajeros`);

                socketRepository.emitToRoom('managers', 'entrega.en-transito-admin', {
                    entrega_id: notificationData.entrega_id,
                    numero_entrega: notificationData.numero_entrega,
                    estado_entrega: notificationData.estado_entrega,
                    ventas_numeros: notificationData.ventas_numeros,
                    cantidad_ventas: notificationData.cantidad_ventas,
                    clientes_unicos: notificationData.clientes_unicos,
                    clientes_nombres: notificationData.clientes_nombres,
                    chofer: notificationData.chofer,
                    vehiculo: notificationData.vehiculo,
                    mensaje: notificationData.mensaje,
                    type: 'info',
                    timestamp: new Date().toISOString(),
                    notificationType: 'entrega_en_transito_admin'
                });
                console.log(`   ✅ Notificación enviada a managers`);

                notificationSent = true;
            }
            // ✅ NUEVO: Notificar a admins/cajeros cuando entrega fue finalizada
            else if (eventName === 'notify/entrega-finalizada-admin') {
                console.log('\n═══════════════════════════════════════════════════════════');
                console.log('✅ ENTREGA FINALIZADA - NOTIFICANDO A ADMINS Y CAJEROS');
                console.log('═══════════════════════════════════════════════════════════');
                console.log(`   Entrega ID: ${notificationData.entrega_id}`);
                console.log(`   Número Entrega: ${notificationData.numero_entrega}`);
                console.log(`   Cantidad de Ventas: ${notificationData.cantidad_ventas}`);
                console.log(`   Clientes Únicos: ${notificationData.clientes_unicos}`);
                console.log(`   Chofer: ${notificationData.chofer?.nombre}`);
                console.log(`   Vehículo: ${notificationData.vehiculo?.placa}`);
                console.log(`   Fecha de Entrega: ${notificationData.fecha_entrega}`);
                console.log('═══════════════════════════════════════════════════════════\n');

                // ✅ Emitir a ADMINS, CAJEROS Y MANAGERS
                socketRepository.emitToRoom('admins', 'entrega.finalizada-admin', {
                    entrega_id: notificationData.entrega_id,
                    numero_entrega: notificationData.numero_entrega,
                    estado_entrega: notificationData.estado_entrega,
                    ventas_numeros: notificationData.ventas_numeros,
                    cantidad_ventas: notificationData.cantidad_ventas,
                    clientes_unicos: notificationData.clientes_unicos,
                    clientes_nombres: notificationData.clientes_nombres,
                    chofer: notificationData.chofer,
                    vehiculo: notificationData.vehiculo,
                    fecha_entrega: notificationData.fecha_entrega,
                    mensaje: notificationData.mensaje,
                    type: 'success',
                    timestamp: new Date().toISOString(),
                    notificationType: 'entrega_finalizada_admin'
                });
                console.log(`   ✅ Notificación enviada a admins`);

                socketRepository.emitToRoom('cobradores', 'entrega.finalizada-admin', {
                    entrega_id: notificationData.entrega_id,
                    numero_entrega: notificationData.numero_entrega,
                    estado_entrega: notificationData.estado_entrega,
                    ventas_numeros: notificationData.ventas_numeros,
                    cantidad_ventas: notificationData.cantidad_ventas,
                    clientes_unicos: notificationData.clientes_unicos,
                    clientes_nombres: notificationData.clientes_nombres,
                    chofer: notificationData.chofer,
                    vehiculo: notificationData.vehiculo,
                    fecha_entrega: notificationData.fecha_entrega,
                    mensaje: notificationData.mensaje,
                    type: 'success',
                    timestamp: new Date().toISOString(),
                    notificationType: 'entrega_finalizada_admin'
                });
                console.log(`   ✅ Notificación enviada a cajeros`);

                socketRepository.emitToRoom('managers', 'entrega.finalizada-admin', {
                    entrega_id: notificationData.entrega_id,
                    numero_entrega: notificationData.numero_entrega,
                    estado_entrega: notificationData.estado_entrega,
                    ventas_numeros: notificationData.ventas_numeros,
                    cantidad_ventas: notificationData.cantidad_ventas,
                    clientes_unicos: notificationData.clientes_unicos,
                    clientes_nombres: notificationData.clientes_nombres,
                    chofer: notificationData.chofer,
                    vehiculo: notificationData.vehiculo,
                    fecha_entrega: notificationData.fecha_entrega,
                    mensaje: notificationData.mensaje,
                    type: 'success',
                    timestamp: new Date().toISOString(),
                    notificationType: 'entrega_finalizada_admin'
                });
                console.log(`   ✅ Notificación enviada a managers`);

                notificationSent = true;
            }
            // ✅ NUEVO: Notificar a cliente cuando su venta fue entregada
            else if (eventName === 'notify/venta-entregada-cliente') {
                console.log('\n═══════════════════════════════════════════════════════════');
                console.log('✅ VENTA ENTREGADA - NOTIFICANDO A CLIENTE');
                console.log('═══════════════════════════════════════════════════════════');
                console.log(`   Venta ID: ${notificationData.venta_id}`);
                console.log(`   Venta: ${notificationData.venta_numero}`);
                console.log(`   Cliente: ${notificationData.cliente_nombre}`);
                console.log(`   User ID: ${notificationData.user_id}`);
                console.log(`   Entrega: ${notificationData.numero_entrega}`);
                console.log('═══════════════════════════════════════════════════════════\n');

                // ✅ Emitir a CLIENTE específico
                socketRepository.emitToUser(notificationData.user_id, 'venta.entregada', {
                    venta_id: notificationData.venta_id,
                    venta_numero: notificationData.venta_numero,
                    cliente_nombre: notificationData.cliente_nombre,
                    entrega_id: notificationData.entrega_id,
                    numero_entrega: notificationData.numero_entrega,
                    mensaje: notificationData.mensaje,
                    type: 'success',
                    timestamp: new Date().toISOString(),
                    notificationType: 'venta_entregada_cliente'
                });
                console.log(`   ✅ Notificación enviada a cliente (user_${notificationData.user_id})`);

                notificationSent = true;
            }
            // ✅ NUEVO: Notificar a admin/cajero cuando venta fue entregada
            else if (eventName === 'notify/venta-entregada-admin') {
                console.log('\n═══════════════════════════════════════════════════════════');
                console.log('✅ VENTA ENTREGADA - NOTIFICANDO A ADMINS Y CAJEROS');
                console.log('═══════════════════════════════════════════════════════════');
                console.log(`   Venta ID: ${notificationData.venta_id}`);
                console.log(`   Venta: ${notificationData.venta_numero}`);
                console.log(`   Cliente: ${notificationData.cliente_nombre}`);
                console.log(`   Chofer: ${notificationData.chofer?.nombre}`);
                console.log(`   Entrega: ${notificationData.numero_entrega}`);
                console.log('═══════════════════════════════════════════════════════════\n');

                // ✅ Emitir a ADMINS, CAJEROS Y MANAGERS
                socketRepository.emitToRoom('admins', 'venta.entregada-admin', {
                    venta_id: notificationData.venta_id,
                    venta_numero: notificationData.venta_numero,
                    cliente_nombre: notificationData.cliente_nombre,
                    cliente_id: notificationData.cliente_id,
                    entrega_id: notificationData.entrega_id,
                    numero_entrega: notificationData.numero_entrega,
                    chofer: notificationData.chofer,
                    mensaje: notificationData.mensaje,
                    type: 'success',
                    timestamp: new Date().toISOString(),
                    notificationType: 'venta_entregada_admin'
                });
                console.log(`   ✅ Notificación enviada a admins`);

                socketRepository.emitToRoom('cobradores', 'venta.entregada-admin', {
                    venta_id: notificationData.venta_id,
                    venta_numero: notificationData.venta_numero,
                    cliente_nombre: notificationData.cliente_nombre,
                    cliente_id: notificationData.cliente_id,
                    entrega_id: notificationData.entrega_id,
                    numero_entrega: notificationData.numero_entrega,
                    chofer: notificationData.chofer,
                    mensaje: notificationData.mensaje,
                    type: 'success',
                    timestamp: new Date().toISOString(),
                    notificationType: 'venta_entregada_admin'
                });
                console.log(`   ✅ Notificación enviada a cajeros`);

                socketRepository.emitToRoom('managers', 'venta.entregada-admin', {
                    venta_id: notificationData.venta_id,
                    venta_numero: notificationData.venta_numero,
                    cliente_nombre: notificationData.cliente_nombre,
                    cliente_id: notificationData.cliente_id,
                    entrega_id: notificationData.entrega_id,
                    numero_entrega: notificationData.numero_entrega,
                    chofer: notificationData.chofer,
                    mensaje: notificationData.mensaje,
                    type: 'success',
                    timestamp: new Date().toISOString(),
                    notificationType: 'venta_entregada_admin'
                });
                console.log(`   ✅ Notificación enviada a managers`);

                notificationSent = true;
            }
            // ✅ NUEVO: Manejar creación de entrega consolidada
            else if (eventName === 'entrega.creada') {
                console.log('\n═══════════════════════════════════════════════════════════');
                console.log('🚚 NUEVA ENTREGA CONSOLIDADA CREADA');
                console.log('═══════════════════════════════════════════════════════════');
                console.log(`   Entrega ID: ${notificationData.entrega_id}`);
                console.log(`   Número: ${notificationData.entrega_numero}`);
                console.log(`   Estado: ${notificationData.estado}`);
                console.log(`   Chofer: ${notificationData.chofer_nombre}`);
                console.log(`   Vehículo: ${notificationData.vehiculo_placa}`);
                console.log(`   Cantidad Ventas: ${notificationData.ventas_count}`);
                console.log('═══════════════════════════════════════════════════════════\n');

                // ✅ Notificar a admin y logística
                socketRepository.emitToRoom('admins', 'entrega.creada', {
                    entrega_id: notificationData.entrega_id,
                    entrega_numero: notificationData.entrega_numero,
                    estado: notificationData.estado,
                    chofer_id: notificationData.chofer_id,
                    chofer_nombre: notificationData.chofer_nombre,
                    vehiculo_placa: notificationData.vehiculo_placa,
                    ventas_count: notificationData.ventas_count,
                    fecha_asignacion: notificationData.fecha_asignacion,
                    tipo: 'entrega_creada',
                    type: 'info',
                    timestamp: new Date().toISOString(),
                    notificationType: 'entrega_creada'
                });
                console.log('   ✅ Notificación enviada a admins');

                socketRepository.emitToRoom('logisticas', 'entrega.creada', {
                    entrega_id: notificationData.entrega_id,
                    entrega_numero: notificationData.entrega_numero,
                    estado: notificationData.estado,
                    chofer_id: notificationData.chofer_id,
                    chofer_nombre: notificationData.chofer_nombre,
                    vehiculo_placa: notificationData.vehiculo_placa,
                    ventas_count: notificationData.ventas_count,
                    fecha_asignacion: notificationData.fecha_asignacion,
                    tipo: 'entrega_creada',
                    type: 'info',
                    timestamp: new Date().toISOString(),
                    notificationType: 'entrega_creada'
                });
                console.log('   ✅ Notificación enviada a logística');

                notificationSent = true;
            }
            // ✅ NUEVO: Manejar asignación de venta a entrega
            else if (eventName === 'venta.asignada.entrega') {
                console.log('\n═══════════════════════════════════════════════════════════');
                console.log('📦 VENTA ASIGNADA A ENTREGA');
                console.log('═══════════════════════════════════════════════════════════');
                console.log(`   Venta ID: ${notificationData.venta_id}`);
                console.log(`   Venta Número: ${notificationData.venta_numero}`);
                console.log(`   Entrega ID: ${notificationData.entrega_id}`);
                console.log(`   Entrega Número: ${notificationData.entrega_numero}`);
                console.log(`   Cliente: ${notificationData.cliente_nombre}`);
                console.log(`   User ID: ${notificationData.user_id}`);
                console.log(`   Preventista ID: ${notificationData.preventista_id}`);
                console.log(`   Total: ${notificationData.total}`);
                console.log(`   Chofer: ${notificationData.chofer_nombre}`);
                console.log(`   Vehículo: ${notificationData.vehiculo_placa}`);
                console.log(`   Estado Logístico: ${notificationData.estado_logistico_nombre}`);
                console.log('═══════════════════════════════════════════════════════════\n');

                // ✅ CENTRALIZADO: Usar mensaje que viene desde Laravel
                // Ya viene construido con NotificationMessageService::ventasAsignadasAEntrega()
                const mensajeNotificacion = notificationData.mensaje ||
                    `Entrega Folio:${notificationData.entrega_id} | ${notificationData.estado_logistico_nombre || 'Pendiente'} - ${notificationData.cliente_nombre}`;

                const commonData = {
                    venta_id: notificationData.venta_id,
                    venta_numero: notificationData.venta_numero,
                    entrega_id: notificationData.entrega_id,
                    entrega_numero: notificationData.entrega_numero,
                    cliente_id: notificationData.cliente_id,
                    cliente_nombre: notificationData.cliente_nombre,
                    total: notificationData.total,
                    chofer_nombre: notificationData.chofer_nombre,
                    vehiculo_placa: notificationData.vehiculo_placa,
                    estado_logistico_nombre: notificationData.estado_logistico_nombre,
                    fecha_asignacion: notificationData.fecha_asignacion,
                    mensaje: mensajeNotificacion,  // ✅ Usa mensaje centralizado de Laravel
                    tipo: 'venta_asignada_entrega',
                    timestamp: new Date().toISOString(),
                    notificationType: 'venta_asignada_entrega'
                };

                // ✅ Notificar al CLIENTE
                if (notificationData.user_id) {
                    socketRepository.emitToUser(notificationData.user_id, 'venta.asignada-entrega', {
                        ...commonData,
                        type: 'success',
                    });
                    console.log(`   ✅ Notificación enviada al cliente: user_${notificationData.user_id}`);
                    console.log(`   📝 Mensaje: ${mensajeNotificacion}`);
                }

                // ✅ Notificar al PREVENTISTA si existe
                if (notificationData.preventista_id) {
                    socketRepository.emitToUser(notificationData.preventista_id, 'venta.asignada-entrega', {
                        ...commonData,
                        type: 'success',
                    });
                    console.log(`   ✅ Notificación enviada al preventista: user_${notificationData.preventista_id}`);
                    console.log(`   📝 Mensaje: ${mensajeNotificacion}`);
                }

                // ✅ Notificar a ADMINS y LOGISTICA
                socketRepository.emitToRoom('admins', 'venta.asignada-entrega', {
                    ...commonData,
                    type: 'info',
                });
                console.log('   ✅ Notificación enviada a admins');

                socketRepository.emitToRoom('logisticas', 'venta.asignada-entrega', {
                    ...commonData,
                    type: 'info',
                });
                console.log('   ✅ Notificación enviada a logística');

                notificationSent = true;
            }
            // ✅ NUEVO: Manejar generación de reporte de carga
            else if (eventName === 'reporte.cargo_generado') {
                console.log('\n═══════════════════════════════════════════════════════════');
                console.log('📋 REPORTE DE CARGA GENERADO');
                console.log('═══════════════════════════════════════════════════════════');
                console.log(`   Entrega ID: ${notificationData.entrega_id}`);
                console.log(`   Entrega Número: ${notificationData.entrega_numero}`);
                console.log(`   Reporte ID: ${notificationData.reporte_id}`);
                console.log(`   Reporte Número: ${notificationData.reporte_numero}`);
                console.log(`   Estado: ${notificationData.estado}`);
                console.log(`   Chofer: ${notificationData.chofer_nombre}`);
                console.log(`   Vehículo: ${notificationData.vehiculo_placa}`);
                console.log(`   Cantidad Ventas: ${notificationData.ventas_count}`);
                console.log('═══════════════════════════════════════════════════════════\n');

                // ✅ Notificar a ADMINS y LOGISTICA
                socketRepository.emitToRoom('admins', 'reporte.cargo-generado', {
                    entrega_id: notificationData.entrega_id,
                    entrega_numero: notificationData.entrega_numero,
                    reporte_id: notificationData.reporte_id,
                    reporte_numero: notificationData.reporte_numero,
                    estado: notificationData.estado,
                    chofer_nombre: notificationData.chofer_nombre,
                    vehiculo_placa: notificationData.vehiculo_placa,
                    ventas_count: notificationData.ventas_count,
                    fecha_generacion: notificationData.fecha_generacion,
                    tipo: 'reporte_cargo_generado',
                    type: 'info',
                    timestamp: new Date().toISOString(),
                    notificationType: 'reporte_cargo_generado'
                });
                console.log('   ✅ Notificación enviada a admins');

                socketRepository.emitToRoom('logisticas', 'reporte.cargo-generado', {
                    entrega_id: notificationData.entrega_id,
                    entrega_numero: notificationData.entrega_numero,
                    reporte_id: notificationData.reporte_id,
                    reporte_numero: notificationData.reporte_numero,
                    estado: notificationData.estado,
                    chofer_nombre: notificationData.chofer_nombre,
                    vehiculo_placa: notificationData.vehiculo_placa,
                    ventas_count: notificationData.ventas_count,
                    fecha_generacion: notificationData.fecha_generacion,
                    tipo: 'reporte_cargo_generado',
                    type: 'info',
                    timestamp: new Date().toISOString(),
                    notificationType: 'reporte_cargo_generado'
                });
                console.log('   ✅ Notificación enviada a logística');

                notificationSent = true;
            }
            // ✅ FASE 2: Manejar eventos de cambio de estado de entregas
            // Estos eventos vienen desde Laravel cuando cambia el estado
            else if (eventName === 'entrega.estado_cambio') {
                console.log('📦 Cambio de estado en entrega');
                notificationService.notifyAll('entrega.estado-cambio', {
                    ...notificationData,
                    tipo: 'entrega_estado',
                    prioridad: this.getPriorityForEntregaState(notificationData.estado_nuevo?.codigo)
                });
                notificationSent = true;
            } else if (eventName === 'entrega.en_transito') {
                console.log('📍 Entrega en tránsito - GPS activo');
                notificationService.notifyAll('entrega.en-transito', {
                    ...notificationData,
                    tipo: 'entrega_tracking',
                    prioridad: 'high'
                });
                notificationSent = true;
            } else if (eventName === 'entrega.entregada') {
                console.log('✅ Entrega completada');
                notificationService.notifyAll('entrega.entregada', {
                    ...notificationData,
                    tipo: 'entrega_estado',
                    prioridad: 'medium'
                });
                notificationSent = true;
            } else if (eventName === 'entrega.problema') {
                console.log('⚠️ Problema en entrega');
                notificationService.notifyAll('entrega.problema', {
                    ...notificationData,
                    tipo: 'entrega_estado',
                    prioridad: 'high'
                });
                notificationSent = true;
            }
            // ✅ FASE 3: Manejar eventos de ubicación GPS en tiempo real
            else if (eventName === 'entrega.ubicacion') {
                console.log('📍 Ubicación actualizada - Lat:', notificationData.latitud, 'Lng:', notificationData.longitud);
                notificationService.notifyAll('entrega.ubicacion', {
                    ...notificationData,
                    tipo: 'entrega_tracking',
                    prioridad: 'high'
                });
                notificationSent = true;
            }
            // ✅ NUEVO: Manejar evento cuando venta es entregada (cliente/preventista)
            else if (eventName === 'venta.entregada') {
                console.log('\n═══════════════════════════════════════════════════════════');
                console.log('🎉 VENTA ENTREGADA - NOTIFICACIÓN A CLIENTE/PREVENTISTA');
                console.log('═══════════════════════════════════════════════════════════');
                console.log(`   Venta ID: ${notificationData.venta_id}`);
                console.log(`   Venta Número: ${notificationData.venta_numero}`);
                console.log(`   Cliente: ${notificationData.cliente_nombre}`);
                console.log(`   Tipo Entrega: ${notificationData.tipo_entrega}`);
                console.log(`   Tipo Novedad: ${notificationData.tipo_novedad || 'N/A'}`);
                console.log(`   Estado Pago: ${notificationData.estado_pago}`);
                console.log(`   Total: Bs. ${notificationData.total}`);
                console.log(`   User ID para routing: ${notificationData.user_id}`);
                console.log('═══════════════════════════════════════════════════════════\n');

                // Emitir al cliente/preventista específico
                if (notificationData.user_id) {
                    // Generar icono según tipo de entrega
                    const icono = notificationData.tipo_entrega === 'COMPLETA' ? '✅' : '⚠️';

                    socketRepository.emitToUser(notificationData.user_id, 'venta.entregada', {
                        venta_id: notificationData.venta_id,
                        venta_numero: notificationData.venta_numero,
                        cliente_nombre: notificationData.cliente_nombre,
                        entrega_numero: notificationData.entrega_numero,
                        total: notificationData.total,
                        chofer: notificationData.chofer,
                        tipo_entrega: notificationData.tipo_entrega,
                        tipo_novedad: notificationData.tipo_novedad,
                        estado_pago: notificationData.estado_pago,
                        mensaje: notificationData.mensaje || `${icono} Venta #${notificationData.venta_numero} entregada`,
                        titulo: notificationData.tipo_entrega === 'COMPLETA' ? '✅ Venta Entregada' : '⚠️ Novedad en Entrega',
                        tipo: 'venta_entregada',
                        timestamp: new Date().toISOString()
                    });
                    console.log(`   ✅ Notificación enviada a usuario: ${notificationData.user_id}`);
                    notificationSent = true;
                }
            }
            // ✅ NUEVO: Manejar evento cuando venta es entregada (admins/cajeros)
            else if (eventName === 'venta.entregada-admin') {
                console.log('\n═══════════════════════════════════════════════════════════');
                console.log('🎉 VENTA ENTREGADA - NOTIFICACIÓN A ADMINS/CAJEROS');
                console.log('═══════════════════════════════════════════════════════════');
                console.log(`   Venta ID: ${notificationData.venta_id}`);
                console.log(`   Venta Número: ${notificationData.venta_numero}`);
                console.log(`   Cliente: ${notificationData.cliente_nombre}`);
                console.log(`   Tipo Entrega: ${notificationData.tipo_entrega}`);
                console.log(`   Tipo Novedad: ${notificationData.tipo_novedad || 'N/A'}`);
                console.log(`   Estado Pago: ${notificationData.estado_pago}`);
                console.log(`   Total: Bs. ${notificationData.total}`);
                console.log(`   Destinatario: ${notificationData.destinatario}`);
                console.log('═══════════════════════════════════════════════════════════\n');

                // Generar icono según tipo de entrega
                const icono = notificationData.tipo_entrega === 'COMPLETA' ? '✅' : '⚠️';

                // Emitir a ADMINS
                if (notificationData.destinatario === 'admins') {
                    socketRepository.emitToRoom('admins', 'venta.entregada', {
                        venta_id: notificationData.venta_id,
                        venta_numero: notificationData.venta_numero,
                        cliente_nombre: notificationData.cliente_nombre,
                        cliente_id: notificationData.cliente_id,
                        entrega_numero: notificationData.entrega_numero,
                        total: notificationData.total,
                        chofer: notificationData.chofer,
                        tipo_entrega: notificationData.tipo_entrega,
                        tipo_novedad: notificationData.tipo_novedad,
                        estado_pago: notificationData.estado_pago,
                        mensaje: notificationData.mensaje || `${icono} Venta #${notificationData.venta_numero} - ${notificationData.cliente_nombre}`,
                        titulo: notificationData.tipo_entrega === 'COMPLETA' ? '✅ Venta Entregada' : '⚠️ Novedad en Entrega',
                        tipo: 'venta_entregada',
                        timestamp: new Date().toISOString()
                    });
                    console.log(`   ✅ Notificación enviada a admins`);
                    notificationSent = true;
                }
                // Emitir a CAJEROS
                else if (notificationData.destinatario === 'cajeros') {
                    socketRepository.emitToRoom('cajeros', 'venta.entregada', {
                        venta_id: notificationData.venta_id,
                        venta_numero: notificationData.venta_numero,
                        cliente_nombre: notificationData.cliente_nombre,
                        cliente_id: notificationData.cliente_id,
                        entrega_numero: notificationData.entrega_numero,
                        total: notificationData.total,
                        chofer: notificationData.chofer,
                        tipo_entrega: notificationData.tipo_entrega,
                        tipo_novedad: notificationData.tipo_novedad,
                        estado_pago: notificationData.estado_pago,
                        mensaje: notificationData.mensaje || `${icono} Pago venta #${notificationData.venta_numero} - ${notificationData.cliente_nombre} - Bs. ${notificationData.total}`,
                        titulo: notificationData.estado_pago === 'PAGADO' ? '💰 Pago Registrado' : `💳 ${notificationData.estado_pago === 'PARCIAL' ? 'Pago Parcial' : 'Sin Pago'}`,
                        tipo: 'venta_entregada_pago',
                        timestamp: new Date().toISOString()
                    });
                    console.log(`   ✅ Notificación enviada a cajeros`);
                    notificationSent = true;
                }
            }
            // Fallback: Notificar a un usuario específico por ID
            else if (userId || data?.user_id) {
                const targetUserId = userId || data?.user_id;
                notificationSent = notificationService.notifyUser(targetUserId, eventName, notificationData);
            }
            // Notificar a todos los usuarios de un tipo específico (cobrador, manager, etc.)
            else if (userType) {
                notificationSent = notificationService.notifyUserType(userType, eventName, notificationData);
            }
            // Broadcast a todos los usuarios
            else {
                notificationService.notifyAll(eventName, notificationData);
                notificationSent = true;
            }

            res.json({
                success: true,
                message: 'Notification sent',
                event: eventName,
                target: userId || data?.user_id
                    ? `user ${userId || data.user_id}`
                    : (userType ? `all ${userType}s` : 'all users'),
                sent: notificationSent
            });
        } catch (error) {
            console.error('Error sending notification:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ✅ Nuevo endpoint: Obtener estadísticas de usuarios conectados
    async getConnectedStats(req, res) {
        try {
            const stats = proformaNotificationService.getConnectedStats();
            res.json({
                success: true,
                stats
            });
        } catch (error) {
            console.error('Error getting connected stats:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ✅ Nuevo endpoint: Verificar que el servidor WebSocket está activo
    async healthCheck(req, res) {
        res.json({
            success: true,
            message: 'WebSocket server is running',
            timestamp: new Date().toISOString()
        });
    }

    // ✅ FASE 2: Determinar prioridad de evento según estado
    // Estados críticos (GPS activo) son high priority
    // Estados finales son medium priority
    getPriorityForEntregaState(estadoCodigo) {
        const criticalStates = ['EN_TRANSITO', 'EN_CAMINO', 'LLEGO'];
        const mediumStates = ['ENTREGADO', 'ENTREGADA'];
        const lowStates = ['PROGRAMADO', 'ASIGNADA', 'CANCELADA'];

        if (criticalStates.includes(estadoCodigo)) return 'high';
        if (mediumStates.includes(estadoCodigo)) return 'medium';
        if (lowStates.includes(estadoCodigo)) return 'low';
        return 'medium'; // default
    }
}

export default new NotificationController();
