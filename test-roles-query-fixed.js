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
        const userId = 2;
        
        console.log('Test 1: Usando E (escape string literal)');
        const test1 = await client.query(
            `SELECT DISTINCT r.name
             FROM model_has_roles mhr
             JOIN roles r ON mhr.role_id = r.id
             WHERE mhr.model_id = $1 AND mhr.model_type = E'App\Models\User'`,
            [userId]
        );
        console.log(`Resultado: ${test1.rows.length} roles encontrados`);
        test1.rows.forEach(r => console.log(`  ✅ ${r.name}`));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

testQuery();
