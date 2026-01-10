/**
 * Component.js - Reusable UI Components and Utilities
 * New Zealand Migration Data Visualization
 */

// Loading Spinner Component
function showLoading(elementId) {
    const container = d3.select(`#${elementId}`);
    container.html(`
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading data...</p>
        </div>
    `);
}

function hideLoading(elementId) {
    d3.select(`#${elementId} .loading-spinner`).remove();
}

// Error Handler
function handleDataError(error, elementId) {
    console.error("Data loading error:", error);
    const container = d3.select(`#${elementId}`);
    container.html(`
        <div class="error-message">
            <p>⚠️ Unable to load data. Please try again later.</p>
            <button onclick="location.reload()">Reload Page</button>
        </div>
    `);
}

// Data Validator
function validateMigrationData(data) {
    if (!data || data.length === 0) {
        throw new Error("No data available");
    }
    
    // Check required fields
    const requiredFields = ['country', 'year', 'estimate'];
    const firstRow = data[0];
    
    for (let field of requiredFields) {
        if (!(field in firstRow)) {
            throw new Error(`Missing required field: ${field}`);
        }
    }
    
    return true;
}

// Format Number with Commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Download Data as CSV
function downloadCSV(data, filename) {
    const csv = d3.csvFormat(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Analytics Tracker (optional)
function trackInteraction(action, label) {
    console.log(`User Interaction: ${action} - ${label}`);
    // Can integrate with Google Analytics here
}

// Tooltip Helper
function createTooltip() {
    return d3.select("body")
        .append("div")
        .attr("class", "custom-tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("font-size", "14px")
        .style("pointer-events", "none")
        .style("z-index", "1000");
}

// Debounce Function for Performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export functions globally
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.handleDataError = handleDataError;
window.validateMigrationData = validateMigrationData;
window.formatNumber = formatNumber;
window.downloadCSV = downloadCSV;
window.trackInteraction = trackInteraction;
window.createTooltip = createTooltip;
window.debounce = debounce;

// Download All Data Function
function downloadAllData() {
    d3.csv("dataset/NZ_MIGRATION.csv").then(function(data) {
        downloadCSV(data, 'nz_migration_data.csv');
        alert('✅ Migration data downloaded successfully!');
    }).catch(function(error) {
        alert('❌ Error downloading data: ' + error.message);
    });
}

window.downloadAllData = downloadAllData;
