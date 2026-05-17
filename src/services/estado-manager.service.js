/**
 * Estado Manager Service
 *
 * Gestor central de estados que coordina:
 * - API de Laravel
 * - Cache en memoria
 * - Inicialización y refresh de estados
 *
 * Implementación de la Fase 2
 */

import laravelApiService from './laravel-api.service.js';
import stateCache from '../utils/state-cache.js';

class EstadoManagerService {
    constructor() {
        this.initialized = false;
        this.apiHealthy = false;
        this.loadingPromises = new Map(); // Track in-flight requests per categoria
        this.categorias = [];
        this.categoriasLoaded = false;
    }

    /**
     * Inicializar: solo verificar conectividad (NO bloquea el startup)
     * Carga de datos ocurre bajo demanda (lazy loading)
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) {
            console.log('ℹ️  Estado Manager already initialized');
            return;
        }

        this.initialized = true;

        try {
            console.log('\n🔄 ============================================');
            console.log('🔄 Verificando conectividad con Laravel API...');
            console.log('🔄 ============================================\n');

            // Verificar conectividad (rápido, sin bloquear)
            this.apiHealthy = await laravelApiService.healthCheck();

            if (!this.apiHealthy) {
                console.warn('⚠️  API no disponible al iniciar. Reintentar en background...');
                // Reintentar en background sin bloquear
                this.retryApiHealthCheck();
            } else {
                console.log('✅ API disponible. Los datos se cargarán bajo demanda.\n');
                // Pre-cargar categorías en background (opcional, mejora UX)
                this.loadCategoriasInBackground();
            }

        } catch (error) {
            console.error('⚠️  Error durante inicialización:', error.message);
            this.apiHealthy = false;
            this.retryApiHealthCheck();
        }
    }

    /**
     * Reintentar health check en background cada 10 segundos
     * @private
     */
    retryApiHealthCheck() {
        setTimeout(async () => {
            try {
                const healthy = await laravelApiService.healthCheck();
                if (healthy && !this.apiHealthy) {
                    this.apiHealthy = true;
                    console.log('✅ API recuperada. Cargando categorías...');
                    this.loadCategoriasInBackground();
                }
            } catch (error) {
                console.warn('⚠️  Health check fallido, reintentando en 10s...');
                this.retryApiHealthCheck();
            }
        }, 10000);
    }

    /**
     * Cargar categorías en background sin bloquear
     * @private
     */
    async loadCategoriasInBackground() {
        if (this.categoriasLoaded) return;

        try {
            const categorias = await laravelApiService.fetchCategorias();
            this.categorias = categorias.map(cat => cat.codigo);
            this.categoriasLoaded = true;
            console.log(`📦 Categorías disponibles: ${this.categorias.join(', ')}`);
        } catch (error) {
            console.warn('⚠️  No se pudieron cargar categorías:', error.message);
            setTimeout(() => this.loadCategoriasInBackground(), 10000);
        }
    }

    /**
     * Obtener estados de una categoría (lazy loading con cache automático)
     * Evita solicitudes duplicadas mientras se carga la misma categoría
     * @param {string} categoria - Categoría de estados
     * @returns {Promise<Array>} Array de estados
     */
    async getEstados(categoria) {
        // 1. Intentar obtener del cache primero (más rápido)
        let estados = stateCache.get(categoria);
        if (estados) {
            return estados;
        }

        // 2. Si ya hay una solicitud en vuelo, esperar esa promesa
        if (this.loadingPromises.has(categoria)) {
            return this.loadingPromises.get(categoria);
        }

        // 3. Crear nueva promesa de carga
        const loadPromise = (async () => {
            try {
                console.log(`🔄 Cargando ${categoria} desde API...`);
                const fetchedEstados = await laravelApiService.fetchEstados(categoria);
                stateCache.set(categoria, fetchedEstados);
                console.log(`✅ ${categoria} cargado y cacheado (${fetchedEstados.length} estados)`);
                return fetchedEstados;
            } catch (error) {
                console.error(`❌ Error cargando ${categoria}:`, error.message);
                return [];
            } finally {
                // Limpiar promesa después de completarse
                this.loadingPromises.delete(categoria);
            }
        })();

        // Guardar la promesa para evitar solicitudes duplicadas
        this.loadingPromises.set(categoria, loadPromise);
        return loadPromise;
    }

    /**
     * Obtener un estado por código
     * @param {string} categoria - Categoría del estado
     * @param {string} codigo - Código del estado
     * @returns {Promise<Object|null>} Estado encontrado o null
     */
    async getEstadoPorCodigo(categoria, codigo) {
        const estados = await this.getEstados(categoria);
        return estados.find(e => e.codigo === codigo) || null;
    }

    /**
     * Validar si un código de estado existe
     * @param {string} categoria - Categoría del estado
     * @param {string} codigo - Código del estado
     * @returns {Promise<boolean>}
     */
    async isValidEstado(categoria, codigo) {
        const estado = await this.getEstadoPorCodigo(categoria, codigo);
        return estado !== null;
    }

    /**
     * Obtener todas las categorías
     * @returns {Array} Array de códigos de categorías
     */
    getCategorias() {
        return this.categorias;
    }

    /**
     * Verificar si una categoría es válida
     * @param {string} categoria - Categoría a validar
     * @returns {boolean}
     */
    isValidCategoria(categoria) {
        return this.categorias.includes(categoria);
    }

    /**
     * Refrescar cache de una categoría específica
     * @param {string} categoria - Categoría a refrescar
     * @returns {Promise<Array>} Estados actualizados
     */
    async refreshCategoria(categoria) {
        try {
            console.log(`♻️  Refreshing cache for ${categoria}...`);
            const estados = await laravelApiService.fetchEstados(categoria);
            stateCache.set(categoria, estados);
            console.log(`✅ Cache refreshed for ${categoria}`);
            return estados;
        } catch (error) {
            console.error(`❌ Error refrescando ${categoria}:`, error.message);
            throw error;
        }
    }

    /**
     * Refrescar cache completo
     * @returns {Promise<void>}
     */
    async refreshAll() {
        try {
            console.log('♻️  Refreshing all estado categories...');
            stateCache.clear();

            for (const categoria of this.categorias) {
                const estados = await laravelApiService.fetchEstados(categoria);
                stateCache.set(categoria, estados);
            }

            console.log('✅ All caches refreshed');
        } catch (error) {
            console.error('❌ Error refreshing all caches:', error.message);
            throw error;
        }
    }

    /**
     * Obtener estadísticas del cache
     * @returns {object} Estadísticas detalladas
     */
    getCacheStats() {
        const summary = stateCache.getSummary();
        return {
            initialized: this.initialized,
            cache_summary: summary,
            cache_details: stateCache.getStats(),
            categorias: this.categorias
        };
    }

    /**
     * Obtener información de un estado específico con detalles
     * @param {string} categoria - Categoría del estado
     * @param {string} codigo - Código del estado
     * @returns {Promise<Object|null>} Estado con detalles o null
     */
    async getEstadoDetalles(categoria, codigo) {
        try {
            const estado = await this.getEstadoPorCodigo(categoria, codigo);
            if (!estado) {
                return null;
            }

            // Obtener transiciones disponibles
            let transiciones = [];
            try {
                transiciones = await laravelApiService.fetchTransiciones(categoria, codigo);
            } catch (e) {
                console.warn(`Could not fetch transiciones for ${categoria}/${codigo}`);
            }

            return {
                ...estado,
                transiciones_disponibles: transiciones
            };
        } catch (error) {
            console.error(`Error getting detalles for ${categoria}/${codigo}:`, error.message);
            return null;
        }
    }

    /**
     * Validar una transición entre dos estados
     * @param {string} categoria - Categoría del estado
     * @param {string} codigoOrigen - Código del estado origen
     * @param {string} codigoDestino - Código del estado destino
     * @returns {Promise<boolean>}
     */
    async isValidTransicion(categoria, codigoOrigen, codigoDestino) {
        try {
            const transiciones = await laravelApiService.fetchTransiciones(categoria, codigoOrigen);
            return transiciones.some(t => t.codigo === codigoDestino);
        } catch (error) {
            console.error(`Error validating transition: ${error.message}`);
            return false;
        }
    }

    /**
     * Mapear un estado a otra categoría
     * @param {string} categoriaOrigen - Categoría origen
     * @param {string} codigoOrigen - Código origen
     * @param {string} categoriaDestino - Categoría destino
     * @returns {Promise<Object|null>} Estado mapeado o null
     */
    async mapearEstado(categoriaOrigen, codigoOrigen, categoriaDestino) {
        try {
            const mapeo = await laravelApiService.fetchMapeo(
                categoriaOrigen,
                codigoOrigen,
                categoriaDestino
            );
            return mapeo.destino;
        } catch (error) {
            console.error(`Error mapping estado: ${error.message}`);
            return null;
        }
    }
}

// Crear instancia singleton
export default new EstadoManagerService();
