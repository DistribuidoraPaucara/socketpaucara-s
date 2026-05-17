/**
 * API Configuration for Laravel Backend Integration
 *
 * Configuración de la API de Laravel para consultar estados centralizados
 * Esta configuración es parte de la Fase 2 de integración WebSocket
 */

export const API_BASE_URL = process.env.LARAVEL_API_URL || 'http://localhost:8000/api';
export const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '10000', 10); // 10 segundos

export const API_ENDPOINTS = {
    // Endpoints de estados
    estados: '/estados',
    categorias: '/estados/categorias',
    transiciones: '/transiciones',
    mapeos: '/mapeos',
    buscar: '/estados/buscar',
    estadisticas: '/estadisticas',
};

// Log de configuración (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
    console.log('📡 API Configuration Loaded:', {
        baseURL: API_BASE_URL,
        timeout: API_TIMEOUT,
        endpoints: API_ENDPOINTS
    });
}
