import userService from '../services/user.service.js';

class HealthController {
    // Endpoint de salud del servidor
    async getHealth(req, res) {
        try {
            const healthInfo = userService.getHealthInfo();
            res.json(healthInfo);
        } catch (error) {
            res.status(500).json({
                status: 'ERROR',
                message: error.message
            });
        }
    }

    // Endpoint de usuarios activos
    async getActiveUsers(req, res) {
        try {
            const activeUsers = userService.getActiveUsers();
            res.json(activeUsers);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

export default new HealthController();
