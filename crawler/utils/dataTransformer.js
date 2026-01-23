/**
 * Data Transformer - Xử lý và chuyển đổi dữ liệu từ API
 * Tùy chỉnh các hàm transform cho từng loại dữ liệu
 */

const Logger = require('./logger');
const csv = require('csv-parser');
const { Readable } = require('stream');

class DataTransformer {
    constructor() {
        this.logger = new Logger('DataTransformer');
    }

    /**
     * Transform dữ liệu dựa trên cấu hình nguồn
     * @param {any} rawData - Dữ liệu thô từ API
     * @param {object} source - Cấu hình nguồn
     * @returns {Promise<any>} - Dữ liệu đã được transform
     */
    async transform(rawData, source) {
        let data = rawData;

        // Xử lý CSV string
        if (source.format === 'csv' && typeof rawData === 'string') {
            try {
                this.logger.info('Parsing CSV string...');
                data = await this.parseCSV(rawData);
            } catch (e) {
                this.logger.warn(`Lỗi parsing CSV: ${e.message}. Giữ nguyên raw string.`);
            }
        } else if (typeof rawData === 'string') {
            try {
                data = JSON.parse(rawData);
            } catch (e) {
                // Không phải JSON, giữ nguyên
                data = rawData;
            }
        }

        // Gọi transformer tương ứng dựa trên tên file
        const transformerName = this.getTransformerName(source.outputFile);
        
        if (this[transformerName]) {
            this.logger.info(`Sử dụng transformer: ${transformerName}`);
            return this[transformerName](data, source);
        }

        // Default: trả về dữ liệu nguyên bản
        this.logger.info('Sử dụng default transformer');
        return this.defaultTransform(data, source);
    }

    parseCSV(csvString) {
        return new Promise((resolve, reject) => {
            const results = [];
            Readable.from(csvString)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', (err) => reject(err));
        });
    }

    /**
     * Lấy tên transformer từ tên file
     */
    getTransformerName(filename) {
        const baseName = filename.replace(/\.[^.]+$/, ''); // Bỏ extension
        const camelCase = baseName.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
        return `transform${camelCase.charAt(0).toUpperCase() + camelCase.slice(1)}`;
    }

    /**
     * Default transformer - giữ nguyên dữ liệu
     */
    defaultTransform(data, source) {
        if (source.format === 'json') {
            return data;
        }
        
        // CSV: đảm bảo là mảng các object
        if (Array.isArray(data)) {
            return data;
        }
        
        // Nếu là object có property chứa mảng dữ liệu
        if (typeof data === 'object') {
            const arrayProps = Object.keys(data).filter(k => Array.isArray(data[k]));
            if (arrayProps.length > 0) {
                return data[arrayProps[0]];
            }
        }

        return [data];
    }

    /**
     * Transform cho dữ liệu tuổi và giới tính
     *
     */
    transformAgeandsex(data, source) {
        if (Array.isArray(data)) return data;
        // Ví dụ: API trả về { results: [...] }
        if (data.results) {
            return data.results.map(item => ({
                age_group: item.age_group || item.ageGroup || '',
                male: item.male || item.Male || 0,
                female: item.female || item.Female || 0,
                total: item.total || item.Total || 0
            }));
        }
        return this.defaultTransform(data, source);
    }

    /**
     * Transform cho dữ liệu GDP
     *
     */
    transformGdpPennWorldTable(data, source) {
        // Ví dụ: API Penn World Table format
        if (data.data) {
            return data.data.map(item => ({
                country: item.country || item.countrycode || '',
                year: item.year || '',
                gdp: item.rgdpe || item.gdp || 0,
                population: item.pop || item.population || 0
            }));
        }
        return this.defaultTransform(data, source);
    }

    /**
     * Transform cho dữ liệu NZ
     *
     */
    transformNzData(data, source) {
        if (data.dataset) {
            return data.dataset.map(item => ({
                indicator: item.indicator || '',
                value: item.value || 0,
                year: item.year || ''
            }));
        }
        return this.defaultTransform(data, source);
    }

    /**
     * Transform cho dữ liệu di cư NZ
     *
     */
    transformNZMIGRATION(data, source) {
        if (data.migration) {
            return data.migration.map(item => ({
                year: item.year || '',
                arrivals: item.arrivals || item.in || 0,
                departures: item.departures || item.out || 0,
                net_migration: item.net || (item.arrivals - item.departures) || 0
            }));
        }
        return this.defaultTransform(data, source);
    }

    /**
     * Transform cho dữ liệu radar NZ
     *
     */
    transformNzRadio(data, source) {
        if (data.indicators) {
            return data.indicators.map(item => ({
                category: item.name || item.category || '',
                value: item.value || 0
            }));
        }
        return this.defaultTransform(data, source);
    }

    /**
     * Transform cho dữ liệu treemap
     *

     */
    transformDataTreemap(data, source) {
        if (data.categories) {
            const result = [];
            data.categories.forEach(cat => {
                if (cat.subcategories) {
                    cat.subcategories.forEach(sub => {
                        result.push({
                            category: cat.name,
                            subcategory: sub.name,
                            value: sub.value
                        });
                    });
                } else {
                    result.push({
                        category: cat.name,
                        subcategory: '',
                        value: cat.value
                    });
                }
            });
            return result;
        }
        return this.defaultTransform(data, source);
    }

    /**
     * Transform cho dữ liệu bản đồ thế giới (GeoJSON)
     * Thường không cần transform, giữ nguyên
     */
    transformWorld(data, source) {
        // GeoJSON thường giữ nguyên
        return data;
    }

    /**
     * Transform cho dữ liệu bản đồ thế giới 2
     */
    transformWorld2(data, source) {
        return data;
    }
}

module.exports = DataTransformer;
