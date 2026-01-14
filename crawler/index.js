/**
 * DataVis Crawler - Tự động cập nhật dữ liệu
 */

require('dotenv').config();
const config = require('./config');
const CrawlerService = require('./services/crawlerService');
const Logger = require('./utils/logger');

const logger = new Logger('Main');
const crawlerService = new CrawlerService();

async function run() {
    logger.info('Bắt đầu cập nhật dữ liệu...');
    
    try {
        const results = await crawlerService.crawlAll();
        
        let successCount = 0;
        let failCount = 0;
        
        results.forEach(res => {
            if (res.success) {
                logger.info(`[✓] ${res.source}: ${res.message} (${res.recordCount} records)`);
                successCount++;
            } else {
                logger.error(`[✗] ${res.source}: ${res.message}`);
                failCount++;
            }
        });
        
        logger.info(`Hoàn tất. Thành công: ${successCount}, Thất bại: ${failCount}`);
        
    } catch (error) {
        logger.error(`Lỗi không mong muốn: ${error.message}`);
    }
}

// Chạy ngay lập tức khi file được execute
if (require.main === module) {
    run();
}

module.exports = { run };
