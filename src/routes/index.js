import notificationRoutes from './notification.routes.js';
import healthRoutes from './health.routes.js';
import usersRoutes from './users.routes.js';
import proformaRoutes from './proforma.routes.js';
import shipmentRoutes from './shipment.routes.js';
import dashboardRoutes from './dashboard.routes.js';

export const setupRoutes = (app) => {
    // Rutas de salud y estáticas
    app.use('/', healthRoutes);

    // Rutas de notificaciones (legacy)
    app.use('/', notificationRoutes);

    // Rutas de proformas (Laravel → WebSocket)
    app.use('/', proformaRoutes);

    // Rutas de dashboard (Laravel → WebSocket)
    app.use('/notify', dashboardRoutes);

    // Rutas de usuarios conectados
    app.use('/api/users', usersRoutes);

    // Rutas de tracking y logística en tiempo real
    app.use('/api', shipmentRoutes);
};
