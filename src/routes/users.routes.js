import express from 'express';
import usersController from '../controllers/users.controller.js';

const router = express.Router();

// GET /api/users/connected - Obtener todos los usuarios conectados
router.get('/connected', (req, res) => usersController.getConnectedUsers(req, res));

// GET /api/users/:userId/status - Verificar si un usuario está conectado
router.get('/:userId/status', (req, res) => usersController.checkUserConnection(req, res));

export default router;
