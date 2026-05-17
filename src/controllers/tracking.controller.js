import socketRepository from '../repositories/socket.repository.js';
import shipmentService from '../services/shipment.service.js';

class TrackingController {

    /**
     * Iniciar seguimiento de envío
     * Se llama cuando un chofer comienza el viaje
     */
    startTracking(req, res) {
        try {
            const {
                shipment_id,
                numero_envio,
                chofer_id,
                cliente_id,
                ruta_data
            } = req.body;

            console.log(`🚀 Iniciando seguimiento de envío: ${numero_envio}`);

            // Validar datos requeridos
            if (!shipment_id || !numero_envio || !chofer_id || !cliente_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos incompletos para iniciar seguimiento',
                    required: ['shipment_id', 'numero_envio', 'chofer_id', 'cliente_id']
                });
            }

            // Notificar a cliente sobre inicio de seguimiento
            socketRepository.emitToUser(cliente_id, 'tracking_started', {
                shipment_id: shipment_id,
                numero_envio: numero_envio,
                message: '🚗 El seguimiento en tiempo real ha comenzado',
                timestamp: new Date().toISOString()
            });

            return res.json({
                success: true,
                message: 'Seguimiento iniciado correctamente',
                data: {
                    shipment_id: shipment_id,
                    numero_envio: numero_envio
                }
            });
        } catch (error) {
            console.error('Error al iniciar seguimiento:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al iniciar seguimiento',
                error: error.message
            });
        }
    }

    /**
     * Actualizar ubicación del chofer
     * Se llama continuamente mientras está en ruta
     */
    updateLocation(req, res) {
        try {
            const {
                shipment_id,
                numero_envio,
                chofer_id,
                cliente_id,
                latitude,
                longitude,
                precisión,
                velocidad,
                dirección,
                altitude
            } = req.body;

            // Validar datos críticos
            if (!shipment_id || !latitude || !longitude || !chofer_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos de ubicación incompletos'
                });
            }

            // Actualizar ubicación a través del servicio
            shipmentService.updateDriverLocation({
                shipment_id: shipment_id,
                chofer_id: chofer_id,
                numero_envio: numero_envio,
                cliente_id: cliente_id,
                latitude: latitude,
                longitude: longitude,
                precisión: precisión || 5,
                velocidad: velocidad || 0,
                dirección: dirección || 0,
                altitude: altitude || 0,
                timestamp: new Date().toISOString()
            });

            return res.json({
                success: true,
                message: 'Ubicación actualizada',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error al actualizar ubicación:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al actualizar ubicación',
                error: error.message
            });
        }
    }

    /**
     * Obtener última ubicación conocida de un envío
     */
    getLastLocation(req, res) {
        try {
            const { shipment_id } = req.params;

            if (!shipment_id) {
                return res.status(400).json({
                    success: false,
                    message: 'shipment_id es requerido'
                });
            }

            // Aquí en un escenario real, obtendrías la última ubicación de la BD
            // Por ahora retornamos estructura de respuesta
            return res.json({
                success: true,
                data: {
                    shipment_id: shipment_id,
                    latitude: null,
                    longitude: null,
                    precisión: null,
                    velocidad: null,
                    timestamp: null,
                    message: 'Obtén la ubicación más reciente de la base de datos'
                }
            });
        } catch (error) {
            console.error('Error al obtener ubicación:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener ubicación',
                error: error.message
            });
        }
    }

    /**
     * Obtener ruta completa del envío
     */
    getShipmentRoute(req, res) {
        try {
            const { shipment_id } = req.params;

            if (!shipment_id) {
                return res.status(400).json({
                    success: false,
                    message: 'shipment_id es requerido'
                });
            }

            // Aquí en un escenario real, obtendrías todas las ubicaciones del envío de la BD
            return res.json({
                success: true,
                data: {
                    shipment_id: shipment_id,
                    route_points: [],
                    total_distance: 0,
                    total_duration: 0,
                    message: 'Obtén la ruta completa de la base de datos'
                }
            });
        } catch (error) {
            console.error('Error al obtener ruta:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener ruta',
                error: error.message
            });
        }
    }

    /**
     * Reportar evento en ruta
     */
    reportRouteEvent(req, res) {
        try {
            const {
                shipment_id,
                numero_envio,
                chofer_id,
                cliente_id,
                tipo_evento, // PARADA, GIRO, DESVIO, DETENCCION_LARGA, ACCIDENTE, OTRO
                descripcion,
                latitude,
                longitude,
                foto_url,
                audio_url
            } = req.body;

            console.log(`🛣️ Evento de ruta reportado: ${tipo_evento}`);

            // Validar datos requeridos
            if (!shipment_id || !tipo_evento || !chofer_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos incompletos para reportar evento'
                });
            }

            // Registrar el evento
            shipmentService.notifyRouteEvent({
                shipment_id: shipment_id,
                numero_envio: numero_envio,
                cliente_id: cliente_id,
                chofer_id: chofer_id,
                tipo_evento: tipo_evento,
                descripcion: descripcion,
                coordenadas: {
                    latitude: latitude,
                    longitude: longitude
                },
                foto_url: foto_url,
                audio_url: audio_url,
                timestamp: new Date().toISOString()
            });

            return res.json({
                success: true,
                message: 'Evento registrado correctamente',
                data: {
                    shipment_id: shipment_id,
                    tipo_evento: tipo_evento
                }
            });
        } catch (error) {
            console.error('Error al reportar evento:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al reportar evento',
                error: error.message
            });
        }
    }

    /**
     * Notificar llegada cercana (cuando está a pocos km)
     */
    notifyArriving(req, res) {
        try {
            const {
                shipment_id,
                numero_envio,
                cliente_id,
                chofer_id,
                chofer_nombre,
                chofer_telefono,
                eta_minutos,
                latitude,
                longitude
            } = req.body;

            if (!shipment_id || !cliente_id || !eta_minutos) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos incompletos para notificar llegada'
                });
            }

            console.log(`📍 Llegada cercana: ${numero_envio} en ${eta_minutos} min`);

            // Notificar a través del servicio
            shipmentService.notifyShipmentArriving({
                id: shipment_id,
                numero_envio: numero_envio,
                cliente_id: cliente_id,
                chofer: {
                    id: chofer_id,
                    name: chofer_nombre,
                    telefono: chofer_telefono
                },
                eta_minutos: eta_minutos,
                ubicacion_actual: {
                    latitude: latitude,
                    longitude: longitude
                }
            });

            return res.json({
                success: true,
                message: 'Notificación de llegada enviada',
                data: {
                    shipment_id: shipment_id,
                    eta_minutos: eta_minutos
                }
            });
        } catch (error) {
            console.error('Error al notificar llegada:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al notificar llegada',
                error: error.message
            });
        }
    }

    /**
     * Confirmar entrega
     */
    confirmDelivery(req, res) {
        try {
            const {
                shipment_id,
                numero_envio,
                venta_numero,
                cliente_id,
                cliente_nombre,
                chofer_id,
                chofer_nombre,
                receptor_nombre,
                receptor_documento,
                foto_url,
                firma_base64,
                observaciones
            } = req.body;

            if (!shipment_id || !cliente_id || !receptor_nombre) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos incompletos para confirmar entrega'
                });
            }

            console.log(`✅ Confirmando entrega: ${numero_envio}`);

            // Notificar entrega completada
            shipmentService.notifyShipmentDelivered({
                id: shipment_id,
                numero_envio: numero_envio,
                venta_numero: venta_numero,
                cliente_id: cliente_id,
                cliente_nombre: cliente_nombre,
                receptor_nombre: receptor_nombre,
                receptor_documento: receptor_documento,
                fecha_entrega: new Date().toISOString(),
                foto_entrega: foto_url,
                firma_cliente: firma_base64,
                observaciones: observaciones,
                chofer: {
                    id: chofer_id,
                    name: chofer_nombre
                }
            });

            return res.json({
                success: true,
                message: 'Entrega confirmada correctamente',
                data: {
                    shipment_id: shipment_id,
                    numero_envio: numero_envio,
                    receptor: receptor_nombre
                }
            });
        } catch (error) {
            console.error('Error al confirmar entrega:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al confirmar entrega',
                error: error.message
            });
        }
    }

    /**
     * Reportar fallo de entrega
     */
    reportDeliveryFailure(req, res) {
        try {
            const {
                shipment_id,
                numero_envio,
                cliente_id,
                cliente_nombre,
                chofer_id,
                chofer_nombre,
                motivo_rechazo,
                foto_url,
                observaciones,
                reintentar_fecha
            } = req.body;

            if (!shipment_id || !cliente_id || !motivo_rechazo) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos incompletos para reportar fallo'
                });
            }

            console.log(`❌ Fallo de entrega reportado: ${numero_envio}`);

            // Notificar fallo de entrega
            shipmentService.notifyShipmentDeliveryFailed({
                id: shipment_id,
                numero_envio: numero_envio,
                cliente_id: cliente_id,
                cliente_nombre: cliente_nombre,
                motivo_rechazo: motivo_rechazo,
                fecha_intento: new Date().toISOString(),
                foto_url: foto_url,
                observaciones: observaciones,
                reintentar_fecha: reintentar_fecha,
                chofer: {
                    id: chofer_id,
                    name: chofer_nombre
                }
            });

            return res.json({
                success: true,
                message: 'Fallo de entrega registrado',
                data: {
                    shipment_id: shipment_id,
                    numero_envio: numero_envio,
                    motivo: motivo_rechazo
                }
            });
        } catch (error) {
            console.error('Error al reportar fallo:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al reportar fallo',
                error: error.message
            });
        }
    }

    /**
     * Obtener estadísticas de seguimiento
     */
    getTrackingStats(req, res) {
        try {
            const { shipment_id } = req.params;

            if (!shipment_id) {
                return res.status(400).json({
                    success: false,
                    message: 'shipment_id es requerido'
                });
            }

            // En un escenario real, obtendrías estadísticas de la BD
            return res.json({
                success: true,
                data: {
                    shipment_id: shipment_id,
                    total_distance: 0,
                    total_time: 0,
                    avg_speed: 0,
                    max_speed: 0,
                    points_count: 0,
                    route_efficiency: 0,
                    message: 'Obtén estadísticas de la base de datos'
                }
            });
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas',
                error: error.message
            });
        }
    }

    /**
     * Finalizar seguimiento
     */
    endTracking(req, res) {
        try {
            const {
                shipment_id,
                numero_envio,
                cliente_id,
                chofer_id,
                distancia_total,
                tiempo_total
            } = req.body;

            if (!shipment_id) {
                return res.status(400).json({
                    success: false,
                    message: 'shipment_id es requerido'
                });
            }

            console.log(`⏹️ Finalizando seguimiento: ${numero_envio}`);

            // Notificar al cliente que finalizó el seguimiento
            socketRepository.emitToUser(cliente_id, 'tracking_ended', {
                shipment_id: shipment_id,
                numero_envio: numero_envio,
                distancia_total: distancia_total,
                tiempo_total: tiempo_total,
                message: '✅ El seguimiento ha finalizado',
                timestamp: new Date().toISOString()
            });

            return res.json({
                success: true,
                message: 'Seguimiento finalizado correctamente',
                data: {
                    shipment_id: shipment_id,
                    distancia_total: distancia_total,
                    tiempo_total: tiempo_total
                }
            });
        } catch (error) {
            console.error('Error al finalizar seguimiento:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al finalizar seguimiento',
                error: error.message
            });
        }
    }
}

export default new TrackingController();
