/**
 * Data Warehouse API Client
 * Thay thế việc load trực tiếp từ CSV bằng API calls
 */

const DataWarehouseAPI = {
    // Base URL của API server
    baseURL: 'http://localhost:3000/api',
    
    // Cache để giảm API calls
    cache: new Map(),
    cacheTimeout: 5 * 60 * 1000, // 5 phút
    
    /**
     * Generic fetch với caching
     */
    async fetch(endpoint, options = {}) {
        const cacheKey = endpoint;
        
        // Check cache
        if (!options.noCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log(`[Cache HIT] ${endpoint}`);
                return cached.data;
            }
        }
        
        console.log(`[API] Fetching: ${this.baseURL}${endpoint}`);
        
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: options.body ? JSON.stringify(options.body) : undefined
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'API Error');
            }
            
            // Cache result
            this.cache.set(cacheKey, {
                data: result.data,
                timestamp: Date.now()
            });
            
            return result.data;
            
        } catch (error) {
            console.error(`[API Error] ${endpoint}:`, error.message);
            throw error;
        }
    },
    
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('[Cache] Cleared');
    },
    
    // ============================================
    // API METHODS
    // ============================================
    
    /**
     * Health check
     */
    async healthCheck() {
        return this.fetch('/health');
    },
    
    /**
     * Get all countries
     */
    async getCountries() {
        return this.fetch('/countries');
    },
    
    /**
     * Get migration data với filters
     * @param {Object} filters - { year, country, limit }
     */
    async getMigration(filters = {}) {
        const params = new URLSearchParams();
        if (filters.year) params.append('year', filters.year);
        if (filters.country) params.append('country', filters.country);
        if (filters.limit) params.append('limit', filters.limit);
        
        const queryString = params.toString();
        return this.fetch(`/migration${queryString ? '?' + queryString : ''}`);
    },
    
    /**
     * Get migration data by country (for line chart)
     * @param {string} country - Country name
     */
    async getMigrationByCountry(country) {
        return this.fetch(`/migration/country/${encodeURIComponent(country)}`);
    },
    
    /**
     * Get migration data by year (for choropleth map)
     * @param {number} year - Year
     */
    async getMigrationByYear(year) {
        return this.fetch(`/migration/year/${year}`);
    },
    
    /**
     * Get pre-aggregated migration summary
     */
    async getMigrationSummary() {
        return this.fetch('/migration/summary');
    },
    
    /**
     * Get demographics data (for age group visualizations)
     */
    async getDemographics() {
        return this.fetch('/demographics');
    },
    
    /**
     * Get exports/treemap data
     */
    async getExports() {
        return this.fetch('/exports');
    },
    
    /**
     * Execute custom SQL query
     * @param {string} sql - SQL SELECT statement
     */
    async query(sql) {
        return this.fetch('/query', {
            method: 'POST',
            body: { sql },
            noCache: true
        });
    },
    
    /**
     * Get database statistics
     */
    async getStats() {
        return this.fetch('/stats', { noCache: true });
    },
    
    /**
     * Get ETL logs
     */
    async getETLLogs() {
        return this.fetch('/etl/logs', { noCache: true });
    }
};

// ============================================
// HELPER: Fallback to CSV if API unavailable
// ============================================

const DataSource = {
    useWarehouse: true, // Set to false to use CSV files
    
    /**
     * Check if Data Warehouse is available
     */
    async checkWarehouse() {
        try {
            await DataWarehouseAPI.healthCheck();
            this.useWarehouse = true;
            console.log('✓ Data Warehouse connected');
            return true;
        } catch (error) {
            this.useWarehouse = false;
            console.warn('⚠ Data Warehouse unavailable, falling back to CSV');
            return false;
        }
    },
    
    /**
     * Get migration data - auto fallback
     * @param {string} country - Country name
     */
    async getMigrationByCountry(country) {
        if (this.useWarehouse) {
            try {
                const data = await DataWarehouseAPI.getMigrationByCountry(country);
                // Transform to match CSV format
                return data.map(d => ({
                    x: d.year,
                    y: d.arrivals || d.net_migration
                }));
            } catch (error) {
                console.warn('Warehouse failed, falling back to CSV');
            }
        }
        
        // Fallback: Load from CSV
        return new Promise((resolve, reject) => {
            d3.csv("dataset/NZ_MIGRATION.csv").then(data => {
                const filtered = data
                    .filter(d => d.country === country)
                    .map(d => ({
                        x: parseInt(d.year),
                        y: parseInt(d.estimate)
                    }));
                resolve(filtered);
            }).catch(reject);
        });
    },
    
    /**
     * Get migration data by year - auto fallback
     * @param {number} year - Year
     */
    async getMigrationByYear(year) {
        if (this.useWarehouse) {
            try {
                return await DataWarehouseAPI.getMigrationByYear(year);
            } catch (error) {
                console.warn('Warehouse failed, falling back to CSV');
            }
        }
        
        // Fallback: Load from CSV
        return new Promise((resolve, reject) => {
            d3.csv("dataset/NZ_MIGRATION.csv").then(data => {
                const filtered = data
                    .filter(d => parseInt(d.year) === year)
                    .map(d => ({
                        country_name: d.country,
                        arrivals: parseInt(d.estimate)
                    }));
                resolve(filtered);
            }).catch(reject);
        });
    },
    
    /**
     * Get treemap data - auto fallback
     */
    async getTreemapData() {
        if (this.useWarehouse) {
            try {
                return await DataWarehouseAPI.getExports();
            } catch (error) {
                console.warn('Warehouse failed, falling back to CSV');
            }
        }
        
        // Fallback: Load from CSV
        return new Promise((resolve, reject) => {
            d3.csv("dataset/data_treemap.csv").then(data => {
                resolve(data);
            }).catch(reject);
        });
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await DataSource.checkWarehouse();
});

// Export for use in other scripts
window.DataWarehouseAPI = DataWarehouseAPI;
window.DataSource = DataSource;
