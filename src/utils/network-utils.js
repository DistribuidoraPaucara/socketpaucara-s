import os from 'os';
import process from 'process';

/**
 * Detectar IP local automáticamente, respetando la IP preferida del .env
 */
export function getLocalIP() {
    // Si hay una IP preferida configurada, usarla
    if (process.env.PREFERRED_IP) {
        return process.env.PREFERRED_IP;
    }

    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Buscar IPv4, no loopback, y en redes privadas
            if (iface.family === 'IPv4' &&
                !iface.internal &&
                (iface.address.startsWith('192.168.') ||
                    iface.address.startsWith('10.') ||
                    iface.address.match(/^172\.(1[6-9]|2\d|3[01])\./))) {
                return iface.address;
            }
        }
    }

    return 'localhost';
}

/**
 * Obtener todas las IPs disponibles
 */
export function getAllIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push({
                    interface: name,
                    address: iface.address,
                    isPrivate: isPrivateIP(iface.address)
                });
            }
        }
    }

    return ips;
}

/**
 * Verificar si una IP es privada
 */
export function isPrivateIP(ip) {
    return ip.startsWith('192.168.') ||
        ip.startsWith('10.') ||
        ip.match(/^172\.(1[6-9]|2\d|3[01])\./);
}

/**
 * Generar URLs de configuración
 */
export function generateConfig(port = 3001) {
    const localIP = getLocalIP();
    const allIPs = getAllIPs();

    console.log('🌐 Configuración de Red Detectada:');
    console.log('=====================================');
    console.log(`IP Principal: ${localIP}`);
    console.log(`Puerto WebSocket: ${port}`);
    console.log('');

    console.log('📱 URLs para Flutter:');
    console.log(`Desarrollo: http://${localIP}:${port}`);
    console.log(`Producción: https://tu-dominio.com:${port}`);
    console.log('');

    console.log('🔧 Variables de Entorno (.env):');
    console.log(`LOCAL_IP=${localIP}`);
    console.log(`WEBSOCKET_PORT=${port}`);
    console.log(`CLIENT_URL=http://localhost:3000`);
    console.log(`MOBILE_CLIENT_URL=http://${localIP}:3000`);
    console.log('');

    console.log('🖥️ Todas las interfaces de red disponibles:');
    allIPs.forEach(ip => {
        console.log(`  ${ip.interface}: ${ip.address} ${ip.isPrivate ? '(Privada)' : '(Pública)'}`);
    });
    console.log('');

    console.log('📋 URLs de Prueba:');
    console.log(`Estado del servidor: http://${localIP}:${port}/health`);
    console.log(`Página de pruebas: http://${localIP}:${port}/test.html`);
    console.log(`Usuarios activos: http://${localIP}:${port}/active-users`);
    console.log('');

    console.log('📲 Configuración para Flutter:');
    console.log('```dart');
    console.log(`_wsService.configureServer(url: 'http://${localIP}:${port}');`);
    console.log('```');
    console.log('');

    return {
        localIP,
        allIPs,
        port,
        urls: {
            websocket: `http://${localIP}:${port}`,
            health: `http://${localIP}:${port}/health`,
            test: `http://${localIP}:${port}/test.html`,
            activeUsers: `http://${localIP}:${port}/active-users`
        }
    };
}

// Si se ejecuta directamente (ES6 modules)
if (import.meta.url === `file://${process.argv[1]}`) {
    const port = process.argv[2] || process.env.WEBSOCKET_PORT || 3001;
    generateConfig(parseInt(port));
}
