import socketRepository from '../repositories/socket.repository.js';

class ShipmentService {

    // ========================================
    // NOTIFICACIONES DE ENVÍOS
    // ========================================

    /**
     * Notificar programación de envío
     * Se envía cuando se programa un envío
     */
    notifyShipmentScheduled(shipmentData) {
        const {
            id,
            numero_envio,
            venta_id,
            venta_numero,
            cliente_id,
            cliente_nombre,
            direccion_entrega,
            fecha_programada,
            vehiculo,
            chofer,
            total
        } = shipmentData;

        console.log(`📦 Envío programado: ${numero_envio} - Cliente ${cliente_id}`);

        // 1. Notificar al cliente
        socketRepository.emitToUser(cliente_id, 'shipment_scheduled', {
            shipment_id: id,
            numero_envio: numero_envio,
            venta_numero: venta_numero,
            direccion_entrega: direccion_entrega,
            fecha_programada: fecha_programada,
            total: total,
            message: `📦 Tu pedido ha sido programado para envío el ${fecha_programada}`,
            type: 'info',
            action_required: false,
            timestamp: new Date().toISOString()
        });

        // 2. Notificar a managers
        socketRepository.emitToRoom('managers', 'new_shipment_scheduled', {
            shipment_id: id,
            numero_envio: numero_envio,
            venta_numero: venta_numero,
            cliente_id: cliente_id,
            cliente_nombre: cliente_nombre,
            direccion_entrega: direccion_entrega,
            fecha_programada: fecha_programada,
            vehiculo: vehiculo,
            chofer: chofer,
            message: `Nuevo envío ${numero_envio} programado`,
            timestamp: new Date().toISOString()
        });

        // 3. Notificar al chofer asignado
        if (chofer?.id) {
            socketRepository.emitToUser(chofer.id, 'new_shipment_assigned', {
                shipment_id: id,
                numero_envio: numero_envio,
                cliente_nombre: cliente_nombre,
                direccion_entrega: direccion_entrega,
                fecha_programada: fecha_programada,
                vehiculo: vehiculo,
                message: `🚗 Tienes un nuevo envío asignado: ${numero_envio}`,
                type: 'info',
                action_required: true,
                timestamp: new Date().toISOString()
            });
        }

        console.log(`✅ Notificaciones enviadas: cliente + managers + chofer`);
        return true;
    }

    /**
     * Notificar que la preparación ha iniciado
     */
    notifyShipmentPreparationStarted(shipmentData) {
        const {
            id,
            numero_envio,
            venta_id,
            cliente_id,
            cliente_nombre,
            items,
            fecha_inicio
        } = shipmentData;

        console.log(`🔄 Preparación iniciada: ${numero_envio}`);

        // 1. Notificar al cliente
        socketRepository.emitToUser(cliente_id, 'shipment_preparation_started', {
            shipment_id: id,
            numero_envio: numero_envio,
            items_count: items?.length || 0,
            fecha_inicio: fecha_inicio,
            message: '🔄 Tu pedido está siendo preparado en el almacén',
            type: 'info',
            action_required: false,
            timestamp: new Date().toISOString()
        });

        // 2. Notificar a managers y personal de almacén
        socketRepository.emitToRoom('managers', 'shipment_preparation_started', {
            shipment_id: id,
            numero_envio: numero_envio,
            cliente_nombre: cliente_nombre,
            items: items,
            fecha_inicio: fecha_inicio,
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Notificación de preparación enviada a cliente + almacén`);
        return true;
    }

    /**
     * Notificar salida del almacén
     */
    notifyShipmentDeparted(shipmentData) {
        const {
            id,
            numero_envio,
            venta_numero,
            cliente_id,
            cliente_nombre,
            direccion_entrega,
            chofer,
            vehiculo,
            fecha_salida,
            ruta_estimada
        } = shipmentData;

        console.log(`🚛 Salida del almacén: ${numero_envio} - Chofer ${chofer?.name}`);

        // 1. Notificar al cliente
        socketRepository.emitToUser(cliente_id, 'shipment_departed', {
            shipment_id: id,
            numero_envio: numero_envio,
            venta_numero: venta_numero,
            chofer_nombre: chofer?.name,
            chofer_telefono: chofer?.telefono,
            vehiculo_placa: vehiculo?.placa,
            vehiculo_marca: vehiculo?.marca,
            fecha_salida: fecha_salida,
            ruta_estimada: ruta_estimada,
            message: `🚛 ¡Tu pedido está en ruta! Te lo llevará ${chofer?.name}`,
            type: 'success',
            action_required: false,
            timestamp: new Date().toISOString()
        });

        // 2. Notificar a managers
        socketRepository.emitToRoom('managers', 'shipment_departed_notification', {
            shipment_id: id,
            numero_envio: numero_envio,
            cliente_id: cliente_id,
            cliente_nombre: cliente_nombre,
            chofer: chofer,
            vehiculo: vehiculo,
            fecha_salida: fecha_salida,
            timestamp: new Date().toISOString()
        });

        // 3. Notificar al chofer (confirmación de salida)
        if (chofer?.id) {
            socketRepository.emitToUser(chofer.id, 'confirmed_departed', {
                shipment_id: id,
                numero_envio: numero_envio,
                direccion_entrega: direccion_entrega,
                cliente_nombre: cliente_nombre,
                message: '✅ Salida confirmada. Dirígete al cliente',
                type: 'success',
                timestamp: new Date().toISOString()
            });
        }

        console.log(`✅ Notificaciones de salida enviadas`);
        return true;
    }

    /**
     * Notificar llegada cercana del envío
     */
    notifyShipmentArriving(shipmentData) {
        const {
            id,
            numero_envio,
            cliente_id,
            cliente_nombre,
            chofer,
            eta_minutos,
            ubicacion_actual
        } = shipmentData;

        console.log(`📍 Llegada cercana: ${numero_envio} - ${eta_minutos} min`);

        // Notificar al cliente con urgencia
        socketRepository.emitToUser(cliente_id, 'shipment_arriving_soon', {
            shipment_id: id,
            numero_envio: numero_envio,
            chofer_nombre: chofer?.name,
            chofer_telefono: chofer?.telefono,
            eta_minutos: eta_minutos,
            ubicacion_actual: ubicacion_actual,
            message: `⏰ ¡El chofer está llegando! Llega en aproximadamente ${eta_minutos} minutos`,
            type: 'warning',
            action_required: true,
            timestamp: new Date().toISOString()
        });

        return true;
    }

    /**
     * Notificar entrega completada
     */
    notifyShipmentDelivered(deliveryData) {
        const {
            id,
            numero_envio,
            venta_numero,
            cliente_id,
            cliente_nombre,
            receptor_nombre,
            receptor_documento,
            fecha_entrega,
            foto_entrega,
            firma_cliente,
            chofer
        } = deliveryData;

        console.log(`✅ Entrega completada: ${numero_envio} - Receptor ${receptor_nombre}`);

        // 1. Notificar al cliente
        socketRepository.emitToUser(cliente_id, 'shipment_delivered', {
            shipment_id: id,
            numero_envio: numero_envio,
            venta_numero: venta_numero,
            receptor_nombre: receptor_nombre,
            receptor_documento: receptor_documento,
            fecha_entrega: fecha_entrega,
            foto_entrega: foto_entrega,
            firma_cliente: firma_cliente,
            message: `✅ ¡Entregado correctamente a ${receptor_nombre}!`,
            type: 'success',
            action_required: false,
            timestamp: new Date().toISOString()
        });

        // 2. Notificar a managers
        socketRepository.emitToRoom('managers', 'shipment_delivery_completed', {
            shipment_id: id,
            numero_envio: numero_envio,
            cliente_id: cliente_id,
            cliente_nombre: cliente_nombre,
            receptor_nombre: receptor_nombre,
            fecha_entrega: fecha_entrega,
            chofer: chofer,
            timestamp: new Date().toISOString()
        });

        return true;
    }

    /**
     * Notificar entrega fallida/rechazada
     */
    notifyShipmentDeliveryFailed(failureData) {
        const {
            id,
            numero_envio,
            cliente_id,
            cliente_nombre,
            motivo_rechazo,
            fecha_intento,
            chofer
        } = failureData;

        console.log(`❌ Entrega fallida: ${numero_envio} - Motivo: ${motivo_rechazo}`);

        // 1. Notificar al cliente
        socketRepository.emitToUser(cliente_id, 'shipment_delivery_failed', {
            shipment_id: id,
            numero_envio: numero_envio,
            motivo_rechazo: motivo_rechazo,
            fecha_intento: fecha_intento,
            chofer_nombre: chofer?.name,
            chofer_telefono: chofer?.telefono,
            message: `❌ No se pudo entregar el envío. Motivo: ${motivo_rechazo}. El chofer se contactará contigo.`,
            type: 'error',
            action_required: true,
            timestamp: new Date().toISOString()
        });

        // 2. Notificar a managers
        socketRepository.emitToRoom('managers', 'shipment_delivery_failed_notification', {
            shipment_id: id,
            numero_envio: numero_envio,
            cliente_id: cliente_id,
            cliente_nombre: cliente_nombre,
            motivo_rechazo: motivo_rechazo,
            fecha_intento: fecha_intento,
            chofer: chofer,
            timestamp: new Date().toISOString()
        });

        return true;
    }

    // ========================================
    // TRACKING EN TIEMPO REAL
    // ========================================

    /**
     * Actualizar ubicación del chofer
     * Se llama continuamente mientras está en ruta
     */
    updateDriverLocation(locationData) {
        const {
            shipment_id,
            chofer_id,
            numero_envio,
            cliente_id,
            latitude,
            longitude,
            precisión,
            velocidad,
            dirección,
            timestamp
        } = locationData;

        // Emitir a cliente específico (para mapa en tiempo real)
        socketRepository.emitToUser(cliente_id, 'driver_location_update', {
            shipment_id: shipment_id,
            numero_envio: numero_envio,
            latitude: latitude,
            longitude: longitude,
            precisión: precisión,
            velocidad: velocidad,
            dirección: dirección,
            timestamp: timestamp || new Date().toISOString()
        });

        // Emitir a managers para seguimiento general
        socketRepository.emitToRoom('managers', 'driver_location_update', {
            shipment_id: shipment_id,
            numero_envio: numero_envio,
            chofer_id: chofer_id,
            latitude: latitude,
            longitude: longitude,
            velocidad: velocidad,
            timestamp: timestamp || new Date().toISOString()
        });

        return true;
    }

    /**
     * Notificar evento de ruta (parada, giro, etc.)
     */
    notifyRouteEvent(routeEventData) {
        const {
            shipment_id,
            numero_envio,
            cliente_id,
            chofer_id,
            tipo_evento, // PARADA, GIRO, DESVIO, DETENCCION_LARGA
            descripcion,
            coordenadas,
            timestamp
        } = routeEventData;

        console.log(`🛣️ Evento de ruta: ${tipo_evento} - Envío ${numero_envio}`);

        // Notificar a managers para monitoreo
        socketRepository.emitToRoom('managers', 'route_event', {
            shipment_id: shipment_id,
            numero_envio: numero_envio,
            chofer_id: chofer_id,
            tipo_evento: tipo_evento,
            descripcion: descripcion,
            coordenadas: coordenadas,
            timestamp: timestamp || new Date().toISOString()
        });

        // Si es un evento importante, notificar al cliente
        if (['DESVIO', 'DETENCCION_LARGA'].includes(tipo_evento)) {
            socketRepository.emitToUser(cliente_id, 'route_event_alert', {
                shipment_id: shipment_id,
                numero_envio: numero_envio,
                tipo_evento: tipo_evento,
                descripcion: descripcion,
                message: `⚠️ ${descripcion}`,
                type: 'warning',
                timestamp: timestamp || new Date().toISOString()
            });
        }

        return true;
    }

    // ========================================
    // NOTIFICACIONES DE ESTADO DE VEHÍCULO
    // ========================================

    /**
     * Notificar cambio de estado de vehículo
     */
    notifyVehicleStatusChanged(vehicleData) {
        const {
            vehiculo_id,
            placa,
            estado_anterior, // DISPONIBLE, EN_RUTA, MANTENIMIENTO, FUERA_SERVICIO
            estado_nuevo,
            chofer,
            envio_numero,
            motivo
        } = vehicleData;

        console.log(`🚗 Estado vehículo ${placa}: ${estado_anterior} → ${estado_nuevo}`);

        // Broadcast a managers
        socketRepository.emitToRoom('managers', 'vehicle_status_changed', {
            vehiculo_id: vehiculo_id,
            placa: placa,
            estado_anterior: estado_anterior,
            estado_nuevo: estado_nuevo,
            chofer: chofer,
            envio_numero: envio_numero,
            motivo: motivo,
            timestamp: new Date().toISOString()
        });

        return true;
    }

    /**
     * Notificar mantenimiento necesario de vehículo
     */
    notifyVehicleMaintenanceNeeded(maintenanceData) {
        const {
            vehiculo_id,
            placa,
            tipo_mantenimiento,
            descripcion,
            urgencia // BAJA, MEDIA, ALTA
        } = maintenanceData;

        console.log(`🔧 Mantenimiento necesario: ${placa} - ${tipo_mantenimiento}`);

        socketRepository.emitToRoom('managers', 'vehicle_maintenance_needed', {
            vehiculo_id: vehiculo_id,
            placa: placa,
            tipo_mantenimiento: tipo_mantenimiento,
            descripcion: descripcion,
            urgencia: urgencia,
            message: `⚠️ Mantenimiento ${urgencia} necesario para ${placa}`,
            timestamp: new Date().toISOString()
        });

        return true;
    }

    // ========================================
    // NOTIFICACIONES DE REPORTES
    // ========================================

    /**
     * Notificar reporte diario de envíos
     */
    notifyDailyShipmentSummary(summaryData) {
        const {
            fecha,
            total_envios,
            completados,
            pendientes,
            fallidos,
            en_ruta
        } = summaryData;

        console.log(`📊 Reporte diario: ${fecha}`);

        socketRepository.emitToRoom('managers', 'daily_shipment_summary', {
            fecha: fecha,
            total_envios: total_envios,
            completados: completados,
            pendientes: pendientes,
            fallidos: fallidos,
            en_ruta: en_ruta,
            porcentaje_completado: (completados / total_envios * 100).toFixed(2),
            timestamp: new Date().toISOString()
        });

        return true;
    }

    /**
     * Notificar reporte de rendimiento de chofer
     */
    notifyDriverPerformanceReport(performanceData) {
        const {
            chofer_id,
            chofer_nombre,
            fecha,
            envios_completados,
            envios_fallidos,
            tiempo_promedio_entrega,
            calificacion_promedio,
            total_km
        } = performanceData;

        console.log(`📈 Reporte de rendimiento: ${chofer_nombre}`);

        socketRepository.emitToUser(chofer_id, 'performance_report', {
            fecha: fecha,
            envios_completados: envios_completados,
            envios_fallidos: envios_fallidos,
            tiempo_promedio_entrega: tiempo_promedio_entrega,
            calificacion_promedio: calificacion_promedio,
            total_km: total_km,
            message: `📊 Tu reporte de hoy: ${envios_completados} entregas completadas`,
            type: 'info',
            timestamp: new Date().toISOString()
        });

        socketRepository.emitToRoom('managers', 'driver_performance_report', {
            chofer_id: chofer_id,
            chofer_nombre: chofer_nombre,
            fecha: fecha,
            envios_completados: envios_completados,
            envios_fallidos: envios_fallidos,
            tiempo_promedio_entrega: tiempo_promedio_entrega,
            calificacion_promedio: calificacion_promedio,
            total_km: total_km,
            timestamp: new Date().toISOString()
        });

        return true;
    }

    // ========================================
    // NOTIFICACIONES DE ALERTAS
    // ========================================

    /**
     * Notificar alerta general
     */
    notifyAlert(alertData) {
        const {
            titulo,
            mensaje,
            nivel, // INFO, WARNING, ERROR, CRITICAL
            destinatarios // 'managers', 'drivers', 'clientes', 'all'
        } = alertData;

        console.log(`🚨 Alerta [${nivel}]: ${titulo}`);

        if (destinatarios === 'all') {
            socketRepository.emitToAll('alert_notification', {
                titulo: titulo,
                mensaje: mensaje,
                nivel: nivel,
                timestamp: new Date().toISOString()
            });
        } else {
            socketRepository.emitToRoom(destinatarios, 'alert_notification', {
                titulo: titulo,
                mensaje: mensaje,
                nivel: nivel,
                timestamp: new Date().toISOString()
            });
        }

        return true;
    }

    /**
     * ✅ NUEVO: Notificar estadísticas actualizadas del chofer
     * Se envía cuando las estadísticas del chofer cambian (nueva entrega, entrega completada, etc.)
     */
    notifyStatsUpdated(statsData) {
        const {
            chofer_id,
            total_entregas,
            entregas_completadas,
            entregas_pendientes,
            entregas_en_ruta,
            tasa_exito,
            km_estimados,
            tiempo_promedio_minutos,
            proxima_entrega
        } = statsData;

        console.log(`📊 Estadísticas actualizadas para chofer ${chofer_id}`);

        // Notificar al chofer específico
        socketRepository.emitToUser(chofer_id, 'estadisticas:actualizadas', {
            total_entregas: total_entregas,
            entregas_completadas: entregas_completadas,
            entregas_pendientes: entregas_pendientes,
            entregas_en_ruta: entregas_en_ruta,
            tasa_exito: tasa_exito,
            km_estimados: km_estimados,
            tiempo_promedio_minutos: tiempo_promedio_minutos,
            proxima_entrega: proxima_entrega,
            timestamp: new Date().toISOString()
        });

        // Notificar a managers también para su dashboard
        socketRepository.emitToRoom('managers', 'driver_stats_updated', {
            chofer_id: chofer_id,
            total_entregas: total_entregas,
            entregas_completadas: entregas_completadas,
            entregas_pendientes: entregas_pendientes,
            entregas_en_ruta: entregas_en_ruta,
            tasa_exito: tasa_exito,
            timestamp: new Date().toISOString()
        });

        return true;
    }
}

export default new ShipmentService();
