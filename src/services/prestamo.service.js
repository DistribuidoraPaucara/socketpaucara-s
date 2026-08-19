import socketRepository from '../repositories/socket.repository.js';

/**
 * Servicio especializado para notificaciones de préstamos
 * Emite eventos de Socket.IO cuando se crean préstamos
 *
 * Patrón idéntico a ProformaService
 */
class PrestamoService {

    /**
     * 🎁 Notificar creación de préstamo a cliente
     * Emite a múltiples canales según usuario_id y roles
     */
    notifyPrestamoClienteCreado(prestamoData) {
        console.log('🎁 PrestamoService.notifyPrestamoClienteCreado()');
        console.log('   Datos:', {
            id: prestamoData.id,
            cliente: prestamoData.cliente?.nombre,
            cantidad: prestamoData.cantidad,
        });

        try {
            const message = {
                id: prestamoData.id,
                type: 'prestamo.cliente.creado',
                cliente_nombre: prestamoData.cliente?.nombre || 'Cliente',
                cliente_id: prestamoData.cliente_id,
                cantidad: prestamoData.cantidad,
                estado: prestamoData.estado,
                items: prestamoData.items || [],
                creador: prestamoData.creador?.name || 'Sistema',
                fecha: prestamoData.fecha_creacion || new Date().toISOString(),
                timestamp: Date.now(),
            };

            // ✅ EMITIR A USUARIOS ESPECÍFICOS
            if (prestamoData.user_ids && prestamoData.user_ids.length > 0) {
                console.log(`   📤 Emitiendo a usuarios específicos (${prestamoData.user_ids.length}):`, prestamoData.user_ids);
                prestamoData.user_ids.forEach(userId => {
                    socketRepository.emitToUser(userId, 'prestamo:cliente:creado', message);
                });
            }

            // ✅ EMITIR A ROLES
            if (prestamoData.roles && prestamoData.roles.length > 0) {
                console.log(`   🔐 Emitiendo a roles (${prestamoData.roles.length}):`, prestamoData.roles);
                prestamoData.roles.forEach(role => {
                    socketRepository.emitToRole(role, 'prestamo:cliente:creado', message);
                });
            }

            console.log('   ✅ Notificación enviada\n');
            return true;

        } catch (error) {
            console.error('❌ Error en notifyPrestamoClienteCreado:', error.message);
            return false;
        }
    }

    /**
     * 🎁 Notificar creación de préstamo a evento
     * Emite a múltiples canales según usuario_id y roles
     */
    notifyPrestamoEventoCreado(prestamoData) {
        console.log('🎁 PrestamoService.notifyPrestamoEventoCreado()');
        console.log('   Datos:', {
            id: prestamoData.id,
            evento: prestamoData.nombre_evento,
            cantidad: prestamoData.cantidad,
        });

        try {
            const message = {
                id: prestamoData.id,
                type: 'prestamo.evento.creado',
                nombre_evento: prestamoData.nombre_evento,
                cantidad: prestamoData.cantidad,
                estado: prestamoData.estado,
                encargado_evento: prestamoData.encargado_evento || '',
                items: prestamoData.items || [],
                creador: prestamoData.creador?.name || 'Sistema',
                fecha: prestamoData.fecha_creacion || new Date().toISOString(),
                timestamp: Date.now(),
            };

            // ✅ EMITIR A USUARIOS ESPECÍFICOS
            if (prestamoData.user_ids && prestamoData.user_ids.length > 0) {
                console.log(`   📤 Emitiendo a usuarios específicos (${prestamoData.user_ids.length}):`, prestamoData.user_ids);
                prestamoData.user_ids.forEach(userId => {
                    socketRepository.emitToUser(userId, 'prestamo:evento:creado', message);
                });
            }

            // ✅ EMITIR A ROLES
            if (prestamoData.roles && prestamoData.roles.length > 0) {
                console.log(`   🔐 Emitiendo a roles (${prestamoData.roles.length}):`, prestamoData.roles);
                prestamoData.roles.forEach(role => {
                    socketRepository.emitToRole(role, 'prestamo:evento:creado', message);
                });
            }

            console.log('   ✅ Notificación enviada\n');
            return true;

        } catch (error) {
            console.error('❌ Error en notifyPrestamoEventoCreado:', error.message);
            return false;
        }
    }
}

export default new PrestamoService();
