/**
 * State Validator Utility
 *
 * Funciones para validar estados logísticos
 * Se usa antes de procesar eventos con estados
 *
 * Implementación de la Fase 2
 */

import estadoManager from '../services/estado-manager.service.js';

/**
 * Validar estado de proforma
 * @param {string} estado - Código de estado
 * @returns {Promise<{valid: boolean, message: string, estado: Object|null}>}
 */
export async function validateProformaEstado(estado) {
    if (!estado) {
        return {
            valid: false,
            message: 'Estado no proporcionado',
            estado: null
        };
    }

    const isValid = await estadoManager.isValidEstado('proforma', estado);

    if (isValid) {
        const estadoData = await estadoManager.getEstadoPorCodigo('proforma', estado);
        return {
            valid: true,
            message: `Estado válido: ${estado}`,
            estado: estadoData
        };
    }

    return {
        valid: false,
        message: `Estado inválido para proforma: ${estado}`,
        estado: null
    };
}

/**
 * Validar estado de entrega
 * @param {string} estado - Código de estado
 * @returns {Promise<{valid: boolean, message: string, estado: Object|null}>}
 */
export async function validateEntregaEstado(estado) {
    if (!estado) {
        return {
            valid: false,
            message: 'Estado no proporcionado',
            estado: null
        };
    }

    const isValid = await estadoManager.isValidEstado('entrega', estado);

    if (isValid) {
        const estadoData = await estadoManager.getEstadoPorCodigo('entrega', estado);
        return {
            valid: true,
            message: `Estado válido: ${estado}`,
            estado: estadoData
        };
    }

    return {
        valid: false,
        message: `Estado inválido para entrega: ${estado}`,
        estado: null
    };
}

/**
 * Validar estado de venta logística
 * @param {string} estado - Código de estado
 * @returns {Promise<{valid: boolean, message: string, estado: Object|null}>}
 */
export async function validateVentaEstado(estado) {
    if (!estado) {
        return {
            valid: false,
            message: 'Estado no proporcionado',
            estado: null
        };
    }

    const isValid = await estadoManager.isValidEstado('venta_logistica', estado);

    if (isValid) {
        const estadoData = await estadoManager.getEstadoPorCodigo('venta_logistica', estado);
        return {
            valid: true,
            message: `Estado válido: ${estado}`,
            estado: estadoData
        };
    }

    return {
        valid: false,
        message: `Estado inválido para venta_logistica: ${estado}`,
        estado: null
    };
}

/**
 * Validar estado de vehículo
 * @param {string} estado - Código de estado
 * @returns {Promise<{valid: boolean, message: string, estado: Object|null}>}
 */
export async function validateVehiculoEstado(estado) {
    if (!estado) {
        return {
            valid: false,
            message: 'Estado no proporcionado',
            estado: null
        };
    }

    const isValid = await estadoManager.isValidEstado('vehiculo', estado);

    if (isValid) {
        const estadoData = await estadoManager.getEstadoPorCodigo('vehiculo', estado);
        return {
            valid: true,
            message: `Estado válido: ${estado}`,
            estado: estadoData
        };
    }

    return {
        valid: false,
        message: `Estado inválido para vehiculo: ${estado}`,
        estado: null
    };
}

/**
 * Validar estado de pago
 * @param {string} estado - Código de estado
 * @returns {Promise<{valid: boolean, message: string, estado: Object|null}>}
 */
export async function validatePagoEstado(estado) {
    if (!estado) {
        return {
            valid: false,
            message: 'Estado no proporcionado',
            estado: null
        };
    }

    const isValid = await estadoManager.isValidEstado('pago', estado);

    if (isValid) {
        const estadoData = await estadoManager.getEstadoPorCodigo('pago', estado);
        return {
            valid: true,
            message: `Estado válido: ${estado}`,
            estado: estadoData
        };
    }

    return {
        valid: false,
        message: `Estado inválido para pago: ${estado}`,
        estado: null
    };
}

/**
 * Validar estado genérico
 * @param {string} categoria - Categoría del estado
 * @param {string} estado - Código del estado
 * @returns {Promise<{valid: boolean, message: string, estado: Object|null}>}
 */
export async function validateEstado(categoria, estado) {
    if (!estado || !categoria) {
        return {
            valid: false,
            message: 'Categoría o estado no proporcionado',
            estado: null
        };
    }

    // Validar que la categoría exista
    if (!estadoManager.isValidCategoria(categoria)) {
        return {
            valid: false,
            message: `Categoría inválida: ${categoria}. Categorías válidas: ${estadoManager.getCategorias().join(', ')}`,
            estado: null
        };
    }

    const isValid = await estadoManager.isValidEstado(categoria, estado);

    if (isValid) {
        const estadoData = await estadoManager.getEstadoPorCodigo(categoria, estado);
        return {
            valid: true,
            message: `Estado válido en ${categoria}: ${estado}`,
            estado: estadoData
        };
    }

    return {
        valid: false,
        message: `Estado inválido en ${categoria}: ${estado}`,
        estado: null
    };
}

/**
 * Validar múltiples estados a la vez
 * @param {Array<{categoria: string, estado: string}>} estados - Array de estados a validar
 * @returns {Promise<{valid: boolean, results: Array}>}
 */
export async function validateEstados(estados) {
    if (!Array.isArray(estados)) {
        return {
            valid: false,
            message: 'Estados debe ser un array',
            results: []
        };
    }

    const results = await Promise.all(
        estados.map(async (item) => {
            const result = await validateEstado(item.categoria, item.estado);
            return {
                categoria: item.categoria,
                estado: item.estado,
                ...result
            };
        })
    );

    const allValid = results.every(r => r.valid);

    return {
        valid: allValid,
        message: allValid ? 'Todos los estados son válidos' : 'Algunos estados son inválidos',
        results
    };
}

/**
 * Obtener estados válidos para una categoría
 * @param {string} categoria - Categoría
 * @returns {Promise<Array>}
 */
export async function getValidEstados(categoria) {
    return await estadoManager.getEstados(categoria);
}

/**
 * Obtener todas las categorías y sus estados válidos
 * @returns {Promise<Object>} Objeto con categorías como claves y array de estados como valores
 */
export async function getAllEstados() {
    const categorias = estadoManager.getCategorias();
    const resultado = {};

    for (const categoria of categorias) {
        resultado[categoria] = await estadoManager.getEstados(categoria);
    }

    return resultado;
}
