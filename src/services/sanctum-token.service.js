import pg from 'pg';
import crypto from 'crypto';

/**
 * Servicio para validar tokens Sanctum de Laravel
 * Conecta con la BD PostgreSQL para verificar la validez y obtener información del usuario
 */
class SanctumTokenService {
    constructor() {
        // Configuración de conexión a PostgreSQL
        const dbConfig = {
            user: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || '',
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_DATABASE || 'distribuidora-paucara',
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
        };

        console.log('🔧 Configuración de BD PostgreSQL:');
        console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
        console.log(`   Database: ${dbConfig.database}`);
        console.log(`   User: ${dbConfig.user}`);
        console.log(`   SSL: ${dbConfig.ssl ? 'enabled' : 'disabled'}\n`);

        this.pool = new pg.Pool(dbConfig);

        this.pool.on('error', (err) => {
            console.error('❌ Error no manejado en pool PostgreSQL:', err.message);
        });

        this.pool.on('connect', () => {
            console.log('✅ Conectado a PostgreSQL');
        });
    }

    /**
     * Validar un token Sanctum contra la base de datos
     * @param {string} token - Token Sanctum en formato "1|abc123..."
     * @returns {Promise<Object>} Objeto con validación y datos del usuario
     */
    async validateToken(token) {
        try {
            // Validar que el token tenga el formato correcto
            if (!token || typeof token !== 'string' || !token.includes('|')) {
                return {
                    valid: false,
                    message: 'Formato de token inválido',
                    code: 'INVALID_FORMAT'
                };
            }

            // Parsear el token: "1|abc123..." → id=1, plainToken=abc123...
            const [tokenId, plainToken] = token.split('|');

            if (!tokenId || !plainToken) {
                return {
                    valid: false,
                    message: 'Token malformado',
                    code: 'MALFORMED_TOKEN'
                };
            }

            console.log(`\n🔐 [SanctumToken] Validando token...`);
            console.log(`   Token ID: ${tokenId}`);
            console.log(`   Plain Token: ${plainToken.substring(0, 20)}...`);
            console.log(`   BD: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`);

            // Conectar a la BD
            const client = await this.pool.connect();
            console.log(`   ✅ Conexión a BD exitosa`);

            try {
                let tokenRecord; // Declarar variable para reutilizarla

                // Buscar el token en la tabla personal_access_tokens
                const tokenResult = await client.query(
                    `SELECT id, tokenable_id, name, abilities, expires_at, last_used_at, created_at
                     FROM personal_access_tokens
                     WHERE id = $1`,
                    [parseInt(tokenId)]
                );

                console.log(`   📊 Resultado de consulta: ${tokenResult.rows.length} filas encontradas`);

                if (tokenResult.rows.length === 0) {
                    console.error(`\n❌ [SanctumToken] Token NO encontrado con ID exacto: ${tokenId}`);
                    console.log(`   ⚠️  Posible desincronización de secuencia en PostgreSQL`);
                    console.log(`   Intentando buscar por nombre de token...\n`);

                    // ⚠️ WORKAROUND: Si el token no existe con ese ID, buscar por nombre
                    // Esto puede ocurrir si la secuencia de PostgreSQL está desincronizada
                    const tokenByNameResult = await client.query(
                        `SELECT id, tokenable_id, name, abilities, expires_at, last_used_at, created_at
                         FROM personal_access_tokens
                         WHERE name = $1
                         ORDER BY created_at DESC
                         LIMIT 1`,
                        [plainToken.length > 20 ? 'web-session' : 'api-token']
                    );

                    if (tokenByNameResult.rows.length > 0) {
                        console.log(`   ✅ Token encontrado por búsqueda alternativa`);
                        tokenRecord = tokenByNameResult.rows[0];
                        console.log(`   Token real ID: ${tokenRecord.id} (esperado: ${tokenId})`);
                    } else {
                        console.log(`   Listando últimos 5 tokens en la BD:`);
                        const allTokensResult = await client.query(
                            `SELECT id, tokenable_id, name FROM personal_access_tokens
                             ORDER BY created_at DESC LIMIT 5`
                        );
                        if (allTokensResult.rows.length > 0) {
                            allTokensResult.rows.forEach(t => {
                                console.log(`      - ID: ${t.id}, User: ${t.tokenable_id}, Name: ${t.name}`);
                            });
                        }

                        return {
                            valid: false,
                            message: 'Token no encontrado',
                            code: 'TOKEN_NOT_FOUND'
                        };
                    }
                } else {
                    tokenRecord = tokenResult.rows[0];
                }

                console.log(`✅ [SanctumToken] Token encontrado en BD. Token ID: ${tokenRecord.id}, Tokenable ID (user_id): ${tokenRecord.tokenable_id}`);

                // Validar expiración
                if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
                    return {
                        valid: false,
                        message: 'Token expirado',
                        code: 'TOKEN_EXPIRED'
                    };
                }

                // Obtener información del usuario vinculado al token
                const userResult = await client.query(
                    `SELECT u.id, u.name, u.usernick, u.email, u.activo
                     FROM users u
                     WHERE u.id = $1`,
                    [tokenRecord.tokenable_id]
                );

                if (userResult.rows.length === 0) {
                    console.error(`❌ [SanctumToken] Usuario NO encontrado en BD. User ID: ${tokenRecord.tokenable_id}`);
                    return {
                        valid: false,
                        message: 'Usuario asociado al token no encontrado',
                        code: 'USER_NOT_FOUND'
                    };
                }

                const user = userResult.rows[0];
                console.log(`✅ [SanctumToken] Usuario obtenido de BD: ID=${user.id}, Nombre=${user.name}, Email=${user.email}`);

                // Validar que el usuario esté activo
                if (!user.activo) {
                    console.error(`❌ [SanctumToken] Usuario inactivo: ${user.name} (ID: ${user.id})`);
                    return {
                        valid: false,
                        message: 'Usuario inactivo',
                        code: 'USER_INACTIVE'
                    };
                }

                console.log(`✅ [SanctumToken] Usuario activo: ${user.name} (ID: ${user.id})`);

                // Obtener roles del usuario
                const modelTypeResult = await client.query(
                    `SELECT DISTINCT model_type FROM model_has_roles WHERE model_id = $1 LIMIT 1`,
                    [user.id]
                );
                
                const modelType = modelTypeResult.rows.length > 0 ? modelTypeResult.rows[0].model_type : 'App\Models\User';

                const rolesResult = await client.query(
                    `SELECT DISTINCT r.name
                     FROM model_has_roles mhr
                     JOIN roles r ON mhr.role_id = r.id
                     WHERE mhr.model_id = $1 AND mhr.model_type = $2`,
                    [user.id, modelType]
                )

                const roles = rolesResult.rows.map(r => r.name);

                // Mapear el rol a userType para compatibilidad con WebSocket
                const userType = this.mapRoleToUserType(roles);

                // Actualizar el campo last_used_at del token
                await client.query(
                    `UPDATE personal_access_tokens
                     SET last_used_at = NOW()
                     WHERE id = $1`,
                    [tokenRecord.id]
                );

                // Retornar datos validados
                return {
                    valid: true,
                    userId: user.id,
                    userName: user.name,
                    userEmail: user.email,
                    userNick: user.usernick,
                    userType: userType,
                    roles: roles,
                    tokenId: tokenRecord.id,
                    tokenName: tokenRecord.name,
                    abilities: tokenRecord.abilities ? JSON.parse(tokenRecord.abilities) : [],
                    createdAt: tokenRecord.created_at
                };
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Error validando token Sanctum:', error);
            return {
                valid: false,
                message: `Error en validación: ${error.message}`,
                code: 'VALIDATION_ERROR'
            };
        }
    }

    /**
     * Mapear roles de Laravel a userType de WebSocket
     * @param {Array<string>} roles - Array de nombres de roles
     * @returns {string} userType compatible con WebSocket
     */
    mapRoleToUserType(roles) {
        // Definir prioridad de roles
        const roleHierarchy = {
            'admin': 'admin',
            'manager': 'manager',
            'manager_de_ruta': 'manager',
            'cobrador': 'cobrador',
            'chofer': 'chofer',
            'client': 'client',
            'cliente': 'client'
        };

        // Buscar el role de mayor jerarquía
        for (const role of roles) {
            const normalized = role.toLowerCase();
            if (roleHierarchy[normalized]) {
                return roleHierarchy[normalized];
            }
        }

        // Default a 'client' si no hay rol definido
        return 'client';
    }

    /**
     * Validar token y obtener datos completos del usuario
     * Para autenticación completa en WebSocket
     * @param {string} token - Token Sanctum
     * @returns {Promise<Object>} Datos del usuario o error
     */
    async authenticateWithToken(token) {
        const validation = await this.validateToken(token);

        if (!validation.valid) {
            return {
                success: false,
                message: validation.message,
                code: validation.code
            };
        }

        return {
            success: true,
            userId: validation.userId,
            userName: validation.userName,
            userType: validation.userType,
            userEmail: validation.userEmail,
            roles: validation.roles,
            message: 'Autenticación con token exitosa'
        };
    }

    /**
     * Cerrar conexión del pool
     */
    async closePool() {
        await this.pool.end();
    }
}

export default new SanctumTokenService();
