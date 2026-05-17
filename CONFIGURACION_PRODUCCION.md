# Configuración del WebSocket Server para Producción

## ⚠️ Problema Identificado en Producción

El servicio WebSocket estaba intentando conectarse a `127.0.0.1:8000` (localhost) en lugar de usar la URL real de la API en producción (`https://gestorlp.up.railway.app/api`).

Esto causaba el error:
```
❌ API Error: connect ECONNREFUSED 127.0.0.1:8000 (/estados/categorias)
```

## 🔍 Causa Raíz

La variable de entorno `LARAVEL_API_URL` estaba hardcodeada a `http://localhost:8000/api` en el `.env` local, pero **en producción debe apuntar a la URL real de tu API**.

## ✅ Solución

### Opción 1: Usar `.env.production` (Recomendado)

Se ha creado un archivo `.env.production` con toda la configuración correcta para producción.

**Para deployar en Railway:**

1. **Copia el contenido de `.env.production` a las variables de entorno de Railway:**
   - Ve a tu proyecto en [Railway Dashboard](https://railway.app)
   - Selecciona el servicio WebSocket
   - Ve a la pestaña "Variables"
   - Copia estas variables (ajustando valores según sea necesario):

```env
NODE_ENV=production
PORT=3001
WS_SECRET=cobrador-websocket-secret-key-2025
CLIENT_URL=https://gestorlp.up.railway.app
MOBILE_CLIENT_URL=https://gestorlp.up.railway.app
WEBSOCKET_URL=https://socket-gestor-lp.up.railway.app
WEBSOCKET_HOST=0.0.0.0
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000
SOCKET_MAX_HTTP_BUFFER_SIZE=1048576
ENABLE_LOGS=true
LOG_LEVEL=info

# ⚠️ CRÍTICO: Base de datos de PostgreSQL
DB_HOST=postgres.railway.internal
DB_PORT=5432
DB_DATABASE=farmacia_orellana
DB_USERNAME=postgres
DB_PASSWORD=<tu-password-aqui>
DB_SSL=true

# ⚠️ CRÍTICO: URL de la API de Laravel en PRODUCCIÓN
LARAVEL_API_URL=https://gestorlp.up.railway.app/api
API_TIMEOUT=10000
STATE_CACHE_TTL=3600000
```

### Opción 2: Configurar Variables Individuales en Railway

Si prefieres configurar una por una en el dashboard de Railway:

1. `NODE_ENV` → `production`
2. `LARAVEL_API_URL` → **`https://gestorlp.up.railway.app/api`** ← ⚠️ **CRÍTICO**
3. `WEBSOCKET_URL` → **`https://socket-gestor-lp.up.railway.app`** ← ⚠️ **CRÍTICO**
4. `CLIENT_URL` → `https://gestorlp.up.railway.app`
5. Las demás variables según el archivo `.env.production`

## 🔑 Variables Críticas para Producción

| Variable | Valor en Producción | Por qué es crítica |
|----------|---------------------|-------------------|
| `LARAVEL_API_URL` | `https://gestorlp.up.railway.app/api` | El WebSocket necesita conectarse a la API para cargar estados logísticos |
| `WEBSOCKET_URL` | `https://socket-gestor-lp.up.railway.app` | Los clientes necesitan saber dónde conectarse |
| `NODE_ENV` | `production` | Activa validaciones y optimizaciones |
| `WS_SECRET` | Cambiar a un valor seguro | Para autenticación entre Laravel y WebSocket |
| `DB_HOST` | `postgres.railway.internal` | Apunta a la base de datos de PostgreSQL en Railway |
| `DB_SSL` | `true` | Requiere conexión segura en producción |

## ❌ Errores Comunes

### Error: `API health check failed: connect ECONNREFUSED 127.0.0.1:8000`

**Causa:** `LARAVEL_API_URL` sigue apuntando a localhost
**Solución:** Cambia `LARAVEL_API_URL` a `https://gestorlp.up.railway.app/api` en Railway

### Error: Servidor inicia pero WebSocket no responde

**Causa:** `WEBSOCKET_URL` está incorrecta
**Solución:** Verifica que sea `https://socket-gestor-lp.up.railway.app`

### Error: `undefined` en los logs

**Causa:** Las variables de entorno no están siendo leídas correctamente
**Solución:**
- Redeploy la aplicación después de agregar las variables
- Verifica que todas las variables estén en Railway (no solo en tu `.env` local)

## 🚀 Pasos para Deployar

1. **Confirma los cambios:**
   ```bash
   git add .
   git commit -m "Fix: Configurar correctamente LARAVEL_API_URL y validaciones para producción"
   git push origin main
   ```

2. **En Railway Dashboard:**
   - Ve a tu servicio WebSocket
   - Agrega/actualiza las variables de entorno (especialmente `LARAVEL_API_URL`, `WEBSOCKET_URL`, `NODE_ENV`)
   - Haz un redeploy

3. **Verifica los logs:**
   - Deberías ver: ✅ API health check passed
   - Deberías ver: 🎉 Estados inicializados correctamente!

## 📝 Diferencias Local vs Producción

### Local (Desarrollo)
```env
NODE_ENV=development
LARAVEL_API_URL=http://localhost:8000/api
WEBSOCKET_URL=http://192.168.5.44:3001
CLIENT_URL=http://192.168.5.44:8000
```

### Producción (Railway)
```env
NODE_ENV=production
LARAVEL_API_URL=https://gestorlp.up.railway.app/api
WEBSOCKET_URL=https://socket-gestor-lp.up.railway.app
CLIENT_URL=https://gestorlp.up.railway.app
```

## 🔧 Validaciones Agregadas

Se han mejorado las validaciones en `socket.config.js` para detectar configuraciones incorrectas en producción:

- ✅ Verifica que `LARAVEL_API_URL` esté configurada
- ✅ Verifica que `LARAVEL_API_URL` NO apunte a localhost en producción
- ✅ Verifica que `WEBSOCKET_URL` use HTTPS en producción
- ✅ Verifica que `WS_SECRET` esté configurado con un valor seguro

Si alguna validación falla, el servidor saldrá con error inmediatamente, evitando que se inicie con configuración incorrecta.

## ✅ Checklist para Producción

- [ ] `NODE_ENV=production` en Railway
- [ ] `LARAVEL_API_URL=https://gestorlp.up.railway.app/api` en Railway
- [ ] `WEBSOCKET_URL=https://socket-gestor-lp.up.railway.app` en Railway
- [ ] `WS_SECRET` configurado con valor seguro
- [ ] `DB_HOST=postgres.railway.internal` en Railway
- [ ] `DB_SSL=true` en Railway
- [ ] Redeploy realizado después de cambiar variables
- [ ] Verificar que los logs muestren "API health check passed" ✅

---

**Última actualización:** Enero 6, 2026
