import express from 'express';
import healthController from '../controllers/health.controller.js';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir archivo de prueba
router.get('/', (req, res) => {
    res.redirect('/test.html');
});

router.get('/test.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../test.html'));
});

// Ruta de salud del servidor
router.get('/health', healthController.getHealth);

// Endpoint para obtener usuarios activos
router.get('/active-users', healthController.getActiveUsers);

export default router;
