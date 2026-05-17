/**
 * In-Memory State Cache
 *
 * Cache en memoria con TTL para estados logísticos
 * Se usa para evitar llamadas frecuentes a la API de Laravel
 *
 * Implementación de la Fase 2
 */

class StateCache {
    constructor() {
        this.cache = new Map();
        this.TTL = parseInt(process.env.STATE_CACHE_TTL || '3600000', 10); // 1 hora por defecto
        console.log(`⏱️  State Cache initialized with TTL: ${this.TTL}ms (${(this.TTL / 1000 / 60).toFixed(1)} minutos)`);
    }

    /**
     * Guardar estados en cache con timestamp
     * @param {string} categoria - Categoría de estados
     * @param {Array} data - Array de estados a cachear
     */
    set(categoria, data) {
        this.cache.set(categoria, {
            data: data,
            timestamp: Date.now()
        });
        console.log(`💾 Cache SET: ${categoria} (${data.length} estados)`);
    }

    /**
     * Obtener estados del cache si aún son válidos
     * @param {string} categoria - Categoría de estados
     * @returns {Array|null} Estados cacheados o null si expiró
     */
    get(categoria) {
        const cached = this.cache.get(categoria);

        if (!cached) {
            return null;
        }

        // Verificar si el cache expiró
        const age = Date.now() - cached.timestamp;
        if (age > this.TTL) {
            this.cache.delete(categoria);
            console.log(`⏰ Cache EXPIRED: ${categoria} (age: ${(age / 1000).toFixed(1)}s)`);
            return null;
        }

        console.log(`✅ Cache HIT: ${categoria} (age: ${(age / 1000).toFixed(1)}s, TTL: ${((this.TTL - age) / 1000).toFixed(1)}s remaining)`);
        return cached.data;
    }

    /**
     * Verificar si hay datos cacheados válidos
     * @param {string} categoria - Categoría de estados
     * @returns {boolean}
     */
    has(categoria) {
        return this.get(categoria) !== null;
    }

    /**
     * Limpiar cache completo
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`🗑️  Cache CLEARED (${size} entries removed)`);
    }

    /**
     * Limpiar cache de una categoría específica
     * @param {string} categoria - Categoría a limpiar
     */
    delete(categoria) {
        const exists = this.cache.has(categoria);
        if (exists) {
            this.cache.delete(categoria);
            console.log(`🗑️  Cache DELETE: ${categoria}`);
        }
        return exists;
    }

    /**
     * Obtener estadísticas del cache
     * @returns {object} Estadísticas de cada categoría en cache
     */
    getStats() {
        const stats = {};
        for (const [categoria, cached] of this.cache.entries()) {
            const age = Date.now() - cached.timestamp;
            const remainingTTL = Math.max(0, this.TTL - age);
            stats[categoria] = {
                count: cached.data.length,
                age_ms: age,
                age_seconds: (age / 1000).toFixed(1),
                expires_in_ms: remainingTTL,
                expires_in_seconds: (remainingTTL / 1000).toFixed(1),
                expired: age > this.TTL
            };
        }
        return stats;
    }

    /**
     * Obtener resumen del cache
     * @returns {object} Resumen con total de entradas y tamaño total
     */
    getSummary() {
        let totalStates = 0;
        const stats = this.getStats();

        for (const [_, stat] of Object.entries(stats)) {
            totalStates += stat.count;
        }

        return {
            total_categories: this.cache.size,
            total_states: totalStates,
            ttl_ms: this.TTL,
            ttl_minutes: (this.TTL / 1000 / 60).toFixed(1),
            categories: stats
        };
    }
}

// Crear instancia singleton
export default new StateCache();
