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

            // PASO 4: Unir al usuario a salas según su tipo Y TODOS SUS ROLES
            this.joinUserToRooms(socket, userType, roles);

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
            this.logRoomsForType(userType, roles);

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

    // Unir usuario a salas según su tipo Y todos sus roles
    // ✅ IMPORTANTE: Normalizar a minúsculas para evitar problemas case-sensitive
    joinUserToRooms(socket, userType, roles = []) {
        const normalizedType = (userType || '').toLowerCase().trim();
        const rolesSet = new Set(); // Para evitar duplicados

        // Primero, procesar el userType principal
        this._joinRoomsByType(normalizedType, rolesSet);

        // ✅ NUEVO: Procesar TODOS los roles del usuario
        if (Array.isArray(roles) && roles.length > 0) {
            roles.forEach(role => {
                const normalizedRole = (role || '').toLowerCase().trim();
                this._joinRoomsByType(normalizedRole, rolesSet);
            });
        }

        // Unir a todas las salas recolectadas
        rolesSet.forEach(room => {
            socketRepository.joinRoom(socket, room);
        });
    }

    // ✅ Método auxiliar para mapear tipos/roles a salas
    _joinRoomsByType(normalizedType, rolesSet) {
        switch (normalizedType) {
            case 'cobrador':
                rolesSet.add('cobradores');
                break;
            case 'client':
            case 'cliente':
                rolesSet.add('clients');
                break;
            case 'manager':
                rolesSet.add('managers');
                rolesSet.add('admins');
                break;
            case 'admin':
            case 'super admin':
                rolesSet.add('admins');
                rolesSet.add('managers');
                rolesSet.add('cobradores');
                break;
            case 'cajero':
                rolesSet.add('cajeros');
                break;
            case 'preventista':
                rolesSet.add('preventistas');
                break;
            case 'logistica':
            case 'logístico':
                rolesSet.add('logisticas');
                break;
            case 'chofer':
            case 'driver':
                rolesSet.add('choferes');
                break;
            case 'vendedor':
            case 'vendedores':
                rolesSet.add('vendedores');
                break;
            case 'compras':
                rolesSet.add('compras');
                break;
            case 'gestor de usuarios':
            case 'gestor':
                rolesSet.add('gestores');
                break;
            default:
                if (normalizedType && normalizedType.length > 0) {
                    rolesSet.add(normalizedType + 's');
                }
        }
    }

    // Registrar en logs las salas según el tipo de usuario Y todos sus roles
    // ✅ IMPORTANTE: Normalizar userType a minúsculas para evitar problemas case-sensitive
    logRoomsForType(userType, roles = []) {
        const rolesSet = new Set();
        const normalizedType = (userType || '').toLowerCase().trim();

        // Procesar userType principal
        this._collectRoomsForType(normalizedType, rolesSet);

        // ✅ NUEVO: Procesar TODOS los roles
        if (Array.isArray(roles) && roles.length > 0) {
            roles.forEach(role => {
                const normalizedRole = (role || '').toLowerCase().trim();
                this._collectRoomsForType(normalizedRole, rolesSet);
            });
        }

        // Mostrar todas las salas
        if (rolesSet.size > 0) {
            const roomsArray = Array.from(rolesSet).sort();
            roomsArray.forEach((room, index) => {
                const isLast = index === roomsArray.length - 1;
                const prefix = isLast ? '└─' : '├─';
                console.log(`      ${prefix} ${room} (sala de rol)`);
            });
        }
    }

    // ✅ Método auxiliar para recolectar salas
    _collectRoomsForType(normalizedType, rolesSet) {
        switch (normalizedType) {
            case 'cobrador':
                rolesSet.add('cobradores');
                break;
            case 'client':
            case 'cliente':
                rolesSet.add('clients');
                break;
            case 'manager':
                rolesSet.add('managers');
                rolesSet.add('admins');
                break;
            case 'admin':
            case 'super admin':
                rolesSet.add('admins');
                rolesSet.add('managers');
                rolesSet.add('cobradores');
                break;
            case 'cajero':
                rolesSet.add('cajeros');
                break;
            case 'preventista':
                rolesSet.add('preventistas');
                break;
            case 'logistica':
            case 'logístico':
                rolesSet.add('logisticas');
                break;
            case 'chofer':
            case 'driver':
                rolesSet.add('choferes');
                break;
            case 'vendedor':
            case 'vendedores':
                rolesSet.add('vendedores');
                break;
            case 'compras':
                rolesSet.add('compras');
                break;
            case 'gestor de usuarios':
            case 'gestor':
                rolesSet.add('gestores');
                break;
            default:
                if (normalizedType && normalizedType.length > 0) {
                    rolesSet.add(normalizedType + 's');
                }
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
