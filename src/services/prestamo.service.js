import io from '../config/io.js';

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
    notifyPrestamoClienteCreated(prestamoData) {
        console.log('🎁 PrestamoService.notifyPrestamoClienteCreated()');
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
                    const room = `user-${userId}`;
                    io.to(room).emit('prestamo:cliente:creado', message);
                });
            }

            // ✅ EMITIR A ROLES
            if (prestamoData.roles && prestamoData.roles.length > 0) {
                console.log(`   🔐 Emitiendo a roles (${prestamoData.roles.length}):`, prestamoData.roles);
                prestamoData.roles.forEach(role => {
                    const room = `role-${role}`;
                    io.to(room).emit('prestamo:cliente:creado', message);
                });
            }

            console.log('   ✅ Notificación enviada\n');
            return true;

        } catch (error) {
            console.error('❌ Error en notifyPrestamoClienteCreated:', error.message);
            return false;
        }
    }

    /**
     * 🎁 Notificar creación de préstamo a evento
     * Emite a múltiples canales según usuario_id y roles
     */
    notifyPrestamoEventoCreated(prestamoData) {
        console.log('🎁 PrestamoService.notifyPrestamoEventoCreated()');
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
                    const room = `user-${userId}`;
                    io.to(room).emit('prestamo:evento:creado', message);
                });
            }

            // ✅ EMITIR A ROLES
            if (prestamoData.roles && prestamoData.roles.length > 0) {
                console.log(`   🔐 Emitiendo a roles (${prestamoData.roles.length}):`, prestamoData.roles);
                prestamoData.roles.forEach(role => {
                    const room = `role-${role}`;
                    io.to(room).emit('prestamo:evento:creado', message);
                });
            }

            console.log('   ✅ Notificación enviada\n');
            return true;

        } catch (error) {
            console.error('❌ Error en notifyPrestamoEventoCreated:', error.message);
            return false;
        }
    }
}

export default new PrestamoService();
