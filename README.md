# Servidor WebSocket - Cobrador

Este es el servidor WebSocket para la aplicación Cobrador, construido con Node.js y Socket.IO.

## 🚀 Inicio Rápido

1. **Navegar al directorio:**
   ```bash
   cd websocket-server
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   ```bash
   # Editar .env con tu configuración
   WEBSOCKET_PORT=3001
   CLIENT_URL=http://localhost:3000
   ```

4. **Iniciar servidor:**
   ```bash
   # Desarrollo
   npm run dev
   
   # Producción
   npm start
   
   # O usar el script de Windows
   start.bat
   ```

5. **Probar funcionamiento:**
   - Abrir: http://localhost:3001/test.html
   - Verificar estado: http://localhost:3001/health

## ✨ Características

- ✅ Conexiones WebSocket en tiempo real
- ✅ Autenticación de usuarios por tipo (cliente, cobrador, admin)
- ✅ Salas automáticas por rol de usuario
- ✅ Notificaciones de créditos y pagos
- ✅ Seguimiento de ubicación de cobradores
- ✅ Sistema de mensajería entre usuarios
- ✅ API REST para integración con Laravel
- ✅ Manejo de reconexión automática
- ✅ Logs detallados y debugging

## 📡 Eventos de Socket.IO

### Cliente → Servidor

| Evento | Descripción | Parámetros |
|--------|-------------|------------|
| `authenticate` | Autenticar usuario | `{userId, userType, userName}` |
| `credit_notification` | Notificación de crédito | `{targetUserId, userType, notification}` |
| `payment_update` | Actualizar pago | `{cobradorId, clientId, payment}` |
| `route_notification` | Notificación de ruta | `{cobradorId, routeUpdate}` |
| `send_message` | Enviar mensaje | `{recipientId, message, senderId}` |
| `location_update` | Actualizar ubicación | `{latitude, longitude}` |

### Servidor → Cliente

| Evento | Descripción | Datos |
|--------|-------------|-------|
| `authenticated` | Confirmación de autenticación | `{success, message}` |
| `new_credit_notification` | Nueva notificación de crédito | `{title, message, type, ...}` |
| `payment_updated` | Pago actualizado | `{payment_id, amount, status, ...}` |
| `route_updated` | Ruta actualizada | `{route_id, date, clients_count, ...}` |
| `new_message` | Nuevo mensaje | `{senderId, message, timestamp}` |
| `cobrador_location_update` | Ubicación de cobrador | `{cobradorId, latitude, longitude, ...}` |
| `user_connected` | Usuario conectado | `{userId, userName, userType}` |
| `user_disconnected` | Usuario desconectado | `{userId, userName, userType}` |

## 🌐 API REST

### GET /health
Verifica el estado del servidor.

**Respuesta:**
```json
{
  "status": "OK",
  "message": "WebSocket server is running"
}
```

### GET /active-users
Obtiene lista de usuarios activos conectados.

**Respuesta:**
```json
{
  "total": 5,
  "users": [
    {
      "userId": "123",
      "userName": "Juan Pérez",
      "userType": "cobrador",
      "connectedAt": "2025-08-03T22:30:00.000Z"
    }
  ]
}
```

### POST /notify
Envía notificación a usuarios específicos desde aplicaciones externas.

**Body:**
```json
{
  "userId": "123",          // opcional - usuario específico
  "userType": "cobrador",   // opcional - todos los usuarios de un tipo
  "notification": {
    "title": "Título",
    "message": "Mensaje",
    "type": "info",
    "data": {...}          // datos adicionales
  },
  "event": "custom_event"   // opcional - evento personalizado
}
```

## 🔧 Integración con Laravel

### 1. Instalar el Servicio WebSocket

Copiar `LaravelWebSocketService.php` a `app/Services/` y registrar en el contenedor:

```php
// app/Providers/AppServiceProvider.php
public function register()
{
    $this->app->singleton(WebSocketNotificationService::class);
}
```

### 2. Configuración

Copiar `laravel-websocket-config.php` a `config/websocket.php` y añadir al `.env`:

```env
WEBSOCKET_URL=http://localhost:3001
WEBSOCKET_ENABLED=true
WEBSOCKET_TIMEOUT=5
```

### 3. Usar el Servicio

```php
// En un controlador
use App\Services\WebSocketNotificationService;

public function assignCredit(Request $request, WebSocketNotificationService $ws)
{
    $credit = Credit::create($request->validated());
    
    // Enviar notificación WebSocket
    $ws->notifyNewCredit($credit->cobrador_id, $credit);
    
    return response()->json(['success' => true]);
}
```

### 4. Event Listeners

Copiar `LaravelCreditListener.php` a `app/Listeners/` y registrar:

```php
// app/Providers/EventServiceProvider.php
protected $listen = [
    CreditRequiresAttention::class => [
        SendCreditAttentionNotification::class,
    ],
];
```

## 🎨 Frontend con Vue.js

### 1. Instalar Socket.IO Client

```bash
npm install socket.io-client
```

### 2. Usar el WebSocket Manager

```javascript
// En un componente Vue
import { useWebSocket } from './WebSocketManager.js';

export default {
  setup() {
    const ws = useWebSocket();
    
    onMounted(() => {
      // Conectar
      ws.connect('http://localhost:3001');
      
      // Autenticar
      ws.authenticate({
        id: user.id,
        name: user.name,
        type: user.role
      });
      
      // Escuchar eventos
      ws.on('credit:new', (notification) => {
        console.log('Nuevo crédito:', notification);
      });
    });
    
    return { ws };
  }
}
```

### 3. Componente WebSocket

Copiar `WebSocketComponent.vue` y usar en tu layout:

```vue
<template>
  <div>
    <WebSocketComponent :show-notifications="true" />
  </div>
</template>
```

## 📁 Estructura del Proyecto

```
websocket-server/
├── server.js                      # Servidor principal
├── package.json                   # Dependencias
├── .env                          # Variables de entorno
├── .gitignore                    # Archivos ignorados
├── .eslintrc.json               # Configuración ESLint
├── start.bat                     # Script de inicio Windows
├── test.html                     # Página de pruebas
├── README.md                     # Documentación
└── Archivos de integración:
    ├── LaravelWebSocketService.php    # Servicio para Laravel
    ├── laravel-websocket-config.php   # Configuración Laravel
    ├── LaravelCreditListener.php      # Event Listener ejemplo
    ├── WebSocketManager.js            # Manager para frontend
    └── WebSocketComponent.vue         # Componente Vue
```

## 🔒 Configuración de Seguridad

### Variables de Entorno

```env
# .env
WEBSOCKET_PORT=3001
CLIENT_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info

# Para producción
WEBSOCKET_URL=https://your-domain.com:3001
CLIENT_URL=https://your-app.com
```

### CORS

El servidor está configurado para aceptar conexiones solo desde `CLIENT_URL`. Para múltiples dominios:

```javascript
// En server.js
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://your-app.com",
      "https://admin.your-app.com"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

## 🚀 Despliegue

### Desarrollo Local
```bash
npm run dev
```

### Producción con PM2
```bash
npm install -g pm2
pm2 start server.js --name "cobrador-websocket"
pm2 startup
pm2 save
```

### Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🐛 Debugging

### Logs del Servidor
Los logs se muestran en consola con información detallada sobre:
- Conexiones/desconexiones
- Autenticación de usuarios
- Eventos enviados/recibidos
- Errores

### Página de Pruebas
Usar `http://localhost:3001/test.html` para:
- Probar conexión WebSocket
- Simular eventos
- Verificar notificaciones
- Debug en tiempo real

### Usuarios Activos
Verificar usuarios conectados: `http://localhost:3001/active-users`

## 🔧 Solución de Problemas

### Error: Puerto en uso
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill
```

### Error: Cannot find module
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Error: CORS
Verificar que `CLIENT_URL` en `.env` coincida con la URL de tu frontend.

## 📞 Soporte

Para problemas o mejoras, revisar:
1. Logs del servidor
2. Consola del navegador (F12)
3. Estado de la red
4. Configuración de CORS
