import express from 'express';
import prestamoApiController from '../controllers/prestamo-api.controller.js';
import { ensureBackend } from '../middleware/auth.middleware.js';

const router = express.Router();

// ========================================
// RUTAS DE NOTIFICACIONES DE PRÉSTAMOS
// ========================================

/**
 * 🎁 Endpoint para notificar creación de préstamo a cliente
 * POST /notify/prestamo-cliente-created
 * Headers: { 'x-ws-secret': '...' }
 * Body: {
 *   id: int,
 *   cliente_id: int,
 *   cliente: { id, nombre, apellido },
 *   cantidad: int,
 *   estado: string,
 *   items: [{ prestable_id, prestable_nombre, cantidad_prestada }],
 *   creador: { id, name },
 *   fecha_creacion: ISO8601,
 *   user_ids: [int],           // usuarios específicos a notificar
 *   roles: ['admin', 'cajero'] // roles a notificar
 * }
 */
router.post('/notify/prestamo-cliente-created', ensureBackend, (req, res) =>
    prestamoApiController.notifyClienteCreated(req, res)
);

/**
 * 🎁 Endpoint para notificar creación de préstamo a evento
 * POST /notify/prestamo-evento-created
 * Headers: { 'x-ws-secret': '...' }
 * Body: {
 *   id: int,
 *   nombre_evento: string,
 *   cantidad: int,
 *   estado: string,
 *   encargado_evento: string,
 *   items: [{ prestable_id, prestable_nombre, cantidad_prestada }],
 *   creador: { id, name },
 *   fecha_creacion: ISO8601,
 *   user_ids: [int],           // usuarios específicos a notificar
 *   roles: ['admin', 'cajero'] // roles a notificar
 * }
 */
router.post('/notify/prestamo-evento-created', ensureBackend, (req, res) =>
    prestamoApiController.notifyEventoCreated(req, res)
);

export default router;
