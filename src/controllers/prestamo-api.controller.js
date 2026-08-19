import prestamoService from '../services/prestamo.service.js';

/**
 * Controlador para endpoints REST que reciben notificaciones desde Laravel
 */
class PrestamoApiController {

    // ========================================
    // ENDPOINTS DE PRÉSTAMOS A CLIENTE
    // ========================================

    /**
     * POST /notify/prestamo-cliente-created
     * Notificar creación de nuevo préstamo a cliente
     */
    notifyClienteCreated(req, res) {
        try {
            const prestamoData = req.body;

            console.log('\n');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('📬 NUEVA NOTIFICACIÓN RECIBIDA DESDE LARAVEL');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('📦 Tipo: PRÉSTAMO A CLIENTE');
            console.log('┌─ RESUMEN DE DATOS:');
            console.log(`│  📦 ID Préstamo: ${prestamoData.id}`);
            console.log(`│  👤 Cliente ID: ${prestamoData.cliente_id}`);
            console.log(`│  👤 Cliente: ${prestamoData.cliente?.nombre}`);
            console.log(`│  📊 Cantidad: ${prestamoData.cantidad}`);
            console.log(`│  🛒 Items: ${prestamoData.items?.length || 0}`);
            console.log(`│  👨‍💼 Creador: ${prestamoData.creador?.name}`);
            console.log('└─────────────────────────────────────────────────────────');
            console.log('═══════════════════════════════════════════════════════════\n');

            // Validación básica
            if (!prestamoData.id || !prestamoData.cliente_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos de préstamo inválidos',
                    errors: { id: 'Campo requerido', cliente_id: 'Campo requerido' }
                });
            }

            // Enviar notificación
            const result = prestamoService.notifyPrestamoClienteCreated(prestamoData);

            return res.json({
                success: result,
                message: 'Notificación de préstamo a cliente enviada',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error en notifyClienteCreated:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al procesar notificación',
                error: error.message
            });
        }
    }

    // ========================================
    // ENDPOINTS DE PRÉSTAMOS A EVENTO
    // ========================================

    /**
     * POST /notify/prestamo-evento-created
     * Notificar creación de nuevo préstamo a evento
     */
    notifyEventoCreated(req, res) {
        try {
            const prestamoData = req.body;

            console.log('\n');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('📬 NUEVA NOTIFICACIÓN RECIBIDA DESDE LARAVEL');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('📦 Tipo: PRÉSTAMO A EVENTO');
            console.log('┌─ RESUMEN DE DATOS:');
            console.log(`│  📦 ID Préstamo: ${prestamoData.id}`);
            console.log(`│  🎉 Evento: ${prestamoData.nombre_evento}`);
            console.log(`│  📊 Cantidad: ${prestamoData.cantidad}`);
            console.log(`│  🛒 Items: ${prestamoData.items?.length || 0}`);
            console.log(`│  👨‍💼 Creador: ${prestamoData.creador?.name}`);
            console.log('└─────────────────────────────────────────────────────────');
            console.log('═══════════════════════════════════════════════════════════\n');

            // Validación básica
            if (!prestamoData.id || !prestamoData.nombre_evento) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos de préstamo inválidos',
                    errors: { id: 'Campo requerido', nombre_evento: 'Campo requerido' }
                });
            }

            // Enviar notificación
            const result = prestamoService.notifyPrestamoEventoCreated(prestamoData);

            return res.json({
                success: result,
                message: 'Notificación de préstamo a evento enviada',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error en notifyEventoCreated:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al procesar notificación',
                error: error.message
            });
        }
    }

    // ========================================
    // ENDPOINTS DE PRÉSTAMOS A PROVEEDOR
    // ========================================

    /**
     * POST /notify/prestamo-proveedor-created
     * Notificar creación de nuevo préstamo a proveedor
     */
    notifyProveedorCreated(req, res) {
        try {
            const prestamoData = req.body;

            console.log('\n');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('📬 NUEVA NOTIFICACIÓN RECIBIDA DESDE LARAVEL');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('📦 Tipo: PRÉSTAMO A PROVEEDOR');
            console.log('┌─ RESUMEN DE DATOS:');
            console.log(`│  📦 ID Préstamo: ${prestamoData.id}`);
            console.log(`│  🏭 Proveedor ID: ${prestamoData.proveedor_id}`);
            console.log(`│  🏭 Proveedor: ${prestamoData.proveedor_nombre}`);
            console.log(`│  📊 Cantidad: ${prestamoData.cantidad}`);
            console.log(`│  🛒 Items: ${prestamoData.items?.length || 0}`);
            console.log(`│  👨‍💼 Creador: ${prestamoData.creador?.name}`);
            console.log('└─────────────────────────────────────────────────────────');
            console.log('═══════════════════════════════════════════════════════════\n');

            // Validación básica
            if (!prestamoData.id || !prestamoData.proveedor_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos de préstamo inválidos',
                    errors: { id: 'Campo requerido', proveedor_id: 'Campo requerido' }
                });
            }

            // Enviar notificación
            const result = prestamoService.notifyPrestamoProveedorCreado(prestamoData);

            return res.json({
                success: result,
                message: 'Notificación de préstamo a proveedor enviada',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error en notifyProveedorCreated:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al procesar notificación',
                error: error.message
            });
        }
    }
}

export default new PrestamoApiController();
