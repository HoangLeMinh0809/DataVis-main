/**
 * Data Warehouse API Server
 * Cung cấp REST API để frontend query data từ Data Warehouse
 */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const dbPath = path.join(__dirname, 'database', 'datavis_warehouse.db');
const db = new Database(dbPath, { readonly: true });

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ============================================
// API ENDPOINTS
// ============================================

/**
 * Root endpoint - API documentation
 */
app.get('/', (req, res) => {
    res.json({
        name: 'DataVis Data Warehouse API',
        version: '1.0.0',
        endpoints: {
            health: 'GET /api/health',
            countries: 'GET /api/countries',
            migration: 'GET /api/migration',
            migrationByCountry: 'GET /api/migration/country/:name',
            migrationByYear: 'GET /api/migration/year/:year',
            migrationSummary: 'GET /api/migration/summary',
            demographics: 'GET /api/demographics',
            exports: 'GET /api/exports',
            query: 'POST /api/query',
            stats: 'GET /api/stats',
            etlLogs: 'GET /api/etl/logs'
        }
    });
});

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        database: 'connected',
        timestamp: new Date().toISOString()
    });
});

/**
 * Get all countries
 */
app.get('/api/countries', (req, res) => {
    try {
        const countries = db.prepare(`
            SELECT country_id, country_name, region, continent
            FROM dim_country
            ORDER BY country_name
        `).all();
        
        res.json({ success: true, data: countries });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get migration data with filters (uses pre-aggregated table)
 * Query params: year, country, limit
 */
app.get('/api/migration', (req, res) => {
    try {
        const { year, country, limit = 1000 } = req.query;
        
        let sql = `
            SELECT 
                c.country_name,
                c.region,
                c.continent,
                a.year,
                a.total_arrivals AS arrivals,
                a.total_net_migration AS net_migration
            FROM agg_migration_yearly a
            JOIN dim_country c ON a.country_id = c.country_id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (year) {
            sql += ' AND a.year = ?';
            params.push(parseInt(year));
        }
        
        if (country) {
            sql += ' AND c.country_name = ?';
            params.push(country);
        }
        
        sql += ' ORDER BY a.year DESC, a.total_arrivals DESC LIMIT ?';
        params.push(parseInt(limit));
        
        const data = db.prepare(sql).all(...params);
        
        res.json({ 
            success: true, 
            count: data.length,
            data: data 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get migration by country (for line chart) - uses pre-aggregated table
 */
app.get('/api/migration/country/:country', (req, res) => {
    try {
        const { country } = req.params;
        
        const data = db.prepare(`
            SELECT 
                a.year,
                a.total_arrivals AS arrivals,
                a.total_net_migration AS net_migration
            FROM agg_migration_yearly a
            JOIN dim_country c ON a.country_id = c.country_id
            WHERE c.country_name = ?
            ORDER BY a.year ASC
        `).all(country);
        
        res.json({ 
            success: true, 
            country: country,
            data: data 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get migration by year (for choropleth map) - uses pre-aggregated table
 */
app.get('/api/migration/year/:year', (req, res) => {
    try {
        const { year } = req.params;
        
        const data = db.prepare(`
            SELECT 
                c.country_name,
                c.region,
                c.continent,
                a.total_arrivals AS arrivals,
                a.total_net_migration AS net_migration
            FROM agg_migration_yearly a
            JOIN dim_country c ON a.country_id = c.country_id
            WHERE a.year = ?
            ORDER BY arrivals DESC
        `).all(parseInt(year));
        
        res.json({ 
            success: true, 
            year: parseInt(year),
            data: data 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get aggregated migration summary (pre-computed)
 */
app.get('/api/migration/summary', (req, res) => {
    try {
        // Yearly totals
        const yearlyData = db.prepare(`
            SELECT 
                year,
                SUM(total_arrivals) as total_arrivals,
                SUM(total_net_migration) as total_net_migration,
                COUNT(DISTINCT country_id) as countries_count
            FROM agg_migration_yearly
            GROUP BY year
            ORDER BY year
        `).all();
        
        // Top countries
        const topCountries = db.prepare(`
            SELECT 
                c.country_name,
                a.total_arrivals,
                a.total_net_migration
            FROM agg_migration_by_country a
            JOIN dim_country c ON a.country_id = c.country_id
            ORDER BY a.total_arrivals DESC
            LIMIT 10
        `).all();
        
        res.json({ 
            success: true, 
            data: {
                yearly: yearlyData,
                topCountries: topCountries
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get demographics data (for treemap - age groups)
 */
app.get('/api/demographics', (req, res) => {
    try {
        const data = db.prepare(`
            SELECT 
                a.age_group_name,
                g.gender_name,
                SUM(f.population_count) as population
            FROM fact_demographics f
            JOIN dim_age_group a ON f.age_group_id = a.age_group_id
            JOIN dim_gender g ON f.gender_id = g.gender_id
            GROUP BY a.age_group_name, g.gender_name
            ORDER BY a.min_age, g.gender_name
        `).all();
        
        res.json({ success: true, data: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get exports/treemap data
 */
app.get('/api/exports', (req, res) => {
    try {
        const data = db.prepare(`
            SELECT 
                category as name,
                parent_category as parent,
                export_value as value
            FROM fact_exports
            ORDER BY export_value DESC
        `).all();
        
        res.json({ success: true, data: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Execute custom SQL query (for advanced analytics)
 * POST /api/query
 * Body: { sql: "SELECT ..." }
 */
app.post('/api/query', (req, res) => {
    try {
        const { sql } = req.body;
        
        // Security: Only allow SELECT statements
        if (!sql || !sql.trim().toLowerCase().startsWith('select')) {
            return res.status(400).json({ 
                success: false, 
                error: 'Only SELECT queries are allowed' 
            });
        }
        
        // Prevent dangerous operations
        const forbidden = ['drop', 'delete', 'insert', 'update', 'alter', 'create'];
        const lowerSql = sql.toLowerCase();
        if (forbidden.some(word => lowerSql.includes(word))) {
            return res.status(400).json({ 
                success: false, 
                error: 'Query contains forbidden operations' 
            });
        }
        
        const data = db.prepare(sql).all();
        
        res.json({ 
            success: true, 
            count: data.length,
            data: data 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get ETL logs
 */
app.get('/api/etl/logs', (req, res) => {
    try {
        const logs = db.prepare(`
            SELECT * FROM etl_log 
            ORDER BY started_at DESC 
            LIMIT 50
        `).all();
        
        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get database statistics
 */
app.get('/api/stats', (req, res) => {
    try {
        const stats = {};
        
        // Count records in each table
        const tables = ['dim_country', 'dim_time', 'dim_age_group', 'dim_visa_type', 
                       'fact_migration', 'fact_demographics', 'fact_exports'];
        
        for (const table of tables) {
            const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
            stats[table] = result.count;
        }
        
        res.json({ 
            success: true, 
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║       DataVis Data Warehouse API Server                  ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log('\n📚 Available endpoints:');
    console.log('   GET  /api/health           - Health check');
    console.log('   GET  /api/countries        - List all countries');
    console.log('   GET  /api/migration        - Migration data (with filters)');
    console.log('   GET  /api/migration/country/:name - Migration by country');
    console.log('   GET  /api/migration/year/:year    - Migration by year');
    console.log('   GET  /api/migration/summary       - Pre-aggregated summary');
    console.log('   GET  /api/demographics     - Demographics data');
    console.log('   GET  /api/exports          - Exports/Treemap data');
    console.log('   POST /api/query            - Custom SQL query');
    console.log('   GET  /api/stats            - Database statistics');
    console.log('   GET  /api/etl/logs         - ETL execution logs');
    console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close();
    process.exit(0);
});
