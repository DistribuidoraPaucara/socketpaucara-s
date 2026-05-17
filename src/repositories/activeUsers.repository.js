// Repositorio para gestionar usuarios activos
class ActiveUsersRepository {
    constructor() {
        this.activeUsers = new Map();
    }

    // Agregar usuario
    addUser(socketId, userData) {
        this.activeUsers.set(socketId, {
            ...userData,
            socketId,
            connectedAt: new Date()
        });
    }

    // Obtener usuario por socketId
    getUserBySocketId(socketId) {
        return this.activeUsers.get(socketId);
    }

    // Buscar usuario por userId
    findUserByUserId(userId) {
        // Normalizar userId a string para comparación consistente
        const normalizedUserId = String(userId);

        for (const [socketId, user] of this.activeUsers.entries()) {
            if (user.userId === normalizedUserId) {
                return { socketId, ...user };
            }
        }
        return null;
    }

    // Obtener todos los usuarios
    getAllUsers() {
        return Array.from(this.activeUsers.values());
    }

    // Obtener usuarios por tipo
    getUsersByType(userType) {
        return Array.from(this.activeUsers.values()).filter(
            user => user.userType === userType
        );
    }

    // Remover usuario
    removeUser(socketId) {
        const user = this.activeUsers.get(socketId);
        this.activeUsers.delete(socketId);
        return user;
    }

    // Contar usuarios activos
    count() {
        return this.activeUsers.size;
    }

    // Verificar si un usuario está conectado
    isUserConnected(userId) {
        // La normalización ya se hace en findUserByUserId
        return this.findUserByUserId(userId) !== null;
    }
}

// Singleton
export default new ActiveUsersRepository();
