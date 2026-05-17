import socketRepository from '../repositories/socket.repository.js';

/**
 * Dashboard Service
 *
 * Maneja la lógica de broadcasting de eventos del dashboard a través de WebSocket
 * Distribuye mensajes a las salas (rooms) apropiadas según el tipo de usuario
 */
class DashboardService {
    /**
     * Notificar actualizaciones de estadísticas de entregas
     *
     * Notifica a todos los clientes conectados sobre cambios en las estadísticas de entregas
     * Esta función es llamada desde Laravel cuando hay cambios en entregas
     *
     * @param {Object} stats - Estadísticas de entregas { estados, por_zona, top_choferes, etc }
     * @param {string} timestamp - Timestamp del cambio
     */
    static async notifyEntregasStatsUpdated(stats, timestamp = new Date().toISOString()) {
        try {
            const payload = {
                success: true,
                data: stats,
                timestamp: timestamp,
                source: 'backend'
            };

            // Broadcast a todos los usuarios conectados (no está filtrado por rol porque todos pueden ver dashboard)
            socketRepository.broadcast(null, 'entregas:stats-updated', payload);

            console.log(`📦 [Dashboard Service] Estadísticas de entregas actualizadas`);
            console.log(`   Entregas totales: ${stats.estados_total}`);
            console.log(`   Zonas: ${stats.por_zona?.length || 0}`);
            console.log(`   Timestamp: ${timestamp}`);
            console.log(`   Broadcasted to: todos los clientes`);

            return {
                success: true,
                message: 'Entregas stats updated successfully',
                timestamp: timestamp
            };
        } catch (error) {
            console.error('❌ Error notifying entregas stats:', error.message);
            throw error;
        }
    }

    /**
     * Notificar actualizaciones de métricas del dashboard
     *
     * @param {Object} data - { metricas, periodo, timestamp }
     */
    static async notifyMetricsUpdated(data) {
        try {
            // Broadcast a managers y admins
            socketRepository.emitToRoom('managers', 'dashboard.metrics-updated', data);
            socketRepository.emitToRoom('admins', 'dashboard.metrics-updated', data);

            console.log(`📊 [Dashboard Service] Métricas actualizadas (período: ${data.periodo})`);
            console.log(`   Timestamp: ${data.timestamp}`);
            console.log(`   Broadcasted to: managers, admins`);

            return {
                success: true,
                message: 'Metrics updated successfully',
                periodo: data.periodo,
                timestamp: data.timestamp
            };
        } catch (error) {
            console.error('❌ Error notifying metrics:', error.message);
            throw error;
        }
    }

    /**
     * Notificar alertas de stock bajo/crítico
     *
     * @param {Object} data - { stock_bajo, stock_critico, productos_afectados, timestamp }
     */
    static async notifyStockAlert(data) {
        try {
            // Alertas críticas a todos los roles relevantes
            socketRepository.emitToRoom('managers', 'dashboard.stock-alert', data);
            socketRepository.emitToRoom('admins', 'dashboard.stock-alert', data);
            socketRepository.emitToRoom('preventistas', 'dashboard.stock-alert', data);

            const stockBajoCount = data.stock_bajo ? data.stock_bajo.length : 0;
            const stockCriticoCount = data.stock_critico ? data.stock_critico.length : 0;
            const totalAfectados = data.productos_afectados || (stockBajoCount + stockCriticoCount);

            console.log(`⚠️ [Dashboard Service] Stock Alert`);
            console.log(`   Stock bajo: ${stockBajoCount} productos`);
            console.log(`   Stock crítico: ${stockCriticoCount} productos`);
            console.log(`   Total afectados: ${totalAfectados}`);
            console.log(`   Broadcasted to: managers, admins, preventistas`);

            return {
                success: true,
                message: 'Stock alert sent successfully',
                stock_bajo_count: stockBajoCount,
                stock_critico_count: stockCriticoCount,
                total_afectados: totalAfectados
            };
        } catch (error) {
            console.error('❌ Error notifying stock alert:', error.message);
            throw error;
        }
    }
}

export default DashboardService;
