/**
 * Chạy crawl ngay lập tức (không cần chờ lịch)
 * Sử dụng: node crawl-now.js [source1] [source2] ...
 * Ví dụ: node crawl-now.js gdp nzData
 * Hoặc: node crawl-now.js (crawl tất cả)
 */

require('dotenv').config();
const CrawlerService = require('./services/crawlerService');
const Logger = require('./utils/logger');

const logger = new Logger('CrawlNow');
const crawlerService = new CrawlerService();

async function main() {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║          DataVis Crawler - Manual Crawl                  ║
╚══════════════════════════════════════════════════════════╝
`);

    const args = process.argv.slice(2);
    
    try {
        let results;
        
        if (args.length > 0) {
            // Crawl các nguồn được chỉ định
            logger.info(`Crawl các nguồn: ${args.join(', ')}`);
            results = await crawlerService.crawlSources(args);
        } else {
            // Crawl tất cả
            logger.info('Crawl tất cả các nguồn dữ liệu...');
            results = await crawlerService.crawlAll();
        }

        // Hiển thị kết quả
        console.log('\n═══════════════════════════════════════════');
        console.log('KẾT QUẢ CRAWL:');
        console.log('═══════════════════════════════════════════\n');

        results.forEach(result => {
            const status = result.success ? '✓' : '✗';
            const statusColor = result.success ? '\x1b[32m' : '\x1b[31m';
            console.log(`${statusColor}${status}\x1b[0m ${result.source}: ${result.message}`);
            if (result.recordCount) {
                console.log(`  └─ Số bản ghi: ${result.recordCount}`);
            }
        });

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        console.log('\n═══════════════════════════════════════════');
        console.log(`Tổng kết: Thành công ${successful}/${results.length}, Thất bại ${failed}/${results.length}`);
        console.log('═══════════════════════════════════════════\n');

    } catch (error) {
        logger.error(`Lỗi: ${error.message}`);
        process.exit(1);
    }
}

main();
