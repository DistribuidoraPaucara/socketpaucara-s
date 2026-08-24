// Repositorio para operaciones de Socket.IO
class SocketRepository {
    constructor() {
        this.io = null;
    }

    // Inicializar io
    setIO(ioInstance) {
        this.io = ioInstance;
    }

    // Emitir a un usuario específico
    emitToUser(userId, event, data) {
        if (!this.io) {
            console.error('Socket.IO not initialized');
            return false;
        }
        // Normalizar userId a string para consistencia
        const normalizedUserId = String(userId);
        const room = `user_${normalizedUserId}`;

        // 🔍 LOG: Verificar cuántos clientes están en esa sala
        const sockets = this.io.sockets.adapter.rooms.get(room);
        const clientsInRoom = sockets ? sockets.size : 0;

        console.log(`\n📤 EMITIR A USUARIO:`);
        console.log(`   Sala: ${room}`);
        console.log(`   Clientes conectados en sala: ${clientsInRoom}`);
        console.log(`   Evento: ${event}`);
        console.log(`   Datos: ${JSON.stringify(data, null, 2)}`);
        if (clientsInRoom === 0) {
            console.log(`   ⚠️  ERROR: Usuario ${normalizedUserId} NO está conectado en la sala ${room}`);
            console.log(`   ⚠️  La emisión se perdará porque no hay clientes esperando`);
        } else {
            console.log(`   ✅ Usuario ${normalizedUserId} está conectado, evento será entregado`);
        }
        console.log(`\n`);

        this.io.to(room).emit(event, data);
        return clientsInRoom > 0; // Retornar true si se emitió a alguien
    }

    // Emitir a una sala/grupo
    emitToRoom(room, event, data) {
        if (!this.io) {
            console.error('Socket.IO not initialized');
            return false;
        }
        this.io.to(room).emit(event, data);
        return true;
    }

    // Emitir a todos
    emitToAll(event, data) {
        if (!this.io) {
            console.error('Socket.IO not initialized');
            return false;
        }
        this.io.emit(event, data);
        return true;
    }

    // Unir socket a sala
    joinRoom(socket, room) {
        socket.join(room);
    }

    // Salir de sala
    leaveRoom(socket, room) {
        socket.leave(room);
    }

    // Broadcast desde un socket (excluye el emisor)
    broadcast(socket, event, data) {
        socket.broadcast.emit(event, data);
    }

    // Emitir log del servidor (para debugging)
    emitServerLog(message) {
        if (this.io) {
            this.io.emit('server_log', message);
        }
    }
}

// Singleton
export default new SocketRepository();
