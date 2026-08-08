import activeUsersRepository from '../repositories/activeUsers.repository.js';
import socketRepository from '../repositories/socket.repository.js';
import sanctumAuthMiddleware from '../middleware/sanctum-auth.middleware.js';

class AuthService {
    // Obtener IP del cliente
    getClientIP(socket) {
        const forwarded = socket.handshake.headers['x-forwarded-for'];
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }
        const address = socket.handshake.address;
        if (address === '::1' || address === '::ffff:127.0.0.1') {
            return '127.0.0.1';
        }
        return address.replace('::ffff:', '');
    }

    // Autenticar usuario y unirlo a salas correspondientes
    async authenticateUser(socket, userData) {
        try {
            // PASO 1: Validar token Sanctum o datos legacy
            const validationResult = await sanctumAuthMiddleware.verifyToken(socket, userData);

            if (!validationResult.success) {
                return {
                    success: false,
                    message: validationResult.message,
                    code: validationResult.code || 'AUTH_FAILED'
                };
            }

            // PASO 2: Extraer datos validados
            const {
                userId,
                userName,
                userType,
                userEmail,
                roles,
                tokenValidated,
                source
            } = validationResult;

            // Normalizar userId a string
            const normalizedUserId = String(userId);

            // Obtener IP del cliente
            const clientIP = this.getClientIP(socket);

            // PASO 3: Almacenar información del usuario
            activeUsersRepository.addUser(socket.id, {
                userId: normalizedUserId,
                userType,
                userName,
                userEmail,
                roles,
                clientIP,
                tokenValidated,
                source,
                connectedAt: new Date().toISOString()
            });

            // PASO 4: Unir al usuario a salas según su tipo
            this.joinUserToRooms(socket, userType);

            // PASO 5: Unir a sala personal
            socketRepository.joinRoom(socket, `user_${normalizedUserId}`);

            // PASO 6: Log de autenticación
            const authMethod = tokenValidated ? 'Token Sanctum' : 'Legacy';
            console.log(`\n✅ Usuario autenticado (${authMethod}):`);
            console.log(`   Nombre: ${userName}`);
            console.log(`   Email: ${userEmail || 'N/A'}`);
            console.log(`   Tipo: ${userType}`);
            console.log(`   Roles: ${roles?.join(', ') || 'N/A'}`);
            console.log(`   ID Usuario: ${normalizedUserId}`);
            console.log(`   IP: ${clientIP}`);
            console.log(`   Socket ID: ${socket.id}`);
            console.log(`   🏠 Unido a salas:`);
            console.log(`      └─ user_${normalizedUserId} (sala personal)`);
            this.logRoomsForType(userType);

            // PASO 7: Notificar a otros usuarios sobre la conexión
            socketRepository.broadcast(socket, 'user_connected', {
                userId: normalizedUserId,
                userName,
                userType,
                clientIP,
                connectedAt: new Date().toISOString()
            });

            return {
                success: true,
                message: 'Autenticación exitosa',
                userId: normalizedUserId,
                userName,
                userType,
                userEmail,
                roles,
                clientIP,
                tokenValidated,
                authMethod
            };
        } catch (error) {
            console.error('Error en autenticación:', error);
            return {
                success: false,
                message: 'Error en autenticación del usuario',
                code: 'AUTH_ERROR'
            };
        }
    }

    // Unir usuario a salas según su tipo
    // ✅ IMPORTANTE: Normalizar userType a minúsculas para evitar problemas case-sensitive
    joinUserToRooms(socket, userType) {
        const normalizedType = (userType || '').toLowerCase().trim();

        switch (normalizedType) {
            case 'cobrador':
                socketRepository.joinRoom(socket, 'cobradores');
                break;
            case 'client':
            case 'cliente':  // ✅ NUEVO: Soportar "cliente" (español) además de "client" (inglés)
                socketRepository.joinRoom(socket, 'clients');
                break;
            case 'manager':
                socketRepository.joinRoom(socket, 'managers');
                socketRepository.joinRoom(socket, 'admins'); // Los managers también reciben notificaciones de admin
                break;
            case 'admin':
            case 'super admin': // ✅ NUEVO: Soportar "Super Admin" como equivalente de admin
                socketRepository.joinRoom(socket, 'admins');
                socketRepository.joinRoom(socket, 'managers'); // Los admins también reciben notificaciones de managers
                socketRepository.joinRoom(socket, 'cobradores'); // Los admins también reciben notificaciones de cobradores
                break;
            case 'cajero':
                socketRepository.joinRoom(socket, 'cajeros');
                break;
            case 'preventista':
                socketRepository.joinRoom(socket, 'preventistas');
                break;
            case 'logistica':
            case 'logístico':  // ✅ NUEVO: Soportar variante con tilde
                socketRepository.joinRoom(socket, 'logisticas');
                break;
            case 'chofer':
            case 'driver':     // ✅ NUEVO: Soportar "driver" (inglés) y "chofer" (español)
                socketRepository.joinRoom(socket, 'choferes');
                break;
            default:
                // Fallback: Si no coincide ningún tipo conocido, usar el tipo como nombre de sala
                if (normalizedType) {
                    socketRepository.joinRoom(socket, normalizedType + 's');
                    console.warn(`⚠️  Tipo de usuario no reconocido: ${userType} → Unido a sala: ${normalizedType}s`);
                }
        }
    }

    // Registrar en logs las salas según el tipo de usuario
    // ✅ IMPORTANTE: Normalizar userType a minúsculas para evitar problemas case-sensitive
    logRoomsForType(userType) {
        const normalizedType = (userType || '').toLowerCase().trim();

        switch (normalizedType) {
            case 'cobrador':
                console.log(`      └─ cobradores (sala de rol)`);
                break;
            case 'client':
            case 'cliente':
                console.log(`      └─ clients (sala de rol)`);
                break;
            case 'manager':
                console.log(`      ├─ managers (sala de rol)`);
                console.log(`      └─ admins (para recibir notificaciones de admin)`);
                break;
            case 'admin':
            case 'super admin':
                console.log(`      ├─ admins (sala de rol)`);
                console.log(`      ├─ managers (para recibir notificaciones de managers)`);
                console.log(`      └─ cobradores (para recibir notificaciones de cobradores)`);
                break;
            case 'preventista':
                console.log(`      └─ preventistas (sala de rol)`);
                break;
            case 'cajero':
                console.log(`      └─ cajeros (sala de rol)`);
                break;
            case 'logistica':
            case 'logístico':
                console.log(`      └─ logisticas (sala de rol)`);
                break;
            case 'chofer':
            case 'driver':
                console.log(`      └─ choferes (sala de rol)`);
                break;
            default:
                console.log(`      └─ ${normalizedType}s (sala de rol) [tipo personalizado]`);
        }
    }

    // Manejar desconexión de usuario
    handleDisconnect(socketId) {
        const user = activeUsersRepository.removeUser(socketId);

        if (user) {
            console.log(`\n❌ Usuario desconectado:`);
            console.log(`   Nombre: ${user.userName}`);
            console.log(`   Tipo: ${user.userType}`);
            console.log(`   IP: ${user.clientIP || 'N/A'}`);
            console.log(`   Socket ID: ${socketId}`);

            return {
                userId: user.userId,
                userName: user.userName,
                userType: user.userType,
                clientIP: user.clientIP
            };
        } else {
            console.log(`\n❌ Cliente desconectado: ${socketId}`);
            return null;
        }
    }
}

export default new AuthService();
