import dotenv from 'dotenv';
dotenv.config();

// Middleware para validar que la petición viene del backend
export const ensureBackend = (req, res, next) => {
    const secret = req.headers['x-backend-secret'] || req.headers['x-ws-secret'] || req.query.ws_secret;

    // En desarrollo, si no hay WS_SECRET definido, permitir (para facilitar pruebas)
    if (!process.env.WS_SECRET && process.env.NODE_ENV !== 'production') {
        return next();
    }

    if (!process.env.WS_SECRET || secret !== process.env.WS_SECRET) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized: backend only'
        });
    }

    next();
};
