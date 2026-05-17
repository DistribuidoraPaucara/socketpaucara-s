import { getLocalIP } from '../src/utils/network-utils.js';
import { getPort } from '../src/config/socket.config.js';
import net from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🔍 DIAGNÓSTICO DE CONECTIVIDAD WEBSOCKET\n');

const PORT = getPort();
const localIP = getLocalIP();

console.log(`📊 Información del servidor:`);
console.log(`   IP Local: ${localIP}`);
console.log(`   Puerto WebSocket: ${PORT}`);
console.log(`   Puerto Laravel (funcional): 8000\n`);

// Test 1: Verificar si el puerto está libre
console.log('🧪 Test 1: Verificando disponibilidad del puerto...');
const server = net.createServer();

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Puerto ${PORT} está disponible`);
    server.close();

    // Test 2: Verificar reglas de firewall
    console.log('\n🧪 Test 2: Verificando reglas de firewall...');
    checkFirewallRules();
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`⚠️  Puerto ${PORT} ya está en uso (esto es normal si el WebSocket está corriendo)`);
    } else {
        console.log(`❌ Error en puerto ${PORT}:`, err.message);
    }

    // Continuar con otros tests
    console.log('\n🧪 Test 2: Verificando reglas de firewall...');
    checkFirewallRules();
});

async function checkFirewallRules() {
    try {
        // Verificar si hay reglas de firewall para el puerto
        const { stdout } = await execAsync(`netsh advfirewall firewall show rule name="WebSocket ${PORT}" verbose`);
        if (stdout.includes('No rules match')) {
            console.log(`❌ No hay regla de firewall para el puerto ${PORT}`);
            console.log(`\n🔧 SOLUCIÓN: Ejecuta este comando como Administrador:`);
            console.log(`netsh advfirewall firewall add rule name="WebSocket ${PORT}" dir=in action=allow protocol=TCP localport=${PORT}`);
        } else {
            console.log(`✅ Regla de firewall encontrada para el puerto ${PORT}`);
        }
    } catch (error) {
        console.log(`⚠️  No se pudo verificar firewall automaticamente`);
        console.log(`\n🔧 SOLUCIÓN MANUAL: Ejecuta como Administrador:`);
        console.log(`netsh advfirewall firewall add rule name="WebSocket ${PORT}" dir=in action=allow protocol=TCP localport=${PORT}`);
    }

    // Test 3: Verificar conectividad de red
    console.log('\n🧪 Test 3: Verificando conectividad de red...');
    testNetworkConnectivity();
}

function testNetworkConnectivity() {
    console.log(`\n📋 INSTRUCCIONES PARA PRUEBA DESDE OTRA PC:`);
    console.log(`\n1. 🌐 Prueba HTTP simple:`);
    console.log(`   Abre un navegador en la otra PC y ve a:`);
    console.log(`   http://${localIP}:${PORT}`);
    console.log(`   Deberías ver una respuesta del servidor`);

    console.log(`\n2. 🔌 Prueba de puerto con telnet:`);
    console.log(`   Desde cmd en la otra PC ejecuta:`);
    console.log(`   telnet ${localIP} ${PORT}`);
    console.log(`   Si se conecta, el puerto está abierto`);

    console.log(`\n3. 🧪 Prueba con curl (si está instalado):`);
    console.log(`   curl -I http://${localIP}:${PORT}`);

    console.log(`\n📋 TROUBLESHOOTING COMÚN:`);
    console.log(`\n❌ Si NO puedes acceder desde otra PC:`);
    console.log(`   • Firewall de Windows bloquea el puerto ${PORT}`);
    console.log(`   • Router/Switch bloquea el tráfico`);
    console.log(`   • Antivirus interfiere con la conexión`);
    console.log(`   • IP incorrecta (usar ${localIP})`);

    console.log(`\n✅ Si SÍ puedes acceder al puerto ${PORT} pero WebSocket falla:`);
    console.log(`   • Problema con Socket.IO cliente/servidor`);
    console.log(`   • CORS mal configurado`);
    console.log(`   • Versión incompatible de Socket.IO`);

    console.log(`\n🔧 COMANDOS ÚTILES (Ejecutar como Administrador):`);
    console.log(`\n1. Abrir puerto en firewall:`);
    console.log(`   netsh advfirewall firewall add rule name="WebSocket ${PORT}" dir=in action=allow protocol=TCP localport=${PORT}`);

    console.log(`\n2. Verificar puertos abiertos:`);
    console.log(`   netstat -an | findstr :${PORT}`);

    console.log(`\n3. Deshabilitar temporalmente firewall (SOLO PARA PRUEBAS):`);
    console.log(`   netsh advfirewall set allprofiles state off`);
    console.log(`   ⚠️  RECUERDA REACTIVARLO DESPUÉS:`);
    console.log(`   netsh advfirewall set allprofiles state on`);
}
