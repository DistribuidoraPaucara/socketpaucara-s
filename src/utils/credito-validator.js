/**
 * Validador de payloads de eventos de crédito
 */

/**
 * Validar estructura de crédito creado
 */
export function validateCreditoCreado(data) {
    const errors = [];

    if (!data.cuenta_por_cobrar_id || typeof data.cuenta_por_cobrar_id !== 'number') {
        errors.push('cuenta_por_cobrar_id es requerido y debe ser un número');
    }

    if (!data.cliente_id || typeof data.cliente_id !== 'number') {
        errors.push('cliente_id es requerido y debe ser un número');
    }

    if (!data.venta_id || typeof data.venta_id !== 'number') {
        errors.push('venta_id es requerido y debe ser un número');
    }

    if (!data.monto_original || typeof data.monto_original !== 'number') {
        errors.push('monto_original es requerido y debe ser un número');
    }

    if (!data.fecha_vencimiento) {
        errors.push('fecha_vencimiento es requerido');
    }

    return {
        valid: errors.length === 0,
        errors,
        data: errors.length === 0 ? sanitizeCreditoData(data) : null
    };
}

/**
 * Validar estructura de pago registrado
 */
export function validatePagoRegistrado(data) {
    const errors = [];

    if (!data.pago_id || typeof data.pago_id !== 'number') {
        errors.push('pago_id es requerido y debe ser un número');
    }

    if (!data.cuenta_por_cobrar_id || typeof data.cuenta_por_cobrar_id !== 'number') {
        errors.push('cuenta_por_cobrar_id es requerido y debe ser un número');
    }

    if (!data.monto || typeof data.monto !== 'number') {
        errors.push('monto es requerido y debe ser un número');
    }

    if (!data.cliente_id || typeof data.cliente_id !== 'number') {
        errors.push('cliente_id es requerido y debe ser un número');
    }

    return {
        valid: errors.length === 0,
        errors,
        data: errors.length === 0 ? sanitizePagoData(data) : null
    };
}

/**
 * Validar estructura de crédito vencido
 */
export function validateCreditoVencido(data) {
    const errors = [];

    if (!data.cuenta_por_cobrar_id || typeof data.cuenta_por_cobrar_id !== 'number') {
        errors.push('cuenta_por_cobrar_id es requerido y debe ser un número');
    }

    if (!data.cliente_id || typeof data.cliente_id !== 'number') {
        errors.push('cliente_id es requerido y debe ser un número');
    }

    if (!data.dias_vencido || typeof data.dias_vencido !== 'number') {
        errors.push('dias_vencido es requerido y debe ser un número');
    }

    if (!data.saldo_pendiente || typeof data.saldo_pendiente !== 'number') {
        errors.push('saldo_pendiente es requerido y debe ser un número');
    }

    return {
        valid: errors.length === 0,
        errors,
        data: errors.length === 0 ? sanitizeCreditoData(data) : null
    };
}

/**
 * Validar estructura de crédito crítico
 */
export function validateCreditoCritico(data) {
    const errors = [];

    if (!data.cliente_id || typeof data.cliente_id !== 'number') {
        errors.push('cliente_id es requerido y debe ser un número');
    }

    if (!data.porcentaje_utilizado || typeof data.porcentaje_utilizado !== 'number') {
        errors.push('porcentaje_utilizado es requerido y debe ser un número');
    }

    if (!data.limite_credito || typeof data.limite_credito !== 'number') {
        errors.push('limite_credito es requerido y debe ser un número');
    }

    return {
        valid: errors.length === 0,
        errors,
        data: errors.length === 0 ? data : null
    };
}

/**
 * Sanitizar datos de crédito
 */
function sanitizeCreditoData(data) {
    return {
        cuenta_por_cobrar_id: parseInt(data.cuenta_por_cobrar_id),
        cliente_id: parseInt(data.cliente_id),
        cliente_nombre: String(data.cliente_nombre || 'Cliente'),
        venta_id: parseInt(data.venta_id || 0),
        numero_venta: String(data.numero_venta || ''),
        monto_original: parseFloat(data.monto_original || 0),
        saldo_pendiente: parseFloat(data.saldo_pendiente || data.monto_original || 0),
        fecha_vencimiento: data.fecha_vencimiento,
        dias_vencido: parseInt(data.dias_vencido || 0),
        estado: String(data.estado || 'pendiente'),
        timestamp: data.timestamp || new Date().toISOString()
    };
}

/**
 * Sanitizar datos de pago
 */
function sanitizePagoData(data) {
    return {
        pago_id: parseInt(data.pago_id),
        cuenta_por_cobrar_id: parseInt(data.cuenta_por_cobrar_id),
        cliente_id: parseInt(data.cliente_id),
        cliente_nombre: String(data.cliente_nombre || 'Cliente'),
        monto: parseFloat(data.monto),
        saldo_restante: parseFloat(data.saldo_restante || 0),
        metodo_pago: String(data.metodo_pago || 'efectivo'),
        numero_recibo: String(data.numero_recibo || ''),
        usuario_nombre: String(data.usuario_nombre || 'Sistema'),
        timestamp: data.timestamp || new Date().toISOString()
    };
}

/**
 * Validar evento según tipo
 */
export function validateCreditoEvent(eventType, data) {
    switch (eventType) {
        case 'credito.creado':
            return validateCreditoCreado(data);
        case 'credito.pago_registrado':
            return validatePagoRegistrado(data);
        case 'credito.vencido':
            return validateCreditoVencido(data);
        case 'credito.critico':
            return validateCreditoCritico(data);
        case 'credito.aprobado':
        case 'credito.rechazado':
        case 'credito.limite_actualizado':
            // Validación más simple para estos eventos
            return {
                valid: !!(data.cliente_id),
                errors: data.cliente_id ? [] : ['cliente_id es requerido'],
                data: data
            };
        default:
            return {
                valid: false,
                errors: [`Tipo de evento desconocido: ${eventType}`],
                data: null
            };
    }
}
