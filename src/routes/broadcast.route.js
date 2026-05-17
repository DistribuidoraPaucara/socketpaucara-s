/**
 * Ruta para recibir eventos de Laravel Broadcasting
 * POST /api/broadcast
 *
 * Laravel envía eventos aquí para que Node.js los retransmita a los clientes
 */

import express from 'express';
import socketRepository from '../repositories/socket.repository.js';

const router = express.Router();

/**
 * Recibir evento de Laravel Broadcasting
 * Validar autenticación y retransmitir a clientes suscritos
 */
router.post('/broadcast', (req, res) => {
  const { channels, event, data } = req.body;

  if (!channels || !event || !data) {
    return res.status(400).json({
      success: false,
      message: 'Campos requeridos: channels, event, data'
    });
  }

  debugLog(`📨 Evento recibido de Laravel:`, {
    channels,
    event,
    dataKeys: Object.keys(data)
  });

  // Normalizar canales a array
  const channelsArray = Array.isArray(channels) ? channels : [channels];

  // Retransmitir a cada canal
  channelsArray.forEach(channelName => {
    debugLog(`📡 Retransmitiendo a canal: ${channelName}`);

    // Emitir a todos en el canal (excepto el remitente si es necesario)
    socketRepository.getIO().to(channelName).emit(event, {
      type: event,
      channel: channelName,
      timestamp: new Date().toISOString(),
      data: data
    });
  });

  return res.status(200).json({
    success: true,
    message: 'Evento retransmitido exitosamente',
    channels: channelsArray,
    event: event,
    timestamp: new Date().toISOString()
  });
});

/**
 * Health check para Laravel
 */
router.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Estadísticas de conexiones
 */
router.get('/stats', (req, res) => {
  const io = socketRepository.getIO();

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    connected_clients: io.engine.clientsCount,
    rooms: io.sockets.adapter.rooms.size,
    environment: process.env.NODE_ENV
  });
});

function debugLog(message, data = {}) {
  if (process.env.NODE_ENV === 'development' || process.env.WEBSOCKET_DEBUG === 'true') {
    console.log(`${message}`, data);
  }
}

export { router as broadcastRoutes };
