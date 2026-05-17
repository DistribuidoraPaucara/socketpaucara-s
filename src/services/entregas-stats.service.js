import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '../config/api.config.js';

/**
 * Entregas Stats Service
 *
 * Servicio para obtener y broadcast de estadísticas de entregas del dashboard
 * Se comunica con el endpoint /logistica/entregas/dashboard-stats de Laravel
 *
 * Implementación WebSocket para real-time updates
 */
class EntregasStatsService {
    constructor() {
        this.apiBaseUrl = API_BASE_URL;
        this.statsEndpoint = '/logistica/entregas/dashboard-stats';
        this.timeout = API_TIMEOUT;
        this.cacheKey = 'entregas_stats_cache';
        this.cacheTTL = 30000; // 30 segundos
        this.lastFetch = null;
        this.cachedStats = null;
    }

    /**
     * Obtener estadísticas de entregas
     *
     * Realiza una solicitud GET a Laravel y cachea el resultado
     * para evitar múltiples solicitudes en corto tiempo
     *
     * @returns {Promise<Object>} Estadísticas de entregas
     */
    async fetchStats() {
        try {
            // Usar cache si está disponible y aún es válido
            if (this.isCacheValid()) {
                console.log('📦 [Entregas Stats] Usando cache (TTL válido)');
                return this.cachedStats;
            }

            const url = `${this.apiBaseUrl}${this.statsEndpoint}`;

            console.log(`🔄 [Entregas Stats] Fetching desde ${url}`);

            const response = await axios.get(url, {
                timeout: this.timeout,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            // Validar respuesta
            if (!response.data || !response.data.success) {
                throw new Error('Respuesta inválida del servidor: success = false');
            }

            const stats = response.data.data;

            // Cachear resultado
            this.cachedStats = stats;
            this.lastFetch = Date.now();

            console.log(`✅ [Entregas Stats] Estadísticas obtenidas y cacheadas`);

            return stats;
        } catch (error) {
            console.error('❌ [Entregas Stats] Error fetching stats:', error.message);

            // Si hay error y tenemos cache, retornar cache aunque esté expirado
            if (this.cachedStats) {
                console.log('⚠️  [Entregas Stats] Error en request, usando cache expirado como fallback');
                return this.cachedStats;
            }

            throw new Error(`Error fetching entregas stats: ${error.message}`);
        }
    }

    /**
     * Verificar si el cache es aún válido
     *
     * @returns {boolean}
     */
    isCacheValid() {
        if (!this.lastFetch || !this.cachedStats) {
            return false;
        }

        const elapsed = Date.now() - this.lastFetch;
        return elapsed < this.cacheTTL;
    }

    /**
     * Invalidar cache para forzar refresh
     */
    invalidateCache() {
        this.cachedStats = null;
        this.lastFetch = null;
        console.log('🔄 [Entregas Stats] Cache invalidado');
    }

    /**
     * Obtener estadísticas sin usar cache
     *
     * Útil cuando se necesita un refresh forzado
     *
     * @returns {Promise<Object>}
     */
    async fetchStatsFresh() {
        this.invalidateCache();
        return this.fetchStats();
    }

    /**
     * Estructurar estadísticas para broadcast
     *
     * Convierte la respuesta de Laravel a formato de WebSocket
     *
     * @param {Object} stats - Estadísticas del backend
     * @returns {Object} Stats formateadas para WebSocket
     */
    formatStatsForBroadcast(stats) {
        return {
            estados: stats.estados || {},
            estados_total: stats.estados_total || 0,
            por_zona: stats.por_zona || [],
            top_choferes: stats.top_choferes || [],
            ultimos_7_dias: stats.ultimos_7_dias || [],
            entregas_recientes: stats.entregas_recientes || [],
            timestamp: new Date().toISOString()
        };
    }
}

export default new EntregasStatsService();
