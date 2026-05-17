import process from 'process';

// Configuración de Socket.IO optimizada para móviles
export const socketConfig = {
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 30000,
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 10000,
    upgradeTimeout: 10000,
    maxHttpBufferSize: parseInt(process.env.SOCKET_MAX_HTTP_BUFFER_SIZE) || 1e6,
    allowEIO3: true
};

// Puerto del servidor
export const getPort = () => {
    return process.env.PORT || process.env.WEBSOCKET_PORT || 3001;
};

// Host del servidor (para evitar conflictos con múltiples tarjetas de red)
export const getHost = () => {
    return process.env.WEBSOCKET_HOST || '0.0.0.0';
};

// URL completa del websocket
export const getWebsocketUrl = () => {
    const port = getPort();

    // Si hay una URL específica configurada, usarla
    if (process.env.WEBSOCKET_URL) {
        return process.env.WEBSOCKET_URL;
    }

    // Si hay una IP preferida, usarla
    if (process.env.PREFERRED_IP) {
        return `http://${process.env.PREFERRED_IP}:${port}`;
    }

    // Fallback a localhost
    return `http://localhost:${port}`;
};

// Validar configuración para producción
export const validateProductionConfig = () => {
    const errors = [];

    if (process.env.NODE_ENV === 'production') {
        if (!process.env.WEBSOCKET_URL) {
            errors.push('WEBSOCKET_URL es requerida en producción');
        }

        if (!process.env.WS_SECRET || process.env.WS_SECRET === 'your-secret-key-here') {
            errors.push('WS_SECRET debe ser configurada con un valor seguro en producción');
        }

        if (process.env.WEBSOCKET_URL && process.env.WEBSOCKET_URL.startsWith('http://')) {
            errors.push('WEBSOCKET_URL debe usar HTTPS en producción');
        }

        // Validar LARAVEL_API_URL en producción
        if (!process.env.LARAVEL_API_URL) {
            errors.push('LARAVEL_API_URL es requerida en producción (debe apuntar a la URL de tu API Laravel)');
        }

        if (process.env.LARAVEL_API_URL && (process.env.LARAVEL_API_URL.includes('localhost') || process.env.LARAVEL_API_URL.includes('127.0.0.1'))) {
            errors.push('LARAVEL_API_URL no puede apuntar a localhost en producción. Debe ser una URL externa (ej: https://gestorlp.up.railway.app/api)');
        }
    }

    return errors;
};
