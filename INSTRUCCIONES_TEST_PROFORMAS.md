# 🧪 Instrucciones de Uso - Test de Proformas WebSocket

## 📋 Descripción General

El archivo `test-proformas.html` es una **interfaz de pruebas completa** para demostrar y probar el sistema de notificaciones WebSocket de proformas en tiempo real.

## 🎯 Características Principales

### 1️⃣ Conexión Multi-Dispositivo
- Conecta desde **cualquier dispositivo** en la red local
- Soporta múltiples usuarios conectados simultáneamente
- Visualización en tiempo real de usuarios activos

### 2️⃣ Autenticación por Roles
Puedes autenticarte como diferentes tipos de usuarios:
- 👑 **Admin** - Recibe todas las notificaciones
- 👨‍💼 **Manager** - Recibe todas las notificaciones
- 📋 **Preventista** - Crea proformas
- 🛒 **Cliente** - Recibe proformas
- 📦 **Logística** - Ve conversiones
- 💰 **Cobrador** - Ve conversiones
- 💵 **Cajero** - Ve creaciones

### 3️⃣ Envío de Notificaciones
Tres formas de enviar notificaciones:

#### A) Notificaciones a Usuario Específico
1. Ve a la pestaña "👥 Usuarios Activos"
2. Haz clic en "Actualizar Lista"
3. Verás todos los usuarios conectados
4. Selecciona el tipo de notificación:
   - ✨ **Creada** - Simula proforma creada
   - ✅ **Aprobada** - Simula proforma aprobada
   - ❌ **Rechazada** - Simula proforma rechazada
   - 💰 **Convertida** - Simula conversión a venta

#### B) Notificaciones a Todo un Rol
1. En la pestaña "👥 Usuarios Activos"
2. Baja hasta el panel "📢 Envío Masivo por Rol"
3. Selecciona el rol destino
4. Haz clic en "📢 Enviar Notificación al Rol Completo"

#### C) Eventos Personalizados
1. Ve a la pestaña "📤 Enviar Notificaciones"
2. Haz clic en una plantilla predefinida
3. Modifica el JSON si lo deseas
4. Haz clic en "🚀 Emitir Evento"

## 🚀 Cómo Hacer una Demostración Completa

### Escenario 1: Demostración Básica (1 dispositivo)

1. **Abre 2 pestañas del navegador** con `test-proformas.html`

2. **En la Pestaña 1:**
   - Conectar al servidor
   - Autenticarse como "Admin" (ID: 1, Nombre: "Admin Test")

3. **En la Pestaña 2:**
   - Conectar al servidor
   - Autenticarse como "Preventista" (ID: 2, Nombre: "Preventista Test")

4. **En la Pestaña 1:**
   - Ir a "👥 Usuarios Activos"
   - Hacer clic en "Actualizar Lista"
   - Verás al "Preventista Test" conectado
   - Hacer clic en "✨ Creada" para enviarle una notificación

5. **Observar en la Pestaña 2:**
   - Verás aparecer la notificación de "Proforma Creada" en tiempo real

### Escenario 2: Demostración Multi-Dispositivo (Recomendado)

#### Preparación:
1. **En el servidor** (PC con websocket-paucara):
   - Asegurarte de que el servidor WebSocket esté corriendo
   - Obtener la IP local del servidor: `ipconfig` (Windows) o `ifconfig` (Linux/Mac)
   - Ejemplo: `192.168.1.35`

2. **En otro dispositivo** (PC, tablet, celular):
   - Conectarse a la misma red WiFi
   - Abrir navegador
   - Ir a: `http://192.168.1.35:8000/websocket-paucara/test-proformas.html`

#### Demostración:
1. **Dispositivo 1 (Servidor):**
   ```
   - URL: http://localhost:3001
   - Conectar
   - Autenticarse como "Gerente" (ID: 10)
   ```

2. **Dispositivo 2 (Cliente):**
   ```
   - URL: http://192.168.1.35:3001
   - Conectar
   - Autenticarse como "Preventista" (ID: 20)
   ```

3. **Dispositivo 3 (Otro cliente):**
   ```
   - URL: http://192.168.1.35:3001
   - Conectar
   - Autenticarse como "Logística" (ID: 30)
   ```

4. **En cualquier dispositivo:**
   - Ir a "👥 Usuarios Activos"
   - Activar "🔁 Auto-Refresh" para ver usuarios en tiempo real
   - Seleccionar un usuario
   - Enviar notificación

5. **Observar:**
   - La notificación llega instantáneamente al usuario seleccionado
   - Los otros usuarios NO la reciben (si están en roles diferentes)

### Escenario 3: Broadcast a Todos los Preventistas

1. **Conecta varios usuarios** como "Preventista" desde diferentes dispositivos

2. **Desde cualquier dispositivo:**
   - Ve a "👥 Usuarios Activos"
   - Selecciona rol: "📋 Todos los Preventistas"
   - Haz clic en "📢 Enviar Notificación al Rol Completo"

3. **Resultado:**
   - TODOS los preventistas reciben la notificación al mismo tiempo
   - Los usuarios de otros roles NO la reciben

## 🔧 Funcionalidades Adicionales

### Auto-Refresh
- Activa el auto-refresh para ver usuarios conectándose y desconectándose en tiempo real
- Se actualiza cada 3 segundos automáticamente

### Exportar Mensajes
- Guarda todo el log de eventos en un archivo de texto
- Útil para debugging y análisis

### Eventos Personalizados
- Crea tus propios eventos con datos JSON personalizados
- Útil para probar casos específicos

## 📊 Monitoreo

Cada usuario conectado muestra:
- 📛 **Nombre del usuario**
- 🎭 **Rol/Tipo** (con badge de color)
- 🔢 **ID de usuario**
- 🔌 **Socket ID** (único por conexión)
- 🌐 **IP Address** (desde dónde se conecta)

## ⚠️ Troubleshooting

### No puedo conectarme desde otro dispositivo

**Problema:** Firewall bloqueando el puerto 3001

**Solución:**
```bash
# Windows (PowerShell como admin)
New-NetFirewallRule -DisplayName "WebSocket 3001" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow

# Linux
sudo ufw allow 3001/tcp

# macOS
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /path/to/node
```

### Los usuarios no aparecen en la lista

**Problema:** Endpoint `/active-users` no está funcionando

**Solución:**
- Verificar que el servidor WebSocket tenga el endpoint `/active-users` implementado
- Revisar la consola del navegador (F12) para ver errores

### Las notificaciones no llegan

**Problema:** Los eventos no están siendo emitidos correctamente

**Solución:**
1. Abrir consola del navegador (F12)
2. Verificar que el evento se esté emitiendo: `socket.emit('event:name', data)`
3. En el servidor, verificar que el listener esté escuchando ese evento
4. Revisar los logs del servidor WebSocket

## 💡 Tips para una Demostración Impactante

1. **Usar 3+ dispositivos diferentes** (PC, tablet, celular)
2. **Activar Auto-Refresh** para ver conexiones en vivo
3. **Usar proyector o pantalla grande** para que todos vean
4. **Mostrar el JSON de los datos** que se envían
5. **Demostrar filtrado por roles** (enviar solo a preventistas, etc.)
6. **Mostrar las IPs** de cada dispositivo para demostrar que están en red

## 📝 Casos de Uso Reales

### 1. Preventista crea proforma
```
- Preventista se conecta
- Admin/Manager reciben notificación instantánea
- Pueden aprobar o rechazar
```

### 2. Proforma aprobada
```
- Admin aprueba la proforma
- Preventista recibe notificación de aprobación
- Logística recibe notificación para preparar
```

### 3. Proforma convertida a venta
```
- Se convierte a venta
- Logística recibe notificación
- Cobradores reciben notificación
- Cajeros reciben notificación
```

## 🎓 Conclusión

Este sistema de pruebas te permite **demostrar de forma visual e interactiva** que:

✅ Las conexiones WebSocket funcionan
✅ Los usuarios se pueden autenticar con diferentes roles
✅ Las notificaciones llegan en tiempo real
✅ Se puede filtrar por roles específicos
✅ Funciona en red local (multi-dispositivo)
✅ Es escalable y confiable

¡Ahora puedes hacer demostraciones profesionales del sistema de notificaciones! 🚀
