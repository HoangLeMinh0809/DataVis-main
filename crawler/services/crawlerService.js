/**
 * Service chính xử lý crawl dữ liệu
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
const config = require('../config');
const Logger = require('../utils/logger');
const DataTransformer = require('../utils/dataTransformer');

class CrawlerService {
    constructor() {
        this.logger = new Logger('CrawlerService');
        this.dataTransformer = new DataTransformer();
        this.ensureDirectories();
    }

    /**
     * Đảm bảo các thư mục cần thiết tồn tại
     */
    ensureDirectories() {
        const dirs = [
            path.resolve(__dirname, '..', config.backupPath),
            path.resolve(__dirname, '..', config.logPath)
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                this.logger.info(`Tạo thư mục: ${dir}`);
            }
        });
    }

    /**
     * Crawl tất cả các nguồn dữ liệu
     */
    async crawlAll() {
        const sources = Object.keys(config.dataSources);
        return this.crawlSources(sources);
    }

    /**
     * Crawl các nguồn dữ liệu được chỉ định
     * @param {string[]} sourceNames - Danh sách tên nguồn
     */
    async crawlSources(sourceNames) {
        const results = [];

        for (const sourceName of sourceNames) {
            const source = config.dataSources[sourceName];
            
            if (!source) {
                results.push({
                    source: sourceName,
                    success: false,
                    message: 'Nguồn dữ liệu không tồn tại trong cấu hình'
                });
                continue;
            }

            if (!source.enabled) {
                results.push({
                    source: sourceName,
                    success: false,
                    message: 'Nguồn dữ liệu đã bị tắt'
                });
                continue;
            }

            const result = await this.crawlSource(sourceName, source);
            results.push(result);
        }

        return results;
    }

    /**
     * Crawl một nguồn dữ liệu cụ thể
     * @param {string} name - Tên nguồn
     * @param {object} source - Cấu hình nguồn
     */
    async crawlSource(name, source) {
        this.logger.info(`Bắt đầu crawl: ${name}`);

        // Kiểm tra URL
        if (!source.url || source.url.trim() === '') {
            this.logger.warn(`${name}: Chưa cấu hình URL`);
            return {
                source: name,
                success: false,
                message: 'Chưa cấu hình URL. Vui lòng cập nhật trong config.js'
            };
        }

        try {
            // Backup file cũ nếu có
            if (config.backup.enabled) {
                await this.backupFile(source.outputFile);
            }

            // Fetch dữ liệu với retry
            const data = await this.fetchWithRetry(source.url, config.requestConfig);

            // Transform dữ liệu
            const transformedData = await this.dataTransformer.transform(data, source);

            // Lưu file
            await this.saveData(transformedData, source);

            this.logger.info(`${name}: Crawl thành công!`);
            
            return {
                source: name,
                success: true,
                message: 'Crawl và lưu dữ liệu thành công',
                recordCount: Array.isArray(transformedData) ? transformedData.length : 1,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.logger.error(`${name}: Lỗi - ${error.message}`);
            return {
                source: name,
                success: false,
                message: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Fetch dữ liệu với cơ chế retry
     * @param {string} url - URL cần fetch
     * @param {object} requestConfig - Cấu hình request
     */
    async fetchWithRetry(url, requestConfig) {
        let lastError;

        for (let attempt = 1; attempt <= requestConfig.retries; attempt++) {
            try {
                this.logger.info(`Fetch attempt ${attempt}/${requestConfig.retries}: ${url}`);
                
                const response = await axios.get(url, {
                    timeout: requestConfig.timeout,
                    headers: requestConfig.headers,
                    responseType: 'text'
                });

                return response.data;

            } catch (error) {
                lastError = error;
                this.logger.warn(`Attempt ${attempt} failed: ${error.message}`);
                
                if (attempt < requestConfig.retries) {
                    this.logger.info(`Chờ ${requestConfig.retryDelay}ms trước khi thử lại...`);
                    await this.sleep(requestConfig.retryDelay);
                }
            }
        }

        throw new Error(`Không thể fetch sau ${requestConfig.retries} lần thử: ${lastError.message}`);
    }

    /**
     * Backup file trước khi ghi đè
     * @param {string} filename - Tên file cần backup
     */
    async backupFile(filename) {
        const sourcePath = path.resolve(__dirname, '..', config.datasetPath, filename);
        
        if (fs.existsSync(sourcePath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.resolve(__dirname, '..', config.backupPath);
            const backupPath = path.join(backupDir, `${timestamp}_${filename}`);
            
            fs.copyFileSync(sourcePath, backupPath);
            this.logger.info(`Backup: ${filename} -> ${backupPath}`);

            // Xóa backup cũ
            await this.cleanOldBackups();
        }
    }

    /**
     * Xóa các backup cũ hơn số ngày quy định
     */
    async cleanOldBackups() {
        const backupDir = path.resolve(__dirname, '..', config.backupPath);
        const maxAge = config.backup.keepDays * 24 * 60 * 60 * 1000;
        const now = Date.now();

        try {
            const files = fs.readdirSync(backupDir);
            
            for (const file of files) {
                const filePath = path.join(backupDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filePath);
                    this.logger.info(`Xóa backup cũ: ${file}`);
                }
            }
        } catch (error) {
            this.logger.warn(`Lỗi khi xóa backup cũ: ${error.message}`);
        }
    }

    /**
     * Lưu dữ liệu vào file
     * @param {any} data - Dữ liệu cần lưu
     * @param {object} source - Cấu hình nguồn
     */
    async saveData(data, source) {
        const outputPath = path.resolve(__dirname, '..', config.datasetPath, source.outputFile);

        if (source.format === 'json') {
            // Lưu JSON
            const jsonData = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
            fs.writeFileSync(outputPath, jsonData, 'utf8');
            
        } else if (source.format === 'csv') {
            // Lưu CSV
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('Dữ liệu CSV phải là mảng không rỗng');
            }

            const headers = source.headers || Object.keys(data[0]);
            const csvWriter = createObjectCsvWriter({
                path: outputPath,
                header: headers.map(h => ({ id: h, title: h }))
            });

            await csvWriter.writeRecords(data);
        } else {
            throw new Error(`Format không được hỗ trợ: ${source.format}`);
        }

        this.logger.info(`Đã lưu: ${outputPath}`);
    }

    /**
     * Gửi thông báo khi crawl xong
     * @param {object} summary - Thông tin tổng kết
     */
    async sendNotification(summary) {
        if (config.notifications.webhook.enabled && config.notifications.webhook.url) {
            try {
                await axios.post(config.notifications.webhook.url, {
                    text: `DataVis Crawler Report`,
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `*DataVis Crawler Report*\n` +
                                      `Thành công: ${summary.successful}\n` +
                                      `Thất bại: ${summary.failed}\n` +
                                      `Thời gian: ${new Date().toISOString()}`
                            }
                        }
                    ]
                });
                this.logger.info('Đã gửi thông báo webhook');
            } catch (error) {
                this.logger.error(`Lỗi gửi webhook: ${error.message}`);
            }
        }
    }

    /**
     * Sleep helper
     * @param {number} ms - Số milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = CrawlerService;
