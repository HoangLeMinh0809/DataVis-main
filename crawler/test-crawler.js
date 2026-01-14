/**
 * Test crawler với dữ liệu mẫu (không cần API thật)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Logger = require('./utils/logger');
const DataTransformer = require('./utils/dataTransformer');

const logger = new Logger('TestCrawler');
const dataTransformer = new DataTransformer();

console.log(`
╔══════════════════════════════════════════════════════════╗
║          DataVis Crawler - Test Mode                     ║
╚══════════════════════════════════════════════════════════╝
`);

// Dữ liệu mẫu để test transformer
const sampleData = {
    ageandsex: {
        results: [
            { age_group: '0-14', male: 450000, female: 430000, total: 880000 },
            { age_group: '15-24', male: 320000, female: 310000, total: 630000 },
            { age_group: '25-44', male: 680000, female: 700000, total: 1380000 },
            { age_group: '45-64', male: 550000, female: 570000, total: 1120000 },
            { age_group: '65+', male: 280000, female: 340000, total: 620000 }
        ]
    },
    gdp: {
        data: [
            { country: 'New Zealand', year: 2023, rgdpe: 245000, pop: 5.1 },
            { country: 'Australia', year: 2023, rgdpe: 1680000, pop: 26.0 },
            { country: 'Japan', year: 2023, rgdpe: 5100000, pop: 125.0 }
        ]
    },
    nzData: {
        dataset: [
            { indicator: 'Population', value: 5100000, year: 2023 },
            { indicator: 'GDP per capita', value: 48000, year: 2023 },
            { indicator: 'Life expectancy', value: 82.3, year: 2023 }
        ]
    },
    migration: {
        migration: [
            { year: 2020, arrivals: 15000, departures: 12000, net: 3000 },
            { year: 2021, arrivals: 18000, departures: 10000, net: 8000 },
            { year: 2022, arrivals: 85000, departures: 45000, net: 40000 },
            { year: 2023, arrivals: 120000, departures: 55000, net: 65000 }
        ]
    },
    treemap: {
        categories: [
            { 
                name: 'Technology', 
                subcategories: [
                    { name: 'Software', value: 450 },
                    { name: 'Hardware', value: 230 }
                ]
            },
            { 
                name: 'Agriculture', 
                subcategories: [
                    { name: 'Dairy', value: 380 },
                    { name: 'Meat', value: 290 }
                ]
            }
        ]
    }
};

// Cấu hình sources để test
const testSources = {
    ageandsex: { format: 'csv', outputFile: 'ageandsex.csv' },
    gdp: { format: 'csv', outputFile: 'gdp-penn-world-table.csv' },
    nzData: { format: 'csv', outputFile: 'nz_data.csv' },
    migration: { format: 'csv', outputFile: 'NZ_MIGRATION.csv' },
    treemap: { format: 'csv', outputFile: 'data_treemap.csv' }
};

async function runTests() {
    logger.info('Bắt đầu test các transformer...\n');

    for (const [name, rawData] of Object.entries(sampleData)) {
        const source = testSources[name];
        if (!source) continue;

        try {
            logger.info(`Testing transformer cho: ${name}`);
            
            // Transform dữ liệu
            const transformed = dataTransformer.transform(rawData, source);
            
            // Kiểm tra kết quả
            if (Array.isArray(transformed) && transformed.length > 0) {
                logger.success(`${name}: Transform thành công! ${transformed.length} bản ghi`);
                console.log('  Sample record:', JSON.stringify(transformed[0], null, 2));
            } else {
                logger.warn(`${name}: Kết quả không phải mảng hoặc rỗng`);
            }
            
            console.log('');
        } catch (error) {
            logger.error(`${name}: Lỗi - ${error.message}`);
        }
    }

    // Test tạo thư mục backup
    logger.info('Testing tạo thư mục...');
    const backupDir = path.resolve(__dirname, 'backups');
    const logsDir = path.resolve(__dirname, 'logs');
    
    [backupDir, logsDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        logger.success(`Thư mục OK: ${dir}`);
    });

    console.log('\n═══════════════════════════════════════════');
    logger.success('Tất cả tests hoàn tất!');
    console.log('═══════════════════════════════════════════\n');
    
    console.log('Các bước tiếp theo:');
    console.log('1. Điền URL API vào file config.js');
    console.log('2. Tùy chỉnh transformer trong utils/dataTransformer.js');
    console.log('3. Chạy: npm run crawl-now để test crawl thật');
    console.log('4. Chạy: npm start để khởi động scheduler\n');
}

runTests();
