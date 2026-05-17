import express from 'express';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import process from 'process';

// Importar configuraciones
import { expressCorOptions, socketCorsOptions } from './src/config/cors.config.js';
import { socketConfig, getPort, getHost, getWebsocketUrl, validateProductionConfig } from './src/config/socket.config.js';

// Importar rutas
import { setupRoutes } from './src/routes/index.js';

// Importar repositorios (necesarios para inicializar)
import socketRepository from './src/repositories/socket.repository.js';

// Importar controladores
import socketController from './src/controllers/socket.controller.js';

// Importar utilidades
import { getLocalIP } from './src/utils/network-utils.js';

// Importar Estado Manager (Fase 2)
import estadoManager from './src/services/estado-manager.service.js';

// Cargar variables de entorno
dotenv.config();

// Validar configuración para producción
const configErrors = validateProductionConfig();
if (configErrors.length > 0) {
    console.error('❌ Errores de configuración:');
    configErrors.forEach(error => console.error(`   - ${error}`));
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear aplicación Express
const app = express();
const server = http.createServer(app);

// Configurar Socket.IO
const io = new socketIo(server, {
    cors: socketCorsOptions,
    ...socketConfig
});

// Middleware
app.use(cors(expressCorOptions));
app.use(express.json());

// Servir archivos estáticos
app.use(express.static(__dirname));

// Inicializar repositorio de Socket.IO
socketRepository.setIO(io);

// Configurar rutas
setupRoutes(app);

// Manejar conexiones de Socket.IO
io.on('connection', (socket) => {
    socketController.handleConnection(socket);
});

// Iniciar el servidor
async function startServer() {
    try {
        // Fase 2: Inicializar estados (sin bloquear el startup)
        console.log('\n⏳ Inicializando servicio de estados logísticos...');
        // NO esperamos initialize() - se ejecuta en background
        estadoManager.initialize().catch(error => {
            console.error('⚠️  Error en inicialización background:', error.message);
        });

        const PORT = getPort();
        const HOST = getHost();
        const WEBSOCKET_URL = getWebsocketUrl();

        server.listen(PORT, HOST, () => {
            const localIP = getLocalIP();
            console.log(`\n🚀 Servidor WebSocket corriendo en puerto ${PORT}`);
            console.log(`\n🌐 Entorno: ${process.env.NODE_ENV}`);
            console.log(`\n📡 Escuchando en: ${HOST}:${PORT}`);
            console.log(`\n🔗 URL del WebSocket: ${WEBSOCKET_URL}`);

            console.log(`\n🌐 Servidor accesible en:`);
            console.log(`   Local: http://localhost:${PORT}`);
            console.log(`   Red local: http://${localIP}:${PORT}`);

            if (process.env.PREFERRED_IP) {
                console.log(`   IP Preferida: http://${process.env.PREFERRED_IP}:${PORT}`);
            }

            if (process.env.NODE_ENV === 'development') {
                console.log(`\n🔧 Configuración de desarrollo:`);
                console.log(`   CORS: Permitiendo cualquier origen (*)`);
                console.log(`   Cliente configurado: ${process.env.CLIENT_URL || 'No configurado'}`);
                console.log(`   Host configurado: ${HOST}`);
                console.log(`\n⚠️  DIAGNÓSTICO DE CONECTIVIDAD:`);
                console.log(`   Si no puedes acceder desde otra PC, verifica:`);
                console.log(`   1. Firewall de Windows - Puerto ${PORT} debe estar abierto`);
                console.log(`   2. Red local - Ambas PCs en la misma red`);
                console.log(`   3. IP correcta - Usar la configurada en PREFERRED_IP o ${localIP}:${PORT}`);
                console.log(`\n🧪 Prueba de conectividad desde otra PC:`);
                console.log(`   Navegador: ${WEBSOCKET_URL}`);
                console.log(`   Telnet: telnet ${process.env.PREFERRED_IP || localIP} ${PORT}`);
            }
        });

        // Manejo de errores del servidor
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ El puerto ${PORT} ya está en uso`);
                console.error('   Intenta detener el proceso anterior o usar otro puerto');
                process.exit(1);
            } else {
                console.error('❌ Error del servidor:', error);
                process.exit(1);
            }
        });
    } catch (error) {
        console.error('\n❌ Error fatal durante la inicialización:');
        console.error(`   ${error.message}`);

        if (process.env.NODE_ENV === 'development') {
            console.error('\n📝 Pasos para resolver:');
            console.error('   1. Verifica que Laravel está corriendo en', process.env.LARAVEL_API_URL);
            console.error('   2. Verifica que las migraciones se ejecutaron correctamente');
            console.error('   3. Verifica que la base de datos está accesible');
            console.error('   4. Revisa los logs de Laravel en storage/logs/laravel.log');
        }

        process.exit(1);
    }
}

// Llamar a la función de inicio
startServer();

// Manejo de cierre graceful
const gracefulShutdown = (signal) => {
    console.log(`\n${signal} recibido: Cerrando servidor WebSocket...`);

    // Notificar a todos los clientes sobre el cierre
    io.emit('server_shutdown', {
        message: 'El servidor se está cerrando. Por favor reconecta en breve.',
        timestamp: new Date().toISOString()
    });

    // Cerrar todas las conexiones de Socket.IO
    io.close(() => {
        console.log('✅ Todas las conexiones de Socket.IO cerradas');

        // Cerrar el servidor HTTP
        server.close(() => {
            console.log('✅ Servidor HTTP cerrado');
            console.log('👋 Servidor cerrado correctamente');
            process.exit(0);
        });
    });
    // Forzar cierre después de 10 segundos si no se cerró correctamente
    setTimeout(() => {
        console.error('⚠️  No se pudo cerrar correctamente. Forzando cierre...');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Excepción no capturada:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});
