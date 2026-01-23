/**
 * ETL Pipeline - Extract, Transform, Load
 * Chuyển dữ liệu từ Data Lake (CSV) vào Data Warehouse (SQLite)
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Readable } = require('stream');

// Database connection
const dbPath = path.join(__dirname, '..', 'database', 'datavis_warehouse.db');
const db = new Database(dbPath);

// Paths
const datasetPath = path.join(__dirname, '..', '..', 'dataset');
const dataLakePath = path.join(__dirname, '..', '..', 'data-lake');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║         DataVis ETL Pipeline - Data Loading              ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// ============================================
// HELPER FUNCTIONS
// ============================================

function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
        info: '\x1b[36m',    // Cyan
        success: '\x1b[32m', // Green
        warn: '\x1b[33m',    // Yellow
        error: '\x1b[31m'    // Red
    };
    console.log(`${colors[type]}[${timestamp}] ${message}\x1b[0m`);
}

function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (err) => reject(err));
    });
}

function logETL(jobName, sourceFile, targetTable, stats, status, errorMessage = null) {
    const insert = db.prepare(`
        INSERT INTO etl_log (job_name, source_file, target_table, records_processed, 
            records_inserted, records_updated, records_failed, status, error_message, 
            started_at, completed_at, duration_seconds)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insert.run(
        jobName,
        sourceFile,
        targetTable,
        stats.processed || 0,
        stats.inserted || 0,
        stats.updated || 0,
        stats.failed || 0,
        status,
        errorMessage,
        stats.startedAt,
        new Date().toISOString(),
        stats.duration || 0
    );
}

// ============================================
// ETL: Countries
// ============================================

async function etlCountries() {
    log('Starting ETL: Countries...');
    const startTime = Date.now();
    const stats = { processed: 0, inserted: 0, failed: 0, startedAt: new Date().toISOString() };
    
    try {
        // Extract từ migration data để lấy danh sách countries
        const migrationFile = path.join(datasetPath, 'NZ_MIGRATION.csv');
        const data = await parseCSV(migrationFile);
        
        log(`  Loaded ${data.length} records from CSV`);
        
        // Get unique countries - CSV có column "country" (có thể có khoảng trắng)
        // Normalize column names bằng cách kiểm tra tất cả các key
        const countries = [...new Set(data.map(d => {
            // Tìm country column (có thể có khoảng trắng ở đầu/cuối key)
            for (const key of Object.keys(d)) {
                if (key.trim().toLowerCase() === 'country') {
                    return d[key];
                }
            }
            return d.country || d.Country || d['country'];
        }))].filter(c => c && c.trim() !== '');
        
        log(`  Found ${countries.length} unique countries`);
        
        // Mapping regions (có thể mở rộng)
        const regionMapping = {
            'China': { region: 'East Asia', continent: 'Asia' },
            'India': { region: 'South Asia', continent: 'Asia' },
            'Philippines': { region: 'Southeast Asia', continent: 'Asia' },
            'United Kingdom': { region: 'Northern Europe', continent: 'Europe' },
            'Australia': { region: 'Oceania', continent: 'Oceania' },
            'United States of America': { region: 'North America', continent: 'North America' },
            'South Africa': { region: 'Southern Africa', continent: 'Africa' },
            'Germany': { region: 'Western Europe', continent: 'Europe' },
            'Japan': { region: 'East Asia', continent: 'Asia' },
            'South Korea': { region: 'East Asia', continent: 'Asia' },
            'Korea, Republic of': { region: 'East Asia', continent: 'Asia' },
            'Vietnam': { region: 'Southeast Asia', continent: 'Asia' },
            'Malaysia': { region: 'Southeast Asia', continent: 'Asia' },
            'Thailand': { region: 'Southeast Asia', continent: 'Asia' },
            'Indonesia': { region: 'Southeast Asia', continent: 'Asia' },
            'Singapore': { region: 'Southeast Asia', continent: 'Asia' },
            'France': { region: 'Western Europe', continent: 'Europe' },
            'Canada': { region: 'North America', continent: 'North America' },
            'Brazil': { region: 'South America', continent: 'South America' },
            'New Zealand': { region: 'Oceania', continent: 'Oceania' },
            'Afghanistan': { region: 'South Asia', continent: 'Asia' },
            'Russia': { region: 'Eastern Europe', continent: 'Europe' },
            'Mexico': { region: 'North America', continent: 'North America' },
            'Argentina': { region: 'South America', continent: 'South America' }
        };
        
        const insert = db.prepare(`
            INSERT OR REPLACE INTO dim_country (country_name, region, continent, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `);
        
        const transaction = db.transaction((countries) => {
            for (const country of countries) {
                const mapping = regionMapping[country] || { region: 'Other', continent: 'Other' };
                insert.run(country.trim(), mapping.region, mapping.continent);
                stats.inserted++;
            }
        });
        
        transaction(countries);
        stats.processed = countries.length;
        stats.duration = Math.round((Date.now() - startTime) / 1000);
        
        log(`✓ ETL Countries completed: ${stats.inserted} countries loaded`, 'success');
        logETL('etl_countries', 'NZ_MIGRATION.csv', 'dim_country', stats, 'SUCCESS');
        
    } catch (error) {
        log(`✗ ETL Countries failed: ${error.message}`, 'error');
        logETL('etl_countries', 'NZ_MIGRATION.csv', 'dim_country', stats, 'FAILED', error.message);
    }
}

// ============================================
// ETL: Migration Data
// ============================================

async function etlMigration() {
    log('Starting ETL: Migration Data...');
    const startTime = Date.now();
    const stats = { processed: 0, inserted: 0, failed: 0, startedAt: new Date().toISOString() };
    
    try {
        const migrationFile = path.join(datasetPath, 'NZ_MIGRATION.csv');
        const data = await parseCSV(migrationFile);
        
        log(`  Loaded ${data.length} records from CSV`);
        
        // Prepare statements
        const getCountryId = db.prepare('SELECT country_id FROM dim_country WHERE country_name = ?');
        const getTimeId = db.prepare('SELECT time_id FROM dim_time WHERE year = ? AND month = 1');
        
        const insertFact = db.prepare(`
            INSERT INTO fact_migration (country_id, time_id, arrival_count, net_migration, source_file)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        // Clear old data
        db.exec('DELETE FROM fact_migration');
        
        const transaction = db.transaction((records) => {
            for (const record of records) {
                try {
                    // CSV format: country,year,estimate (handle column name với spaces)
                    let countryName = null;
                    let year = null;
                    let estimate = 0;
                    
                    // Normalize column access
                    for (const key of Object.keys(record)) {
                        const lowerKey = key.trim().toLowerCase();
                        if (lowerKey === 'country') countryName = record[key]?.trim();
                        if (lowerKey === 'year') year = parseInt(record[key]);
                        if (lowerKey === 'estimate') estimate = parseInt(record[key]) || 0;
                    }
                    
                    if (!countryName || isNaN(year)) {
                        stats.failed++;
                        continue;
                    }
                    
                    const country = getCountryId.get(countryName);
                    const time = getTimeId.get(year);
                    
                    if (country && time) {
                        insertFact.run(
                            country.country_id,
                            time.time_id,
                            estimate,
                            estimate, // net = arrivals for this dataset
                            'NZ_MIGRATION.csv'
                        );
                        stats.inserted++;
                    } else {
                        stats.failed++;
                    }
                    stats.processed++;
                } catch (e) {
                    stats.failed++;
                }
            }
        });
        
        transaction(data);
        stats.duration = Math.round((Date.now() - startTime) / 1000);
        
        log(`✓ ETL Migration completed: ${stats.inserted}/${stats.processed} records loaded`, 'success');
        logETL('etl_migration', 'NZ_MIGRATION.csv', 'fact_migration', stats, 'SUCCESS');
        
    } catch (error) {
        log(`✗ ETL Migration failed: ${error.message}`, 'error');
        logETL('etl_migration', 'NZ_MIGRATION.csv', 'fact_migration', stats, 'FAILED', error.message);
    }
}

// ============================================
// ETL: Demographics (Age & Sex)
// ============================================

async function etlDemographics() {
    log('Starting ETL: Demographics Data...');
    const startTime = Date.now();
    const stats = { processed: 0, inserted: 0, failed: 0, startedAt: new Date().toISOString() };
    
    try {
        const ageFile = path.join(datasetPath, 'ageandsex.csv');
        
        if (!fs.existsSync(ageFile)) {
            log('Demographics file not found, skipping...', 'warn');
            return;
        }
        
        const data = await parseCSV(ageFile);
        log(`  Loaded ${data.length} records from CSV`);
        
        // Clear old data
        db.exec('DELETE FROM fact_demographics');
        
        // CSV format: ,direction,age,sex,year,estimate
        // Aggregate by age group
        const aggregated = {};
        
        for (const record of data) {
            // Chỉ lấy Arrivals
            if (record.direction !== 'Arrivals') continue;
            
            const ageGroup = record.age ? record.age.trim() : null;
            const sex = record.sex ? record.sex.trim() : null;
            const year = parseInt(record.year);
            const estimate = parseInt(record.estimate) || 0;
            
            if (!ageGroup || !sex || isNaN(year)) continue;
            
            const key = `${ageGroup}|${sex}|${year}`;
            if (!aggregated[key]) {
                aggregated[key] = { ageGroup, sex, year, total: 0 };
            }
            aggregated[key].total += estimate;
        }
        
        const getTimeId = db.prepare('SELECT time_id FROM dim_time WHERE year = ? AND month = 1');
        const getGenderId = db.prepare('SELECT gender_id FROM dim_gender WHERE gender_code = ?');
        
        // Map age groups
        const ageGroupMapping = {
            '0-4 years': '0-9',
            '5-9 years': '0-9',
            '10-14 years': '10-19',
            '15-19 years': '10-19',
            '20-24 years': '20-29',
            '25-29 years': '20-29',
            '30-34 years': '30-39',
            '35-39 years': '30-39',
            '40-44 years': '40-49',
            '45-49 years': '40-49',
            '50-54 years': '50-59',
            '55-59 years': '50-59',
            '60-64 years': '60-69',
            '65+ years': '70+',
            '65-69 years': '60-69',
            '70-74 years': '70+',
            '75+ years': '70+'
        };
        
        const getAgeGroupId = db.prepare('SELECT age_group_id FROM dim_age_group WHERE age_group_code = ?');
        
        const insertFact = db.prepare(`
            INSERT INTO fact_demographics (time_id, age_group_id, gender_id, population_count, source_file)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        const transaction = db.transaction((records) => {
            for (const record of Object.values(records)) {
                try {
                    const time = getTimeId.get(record.year);
                    const mappedAgeGroup = ageGroupMapping[record.ageGroup] || record.ageGroup;
                    const ageGroup = getAgeGroupId.get(mappedAgeGroup);
                    const genderCode = record.sex === 'Female' ? 'F' : (record.sex === 'Male' ? 'M' : 'O');
                    const gender = getGenderId.get(genderCode);
                    
                    if (time && ageGroup && gender) {
                        insertFact.run(time.time_id, ageGroup.age_group_id, gender.gender_id, record.total, 'ageandsex.csv');
                        stats.inserted++;
                    }
                    stats.processed++;
                } catch (e) {
                    stats.failed++;
                }
            }
        });
        
        transaction(aggregated);
        stats.duration = Math.round((Date.now() - startTime) / 1000);
        
        log(`✓ ETL Demographics completed: ${stats.inserted} records loaded`, 'success');
        logETL('etl_demographics', 'ageandsex.csv', 'fact_demographics', stats, 'SUCCESS');
        
    } catch (error) {
        log(`✗ ETL Demographics failed: ${error.message}`, 'error');
        logETL('etl_demographics', 'ageandsex.csv', 'fact_demographics', stats, 'FAILED', error.message);
    }
}

// ============================================
// ETL: Treemap / Exports
// ============================================

async function etlExports() {
    log('Starting ETL: Exports/Treemap Data...');
    const startTime = Date.now();
    const stats = { processed: 0, inserted: 0, failed: 0, startedAt: new Date().toISOString() };
    
    try {
        const treemapFile = path.join(datasetPath, 'data_treemap.csv');
        
        if (!fs.existsSync(treemapFile)) {
            log('Treemap file not found, skipping...', 'warn');
            return;
        }
        
        const data = await parseCSV(treemapFile);
        log(`  Loaded ${data.length} records from CSV`);
        
        // Clear old data
        db.exec('DELETE FROM fact_exports');
        
        const getTimeId = db.prepare('SELECT time_id FROM dim_time WHERE year = 2023 AND month = 1');
        const time = getTimeId.get();
        
        const insertFact = db.prepare(`
            INSERT INTO fact_exports (time_id, category, subcategory, parent_category, export_value, source_file)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        // CSV format: name,parent,value
        const transaction = db.transaction((records) => {
            for (const record of records) {
                try {
                    const name = record.name ? record.name.trim() : '';
                    const parent = record.parent ? record.parent.trim() : null;
                    const value = parseFloat(record.value) || 0;
                    
                    if (name) {
                        // Nếu có parent -> đây là subcategory
                        // Nếu không có parent -> đây là category chính
                        insertFact.run(
                            time ? time.time_id : null,
                            parent ? parent : name,  // category
                            parent ? name : null,     // subcategory (nếu có parent)
                            parent,                   // parent_category
                            value,
                            'data_treemap.csv'
                        );
                        stats.inserted++;
                    }
                    stats.processed++;
                } catch (e) {
                    stats.failed++;
                }
            }
        });
        
        transaction(data);
        stats.duration = Math.round((Date.now() - startTime) / 1000);
        
        log(`✓ ETL Exports completed: ${stats.inserted} records loaded`, 'success');
        logETL('etl_exports', 'data_treemap.csv', 'fact_exports', stats, 'SUCCESS');
        
    } catch (error) {
        log(`✗ ETL Exports failed: ${error.message}`, 'error');
        logETL('etl_exports', 'data_treemap.csv', 'fact_exports', stats, 'FAILED', error.message);
    }
}

// ============================================
// BUILD AGGREGATIONS
// ============================================

async function buildAggregations() {
    log('Building aggregation tables...');
    
    try {
        // Agg: Migration by Year
        db.exec(`
            DELETE FROM agg_migration_yearly;
            
            INSERT INTO agg_migration_yearly (country_id, year, total_arrivals, total_net_migration)
            SELECT 
                f.country_id,
                t.year,
                SUM(f.arrival_count) as total_arrivals,
                SUM(f.net_migration) as total_net_migration
            FROM fact_migration f
            JOIN dim_time t ON f.time_id = t.time_id
            GROUP BY f.country_id, t.year;
        `);
        log('✓ Built: agg_migration_yearly', 'success');
        
        // Agg: Migration by Country
        db.exec(`
            DELETE FROM agg_migration_by_country;
            
            INSERT INTO agg_migration_by_country (country_id, total_arrivals, total_net_migration, first_year, last_year, years_count)
            SELECT 
                f.country_id,
                SUM(f.arrival_count) as total_arrivals,
                SUM(f.net_migration) as total_net_migration,
                MIN(t.year) as first_year,
                MAX(t.year) as last_year,
                COUNT(DISTINCT t.year) as years_count
            FROM fact_migration f
            JOIN dim_time t ON f.time_id = t.time_id
            GROUP BY f.country_id;
        `);
        log('✓ Built: agg_migration_by_country', 'success');
        
    } catch (error) {
        log(`✗ Aggregation failed: ${error.message}`, 'error');
    }
}

// ============================================
// COPY TO DATA LAKE
// ============================================

async function copyToDataLake() {
    log('Copying CSV files to Data Lake...');
    
    const rawDir = path.join(dataLakePath, 'raw');
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    // Create directories
    const dirs = ['migration', 'demographics', 'economic', 'geographic'];
    dirs.forEach(dir => {
        const fullPath = path.join(rawDir, dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
    });
    
    // Copy files with timestamp
    const fileMappings = [
        { source: 'NZ_MIGRATION.csv', dest: `migration/statsnz_migration_${timestamp}.csv` },
        { source: 'ageandsex.csv', dest: `demographics/statsnz_demographics_${timestamp}.csv` },
        { source: 'gdp-penn-world-table.csv', dest: `economic/statsnz_gdp_${timestamp}.csv` },
        { source: 'data_treemap.csv', dest: `economic/statsnz_exports_${timestamp}.csv` },
        { source: 'world.json', dest: `geographic/world_geojson_${timestamp}.json` }
    ];
    
    for (const mapping of fileMappings) {
        const sourcePath = path.join(datasetPath, mapping.source);
        const destPath = path.join(rawDir, mapping.dest);
        
        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
            log(`  Copied: ${mapping.source} -> ${mapping.dest}`, 'info');
        }
    }
    
    log('✓ Data Lake updated', 'success');
}

// ============================================
// MAIN ETL PIPELINE
// ============================================

async function runETL() {
    const startTime = Date.now();
    log('═══════════════════════════════════════════════════════════');
    log('Starting Full ETL Pipeline...');
    log('═══════════════════════════════════════════════════════════\n');
    
    try {
        // Step 1: Copy to Data Lake
        await copyToDataLake();
        console.log('');
        
        // Step 2: ETL Dimensions
        await etlCountries();
        console.log('');
        
        // Step 3: ETL Facts
        await etlMigration();
        await etlDemographics();
        await etlExports();
        console.log('');
        
        // Step 4: Build Aggregations
        await buildAggregations();
        console.log('');
        
        const duration = Math.round((Date.now() - startTime) / 1000);
        log('═══════════════════════════════════════════════════════════');
        log(`✅ ETL Pipeline completed in ${duration} seconds`, 'success');
        log('═══════════════════════════════════════════════════════════');
        
    } catch (error) {
        log(`❌ ETL Pipeline failed: ${error.message}`, 'error');
        process.exit(1);
    } finally {
        db.close();
    }
}

// Run ETL
runETL();
