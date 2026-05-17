import activeUsersRepository from '../repositories/activeUsers.repository.js';

class UsersController {
    // Obtener todos los usuarios conectados
    getConnectedUsers(req, res) {
        try {
            const users = activeUsersRepository.getAllUsers();
            const userCount = activeUsersRepository.count();

            // Agrupar por tipo
            const usersByType = {
                admins: users.filter(u => u.userType === 'admin'),
                managers: users.filter(u => u.userType === 'manager'),
                cobradores: users.filter(u => u.userType === 'cobrador'),
                clients: users.filter(u => u.userType === 'client'),
            };

            res.json({
                success: true,
                totalUsers: userCount,
                users: users,
                usersByType: {
                    admins: usersByType.admins.length,
                    managers: usersByType.managers.length,
                    cobradores: usersByType.cobradores.length,
                    clients: usersByType.clients.length,
                },
                usersList: usersByType
            });
        } catch (error) {
            console.error('Error obteniendo usuarios conectados:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener usuarios conectados',
                error: error.message
            });
        }
    }

    // Verificar si un usuario específico está conectado
    checkUserConnection(req, res) {
        try {
            const { userId } = req.params;
            const user = activeUsersRepository.findUserByUserId(userId);

            if (user) {
                res.json({
                    success: true,
                    connected: true,
                    user: user
                });
            } else {
                res.json({
                    success: true,
                    connected: false,
                    user: null
                });
            }
        } catch (error) {
            console.error('Error verificando conexión de usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error al verificar conexión',
                error: error.message
            });
        }
    }
}

export default new UsersController();
