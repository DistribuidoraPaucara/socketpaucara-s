import express from 'express';
import proformaApiController from '../controllers/proforma-api.controller.js';
import { ensureBackend } from '../middleware/auth.middleware.js';

const router = express.Router();

// ========================================
// RUTAS DE NOTIFICACIONES DE PROFORMAS
// ========================================
// ⚠️ COMENTADAS - Las notificaciones de proformas se manejan en notification.routes.js
// para evitar duplicación de eventos

// router.post('/notify/proforma-created', ensureBackend, (req, res) => proformaApiController.notifyCreated(req, res));
// router.post('/notify/proforma-approved', ensureBackend, (req, res) => proformaApiController.notifyApproved(req, res));
// router.post('/notify/proforma-rejected', ensureBackend, (req, res) => proformaApiController.notifyRejected(req, res));
// router.post('/notify/proforma-converted', ensureBackend, (req, res) => proformaApiController.notifyConverted(req, res));
// router.post('/notify/proforma-coordination', ensureBackend, (req, res) => proformaApiController.notifyCoordination(req, res));

// ========================================
// RUTAS DE NOTIFICACIONES DE STOCK
// ========================================

router.post('/notify/stock-updated', (req, res) => proformaApiController.notifyStockUpdated(req, res));

export default router;
