import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * ✅ Servicio para verificar y enviar notificaciones recurrentes vía Firebase
 * Se ejecuta cada minuto en el servidor Socket.IO
 */
class NotificacionesRecurrentesService {
    constructor() {
        this.laravelApiUrl = process.env.LARAVEL_API_URL || 'http://192.168.100.42:8000/api';
        this.apiKey = process.env.NOTIFICACIONES_API_KEY || 'cambiar_en_env';
        this.isRunning = false;
        this.lastExecution = null;
    }

    /**
     * Iniciar el servicio de notificaciones recurrentes
     */
    async initialize() {
        try {
            console.log('🔔 Inicializando servicio de notificaciones recurrentes...');

            // Ejecutar verificación inicial
            await this.procesarNotificaciones();

            // Ejecutar cada minuto
            setInterval(async () => {
                await this.procesarNotificaciones();
            }, 60000); // Cada minuto (60000ms)

            console.log('✅ Servicio de notificaciones recurrentes inicializado');
        } catch (error) {
            console.error('❌ Error inicializando servicio de notificaciones:', error.message);
        }
    }

    /**
     * Procesar notificaciones recurrentes
     */
    async procesarNotificaciones() {
        if (this.isRunning) {
            console.log('⏳ Verificación anterior aún en ejecución, saltando...');
            return;
        }

        this.isRunning = true;
        const horaActual = new Date().toLocaleTimeString('es-AR', { hour12: false });

        try {
            console.log(`\n⏰ [${horaActual}] Verificando notificaciones recurrentes...`);

            // Llamar al endpoint de Laravel que ejecuta el comando Artisan
            const response = await axios.get(
                `${this.laravelApiUrl}/public/notificaciones/ejecutar-recurrentes`,
                {
                    params: {
                        api_key: this.apiKey
                    },
                    timeout: 30000 // 30 segundos timeout
                }
            );

            if (response.data.success) {
                const output = response.data.command_output || '';

                // Solo mostrar si hay notificaciones procesadas
                if (output.includes('✅') && !output.includes('No hay notificaciones')) {
                    console.log(`✅ Notificaciones procesadas:`);
                    console.log(`   ${output.replace(/\r\n/g, '\n   ')}`);
                } else {
                    console.log(`✓ Sin notificaciones para enviar en esta hora`);
                }

                this.lastExecution = new Date();
            } else {
                console.error('❌ Error en respuesta:', response.data.message);
            }
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.warn('⚠️  No se puede conectar con Laravel. ¿Está corriendo?');
            } else if (error.response?.status === 403) {
                console.error('❌ API Key inválida o expirada');
            } else {
                console.error('❌ Error verificando notificaciones:', error.message);
            }
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Obtener estado del servicio
     */
    getStatus() {
        return {
            running: true,
            lastExecution: this.lastExecution,
            nextExecution: new Date(Date.now() + 60000),
            laravelApiUrl: this.laravelApiUrl
        };
    }
}

// Exportar como singleton
export default new NotificacionesRecurrentesService();
