import DashboardService from '../services/dashboard.service.js';

/**
 * Dashboard API Controller
 *
 * Maneja las peticiones HTTP POST desde Laravel y las traduce en eventos WebSocket
 */
class DashboardApiController {
    /**
     * Notificar actualizaciones de estadísticas de entregas
     *
     * Endpoint: POST /api/notify/entregas-stats
     * Llamado desde Laravel cuando hay cambios en entregas
     *
     * @param {Express.Request} req
     * @param {Express.Response} res
     */
    static async notifyEntregasStats(req, res) {
        try {
            const { stats, timestamp } = req.body;

            // Validar que los datos requeridos estén presentes
            if (!stats || typeof stats !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid stats data: stats must be an object'
                });
            }

            await DashboardService.notifyEntregasStatsUpdated(
                stats,
                timestamp || new Date().toISOString()
            );

            res.status(200).json({
                success: true,
                message: 'Entregas stats broadcasted successfully'
            });
        } catch (error) {
            console.error('❌ Error broadcasting entregas stats:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Notificar actualizaciones de métricas del dashboard
     *
     * @param {Express.Request} req
     * @param {Express.Response} res
     */
    static async notifyMetricsUpdated(req, res) {
        try {
            const { metricas, periodo, timestamp } = req.body;

            // Validar que los datos requeridos estén presentes
            if (!metricas || typeof metricas !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid metrics data: metricas must be an object'
                });
            }

            await DashboardService.notifyMetricsUpdated({
                metricas,
                periodo: periodo || 'mes_actual',
                timestamp: timestamp || new Date().toISOString()
            });

            res.status(200).json({
                success: true,
                message: 'Dashboard metrics broadcasted successfully'
            });
        } catch (error) {
            console.error('❌ Error broadcasting dashboard metrics:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Notificar alertas de stock bajo/crítico
     *
     * @param {Express.Request} req
     * @param {Express.Response} res
     */
    static async notifyStockAlert(req, res) {
        try {
            const alertData = req.body;

            // Validar que los datos requeridos estén presentes
            if (!alertData || typeof alertData !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid alert data'
                });
            }

            await DashboardService.notifyStockAlert(alertData);

            res.status(200).json({
                success: true,
                message: 'Stock alert broadcasted successfully'
            });
        } catch (error) {
            console.error('❌ Error broadcasting stock alert:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

export default DashboardApiController;
