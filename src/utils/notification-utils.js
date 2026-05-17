/**
 * Utilidades para el manejo de notificaciones y usuarios en el servidor WebSocket
 */

/**
 * Encuentra el socket de un usuario específico por su ID
 * @param {Map} activeUsers - Mapa de usuarios activos
 * @param {string|number} userId - ID del usuario a buscar
 * @returns {Array|null} Array con [socketId, userData] o null si no se encuentra
 */
export function findUserSocket(activeUsers, userId) {
    return Array.from(activeUsers.entries())
        .find(([socketId, userData]) => userData.userId == userId);
}

/**
 * Envía una notificación a un usuario específico
 * @param {Server} io - Instancia del servidor Socket.IO
 * @param {string|number} userId - ID del usuario destinatario
 * @param {string} event - Nombre del evento
 * @param {Object} data - Datos a enviar
 * @returns {boolean} True si se envió, false si el usuario no está conectado
 */
export function notifyUser(io, userId, event, data) {
    if (!userId) return false;

    io.to(`user_${userId}`).emit(event, data);
    console.log(`📨 Notification sent to user ${userId}: ${event}`);
    return true;
}

/**
 * Envía una notificación a un grupo de usuarios por tipo
 * @param {Server} io - Instancia del servidor Socket.IO
 * @param {string} userType - Tipo de usuario (cobrador, manager, admin, client)
 * @param {string} event - Nombre del evento
 * @param {Object} data - Datos a enviar
 * @returns {boolean} True si se envió
 */
export function notifyUserType(io, userType, event, data) {
    if (!userType) return false;

    // Asegurarse que el userType tiene formato plural
    const room = userType.endsWith('s') ? userType : userType + 's';

    io.to(room).emit(event, data);
    console.log(`📢 Notification sent to all ${userType}s: ${event}`);
    return true;
}

/**
 * Envía una notificación a todos los usuarios conectados
 * @param {Server} io - Instancia del servidor Socket.IO
 * @param {string} event - Nombre del evento
 * @param {Object} data - Datos a enviar
 */
export function notifyAll(io, event, data) {
    io.emit(event, data);
    console.log(`📢 Broadcast notification sent: ${event}`);
}

/**
 * Formatea un mensaje de notificación con timestamp
 * @param {string} message - Mensaje a formatear
 * @param {Object} data - Datos adicionales a incluir
 * @returns {Object} Objeto con el mensaje formateado
 */
export function formatNotification(message, data = {}) {
    // Asegurar estructura estándar: title, message, type, timestamp
    const normalized = typeof data === 'object' && data !== null ? { ...data } : {};

    // Title por defecto si no viene
    if (!normalized.title || typeof normalized.title !== 'string' || normalized.title.trim() === '') {
        // Inferir por type si existe; si no, usar genérico
        const inferredType = (normalized.type || '').toString();
        let defaultTitle = 'Notificación';
        if (inferredType.includes('payment')) defaultTitle = 'Pago';
        else if (inferredType.includes('credit')) defaultTitle = 'Crédito';
        else if (inferredType.includes('cobrador')) defaultTitle = 'Cobrador';
        else if (inferredType.includes('system') || inferredType.includes('general')) defaultTitle = 'Sistema';
        normalized.title = defaultTitle;
    }

    // Type por defecto si no viene
    if (!normalized.type || typeof normalized.type !== 'string' || normalized.type.trim() === '') {
        normalized.type = 'general';
    }

    return {
        ...normalized,
        message,
        timestamp: new Date().toISOString()
    };
}
