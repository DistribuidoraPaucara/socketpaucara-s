import activeUsersRepository from '../repositories/activeUsers.repository.js';

class UserService {
    // Obtener todos los usuarios activos
    getActiveUsers() {
        const users = activeUsersRepository.getAllUsers();
        return {
            total: users.length,
            users: users.map(user => ({
                userId: user.userId,
                userName: user.userName,
                userType: user.userType,
                connectedAt: user.connectedAt
            }))
        };
    }

    // Obtener usuarios por tipo
    getUsersByType(userType) {
        return activeUsersRepository.getUsersByType(userType);
    }

    // Verificar si un usuario está conectado
    isUserConnected(userId) {
        return activeUsersRepository.isUserConnected(userId);
    }

    // Contar usuarios activos
    countActiveUsers() {
        return activeUsersRepository.count();
    }

    // Obtener uptime del proceso
    getServerUptime() {
        return process.uptime();
    }

    // Obtener información de salud del servidor
    getHealthInfo() {
        return {
            status: 'OK',
            message: 'WebSocket server is running',
            connections: this.countActiveUsers(),
            uptime: this.getServerUptime(),
            timestamp: new Date().toISOString()
        };
    }
}

export default new UserService();
