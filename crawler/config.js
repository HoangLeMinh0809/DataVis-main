/**
 * Cấu hình các nguồn dữ liệu cần crawl
 * Điền API/Link vào các trường 'url' tương ứng
 */

const config = {
    // Lịch chạy crawl: mỗi tháng vào ngày 1 lúc 00:00
    // Cron format: second minute hour dayOfMonth month dayOfWeek
    cronSchedule: '0 0 0 1 * *', // Chạy vào 00:00 ngày 1 hàng tháng

    // Thư mục lưu dataset
    datasetPath: '../dataset',

    // Thư mục lưu backup
    backupPath: './backups',

    // Thư mục lưu log
    logPath: './logs',

    // Các nguồn dữ liệu
    dataSources: {
        // Dữ liệu tuổi và giới tính
        ageandsex: {
            enabled: true,
            url: 'https://www.stats.govt.nz/assets/Uploads/National-population-estimates/National-population-estimates-At-30-June-2023/Download-data/national-population-estimates-at-30-june-2023-population-by-age-and-sex.csv',
            outputFile: 'ageandsex.csv',
            format: 'csv',
            headers: ['age_group', 'male', 'female', 'total'], // Điều chỉnh theo cấu trúc thực tế
            description: 'Dữ liệu phân bố tuổi và giới tính'
        },

        // Dữ liệu GDP từ Penn World Table (Thay thế bằng GDP Stats NZ - National Accounts)
        gdp: {
            enabled: true,
            url: 'https://www.stats.govt.nz/assets/Uploads/Gross-domestic-product/Gross-domestic-product-September-2025-quarter/Download-data/gross-domestic-product-september-2025-quarter.csv',
            outputFile: 'gdp-penn-world-table.csv',
            format: 'csv',
            headers: ['Series_reference', 'Period', 'Data_value', 'STATUS', 'UNITS', 'Subject', 'Group', 'Series_title_1'],
            description: 'Dữ liệu GDP từ Stats NZ (thay thế PWT)'
        },

        // Dữ liệu New Zealand
        nzData: {
            enabled: true,
            url: 'https://www.stats.govt.nz/assets/Uploads/Annual-enterprise-survey/Annual-enterprise-survey-2023-financial-year-provisional/Download-data/annual-enterprise-survey-2023-financial-year-provisional-size-bands.csv',
            outputFile: 'nz_data.csv',
            format: 'csv',
            headers: ['year', 'industry_name_NZSIOC', 'variable_name', 'value', 'unit'],
            description: 'Dữ liệu tổng hợp New Zealand (Annual Enterprise Survey)'
        },

        // Dữ liệu di cư New Zealand
        nzMigration: {
            enabled: true,
            url: 'https://www.stats.govt.nz/assets/Uploads/International-migration/International-migration-October-2025/Download-data/international-migration-october-2025-citizenship-by-visa-and-by-country-of-last-permanent-residence.csv',
            outputFile: 'NZ_MIGRATION.csv',
            format: 'csv',
            headers: ['Period', 'Country_of_residence', 'Visa', 'Citizenship', 'Count'],
            description: 'Dữ liệu di cư New Zealand'
        },

        // Dữ liệu radar NZ (Sử dụng dữ liệu chi tiêu thẻ điện tử)
        nzRadar: {
            enabled: true,
            url: 'https://www.stats.govt.nz/assets/Uploads/Electronic-card-transactions/Electronic-card-transactions-November-2025/Download-data/electronic-card-transactions-november-2025-csv.csv',
            outputFile: 'nz_radio.csv',
            format: 'csv',
            headers: ['Series_title_1', 'Data_value', 'Period'], 
            description: 'Dữ liệu radar chart New Zealand (Electronic Card Transactions)'
        },

        // Dữ liệu treemap (Xuất khẩu HS10)
        treemap: {
            enabled: true,
            url: 'https://www.stats.govt.nz/assets/Large-datasets/OMT-datasets/OMT-datasets-November-2025/Nov_2025_Exports_HS10.csv',
            outputFile: 'data_treemap.csv',
            format: 'csv',
            headers: ['HSCode', 'Description', 'Value'], // Headers giả định, cần check thực tế
            description: 'Dữ liệu treemap (Exports HS10)'
        },

        // Dữ liệu bản đồ thế giới (GeoJSON) - Sử dụng nguồn mở vì Stats NZ không cung cấp world map
        worldMap: {
            enabled: true,
            url: 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json',
            outputFile: 'world.json',
            format: 'json',
            description: 'Dữ liệu GeoJSON bản đồ thế giới'
        },

        // Dữ liệu bản đồ thế giới 2 (GeoJSON)
        worldMap2: {
            enabled: true,
            url: 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson',
            outputFile: 'world2.json',
            format: 'json',
            description: 'Dữ liệu GeoJSON bản đồ thế giới phiên bản 2'
        }
    },

    // Cấu hình request
    requestConfig: {
        timeout: 60000, // Tăng timeout lên 60s
        retries: 3, 
        retryDelay: 5000, 
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36', // Giả lập browser
            'Accept': 'text/csv, application/json, */*'
        }
    },

    // Cấu hình backup
    backup: {
        enabled: true,
        keepDays: 90 
    },

    // Cấu hình thông báo (Đã tắt theo yêu cầu)
    notifications: {
        email: {
            enabled: false,
            smtp: '', 
            from: '', 
            to: [] 
        },
        webhook: {
            enabled: false,
            url: '' 
        }
    }
};

module.exports = config;
