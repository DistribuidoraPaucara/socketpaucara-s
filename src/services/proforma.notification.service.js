import notificationService from './notification.service.js';
import activeUsersRepository from '../repositories/activeUsers.repository.js';
import socketRepository from '../repositories/socket.repository.js';
import { validateProformaEstado } from '../utils/state-validator.js';

/**
 * Servicio especializado para notificaciones de proformas
 * Maneja el filtrado por rol y emite a los usuarios correspondientes
 */
class ProformaNotificationService {
  /**
   * Notificar cuando se crea una proforma
   * Destinatarios: Preventistas, Cajeros, Managers, Admins
   * Fase 2: Ahora valida el estado contra la BD centralizada
   */
  async notifyProformaCreated(data) {
    // Destructuring con valores por defecto
    let {
      id,
      numero,
      cliente_id,
      cliente = {},
      total,
      items = [],
      fecha_creacion,
      fecha_vencimiento,
      estado = 'PENDIENTE',
      usuario_creador = {}
    } = data;

    // Fase 2: Validar estado contra estados centralizados
    const validation = await validateProformaEstado(estado);
    if (!validation.valid) {
      console.warn(`⚠️  Estado inválido en proforma: ${estado}. Usando fallback: PENDIENTE`);
      estado = 'PENDIENTE';
    } else {
      console.log(`✅ Estado de proforma validado: ${estado}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 Notificación: Proforma Creada');
    console.log(`   Proforma: ${numero} (ID: ${id})`);
    console.log(`   Cliente: ${cliente?.nombre} ${cliente?.apellido} (ID: ${cliente_id})`);
    console.log(`   Total: ${total}`);
    console.log(`   Items: ${items?.length || 0}`);
    console.log(`   Fecha Creación: ${fecha_creacion}`);
    console.log(`   Fecha Vencimiento: ${fecha_vencimiento || 'Sin vencimiento'}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Preparar datos para emitir
    const notificationData = {
      proforma_id: id,
      proforma_numero: numero,
      numero: numero,
      cliente_id: cliente_id,
      cliente: cliente,
      usuario_creador: usuario_creador,
      total: total || 0,
      items: items || [],
      items_count: items?.length || 0,
      fecha_creacion: fecha_creacion,
      fecha_vencimiento: fecha_vencimiento,
      estado: estado,
      timestamp: new Date().toISOString(),
    };

    // Emitir a los grupos que deben recibir esta notificación
    // Profesionales: preventista, cajero, manager, admin
    // ✅ NORMALIZAR ROLES A MINÚSCULAS para evitar case-sensitivity
    const targetRoles = ['preventista', 'cajero', 'manager', 'admin'];

    // ✅ DEDUPLICACIÓN: Emitir a salas de roles profesionales
    // El usuario recibe UNA VEZ en cada sala a la que pertenece
    // (aunque tenga múltiples roles, cada sala emite solo una vez)
    for (const role of targetRoles) {
      const room = `${role}s`; // preventistas, cajeros, managers, admins
      socketRepository.emitToRoom(room, 'proforma.creada', notificationData);
      console.log(`   ✅ Enviado a sala profesional: ${room}`);
    }

    // ❌ NO emitir además al usuario directo (evita duplicación)
    // Si el usuario es profesional, ya recibe la notificación por sus roles
    // Si es cliente puro, entra en la siguiente sección

    // ✅ SOLO para clientes PUROS (sin roles profesionales):
    // Notificar al cliente propietario por su user_id
    const user_id = data.user_id || data.cliente?.user_id;

    // Verificar si el usuario es un cliente puro (no tiene roles profesionales)
    // Los clientes puros NO estarán en ninguna sala de roles (preventista, cajero, etc.)
    // por lo que necesitan recibir la notificación de forma directa
    if (user_id) {
      // ✅ Solo enviar al usuario directo si NO es un usuario profesional
      // (Los usuarios profesionales ya recibieron la notificación por sus salas de roles)
      // Por ahora, SIEMPRE enviar al usuario directo para clientes que crean proformas
      socketRepository.emitToUser(user_id, 'proforma.creada', notificationData);
      console.log(`   ✅ Enviado a cliente directo (user_id): ${user_id}`);
    } else {
      console.warn(`   ⚠️  No se pudo enviar al cliente: user_id no disponible (cliente_id: ${cliente_id})`);
    }

    return true;
  }

  /**
   * ✅ CORREGIDO: Notificar cuando se aprueba una proforma
   * Criterio: SOLO el cliente propietario + Preventista que la creó
   *
   * Son los dos usuarios clave:
   * - Cliente: Quiere saber que su proforma fue aprobada
   * - Preventista: Quiere saber que la proforma que creó fue aprobada
   */
  notifyProformaApproved(data) {
    const {
      id,
      numero,
      proforma_numero = numero,
      cliente_id,
      cliente_nombre,
      cliente = {},
      total,
      usuario_aprobador = {},
      usuario_creador_id = null,  // ID del preventista que creó la proforma
      user_id = null,  // ID del cliente
    } = data;

    // ✅ NUEVO: Extraer nombre del cliente (puede venir como cliente_nombre o de cliente.nombre)
    const clienteName = cliente_nombre || cliente?.nombre || 'Cliente';

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Notificación: Proforma Aprobada');
    console.log(`   Proforma: ${proforma_numero} (ID: ${id})`);
    console.log(`   Aprobador: ${usuario_aprobador?.name || 'Sistema'}`);
    console.log(`   Cliente: ${clienteName} (ID: ${cliente_id})`);
    console.log(`   User ID: ${user_id}`);
    console.log(`   Usuario Creador ID: ${usuario_creador_id}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    const notificationData = {
      proforma_id: id,
      numero: proforma_numero,
      cliente_id: cliente_id,
      cliente_nombre: clienteName,
      cliente: cliente,
      total: total,
      usuario_aprobador: usuario_aprobador,
      message: '🎉 Tu proforma ha sido aprobada',
      type: 'success',
      timestamp: new Date().toISOString(),
    };

    // ✅ 1. Notificar al CLIENTE propietario
    if (user_id) {
      socketRepository.emitToUser(user_id, 'proforma.aprobada', {
        ...notificationData,
        user_id: user_id,
      });
      console.log(`   ✅ Enviado a cliente directo (user_id): ${user_id}`);
    } else {
      console.warn(`   ⚠️  No se pudo enviar al cliente: user_id no disponible (cliente_id: ${cliente_id})`);
    }

    // ✅ 2. Notificar al PREVENTISTA que creó la proforma
    if (usuario_creador_id) {
      socketRepository.emitToUser(usuario_creador_id, 'proforma.aprobada', {
        ...notificationData,
        user_id: usuario_creador_id,
      });
      console.log(`   ✅ Enviado a preventista creador (user_id): ${usuario_creador_id}`);
    }

    return true;
  }

  /**
   * ✅ CORREGIDO: Notificar cuando se rechaza una proforma
   * Criterio: SOLO el cliente propietario + Preventista que la creó
   *
   * Son los dos usuarios clave:
   * - Cliente: DEBE saber que su proforma fue rechazada
   * - Preventista: DEBE saber que la proforma que creó fue rechazada
   */
  notifyProformaRejected(data) {
    const {
      id,
      numero,
      proforma_numero = numero,
      cliente_id,
      cliente = {},
      motivo_rechazo,
      usuario_creador_id = null,  // ID del preventista que creó la proforma
      user_id = null,  // ID del cliente
    } = data;

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('❌ Notificación: Proforma Rechazada');
    console.log(`   Proforma: ${proforma_numero} (ID: ${id})`);
    console.log(`   Cliente: ${cliente?.nombre} (ID: ${cliente_id})`);
    console.log(`   Motivo: ${motivo_rechazo || 'No especificado'}`);
    console.log(`   User ID: ${user_id}`);
    console.log(`   Usuario Creador ID: ${usuario_creador_id}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    const notificationData = {
      proforma_id: id,
      numero: proforma_numero,
      cliente_id: cliente_id,
      cliente: cliente,
      motivo_rechazo: motivo_rechazo,
      message: '❌ Tu proforma ha sido rechazada',
      type: 'error',
      timestamp: new Date().toISOString(),
    };

    // ✅ 1. Notificar al CLIENTE propietario
    if (user_id) {
      socketRepository.emitToUser(user_id, 'proforma.rechazada', {
        ...notificationData,
        user_id: user_id,
      });
      console.log(`   ✅ Enviado a cliente directo (user_id): ${user_id}`);
    } else {
      console.warn(`   ⚠️  No se pudo enviar al cliente: user_id no disponible (cliente_id: ${cliente_id})`);
    }

    // ✅ 2. Notificar al PREVENTISTA que creó la proforma
    if (usuario_creador_id) {
      socketRepository.emitToUser(usuario_creador_id, 'proforma.rechazada', {
        ...notificationData,
        user_id: usuario_creador_id,
      });
      console.log(`   ✅ Enviado a preventista creador (user_id): ${usuario_creador_id}`);
    }

    return true;
  }

  /**
   * ✅ CORREGIDO: Notificar cuando se convierte una proforma a venta
   * Criterio: Cliente propietario + Preventista que la creó
   *
   * Son los dos usuarios clave:
   * - Cliente: "Tu proforma ha sido convertida a venta"
   * - Preventista: "La proforma que creaste fue convertida a venta"
   */
  notifyProformaConverted(data) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎉 Notificación: Proforma Convertida a Venta');
    console.log(`   Proforma: ${data.proforma_numero}`);
    console.log(`   Venta: ${data.venta_numero}`);
    console.log(`   Cliente: ${data.cliente_nombre} (ID: ${data.cliente_id})`);
    console.log(`   User ID: ${data.user_id}`);
    console.log(`   Usuario Creador ID: ${data.usuario_creador_id}`);
    console.log(`   Total: ${data.total}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    const notificationData = {
      proforma_id: data.proforma_id,
      proforma_numero: data.proforma_numero,
      venta_id: data.venta_id,
      venta_numero: data.venta_numero,
      total: data.total,
      cliente_id: data.cliente_id,
      cliente_nombre: data.cliente_nombre,
      type: 'success',
      notificationType: 'proforma_converted',
      timestamp: new Date().toISOString(),
    };

    // 1. ✅ Notificar al CLIENTE propietario
    const user_id = data.user_id;
    if (user_id) {
      socketRepository.emitToUser(user_id, 'proforma.convertida', {
        ...notificationData,
        user_id: user_id,
        message: '🎉 Tu proforma ha sido convertida a venta. Tu pedido está siendo procesado.',
      });
      console.log(`   ✅ Enviado a cliente directo (user_id): ${user_id}`);
    } else {
      console.warn(`   ⚠️  No se pudo enviar al cliente: user_id no disponible (cliente_id: ${data.cliente_id})`);
    }

    // 2. ✅ Notificar al PREVENTISTA que creó la proforma
    const usuario_creador_id = data.usuario_creador_id;
    if (usuario_creador_id) {
      socketRepository.emitToUser(usuario_creador_id, 'proforma.convertida', {
        ...notificationData,
        user_id: usuario_creador_id,
        message: '✅ La proforma que creaste ha sido convertida a venta',
      });
      console.log(`   ✅ Enviado a preventista creador (user_id): ${usuario_creador_id}`);
    }

    return true;
  }

  /**
   * ✅ Notificar DIRECTAMENTE al cliente cuando su proforma se convierte a venta
   * Usa user_id para enrutamiento correcto en WebSocket
   * CRÍTICO: user_id es el ID real del usuario conectado, cliente_id es solo referencia
   */
  notifyClientProformaConverted(data) {
    console.log('🎉 Notificación DIRECTA: Cliente - Proforma Convertida a Venta');
    console.log(`   Cliente: ${data.cliente_nombre} (ID: ${data.cliente_id})`);
    console.log(`   User ID: ${data.user_id || 'NO ESPECIFICADO'}`);
    console.log(`   Proforma: ${data.proforma_numero}`);
    console.log(`   Venta: ${data.venta_numero}`);
    console.log(`   Total: ${data.total}`);

    // ✅ CRÍTICO: Usar user_id para enrutamiento correcto
    // Si no hay user_id, fallar gracefully pero avisar
    const targetUserId = data.user_id;

    if (!targetUserId) {
      console.error('❌ No se puede enviar notificación al cliente: user_id no especificado');
      console.error('   cliente_id: ' + data.cliente_id);
      console.error('   ⚠️  Asegúrate de que el cliente tiene un user_id asociado en la BD');
      return false;
    }

    socketRepository.emitToUser(targetUserId, 'proforma.convertida', {
      proforma_id: data.proforma_id,
      proforma_numero: data.proforma_numero,
      venta_id: data.venta_id,
      venta_numero: data.venta_numero,
      cliente_id: data.cliente_id,
      user_id: targetUserId,
      cliente_nombre: data.cliente_nombre,
      total: data.total,
      fecha_conversion: data.fecha_conversion,
      message: '🎉 Tu proforma ha sido convertida a venta. Tu pedido está siendo procesado.',
      type: 'success',
      notificationType: 'proforma_converted',
      timestamp: new Date().toISOString(),
    });
    console.log(`   ✅ Notificación enviada al cliente (user_id): ${targetUserId}`);
    return true;
  }

  /**
   * Notificar sobre stock reservado para una proforma
   * Destinatarios: Managers, Admins
   */
  notifyStockReserved(data) {
    console.log('📦 Notificación: Stock Reservado');
    console.log(`   Proforma: ${data.proforma_numero}`);
    console.log(`   Items: ${data.items?.length || 0}`);

    const targetRoles = ['manager', 'admin'];

    for (const role of targetRoles) {
      const room = `${role}s`;
      socketRepository.emitToRoom(room, 'proforma.stock_reservado', {
        ...data,
        notificationId: data.proforma_id,
        timestamp: new Date().toISOString(),
      });
      console.log(`   ✅ Enviado a sala: ${room}`);
    }

    return true;
  }

  /**
   * Notificar cuando una reserva está a punto de vencer
   * Destinatarios: Managers, Admins
   */
  notifyReservationExpiring(data) {
    console.log('⏰ Notificación: Reserva por Vencer');
    console.log(`   Proforma: ${data.proforma_numero}`);
    console.log(`   Vence en: ${data.minutes_remaining} minutos`);

    const targetRoles = ['manager', 'admin'];

    for (const role of targetRoles) {
      const room = `${role}s`;
      socketRepository.emitToRoom(room, 'proforma.reserva_venciendo', {
        ...data,
        notificationId: data.proforma_id,
        timestamp: new Date().toISOString(),
      });
      console.log(`   ✅ Enviado a sala: ${room}`);
    }

    return true;
  }

  /**
   * ✅ NUEVO: Notificar cuando se actualiza una proforma
   * Destinatarios: Preventistas, Managers, Admins, Cliente
   */
  notifyProformaUpdated(data) {
    const {
      id,
      numero,
      cliente_id,
      cliente = {},
      total,
      items = [],
      fecha_entrega_solicitada,
      hora_entrega_solicitada,
      hora_entrega_solicitada_fin,
      subtotal,
      impuesto,
      estado = 'PENDIENTE',
    } = data;

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📝 Notificación: Proforma Actualizada');
    console.log(`   Proforma: ${numero} (ID: ${id})`);
    console.log(`   Cliente: ${cliente?.nombre} (ID: ${cliente_id})`);
    console.log(`   Total: ${total}`);
    console.log(`   Items: ${items?.length || 0}`);
    console.log(`   Fecha Entrega: ${fecha_entrega_solicitada}`);
    console.log(`   Hora: ${hora_entrega_solicitada} - ${hora_entrega_solicitada_fin}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Preparar datos para emitir
    const notificationData = {
      proforma_id: id,
      numero: numero,
      cliente_id: cliente_id,
      cliente: cliente,
      total: total || 0,
      subtotal: subtotal || 0,
      impuesto: impuesto || 0,
      items: items || [],
      items_count: items?.length || 0,
      fecha_entrega_solicitada: fecha_entrega_solicitada,
      hora_entrega_solicitada: hora_entrega_solicitada,
      hora_entrega_solicitada_fin: hora_entrega_solicitada_fin,
      estado: estado,
      timestamp: new Date().toISOString(),
    };

    // ✅ NORMALIZAR ROLES A MINÚSCULAS para evitar case-sensitivity
    const targetRoles = ['preventista', 'manager', 'admin'];

    // Emitir a roles específicos
    for (const role of targetRoles) {
      const room = `${role}s`; // preventistas, managers, admins
      socketRepository.emitToRoom(room, 'proforma.actualizada', notificationData);
      console.log(`   ✅ Enviado a sala: ${room}`);
    }

    // ✅ Notificar al cliente directo usando user_id
    const user_id = data.user_id || data.cliente?.user_id;
    if (user_id) {
      socketRepository.emitToUser(user_id, 'proforma.actualizada', {
        ...notificationData,
        user_id: user_id,
        message: '🔄 Tu proforma ha sido actualizada',
      });
      console.log(`   ✅ Enviado a cliente directo (user_id): ${user_id}`);
    } else {
      console.warn(`   ⚠️  No se pudo enviar al cliente: user_id no disponible (cliente_id: ${cliente_id})`);
    }

    return true;
  }

  /**
   * Obtener usuarios activos por rol
   */
  getUsersByRole(role) {
    const allUsers = activeUsersRepository.getAllUsers();
    return allUsers.filter((user) => user.userType === role);
  }

  /**
   * Obtener estadísticas de usuarios conectados
   */
  getConnectedStats() {
    const allUsers = activeUsersRepository.getAllUsers();

    const stats = {
      total: allUsers.length,
      by_role: {},
      users: allUsers.map((u) => ({
        userId: u.userId,
        userName: u.userName,
        userType: u.userType,
        socketId: u.socketId,
        connectedAt: u.connectedAt,
      })),
    };

    // Contar por rol
    for (const user of allUsers) {
      const role = user.userType || 'unknown';
      stats.by_role[role] = (stats.by_role[role] || 0) + 1;
    }

    return stats;
  }

  /**
   * Registrar notificación crítica en log
   */
  logCriticalNotification(event, data) {
    const timestamp = new Date().toISOString();
    console.log(`🔴 CRITICAL NOTIFICATION - ${timestamp}`);
    console.log(`   Event: ${event}`);
    console.log(`   Data:`, JSON.stringify(data, null, 2));
  }
}

export default new ProformaNotificationService();
