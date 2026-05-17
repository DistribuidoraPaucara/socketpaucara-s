import authService from '../services/auth.service.js';
import socketRepository from '../repositories/socket.repository.js';
import activeUsersRepository from '../repositories/activeUsers.repository.js';
import shipmentService from '../services/shipment.service.js';

class SocketController {
    // Obtener IP real del cliente
    getClientIP(socket) {
        // Intentar obtener IP de headers si está detrás de proxy
        const forwarded = socket.handshake.headers['x-forwarded-for'];
        if (forwarded) {
            // x-forwarded-for puede contener múltiples IPs separadas por coma
            return forwarded.split(',')[0].trim();
        }

        // Obtener IP directa del socket
        const address = socket.handshake.address;
        // Convertir IPv6 localhost a IPv4
        if (address === '::1' || address === '::ffff:127.0.0.1') {
            return '127.0.0.1';
        }
        // Remover prefijo IPv6 si existe
        return address.replace('::ffff:', '');
    }

    // Manejar conexión de socket
    handleConnection(socket) {
        const clientIP = this.getClientIP(socket);
        console.log(`\n🔌 Nueva conexión:`);
        console.log(`   Socket ID: ${socket.id}`);
        console.log(`   IP Cliente: ${clientIP}`);
        console.log(`   User-Agent: ${socket.handshake.headers['user-agent'] || 'N/A'}`);

        // Evento de autenticación del usuario
        socket.on('authenticate', async (data) => {
            const result = await authService.authenticateUser(socket, data);

            if (result.success) {
                socket.emit('authenticated', result);
            } else {
                socket.emit('authentication_error', result);
            }
        });

        // Evento de ciclo de vida de crédito
        socket.on('credit_lifecycle', (data) => {
            this.handleCreditLifecycle(socket, data);
        });

        // Evento de notificación de crédito (compatibilidad)
        socket.on('credit_notification', (data) => {
            this.handleCreditNotificationSocket(socket, data);
        });

        // Evento de actualización de pago
        socket.on('payment_update', (data) => {
            this.handlePaymentUpdate(socket, data);
        });

        // Evento de notificación de ruta
        socket.on('route_notification', (data) => {
            this.handleRouteNotification(socket, data);
        });

        // Evento de enviar mensaje
        socket.on('send_message', (data) => {
            this.handleSendMessage(socket, data);
        });

        // Evento de actualización de ubicación
        socket.on('location_update', (data) => {
            this.handleLocationUpdate(socket, data);
        });

        // ========== EVENTOS DE ENVÍO Y LOGÍSTICA ==========

        // Evento de programación de envío
        socket.on('shipment_scheduled', (data) => {
            this.handleShipmentScheduled(socket, data);
        });

        // Evento de inicio de preparación
        socket.on('shipment_preparation_started', (data) => {
            this.handleShipmentPreparationStarted(socket, data);
        });

        // Evento de salida del almacén
        socket.on('shipment_departed', (data) => {
            this.handleShipmentDeparted(socket, data);
        });

        // Evento de actualización de ubicación de chofer
        socket.on('driver_location_update', (data) => {
            this.handleDriverLocationUpdate(socket, data);
        });

        // Evento de llegada cercana
        socket.on('shipment_arriving_soon', (data) => {
            this.handleShipmentArrivingSoon(socket, data);
        });

        // Evento de entrega completada
        socket.on('shipment_delivered', (data) => {
            this.handleShipmentDelivered(socket, data);
        });

        // Evento de entrega fallida
        socket.on('shipment_delivery_failed', (data) => {
            this.handleShipmentDeliveryFailed(socket, data);
        });

        // Evento de cambio de estado de vehículo
        socket.on('vehicle_status_changed', (data) => {
            this.handleVehicleStatusChanged(socket, data);
        });

        // Evento de evento de ruta
        socket.on('route_event', (data) => {
            this.handleRouteEvent(socket, data);
        });

        // ========== EVENTOS DE DASHBOARD DE ENTREGAS ==========

        // Evento de solicitud de estadísticas de entregas
        socket.on('entregas:get-stats', (data) => {
            this.handleGetEntregasStats(socket, data);
        });

        // Evento de desconexión
        socket.on('disconnect', () => {
            this.handleDisconnect(socket);
        });

        // Manejar errores
        socket.on('error', (error) => {
            console.error('Error en socket:', error);
        });
    }

    // Manejar ciclo de vida de crédito
    handleCreditLifecycle(socket, data) {
        const { action, creditId, targetUserId, credit, userType, message } = data;
        const user = activeUsersRepository.getUserBySocketId(socket.id);

        console.log(`🏦 Credit lifecycle event: ${action}`, {
            creditId,
            from: user?.userName,
            targetUserId
        });

        const notificationData = {
            action: action,
            creditId: creditId,
            credit: credit,
            message: message,
            timestamp: new Date().toISOString(),
            from: user ? { id: user.userId, name: user.userName, type: user.userType } : null
        };

        // Enviar a usuario específico si corresponde
        if (targetUserId) {
            socketRepository.emitToUser(targetUserId, 'credit_lifecycle_update', notificationData);
            console.log(`📨 Credit lifecycle sent to user ${targetUserId}`);
        }

        // Enviar a grupos según el tipo de acción
        switch (action) {
            case 'created':
                socketRepository.emitToRoom('managers', 'credit_pending_approval', notificationData);
                break;
            case 'approved':
            case 'rejected':
                socketRepository.emitToRoom('cobradores', 'credit_decision', notificationData);
                if (targetUserId) {
                    socketRepository.emitToUser(targetUserId, 'credit_decision', notificationData);
                }
                break;
            case 'delivered':
                socketRepository.emitToRoom('managers', 'credit_delivered_notification', notificationData);
                break;
            case 'requires_attention':
                if (targetUserId) {
                    socketRepository.emitToUser(targetUserId, 'credit_attention_required', notificationData);
                } else {
                    socketRepository.emitToRoom('cobradores', 'credit_attention_required', notificationData);
                }
                break;
        }
    }

    // Manejar notificación de crédito desde socket
    handleCreditNotificationSocket(socket, data) {
        const { targetUserId, notification, userType } = data;
        const user = activeUsersRepository.getUserBySocketId(socket.id);

        const payload = {
            ...notification,
            from: user ? { id: user.userId, name: user.userName, type: user.userType } : null,
            timestamp: new Date().toISOString(),
        };

        if (targetUserId) {
            socketRepository.emitToUser(targetUserId, 'new_credit_notification', payload);
            console.log(`📨 credit_notification reenviado a user_${targetUserId}`);
        } else if (userType) {
            socketRepository.emitToRoom(`${userType}s`, 'new_credit_notification', payload);
            console.log(`📨 credit_notification reenviado a grupo ${userType}s`);
        } else {
            socketRepository.emitToAll('new_credit_notification', payload);
            console.log(`📨 credit_notification broadcast`);
        }
    }

    // Manejar actualización de pago
    handlePaymentUpdate(socket, data) {
        const { payment, cobradorId, clientId } = data || {};
        const user = activeUsersRepository.getUserBySocketId(socket.id);

        const payload = {
            type: 'payment_update',
            payment: payment,
            cobradorId: cobradorId || user?.userId,
            clientId: clientId,
            from: user ? { id: user.userId, name: user.userName, type: user.userType } : null,
            timestamp: new Date().toISOString(),
        };

        // Notificar al cobrador mismo y a los managers
        if (payload.cobradorId) {
            socketRepository.emitToUser(payload.cobradorId, 'payment_received', payload);
        }
        socketRepository.emitToRoom('managers', 'cobrador_payment_received', payload);
        console.log(`💰 payment_update reenviado (cobrador ${payload.cobradorId ?? 'N/A'})`);
    }

    // Manejar notificación de ruta
    handleRouteNotification(socket, data) {
        const payload = {
            ...data,
            timestamp: new Date().toISOString(),
        };
        socketRepository.emitToRoom('managers', 'route_updated', payload);
        socket.emit('route_updated', payload);
        console.log('🛣️ route_notification reenviado');
    }

    // Manejar envío de mensaje
    handleSendMessage(socket, data) {
        const { recipientId, message, senderId } = data;

        socketRepository.emitToUser(recipientId, 'new_message', {
            senderId,
            message,
            timestamp: new Date()
        });

        console.log(`Mensaje enviado de ${senderId} a ${recipientId}`);
    }

    // Manejar actualización de ubicación
    handleLocationUpdate(socket, data) {
        const user = activeUsersRepository.getUserBySocketId(socket.id);

        if (user && user.userType === 'cobrador') {
            const { latitude, longitude } = data;

            socketRepository.emitToRoom('admins', 'cobrador_location_update', {
                cobradorId: user.userId,
                cobradorName: user.userName,
                latitude,
                longitude,
                timestamp: new Date()
            });

            console.log(`Ubicación actualizada para cobrador ${user.userName}`);
        }
    }

    // Manejar desconexión
    handleDisconnect(socket) {
        const userData = authService.handleDisconnect(socket.id);

        if (userData) {
            socketRepository.broadcast(socket, 'user_disconnected', userData);
        }
    }

    // ========================================
    // MANEJADORES DE ENVÍO Y LOGÍSTICA
    // ========================================

    // Manejar programación de envío
    handleShipmentScheduled(socket, data) {
        const user = activeUsersRepository.getUserBySocketId(socket.id);

        console.log(`📦 Programación de envío: ${data.numero_envio}`);

        // Llamar al servicio para enviar notificaciones
        shipmentService.notifyShipmentScheduled(data);

        // Confirmar al emisor
        socket.emit('shipment_scheduled_confirmed', {
            success: true,
            shipment_id: data.id,
            numero_envio: data.numero_envio,
            message: 'Envío programado correctamente',
            timestamp: new Date().toISOString()
        });

        return true;
    }

    // Manejar inicio de preparación
    handleShipmentPreparationStarted(socket, data) {
        const user = activeUsersRepository.getUserBySocketId(socket.id);

        console.log(`🔄 Preparación iniciada: ${data.numero_envio}`);

        shipmentService.notifyShipmentPreparationStarted(data);

        socket.emit('shipment_preparation_started_confirmed', {
            success: true,
            shipment_id: data.id,
            numero_envio: data.numero_envio,
            message: 'Preparación iniciada correctamente',
            timestamp: new Date().toISOString()
        });

        return true;
    }

    // Manejar salida del almacén
    handleShipmentDeparted(socket, data) {
        const user = activeUsersRepository.getUserBySocketId(socket.id);

        console.log(`🚛 Salida del almacén: ${data.numero_envio}`);

        shipmentService.notifyShipmentDeparted(data);

        socket.emit('shipment_departed_confirmed', {
            success: true,
            shipment_id: data.id,
            numero_envio: data.numero_envio,
            message: 'Salida del almacén confirmada',
            timestamp: new Date().toISOString()
        });

        // Unir al chofer a una sala de seguimiento
        if (data.chofer?.id) {
            socketRepository.joinRoom(socket, `shipment_${data.id}`);
            socketRepository.joinRoom(socket, `driver_${data.chofer.id}`);
        }

        return true;
    }

    // Manejar actualización de ubicación del chofer
    handleDriverLocationUpdate(socket, data) {
        const user = activeUsersRepository.getUserBySocketId(socket.id);

        // Solo chofers pueden actualizar su ubicación
        if (user && user.userType === 'chofer') {
            const {
                shipment_id,
                numero_envio,
                cliente_id,
                latitude,
                longitude,
                precisión,
                velocidad,
                dirección
            } = data;

            console.log(`📍 Ubicación actualizada: Chofer ${user.userName} - Lat: ${latitude}, Lng: ${longitude}`);

            // Actualizar ubicación
            shipmentService.updateDriverLocation({
                shipment_id: shipment_id,
                chofer_id: user.userId,
                numero_envio: numero_envio,
                cliente_id: cliente_id,
                latitude: latitude,
                longitude: longitude,
                precisión: precisión,
                velocidad: velocidad,
                dirección: dirección,
                timestamp: new Date().toISOString()
            });

            // Enviar confirmación al chofer
            socket.emit('location_update_received', {
                success: true,
                message: 'Ubicación actualizada',
                timestamp: new Date().toISOString()
            });
        } else {
            socket.emit('location_update_error', {
                success: false,
                message: 'Solo los choferes pueden actualizar su ubicación',
                timestamp: new Date().toISOString()
            });
        }

        return true;
    }

    // Manejar llegada cercana
    handleShipmentArrivingSoon(socket, data) {
        const user = activeUsersRepository.getUserBySocketId(socket.id);

        console.log(`📍 Llegada cercana: ${data.numero_envio}`);

        shipmentService.notifyShipmentArriving(data);

        socket.emit('shipment_arriving_soon_confirmed', {
            success: true,
            message: 'Notificación de llegada enviada',
            timestamp: new Date().toISOString()
        });

        return true;
    }

    // Manejar entrega completada
    handleShipmentDelivered(socket, data) {
        const user = activeUsersRepository.getUserBySocketId(socket.id);

        console.log(`✅ Entrega completada: ${data.numero_envio}`);

        shipmentService.notifyShipmentDelivered(data);

        socket.emit('shipment_delivered_confirmed', {
            success: true,
            shipment_id: data.id,
            numero_envio: data.numero_envio,
            message: 'Entrega confirmada correctamente',
            timestamp: new Date().toISOString()
        });

        // Salir de las salas de seguimiento
        if (data.id) {
            socketRepository.leaveRoom(socket, `shipment_${data.id}`);
        }
        if (user?.userId) {
            socketRepository.leaveRoom(socket, `driver_${user.userId}`);
        }

        return true;
    }

    // Manejar entrega fallida
    handleShipmentDeliveryFailed(socket, data) {
        const user = activeUsersRepository.getUserBySocketId(socket.id);

        console.log(`❌ Entrega fallida: ${data.numero_envio} - Motivo: ${data.motivo_rechazo}`);

        shipmentService.notifyShipmentDeliveryFailed(data);

        socket.emit('shipment_delivery_failed_confirmed', {
            success: true,
            shipment_id: data.id,
            numero_envio: data.numero_envio,
            message: 'Fallo de entrega registrado',
            timestamp: new Date().toISOString()
        });

        return true;
    }

    // Manejar cambio de estado de vehículo
    handleVehicleStatusChanged(socket, data) {
        const user = activeUsersRepository.getUserBySocketId(socket.id);

        console.log(`🚗 Estado de vehículo actualizado: ${data.placa} → ${data.estado_nuevo}`);

        shipmentService.notifyVehicleStatusChanged(data);

        socket.emit('vehicle_status_changed_confirmed', {
            success: true,
            vehiculo_id: data.vehiculo_id,
            placa: data.placa,
            estado_nuevo: data.estado_nuevo,
            message: 'Estado del vehículo actualizado',
            timestamp: new Date().toISOString()
        });

        return true;
    }

    // Manejar evento de ruta
    handleRouteEvent(socket, data) {
        const user = activeUsersRepository.getUserBySocketId(socket.id);

        console.log(`🛣️ Evento de ruta: ${data.tipo_evento} - ${data.numero_envio}`);

        shipmentService.notifyRouteEvent(data);

        socket.emit('route_event_received', {
            success: true,
            message: 'Evento de ruta registrado',
            timestamp: new Date().toISOString()
        });

        return true;
    }

    // ========================================
    // MANEJADORES DE DASHBOARD DE ENTREGAS
    // ========================================

    /**
     * Manejar solicitud de estadísticas de entregas
     * El cliente solicita estadísticas cuando se conecta o durante periodic polling fallback
     *
     * @param {Socket} socket - Socket del cliente
     * @param {Object} data - Datos (puede estar vacío)
     */
    async handleGetEntregasStats(socket, data = {}) {
        try {
            const user = activeUsersRepository.getUserBySocketId(socket.id);

            console.log(`📊 [Entregas Stats] Solicitud de estadísticas desde ${user?.userName || 'usuario'}`);

            // Importar aquí para evitar circular dependencies
            const { default: EntregasStatsService } = await import('../services/entregas-stats.service.js');

            // Obtener estadísticas del servicio
            const stats = await EntregasStatsService.fetchStats();

            // Enviar estadísticas al cliente que las solicitó
            socket.emit('entregas:stats-updated', {
                success: true,
                data: stats,
                timestamp: new Date().toISOString(),
                source: 'websocket'
            });

            console.log(`✅ [Entregas Stats] Estadísticas enviadas al cliente ${socket.id}`);

            return true;
        } catch (error) {
            console.error('❌ [Entregas Stats] Error al obtener estadísticas:', error.message);

            socket.emit('entregas:stats-error', {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });

            return false;
        }
    }
}

export default new SocketController();
