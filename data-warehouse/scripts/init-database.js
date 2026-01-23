/**
 * Initialize Data Warehouse Database (SQLite)
 * Tạo schema theo mô hình Star Schema cho OLAP
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Tạo thư mục database nếu chưa có
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.join(dbDir, 'datavis_warehouse.db'));

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║     DataVis Data Warehouse - Database Initialization     ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// ============================================
// DIMENSION TABLES (Các bảng chiều)
// ============================================

console.log('Creating Dimension Tables...\n');

// Dim: Country (Quốc gia)
db.exec(`
    DROP TABLE IF EXISTS dim_country;
    CREATE TABLE dim_country (
        country_id INTEGER PRIMARY KEY AUTOINCREMENT,
        country_code VARCHAR(3),
        country_name VARCHAR(100) NOT NULL,
        region VARCHAR(50),
        continent VARCHAR(50),
        iso_alpha2 VARCHAR(2),
        iso_alpha3 VARCHAR(3),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_country_name ON dim_country(country_name);
    CREATE INDEX idx_country_code ON dim_country(country_code);
`);
console.log('✓ Created: dim_country');

// Dim: Time (Thời gian)
db.exec(`
    DROP TABLE IF EXISTS dim_time;
    CREATE TABLE dim_time (
        time_id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_date DATE,
        year INTEGER NOT NULL,
        quarter INTEGER,
        month INTEGER,
        month_name VARCHAR(20),
        day_of_week INTEGER,
        is_weekend BOOLEAN,
        fiscal_year INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_time_year ON dim_time(year);
    CREATE INDEX idx_time_full_date ON dim_time(full_date);
`);
console.log('✓ Created: dim_time');

// Dim: Age Group (Nhóm tuổi)
db.exec(`
    DROP TABLE IF EXISTS dim_age_group;
    CREATE TABLE dim_age_group (
        age_group_id INTEGER PRIMARY KEY AUTOINCREMENT,
        age_group_code VARCHAR(20) NOT NULL,
        age_group_name VARCHAR(50) NOT NULL,
        min_age INTEGER,
        max_age INTEGER,
        generation VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_age_group_code ON dim_age_group(age_group_code);
`);
console.log('✓ Created: dim_age_group');

// Dim: Visa Type (Loại visa)
db.exec(`
    DROP TABLE IF EXISTS dim_visa_type;
    CREATE TABLE dim_visa_type (
        visa_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
        visa_code VARCHAR(20),
        visa_name VARCHAR(100) NOT NULL,
        visa_category VARCHAR(50),
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_visa_code ON dim_visa_type(visa_code);
`);
console.log('✓ Created: dim_visa_type');

// Dim: Gender (Giới tính)
db.exec(`
    DROP TABLE IF EXISTS dim_gender;
    CREATE TABLE dim_gender (
        gender_id INTEGER PRIMARY KEY AUTOINCREMENT,
        gender_code VARCHAR(1) NOT NULL,
        gender_name VARCHAR(20) NOT NULL
    );
    
    INSERT INTO dim_gender (gender_code, gender_name) VALUES 
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
        ('U', 'Unknown');
`);
console.log('✓ Created: dim_gender (with seed data)');

// ============================================
// FACT TABLES (Các bảng sự kiện)
// ============================================

console.log('\nCreating Fact Tables...\n');

// Fact: Migration (Di cư)
db.exec(`
    DROP TABLE IF EXISTS fact_migration;
    CREATE TABLE fact_migration (
        migration_id INTEGER PRIMARY KEY AUTOINCREMENT,
        country_id INTEGER NOT NULL,
        time_id INTEGER NOT NULL,
        visa_type_id INTEGER,
        age_group_id INTEGER,
        gender_id INTEGER,
        
        -- Measures (Các chỉ số)
        arrival_count INTEGER DEFAULT 0,
        departure_count INTEGER DEFAULT 0,
        net_migration INTEGER DEFAULT 0,
        
        -- Metadata
        source_file VARCHAR(100),
        load_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (country_id) REFERENCES dim_country(country_id),
        FOREIGN KEY (time_id) REFERENCES dim_time(time_id),
        FOREIGN KEY (visa_type_id) REFERENCES dim_visa_type(visa_type_id),
        FOREIGN KEY (age_group_id) REFERENCES dim_age_group(age_group_id),
        FOREIGN KEY (gender_id) REFERENCES dim_gender(gender_id)
    );
    
    CREATE INDEX idx_fact_migration_country ON fact_migration(country_id);
    CREATE INDEX idx_fact_migration_time ON fact_migration(time_id);
    CREATE INDEX idx_fact_migration_composite ON fact_migration(country_id, time_id);
`);
console.log('✓ Created: fact_migration');

// Fact: Demographics (Dân số theo tuổi/giới tính)
db.exec(`
    DROP TABLE IF EXISTS fact_demographics;
    CREATE TABLE fact_demographics (
        demographics_id INTEGER PRIMARY KEY AUTOINCREMENT,
        time_id INTEGER NOT NULL,
        age_group_id INTEGER NOT NULL,
        gender_id INTEGER NOT NULL,
        
        -- Measures
        population_count INTEGER DEFAULT 0,
        percentage DECIMAL(5,2),
        
        -- Metadata
        source_file VARCHAR(100),
        load_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (time_id) REFERENCES dim_time(time_id),
        FOREIGN KEY (age_group_id) REFERENCES dim_age_group(age_group_id),
        FOREIGN KEY (gender_id) REFERENCES dim_gender(gender_id)
    );
    
    CREATE INDEX idx_fact_demographics_time ON fact_demographics(time_id);
`);
console.log('✓ Created: fact_demographics');

// Fact: GDP (Kinh tế)
db.exec(`
    DROP TABLE IF EXISTS fact_gdp;
    CREATE TABLE fact_gdp (
        gdp_id INTEGER PRIMARY KEY AUTOINCREMENT,
        country_id INTEGER NOT NULL,
        time_id INTEGER NOT NULL,
        
        -- Measures
        gdp_value DECIMAL(20,2),
        gdp_per_capita DECIMAL(15,2),
        gdp_growth_rate DECIMAL(5,2),
        population DECIMAL(15,0),
        
        -- Metadata
        unit VARCHAR(20),
        source_file VARCHAR(100),
        load_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (country_id) REFERENCES dim_country(country_id),
        FOREIGN KEY (time_id) REFERENCES dim_time(time_id)
    );
    
    CREATE INDEX idx_fact_gdp_country ON fact_gdp(country_id);
    CREATE INDEX idx_fact_gdp_time ON fact_gdp(time_id);
`);
console.log('✓ Created: fact_gdp');

// Fact: Treemap Data (Export categories)
db.exec(`
    DROP TABLE IF EXISTS fact_exports;
    CREATE TABLE fact_exports (
        export_id INTEGER PRIMARY KEY AUTOINCREMENT,
        time_id INTEGER,
        
        -- Dimensions inline (có thể tách ra dim table sau)
        category VARCHAR(100),
        subcategory VARCHAR(100),
        parent_category VARCHAR(100),
        
        -- Measures
        export_value DECIMAL(20,2),
        quantity DECIMAL(15,2),
        unit VARCHAR(20),
        
        -- Metadata
        source_file VARCHAR(100),
        load_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (time_id) REFERENCES dim_time(time_id)
    );
    
    CREATE INDEX idx_fact_exports_category ON fact_exports(category);
`);
console.log('✓ Created: fact_exports');

// ============================================
// AGGREGATION TABLES (Bảng tổng hợp - Pre-computed)
// ============================================

console.log('\nCreating Aggregation Tables...\n');

// Agg: Migration by Year and Country
db.exec(`
    DROP TABLE IF EXISTS agg_migration_yearly;
    CREATE TABLE agg_migration_yearly (
        agg_id INTEGER PRIMARY KEY AUTOINCREMENT,
        country_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
        
        total_arrivals INTEGER DEFAULT 0,
        total_departures INTEGER DEFAULT 0,
        total_net_migration INTEGER DEFAULT 0,
        avg_monthly_arrivals DECIMAL(10,2),
        
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(country_id, year)
    );
    
    CREATE INDEX idx_agg_migration_year ON agg_migration_yearly(year);
`);
console.log('✓ Created: agg_migration_yearly');

// Agg: Migration by Country (All time)
db.exec(`
    DROP TABLE IF EXISTS agg_migration_by_country;
    CREATE TABLE agg_migration_by_country (
        agg_id INTEGER PRIMARY KEY AUTOINCREMENT,
        country_id INTEGER NOT NULL UNIQUE,
        
        total_arrivals INTEGER DEFAULT 0,
        total_departures INTEGER DEFAULT 0,
        total_net_migration INTEGER DEFAULT 0,
        first_year INTEGER,
        last_year INTEGER,
        years_count INTEGER,
        
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);
console.log('✓ Created: agg_migration_by_country');

// ============================================
// VIEWS (Các view cho reporting)
// ============================================

console.log('\nCreating Views...\n');

// View: Migration Summary
db.exec(`
    DROP VIEW IF EXISTS vw_migration_summary;
    CREATE VIEW vw_migration_summary AS
    SELECT 
        c.country_name,
        c.region,
        c.continent,
        t.year,
        t.month,
        SUM(f.arrival_count) as total_arrivals,
        SUM(f.departure_count) as total_departures,
        SUM(f.net_migration) as net_migration
    FROM fact_migration f
    JOIN dim_country c ON f.country_id = c.country_id
    JOIN dim_time t ON f.time_id = t.time_id
    GROUP BY c.country_name, c.region, c.continent, t.year, t.month;
`);
console.log('✓ Created: vw_migration_summary');

// View: Demographics Summary
db.exec(`
    DROP VIEW IF EXISTS vw_demographics_summary;
    CREATE VIEW vw_demographics_summary AS
    SELECT 
        t.year,
        a.age_group_name,
        g.gender_name,
        SUM(f.population_count) as total_population,
        AVG(f.percentage) as avg_percentage
    FROM fact_demographics f
    JOIN dim_time t ON f.time_id = t.time_id
    JOIN dim_age_group a ON f.age_group_id = a.age_group_id
    JOIN dim_gender g ON f.gender_id = g.gender_id
    GROUP BY t.year, a.age_group_name, g.gender_name;
`);
console.log('✓ Created: vw_demographics_summary');

// ============================================
// METADATA TABLE
// ============================================

db.exec(`
    DROP TABLE IF EXISTS etl_log;
    CREATE TABLE etl_log (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_name VARCHAR(100) NOT NULL,
        source_file VARCHAR(200),
        target_table VARCHAR(100),
        records_processed INTEGER,
        records_inserted INTEGER,
        records_updated INTEGER,
        records_failed INTEGER,
        status VARCHAR(20),
        error_message TEXT,
        started_at DATETIME,
        completed_at DATETIME,
        duration_seconds INTEGER
    );
`);
console.log('✓ Created: etl_log');

// ============================================
// SEED INITIAL DATA
// ============================================

console.log('\nSeeding initial dimension data...\n');

// Seed Time dimension (2013-2026)
const insertTime = db.prepare(`
    INSERT INTO dim_time (full_date, year, quarter, month, month_name, fiscal_year)
    VALUES (?, ?, ?, ?, ?, ?)
`);

const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];

for (let year = 2013; year <= 2026; year++) {
    for (let month = 1; month <= 12; month++) {
        const quarter = Math.ceil(month / 3);
        const fiscalYear = month >= 7 ? year + 1 : year; // NZ fiscal year
        const fullDate = `${year}-${String(month).padStart(2, '0')}-01`;
        
        insertTime.run(fullDate, year, quarter, month, months[month - 1], fiscalYear);
    }
}
console.log('✓ Seeded: dim_time (2013-2026)');

// Seed Age Groups
const insertAgeGroup = db.prepare(`
    INSERT INTO dim_age_group (age_group_code, age_group_name, min_age, max_age, generation)
    VALUES (?, ?, ?, ?, ?)
`);

const ageGroups = [
    ['0-9', '0-9 years', 0, 9, 'Gen Alpha'],
    ['10-19', '10-19 years', 10, 19, 'Gen Z'],
    ['20-29', '20-29 years', 20, 29, 'Gen Z/Millennial'],
    ['30-39', '30-39 years', 30, 39, 'Millennial'],
    ['40-49', '40-49 years', 40, 49, 'Gen X'],
    ['50-59', '50-59 years', 50, 59, 'Gen X'],
    ['60-69', '60-69 years', 60, 69, 'Baby Boomer'],
    ['70+', '70+ years', 70, 120, 'Silent/Greatest']
];

ageGroups.forEach(ag => insertAgeGroup.run(...ag));
console.log('✓ Seeded: dim_age_group');

// Seed Visa Types
const insertVisa = db.prepare(`
    INSERT INTO dim_visa_type (visa_code, visa_name, visa_category, description)
    VALUES (?, ?, ?, ?)
`);

const visaTypes = [
    ['WORK', 'Work Visa', 'Temporary', 'Visa for employment purposes'],
    ['STUDENT', 'Student Visa', 'Temporary', 'Visa for educational purposes'],
    ['RESIDENT', 'Resident Visa', 'Permanent', 'Permanent residency visa'],
    ['VISITOR', 'Visitor Visa', 'Temporary', 'Tourism and short visits'],
    ['FAMILY', 'Family Visa', 'Permanent', 'Family reunification'],
    ['BUSINESS', 'Business Visa', 'Temporary', 'Business activities'],
    ['SKILLED', 'Skilled Migrant', 'Permanent', 'Skilled worker category'],
    ['OTHER', 'Other', 'Other', 'Other visa categories']
];

visaTypes.forEach(v => insertVisa.run(...v));
console.log('✓ Seeded: dim_visa_type');

db.close();

console.log('\n══════════════════════════════════════════════════════════');
console.log('✅ Data Warehouse initialized successfully!');
console.log('   Database: data-warehouse/database/datavis_warehouse.db');
console.log('══════════════════════════════════════════════════════════\n');
