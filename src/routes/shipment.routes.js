import express from 'express';
import trackingController from '../controllers/tracking.controller.js';

const router = express.Router();

/**
 * RUTAS DE SEGUIMIENTO Y LOGÍSTICA
 * Estas rutas manejan las operaciones de tracking GPS en tiempo real
 * y gestión de entregas desde la app de choferes
 */

// ===== TRACKING EN TIEMPO REAL =====

/**
 * POST /api/tracking/start
 * Iniciar seguimiento de un envío
 *
 * Body:
 * {
 *   "shipment_id": 1,
 *   "numero_envio": "ENV-001",
 *   "chofer_id": 5,
 *   "cliente_id": 10,
 *   "ruta_data": { ... }
 * }
 */
router.post('/tracking/start', trackingController.startTracking);

/**
 * POST /api/tracking/update-location
 * Actualizar ubicación del chofer en ruta
 * Se debe llamar cada 10-30 segundos durante el viaje
 *
 * Body:
 * {
 *   "shipment_id": 1,
 *   "numero_envio": "ENV-001",
 *   "chofer_id": 5,
 *   "cliente_id": 10,
 *   "latitude": -16.5023,
 *   "longitude": -68.1193,
 *   "precisión": 5,
 *   "velocidad": 60,
 *   "dirección": 45,
 *   "altitude": 3650
 * }
 */
router.post('/tracking/update-location', trackingController.updateLocation);

/**
 * GET /api/tracking/:shipment_id/last-location
 * Obtener la última ubicación conocida de un envío
 *
 * Params: shipment_id
 * Response: { latitude, longitude, timestamp, velocidad }
 */
router.get('/tracking/:shipment_id/last-location', trackingController.getLastLocation);

/**
 * GET /api/tracking/:shipment_id/route
 * Obtener la ruta completa del envío (todos los puntos de seguimiento)
 *
 * Params: shipment_id
 * Response: { route_points: [...], total_distance, total_duration }
 */
router.get('/tracking/:shipment_id/route', trackingController.getShipmentRoute);

/**
 * GET /api/tracking/:shipment_id/stats
 * Obtener estadísticas del seguimiento
 *
 * Params: shipment_id
 * Response: { total_distance, avg_speed, max_speed, route_efficiency }
 */
router.get('/tracking/:shipment_id/stats', trackingController.getTrackingStats);

/**
 * POST /api/tracking/end
 * Finalizar el seguimiento de un envío
 *
 * Body:
 * {
 *   "shipment_id": 1,
 *   "numero_envio": "ENV-001",
 *   "cliente_id": 10,
 *   "chofer_id": 5,
 *   "distancia_total": 25.5,
 *   "tiempo_total": 1800
 * }
 */
router.post('/tracking/end', trackingController.endTracking);

// ===== EVENTOS DE RUTA =====

/**
 * POST /api/tracking/route-event
 * Reportar un evento importante durante la ruta
 * (parada, giro, desvío, detención larga, etc.)
 *
 * Body:
 * {
 *   "shipment_id": 1,
 *   "numero_envio": "ENV-001",
 *   "chofer_id": 5,
 *   "cliente_id": 10,
 *   "tipo_evento": "PARADA|GIRO|DESVIO|DETENCCION_LARGA|ACCIDENTE|OTRO",
 *   "descripcion": "Parada en estación de combustible",
 *   "latitude": -16.5023,
 *   "longitude": -68.1193,
 *   "foto_url": "https://...",
 *   "audio_url": "https://..."
 * }
 */
router.post('/tracking/route-event', trackingController.reportRouteEvent);

// ===== NOTIFICACIONES DE LLEGADA =====

/**
 * POST /api/tracking/arriving-soon
 * Notificar que el chofer está llegando (a pocos km)
 *
 * Body:
 * {
 *   "shipment_id": 1,
 *   "numero_envio": "ENV-001",
 *   "cliente_id": 10,
 *   "chofer_id": 5,
 *   "chofer_nombre": "Juan Pérez",
 *   "chofer_telefono": "+591-...",
 *   "eta_minutos": 5,
 *   "latitude": -16.5023,
 *   "longitude": -68.1193
 * }
 */
router.post('/tracking/arriving-soon', trackingController.notifyArriving);

// ===== CONFIRMACIÓN DE ENTREGAS =====

/**
 * POST /api/tracking/delivery/confirm
 * Confirmar que una entrega fue completada exitosamente
 *
 * Body:
 * {
 *   "shipment_id": 1,
 *   "numero_envio": "ENV-001",
 *   "venta_numero": "V-001",
 *   "cliente_id": 10,
 *   "cliente_nombre": "Empresa XYZ",
 *   "chofer_id": 5,
 *   "chofer_nombre": "Juan Pérez",
 *   "receptor_nombre": "Carlos López",
 *   "receptor_documento": "12345678",
 *   "foto_url": "https://...",
 *   "firma_base64": "data:image/png;base64,...",
 *   "observaciones": "Entregado sin problemas"
 * }
 */
router.post('/tracking/delivery/confirm', trackingController.confirmDelivery);

/**
 * POST /api/tracking/delivery/failed
 * Reportar un fallo en la entrega (cliente no está, rechaza, etc.)
 *
 * Body:
 * {
 *   "shipment_id": 1,
 *   "numero_envio": "ENV-001",
 *   "cliente_id": 10,
 *   "cliente_nombre": "Empresa XYZ",
 *   "chofer_id": 5,
 *   "chofer_nombre": "Juan Pérez",
 *   "motivo_rechazo": "CLIENTE_NO_DISPONIBLE|RECHAZA_PEDIDO|DOMICILIO_INCORRECTO|OTRO",
 *   "foto_url": "https://...",
 *   "observaciones": "El cliente no estaba en el domicilio",
 *   "reintentar_fecha": "2024-10-25"
 * }
 */
router.post('/tracking/delivery/failed', trackingController.reportDeliveryFailure);

export default router;
