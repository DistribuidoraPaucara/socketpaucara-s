const fs = require('fs');

let content = fs.readFileSync('./sanctum-token.service.js', 'utf8');

// Reemplazar la consulta con una versión que primero obtiene el model_type de un registro
const oldQuery = `const rolesResult = await client.query(
                    \`SELECT DISTINCT r.name
                     FROM model_has_roles mhr
                     JOIN roles r ON mhr.role_id = r.id
                     WHERE mhr.model_id = $1 AND mhr.model_type = 'App\\\\Models\\\\User'\`,
                    [user.id]
                );`;

const newQuery = `// Obtener el model_type exacto de la BD primero
                const modelTypeResult = await client.query(
                    \`SELECT DISTINCT model_type FROM model_has_roles WHERE model_id = $1 LIMIT 1\`,
                    [user.id]
                );
                
                const modelType = modelTypeResult.rows.length > 0 ? modelTypeResult.rows[0].model_type : 'App\\Models\\User';

                const rolesResult = await client.query(
                    \`SELECT DISTINCT r.name
                     FROM model_has_roles mhr
                     JOIN roles r ON mhr.role_id = r.id
                     WHERE mhr.model_id = $1 AND mhr.model_type = $2\`,
                    [user.id, modelType]
                );`;

if (content.includes(oldQuery)) {
    content = content.replace(oldQuery, newQuery);
    fs.writeFileSync('./sanctum-token.service.js', content);
    console.log('✅ Consulta actualizada para obtener model_type dinámicamente');
} else {
    console.log('❌ No se encontró el patrón exacto, intentando alternativa...');
}
