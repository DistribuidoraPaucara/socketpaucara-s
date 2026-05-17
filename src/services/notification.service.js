import socketRepository from '../repositories/socket.repository.js';
import activeUsersRepository from '../repositories/activeUsers.repository.js';

class NotificationService {
    // Formatear notificación con estructura estándar
    formatNotification(message, data = {}) {
        return {
            message,
            timestamp: new Date().toISOString(),
            ...data
        };
    }

    // Buscar socket de un usuario
    findUserSocket(userId) {
        return activeUsersRepository.findUserByUserId(userId);
    }

    // Notificar a un usuario específico
    notifyUser(userId, event, data) {
        console.log(`🔍 Buscando usuario para notificar: ${userId} (tipo: ${typeof userId})`);

        const userSocket = this.findUserSocket(userId);
        if (userSocket) {
            socketRepository.emitToUser(userId, event, data);
            console.log(`📨 Notificación enviada a usuario ${userId}: ${event}`);
            console.log(`   → Sala: user_${String(userId)}`);
            console.log(`   → Socket ID: ${userSocket.socketId}`);
            return true;
        }

        // Si no se encuentra, mostrar usuarios activos para debugging
        const activeUsers = activeUsersRepository.getAllUsers();
        console.log(`⚠️ Usuario ${userId} no encontrado o desconectado`);
        console.log(`   → Usuarios activos: ${activeUsers.length}`);
        if (activeUsers.length > 0) {
            console.log(`   → IDs activos:`, activeUsers.map(u => `${u.userId} (${typeof u.userId})`));
        }
        return false;
    }

    // Notificar a todos los usuarios de un tipo
    notifyUserType(userType, event, data) {
        const room = `${userType}s`;
        socketRepository.emitToRoom(room, event, data);
        console.log(`📨 Notificación enviada a grupo ${room}: ${event}`);
        return true;
    }

    // Notificar a todos los usuarios
    notifyAll(event, data) {
        socketRepository.emitToAll(event, data);
        console.log(`📨 Notificación broadcast: ${event}`);
        return true;
    }

    // Emitir log del servidor
    emitServerLog(message) {
        socketRepository.emitServerLog(message);
    }
}

export default new NotificationService();
