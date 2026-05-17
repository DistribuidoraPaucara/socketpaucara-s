import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_DATABASE || 'distribuidora-paucara',
};

const pool = new pg.Pool(dbConfig);

async function testQuery() {
    const client = await pool.connect();
    try {
        console.log('🔍 Testando consulta de roles...\n');
        
        const userId = 2; // Admin user
        
        // Test 1: Verificar que el usuario existe
        const userResult = await client.query(
            'SELECT id, name FROM users WHERE id = $1',
            [userId]
        );
        
        console.log('Usuario encontrado:');
        console.log(` - ID: ${userResult.rows[0].id}`);
        console.log(` - Nombre: ${userResult.rows[0].name}\n`);
        
        // Test 2: Consulta con el string 'App\Models\User'
        const rolesResult = await client.query(
            `SELECT DISTINCT r.name
             FROM model_has_roles mhr
             JOIN roles r ON mhr.role_id = r.id
             WHERE mhr.model_id = $1 AND mhr.model_type = 'App\Models\User'`,
            [userId]
        );
        
        console.log(`Roles encontrados (con 'App\Models\User'):`);
        if (rolesResult.rows.length === 0) {
            console.log('  ❌ Ninguno');
            
            // Debug: Ver qué model_type hay
            const debugResult = await client.query(
                'SELECT DISTINCT model_type FROM model_has_roles WHERE model_id = $1',
                [userId]
            );
            console.log('\n  model_type valores en BD:');
            debugResult.rows.forEach(r => console.log(`    - "${r.model_type}"`));
        } else {
            rolesResult.rows.forEach(r => console.log(`  ✅ ${r.name}`));
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

testQuery();
