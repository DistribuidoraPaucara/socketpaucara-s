@echo off
echo.
echo ==========================================
echo  🚀 Servidor WebSocket - Cobrador
echo  📱 Configurado para Flutter
echo ==========================================
echo.

cd /d "%~dp0"

REM Obtener IP local
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        set "LOCAL_IP=%%b"
        goto :found
    )
)
:found

REM Verificar si se encontró IP
if not defined LOCAL_IP (
    set "LOCAL_IP=localhost"
    echo ⚠️  No se pudo detectar IP local, usando localhost
)

echo 🌐 Configuración de red:
echo    - Servidor local:     http://localhost:3001
echo    - IP de red:         http://%LOCAL_IP%:3001
echo    - Estado del servidor: http://%LOCAL_IP%:3001/health
echo    - Página de pruebas:  http://%LOCAL_IP%:3001/test.html
echo.
echo 📱 URLs para Flutter:
echo    - Emulador Android:   http://10.0.2.2:3001
echo    - Dispositivo físico: http://%LOCAL_IP%:3001
echo    - iOS Simulator:      http://localhost:3001
echo.

REM Instalar dependencias si no existen
if not exist "node_modules" (
    echo ⚠️  Node_modules no encontrado. Instalando dependencias...
    npm install
    if errorlevel 1 (
        echo ❌ Error instalando dependencias
        pause
        exit /b 1
    )
)

REM Verificar archivo .env
if not exist ".env" (
    echo ⚠️  Archivo .env no encontrado. Creando configuración...
    (
        echo # Configuración del servidor WebSocket para Flutter
        echo WEBSOCKET_PORT=3001
        echo CLIENT_URL=http://localhost:3000
        echo ALLOWED_ORIGINS=*
        echo SERVER_IP=%LOCAL_IP%
        echo LOG_LEVEL=info
    ) > .env
)

echo ⚡ Iniciando servidor WebSocket...
echo    💡 Presiona Ctrl+C para detener el servidor
echo.

REM Crear archivo temporal con URLs para Flutter
(
    echo // URLs de conexión para Flutter - Generado automáticamente
    echo class WebSocketConfig {
    echo   static const String localUrl = 'http://localhost:3001';
    echo   static const String networkUrl = 'http://%LOCAL_IP%:3001';
    echo   static const String emulatorUrl = 'http://10.0.2.2:3001';
    echo.  
    echo   // Usar según el entorno
    echo   static String getServerUrl^(bool isEmulator, bool useNetwork^) {
    echo     if ^(isEmulator^) return emulatorUrl;
    echo     return useNetwork ? networkUrl : localUrl;
    echo   }
    echo }
) > flutter_websocket_config.dart

echo 📋 Configuración Flutter guardada en: flutter_websocket_config.dart
echo.

REM Iniciar servidor
npm start

pause
