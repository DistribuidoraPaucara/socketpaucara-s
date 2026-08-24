import activeUsersRepository from '../repositories/activeUsers.repository.js';
import socketRepository from '../repositories/socket.repository.js';

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

    // ✅ NUEVO: Obtener información detallada de salas y conexiones
    getDetailedConnectionStatus() {
        const io = socketRepository.io;
        if (!io) {
            return {
                status: 'error',
                message: 'Socket.IO not initialized'
            };
        }

        const users = activeUsersRepository.getAllUsers();
        const rooms = io.sockets.adapter.rooms;

        // Mapear usuarios a sus salas
        const userRooms = {};
        users.forEach(user => {
            const userRoom = `user_${user.userId}`;
            const socketsInRoom = rooms.get(userRoom);
            userRooms[user.userId] = {
                userId: user.userId,
                userName: user.userName,
                userType: user.userType,
                connectedAt: user.connectedAt,
                privateRoom: userRoom,
                connectedToPrivateRoom: socketsInRoom ? socketsInRoom.size : 0,
                allRooms: [] // Se llena abajo
            };
        });

        // Obtener todas las salas y sus usuarios
        const detailedRooms = {};
        rooms.forEach((sockets, roomName) => {
            detailedRooms[roomName] = {
                name: roomName,
                clientsCount: sockets.size,
                clients: Array.from(sockets).map(socketId => {
                    const socket = io.sockets.sockets.get(socketId);
                    const userData = activeUsersRepository.getUserBySocketId(socketId);
                    return {
                        socketId: socketId,
                        userId: userData?.userId || 'unknown',
                        userName: userData?.userName || 'unknown'
                    };
                })
            };
        });

        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            totalUsers: users.length,
            userRooms,
            allRooms: detailedRooms,
            summary: {
                totalRooms: rooms.size,
                totalSockets: io.sockets.sockets.size
            }
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
