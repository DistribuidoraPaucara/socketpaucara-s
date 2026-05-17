/**
 * Laravel API Service
 *
 * Servicio para comunicarse con la API de Laravel
 * Obtiene estados logísticos centralizados desde el backend
 *
 * Implementación de la Fase 2
 */

import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT, API_ENDPOINTS } from '../config/api.config.js';

class LaravelApiService {
    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            timeout: API_TIMEOUT,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // Interceptor para logging
        this.client.interceptors.response.use(
            response => {
                console.log(`📡 API Response: ${response.status} from ${response.config.url}`);
                return response;
            },
            error => {
                console.error(`❌ API Error: ${error.message} (${error.config?.url})`);
                throw error;
            }
        );
    }

    /**
     * Obtener todos los estados de una categoría
     * @param {string} categoria - Categoría: 'proforma', 'venta_logistica', 'entrega', 'vehiculo', 'pago'
     * @returns {Promise<Array>} Array de estados
     */
    async fetchEstados(categoria) {
        try {
            console.log(`🔄 Fetching estados for categoria: ${categoria}`);
            const response = await this.client.get(`${API_ENDPOINTS.estados}/${categoria}`);

            if (!response.data.data) {
                throw new Error('Invalid response format: missing data field');
            }

            console.log(`✅ Fetched ${response.data.data.length} estados from categoria: ${categoria}`);
            return response.data.data;
        } catch (error) {
            console.error(`❌ Error fetching estados for ${categoria}:`, error.message);
            throw error;
        }
    }

    /**
     * Obtener todas las categorías disponibles
     * @returns {Promise<Array>} Array de categorías
     */
    async fetchCategorias() {
        try {
            console.log('🔄 Fetching all categorias...');
            const response = await this.client.get(API_ENDPOINTS.categorias);

            if (!response.data.data) {
                throw new Error('Invalid response format: missing data field');
            }

            console.log(`✅ Fetched ${response.data.data.length} categorias`);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching categorias:', error.message);
            throw error;
        }
    }

    /**
     * Obtener un estado específico por código
     * @param {string} categoria - Categoría del estado
     * @param {string} codigo - Código del estado
     * @returns {Promise<Object>} Objeto del estado
     */
    async fetchEstadoPorCodigo(categoria, codigo) {
        try {
            console.log(`🔄 Fetching estado: ${categoria}/${codigo}`);
            const response = await this.client.get(`${API_ENDPOINTS.estados}/${categoria}/${codigo}`);

            if (!response.data.data) {
                throw new Error('Invalid response format: missing data field');
            }

            console.log(`✅ Fetched estado: ${codigo}`);
            return response.data.data;
        } catch (error) {
            console.error(`❌ Error fetching estado ${categoria}/${codigo}:`, error.message);
            throw error;
        }
    }

    /**
     * Obtener transiciones válidas desde un estado
     * @param {string} categoria - Categoría del estado
     * @param {string} codigo - Código del estado
     * @returns {Promise<Array>} Array de estados destino válidos
     */
    async fetchTransiciones(categoria, codigo) {
        try {
            console.log(`🔄 Fetching transiciones from: ${categoria}/${codigo}`);
            const response = await this.client.get(`${API_ENDPOINTS.estados}/${categoria}/${codigo}/transiciones`);

            if (!response.data.data) {
                throw new Error('Invalid response format: missing data field');
            }

            console.log(`✅ Fetched ${response.data.data.length} transiciones`);
            return response.data.data;
        } catch (error) {
            console.error(`❌ Error fetching transiciones for ${categoria}/${codigo}:`, error.message);
            throw error;
        }
    }

    /**
     * Obtener mapeo de un estado a otra categoría
     * @param {string} categoriaOrigen - Categoría del estado origen
     * @param {string} codigoOrigen - Código del estado origen
     * @param {string} categoriaDestino - Categoría del estado destino
     * @returns {Promise<Object>} Mapeo entre estados
     */
    async fetchMapeo(categoriaOrigen, codigoOrigen, categoriaDestino) {
        try {
            console.log(`🔄 Fetching mapeo: ${categoriaOrigen}/${codigoOrigen} → ${categoriaDestino}`);
            const response = await this.client.get(
                `${API_ENDPOINTS.mapeos}/${categoriaOrigen}/${codigoOrigen}/${categoriaDestino}`
            );

            if (!response.data.data) {
                throw new Error('Invalid response format: missing data field');
            }

            console.log(`✅ Fetched mapeo: ${codigoOrigen} → ${response.data.data.destino.codigo}`);
            return response.data.data;
        } catch (error) {
            console.error(
                `❌ Error fetching mapeo ${categoriaOrigen}/${codigoOrigen}/${categoriaDestino}:`,
                error.message
            );
            throw error;
        }
    }

    /**
     * Buscar estados por término
     * @param {string} termino - Término de búsqueda
     * @param {string} categoria - Categoría opcional para filtrar
     * @returns {Promise<Array>} Array de estados encontrados
     */
    async buscar(termino, categoria = null) {
        try {
            const params = { q: termino };
            if (categoria) {
                params.categoria = categoria;
            }

            console.log(`🔄 Searching estados: "${termino}"${categoria ? ` in ${categoria}` : ''}`);
            const response = await this.client.get(API_ENDPOINTS.buscar, { params });

            if (!response.data.data) {
                throw new Error('Invalid response format: missing data field');
            }

            console.log(`✅ Found ${response.data.data.length} estados matching "${termino}"`);
            return response.data.data;
        } catch (error) {
            console.error(`❌ Error searching estados:`, error.message);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de una categoría
     * @param {string} categoria - Categoría
     * @returns {Promise<Object>} Estadísticas de la categoría
     */
    async fetchEstadisticas(categoria) {
        try {
            console.log(`🔄 Fetching estadísticas for: ${categoria}`);
            const response = await this.client.get(`${API_ENDPOINTS.estadisticas}/${categoria}`);

            if (!response.data.data) {
                throw new Error('Invalid response format: missing data field');
            }

            console.log(`✅ Fetched estadísticas for ${categoria}`);
            return response.data.data;
        } catch (error) {
            console.error(`❌ Error fetching estadísticas for ${categoria}:`, error.message);
            throw error;
        }
    }

    /**
     * Verificar conectividad con la API
     * @returns {Promise<boolean>} true si la API es accesible
     */
    async healthCheck() {
        try {
            console.log('🏥 Performing API health check...');
            const response = await this.client.get(API_ENDPOINTS.categorias);
            console.log('✅ API health check passed');
            return true;
        } catch (error) {
            console.error('❌ API health check failed:', error.message);
            return false;
        }
    }
}

// Crear instancia singleton
export default new LaravelApiService();
