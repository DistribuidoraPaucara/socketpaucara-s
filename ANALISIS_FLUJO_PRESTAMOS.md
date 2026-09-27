# 📡 Flujo de Notificaciones de Préstamos: Laravel → Node.js → React/Flutter

## 🎯 Resumen Ejecutivo

Cuando se crea un préstamo en Laravel, se dispara una **cadena de eventos** que notifica en tiempo real a múltiples destinatarios (web y mobile) a través de un servidor WebSocket centralizado en Node.js.

---

## 1️⃣ FASE BACKEND - Laravel (Backend)

### 1.1 Endpoint de Creación
```
POST /api/prestamos-cliente
Controlador: PrestamoClienteController@store
```

**Código en [PrestamoClienteController.php:255](web/app/Http/Controllers/PrestamoClienteController.php#L255)**
```php
// Crear préstamo
$prestamo = $this->prestamoService->crearPrestamo($request->all());

// ✅ Disparar evento para notificar
event(new PrestamoClienteCreado($prestamo));
```

### 1.2 Evento Laravel
**Archivo: [web/app/Events/PrestamoClienteCreado.php](web/app/Events/PrestamoClienteCreado.php)**
```php
class PrestamoClienteCreado {
    public PrestamoCliente $prestamo;
    
    public function __construct(PrestamoCliente $prestamo) {
        $this->prestamo = $prestamo;
        $this->prestamo->load(['cliente', 'creador', 'chofer', 'detalles.prestable']);
    }
}
```

### 1.3 Listener Laravel
**Archivo: [web/app/Listeners/SendPrestamoClienteCreatedNotification.php](web/app/Listeners/SendPrestamoClienteCreatedNotification.php)**

El listener se ejecuta **síncronamente** (no es queued) cuando el evento se dispara:

```php
public function handle(PrestamoClienteCreado $event): void {
    $prestamo = $event->prestamo;
    
    // Cargar relaciones necesarias
    if (!$prestamo->relationLoaded('cliente')) {
        $prestamo->load('cliente');
    }
    
    // Usar PrestamoNotificationService
    $result = $this->notificationService->notifyPrestamoClienteCreated($prestamo);
}
```

### 1.4 Servicio de Notificación
**Archivo: [web/app/Services/Notifications/PrestamoNotificationService.php](web/app/Services/Notifications/PrestamoNotificationService.php)**

El servicio hace DOS cosas:

```php
public function notifyPrestamoClienteCreated(PrestamoCliente $prestamo): bool {
    // 1. Obtener usuarios a notificar
    $users = $this->getUsersForPrestamoCliente($prestamo);
    
    // 2. Guardar en BD (persistente)
    $this->dbNotificationService->create($userIds, 'prestamo.cliente.creado', [
        'prestamo_id'     => $prestamo->id,
        'cliente_nombre'  => $prestamo->cliente->nombre,
        'cantidad'        => $prestamo->cantidad,
        'detalles_count'  => $prestamo->detalles->count(),
        'estado'          => $prestamo->estado,
        'creador_nombre'  => $prestamo->creador?->name,
    ], ['prestamo_id' => $prestamo->id]);
    
    // 3. Enviar notificación EN TIEMPO REAL al servidor WebSocket
    return $this->wsService->notifyPrestamoClienteCreated($prestamo);
}
```

#### Usuarios a Notificar:
- ✅ Usuario creador del préstamo
- ✅ Todos los admins
- ✅ Todos los cajeros
- ✅ Chofer asignado (si lo hay)
- ✅ Cliente propietario (si tiene `user_id`)

### 1.5 Servicio WebSocket
**Archivo: [web/app/Services/WebSocket/PrestamoWebSocketService.php](web/app/Services/WebSocket/PrestamoWebSocketService.php)**

Prepara los datos y llamada `notifyMultiChannel`:

```php
public function notifyPrestamoClienteCreated($prestamo): bool {
    $eventData = [
        'id' => $prestamo->id,
        'cliente_id' => $prestamo->cliente_id,
        'cliente_nombre' => $prestamo->cliente?->nombre,
        'cliente' => [
            'id' => $prestamo->cliente_id,
            'nombre' => $prestamo->cliente?->nombre,
        ],
        'cantidad' => (int) $cantidadTotal,
        'estado' => $prestamo->estado,
        'items' => [...],
        'creador' => ['id' => $prestamo->created_by, 'name' => $prestamo->creador?->name],
        'fecha_creacion' => $prestamo->created_at?->toIso8601String(),
        'tipo' => 'prestamo_cliente',
    ];
    
    // Recopilar usuarios y roles
    $userIds = [$prestamo->created_by, $prestamo->chofer_id, $prestamo->cliente?->user_id];
    $roles = ['admin', 'cajero', 'manager'];
    
    // ✅ Enviar a múltiples canales en UN SOLO evento
    return $this->notifyMultiChannel('prestamo.cliente.creado', $eventData, array_unique($userIds), $roles);
}
```

### 1.6 Base WebSocket Service
**Archivo: [web/app/Services/WebSocket/BaseWebSocketService.php](web/app/Services/WebSocket/BaseWebSocketService.php)**

Realiza una petición HTTP POST al servidor Node.js:

```php
public function notifyMultiChannel(string $event, array $data, array $userIds = [], array $roles = []): bool {
    $userIds = array_filter(array_unique($userIds));
    $roles = array_filter(array_unique($roles));
    
    return $this->send('notify/multi-channel', [
        'event' => $event,           // 'prestamo.cliente.creado'
        'data' => $data,             // {...datos del préstamo...}
        'user_ids' => array_values($userIds),
        'roles' => array_values($roles),
        'timestamp' => now()->toIso8601String(),
    ]);
}

protected function send(string $endpoint, array $data): bool {
    $url = rtrim($this->wsUrl, '/') . '/' . ltrim($endpoint, '/');
    // http://localhost:3001/notify/multi-channel
    
    $request = Http::timeout($this->timeout)
        ->acceptJson()
        ->withHeaders([
            'X-Backend-Secret' => config('websocket.secret'),
        ]);
    
    $response = $request->post($url, $data);
    return $response->successful();
}
```

**Resumen Phase 1:**
- ✅ POST HTTP `http://localhost:3001/notify/multi-channel`
- ✅ Headers: `X-Backend-Secret: [token]`
- ✅ Body:
  ```json
  {
    "event": "prestamo.cliente.creado",
    "data": { ...préstamo... },
    "user_ids": [1, 5, 12],
    "roles": ["admin", "cajero", "manager"],
    "timestamp": "2026-09-25T14:30:00Z"
  }
  ```

---

## 2️⃣ FASE WEBSOCKET - Node.js Server

### 2.1 Rutas de Notificación
**Archivo: [socket/src/routes/notification.routes.js:509](socket/src/routes/notification.routes.js#L509)**

```javascript
router.post('/notify/multi-channel', ensureBackend, (req, res) => {
    notificationController.handleMultiChannel(req, res);
});
```

Middleware `ensureBackend` valida el header `X-Backend-Secret`.

### 2.2 Controlador de Notificaciones
**Archivo: [socket/src/controllers/notification.controller.js:1469](socket/src/controllers/notification.controller.js#L1469)**

```javascript
async handleMultiChannel(req, res) {
    const { event, data, user_ids = [], roles = [], timestamp } = req.body;
    
    console.log(`📡 [/notify/multi-channel] Evento: ${event}`);
    console.log(`   User IDs: ${user_ids.length}`);
    console.log(`   Roles: ${roles.length}`);
    
    let totalEmitted = 0;
    
    // 📬 Emitir a usuarios específicos
    for (const userId of user_ids) {
        socketRepository.emitToUser(userId, event, data);
        console.log(`   ✅ Emitido a usuario: ${userId}`);
        totalEmitted++;
    }
    
    // 👥 Emitir a roles (mapear roles de Laravel a salas de Socket.IO)
    const socketRooms = this.mapRolesToRooms(roles);
    for (const room of socketRooms) {
        socketRepository.emitToRoom(room, event, data);
        console.log(`   ✅ Emitido a rol/sala: ${room}`);
        totalEmitted++;
    }
    
    return res.json({
        success: true,
        event,
        user_ids_count: user_ids.length,
        roles_count: roles.length,
        total_emitted: totalEmitted,
        timestamp: timestamp || new Date().toISOString()
    });
}
```

### 2.3 Mapeo de Roles → Salas Socket.IO
**Archivo: [socket/src/controllers/notification.controller.js:8](socket/src/controllers/notification.controller.js#L8)**

```javascript
mapRolesToRooms(roles) {
    const roleMap = {
        'admin': 'admins',
        'manager': 'managers',
        'preventista': 'preventistas',
        'cliente': 'clients',
        'cobrador': 'cobradores',
        'cajero': 'cajeros',
        'logistica': 'logisticas',
        'logístico': 'logisticas',
        'driver': 'choferes',
        'chofer': 'choferes',
    };
    
    return roles.map(rol => roleMap[rol.toLowerCase()] || rol + 's');
}
```

### 2.4 Socket Repository
**Archivo: [socket/src/repositories/socket.repository.js](socket/src/repositories/socket.repository.js)**

Realiza la emisión usando Socket.IO:

```javascript
// Emitir a un usuario específico
emitToUser(userId, event, data) {
    const normalizedUserId = String(userId);
    const room = `user_${normalizedUserId}`;
    
    // Verificar cuántos clientes están en esa sala
    const sockets = this.io.sockets.adapter.rooms.get(room);
    const clientsInRoom = sockets ? sockets.size : 0;
    
    console.log(`📤 EMITIR A USUARIO: ${userId}`);
    console.log(`   Sala: ${room}`);
    console.log(`   Clientes conectados: ${clientsInRoom}`);
    
    this.io.to(room).emit(event, data);
    return clientsInRoom > 0;
}

// Emitir a una sala/grupo
emitToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
    return true;
}
```

**Resumen Phase 2:**
- ✅ Socket.IO emite a sala: `io.to("user_${userId}").emit(event, data)`
- ✅ Socket.IO emite a sala: `io.to("admins").emit(event, data)`
- ✅ Múltiples clientes en la misma sala reciben el evento

---

## 3️⃣ FASE FRONTEND - React (Web)

### 3.1 Configuración Inicial
**Archivo: [web/resources/js/app.tsx](web/resources/js/app.tsx)**

El app se inicia con un `WebSocketProvider` que:

```tsx
<WebSocketProvider
    autoConnect={true}
    sanctumToken={sanctumToken}
    userId={userId}
    channels={channels}
>
    <EstadosProvider>
        <NotificationsProvider userId={userId} userRoles={userRoles}>
            <App {...props} />
        </NotificationsProvider>
    </EstadosProvider>
</WebSocketProvider>
```

**Canales según rol:**
```typescript
// Siempre: su canal privado
channels.push(`user_${userId}`);

// Según roles:
if (userRoles.includes('admin')) {
    channels.push('admin.proformas');
    channels.push('admin.entregas');
    channels.push('admins');  // ← Para notificaciones multi-canal
}
if (userRoles.includes('cajero')) {
    channels.push('admin.proformas');
    channels.push('admins');  // ← Para notificaciones multi-canal
}
if (userRoles.includes('chofer')) {
    channels.push('choferes');  // ← Para notificaciones multi-canal
}
```

### 3.2 WebSocket Provider
**Archivo: [web/resources/js/application/contexts/WebSocketContext.tsx](web/resources/js/application/contexts/WebSocketContext.tsx)**

Conecta al servidor Node.js:

```typescript
connect(token?: string, userId?: number) {
    connectionPromiseRef.current = websocketService.connect({
        auth: {
            token: authToken,
            userId: userId,
        },
    });
    
    // Suscribirse a canales
    channels.forEach(channel => {
        websocketService.subscribeTo(channel);
    });
}
```

### 3.3 WebSocket Service
**Archivo: [web/resources/js/infrastructure/services/websocket.service.ts](web/resources/js/infrastructure/services/websocket.service.ts)**

Se conecta al socket:

```typescript
connect(config: WebSocketConfig = {}): Promise<void> {
    const baseUrl = config.url ||
                    appConfig.websocketUrl ||
                    import.meta.env.VITE_WEBSOCKET_URL ||
                    fallbackUrl;
    
    this.socket = io(baseUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        auth: config.auth ? {
            token: config.auth.token,
            userId: config.auth.userId,
        } : undefined,
        transports: ['websocket', 'polling'],
    });
    
    this.socket.on('connect', () => {
        console.log('✅ WebSocket conectado');
        
        // Autenticar inmediatamente
        this.socket!.emit('authenticate', {
            token: config.auth.token,
            userId: config.auth.userId,
            type: 'web'
        });
    });
}

subscribeTo(channelName: string) {
    this.socket.emit('subscribe', {
        channel: channelName,
        auth: {
            token: token,
        },
    });
}

on(eventName: string, callback: EventListener): void {
    if (!this.socket) return;
    
    this.socket.on(eventName, (data) => {
        callback(data);
    });
}
```

### 3.4 Escucha de Eventos en Componentes

**Ejemplo: Notificaciones Generales**
```typescript
// En cualquier componente que necesite escuchar eventos
const { on, off } = useContext(WebSocketContext)!;

useEffect(() => {
    const handler = (data: any) => {
        console.log('🎁 Préstamo creado:', data);
        showNotification({
            type: 'success',
            title: 'Préstamo Creado',
            message: `Préstamo para ${data.cliente_nombre}`,
        });
    };
    
    // Escuchar evento
    on('prestamo.cliente.creado', handler);
    
    return () => {
        off('prestamo.cliente.creado', handler);
    };
}, [on, off]);
```

**Resumen Phase 3 (React):**
- ✅ Se conecta al servidor Node.js con token Sanctum
- ✅ Se suscribe a canales según su rol
- ✅ Socket.IO escucha evento: `prestamo.cliente.creado`
- ✅ Emite a listeners en componentes React
- ✅ UI se actualiza en tiempo real

---

## 4️⃣ FASE FRONTEND - Flutter (Mobile)

### 4.1 Conexión al WebSocket
**Archivo: [app/lib/services/websocket_service.dart](app/lib/services/websocket_service.dart)**

En el método `connect()`:

```dart
Future<void> connect({
    required String token,
    required int userId,
    String userType = 'cliente',
}) async {
    _socket = io.io(
        WebSocketConfig.currentUrl,
        io.OptionBuilder()
            .setTransports(['websocket'])
            .setExtraHeaders({
                'Authorization': 'Bearer $token',
            })
            .build(),
    );
    
    // Listener para conexión
    _socket!.onConnect((_) {
        debugPrint('🔌 Socket conectado');
        connectionCompleter.complete();
    });
    
    // Conectar
    _socket!.connect();
    
    // Esperar conexión
    await connectionCompleter.future;
    
    // Autenticar
    _authenticate(token: token, userId: userId, userType: userType);
}
```

### 4.2 Autenticación en Flutter
**Archivo: [app/lib/services/websocket_service.dart](app/lib/services/websocket_service.dart)**

```dart
Future<void> _authenticate({
    required String token,
    required int userId,
    required String userType,
}) async {
    _socket!.once(WebSocketConfig.eventAuthenticated, (data) {
        debugPrint('✅ Autenticado en WebSocket');
        _isConnected = true;
        
        // ✅ Suscribirse a canales según rol
        _subscribeToRoleChannels(userType);
    });
    
    _socket!.emit(WebSocketConfig.eventAuthenticate, {
        'userId': userId,
        'userType': userType,
        'token': token,  // Token Sanctum validado contra BD
    });
}
```

### 4.3 Configuración de Listeners
**Archivo: [app/lib/services/websocket_service.dart](app/lib/services/websocket_service.dart)**

En `_setupEventListeners()`:

```dart
// Escuchar evento de préstamo a cliente creado
_socket!.on(WebSocketConfig.eventPrestamoClienteCreated, (data) {
    debugPrint('🎁 Préstamo a cliente creado: $data');
    _prestamoController.add({
        'type': 'cliente_creado',
        'data': data,
    });
});

// Escuchar evento de préstamo a evento creado
_socket!.on(WebSocketConfig.eventPrestamoEventoCreated, (data) {
    debugPrint('🎁 Préstamo a evento creado: $data');
    _prestamoController.add({
        'type': 'evento_creado',
        'data': data,
    });
});
```

### 4.4 Stream de Préstamos
**Archivo: [app/lib/services/websocket_service.dart](app/lib/services/websocket_service.dart)**

```dart
// Stream controller para préstamos
final _prestamoController = StreamController<Map<String, dynamic>>.broadcast();

// Getter del stream
Stream<Map<String, dynamic>> get prestamoStream => _prestamoController.stream;
```

### 4.5 Widget Listener
**Archivo: [app/lib/widgets/realtime_notifications_listener.dart](app/lib/widgets/realtime_notifications_listener.dart)**

El widget escucha y procesa eventos:

```dart
class _RealtimeNotificationsListenerState extends State<RealtimeNotificationsListener> {
    final WebSocketService _webSocketService = WebSocketService();
    final LocalNotificationService _notificationService = LocalNotificationService();
    StreamSubscription? _prestamoSubscription;
    
    void _iniciarEscucha() {
        // Escuchar eventos de préstamos
        _prestamoSubscription = _webSocketService.prestamoStream.listen((event) {
            final type = event['type'] as String;
            final data = event['data'] as Map<String, dynamic>;
            
            switch (type) {
                case 'cliente_creado':
                    debugPrint('🎁 Préstamo a cliente creado');
                    _mostrarNotificacionPrestamoClienteCreado(data);
                    break;
                case 'evento_creado':
                    debugPrint('🎁 Préstamo a evento creado');
                    _mostrarNotificacionPrestamoEventoCreado(data);
                    break;
            }
        });
    }
    
    void _mostrarNotificacionPrestamoClienteCreado(Map<String, dynamic> data) {
        final prestamo_id = data['id'] as int?;
        final cliente_nombre = data['cliente_nombre'] as String?;
        final cantidad = data['cantidad'] as int?;
        
        // ✅ Mostrar notificación nativa del sistema
        _notificationService.showPrestamoCreatedNotification(
            prestamoId: prestamo_id ?? 0,
            clienteName: cliente_nombre,
            cantidad: cantidad ?? 0,
        );
        
        // ✅ Recargar estadísticas
        context.read<NotificationProvider>().loadStats();
    }
}
```

**Resumen Phase 4 (Flutter):**
- ✅ Se conecta al servidor Node.js con token Sanctum
- ✅ Se autentica y se suscribe a canales según rol
- ✅ Socket.IO escucha evento: `prestamo.cliente.creado`
- ✅ Stream emite datos a los listeners (StreamSubscription)
- ✅ Widget muestra notificación nativa (native push-like)

---

## 📊 Diagrama Completo del Flujo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USUARIO CREA PRÉSTAMO                           │
│                 (Admin/Cajero en Web o Panel Admin)                      │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │   LARAVEL BACKEND     │
                   │  POST /api/prestamos- │
                   │      cliente          │
                   └───────────┬───────────┘
                               │
                               ▼ PrestamoClienteCreado Event
                   ┌───────────────────────┐
                   │  SendPrestamo...      │
                   │  Notification         │
                   │  Listener             │
                   └───────────┬───────────┘
                               │
                               ▼ PrestamoNotificationService
                   ┌───────────────────────────────┐
                   │ 1. Guardar en BD              │
                   │ 2. Enviar por WebSocket       │
                   │    PrestamoWebSocketService   │
                   └───────────┬───────────────────┘
                               │
                               ▼ notifyMultiChannel()
                   ┌───────────────────────────────┐
                   │   HTTP POST                   │
                   │ http://localhost:3001/        │
                   │   notify/multi-channel        │
                   │                               │
                   │ Payload:                      │
                   │ {                             │
                   │   event: "prestamo...creado"  │
                   │   data: {...},                │
                   │   user_ids: [1, 5, 12],       │
                   │   roles: ["admin", "cajero"]  │
                   │ }                             │
                   └───────────┬───────────────────┘
                               │
                               ▼
                   ┌───────────────────────────────┐
                   │    NODE.JS WEBSOCKET SERVER   │
                   │   /notify/multi-channel       │
                   │   handleMultiChannel()        │
                   └───────────┬───────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
         ┌──────────▼──────────┐  ┌──────▼──────────┐
         │ Emitir a USUARIOS   │  │ Emitir a ROLES  │
         │ user_1, user_5,     │  │ admins, cajeros │
         │ user_12             │  │                 │
         └──────────┬──────────┘  └──────┬──────────┘
                    │                     │
          ┌─────────▼──────────────────────▼──────────┐
          │  io.to(room).emit(event, data)            │
          │                                            │
          │  Conexiones WebSocket Activas:            │
          │  - Admin1 (sala: user_1 + admins)        │
          │  - Admin2 (sala: admins)                  │
          │  - Cajero1 (sala: user_5 + cajeros)      │
          │  - Cliente1 (sala: user_12)              │
          │  - Chofer1 (sala: choferes)              │
          └─────────┬──────────────────────┬──────────┘
                    │                      │
         ┌──────────▼──────────┐  ┌───────▼─────────┐
         │   REACT WEB APP     │  │  FLUTTER APP    │
         │                      │  │                 │
         │ WebSocketProvider    │  │ WebSocketService│
         │ + websocket.service  │  │ + prestamoStream│
         │                      │  │                 │
         │ ✅ Escucha evento    │  │ ✅ Escucha evento│
         │ ✅ Actualiza UI      │  │ ✅ Notificación │
         │ ✅ Muestra toast     │  │    nativa (push)│
         └──────────────────────┘  └─────────────────┘
                    │                      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ USUARIOS NOTIFICADOS │
                    │ EN TIEMPO REAL        │
                    └──────────────────────┘
```

---

## 🔐 Seguridad

### Autenticación en Múltiples Niveles

1. **Laravel → Node.js:**
   - Header: `X-Backend-Secret` (token compartido)
   - Middleware: `ensureBackend` valida

2. **React/Flutter → Node.js:**
   - Token Sanctum en headers HTTP
   - Socket.IO auth handshake con token
   - Validación en servidor Node.js contra BD de Laravel

### Autorización

- Cada usuario solo recibe eventos de su canal privado (`user_${userId}`)
- Solo roles autorizados reciben eventos de rol (`admins`, `cajeros`, etc.)
- El servidor Node.js valida canales en el middleware `auth.middleware.js`

---

## 🚀 Performance

- **Una sola petición HTTP:** `notifyMultiChannel()` envía UNA petición con todos los destinatarios
- **Broadcast eficiente:** Socket.IO emite simultáneamente a múltiples clientes
- **Persistencia:** BD también guarda notificación para usuarios offline
- **Reconexión automática:** Clientes se reconectan y recuperan estado

---

## 📝 Eventos Relacionados

El mismo sistema se usa para:
- `prestamo.cliente.creado` ← Cuando se crea préstamo a cliente
- `prestamo.evento.creado` ← Cuando se crea préstamo a evento
- `prestamo.proveedor.creado` ← Cuando se crea préstamo a proveedor
- `proforma.creada`, `proforma.aprobada`, etc.
- `venta.estado-cambio`, `entrega.estado-cambio`, etc.
- Cualquier otro evento que implemente `notifyMultiChannel()`
