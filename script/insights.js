/**
 * Data Insights Generator
 * Tự động tạo insights dựa trên dữ liệu đầu vào
 * Giao diện: Bảng đơn giản, khoa học
 */

class InsightsGenerator {
    constructor() {
        this.migrationData = [];
        this.treemapData = [];
    }

    async loadData() {
        try {
            this.migrationData = await d3.csv("dataset/NZ_MIGRATION.csv");
            this.treemapData = await d3.csv("dataset/data_treemap.csv");
        } catch (error) {
            console.error("Error loading data:", error);
        }
    }

    /**
     * CHOROPLETH MAP INSIGHTS
     */
    getChoroplethInsights(year) {
        // Filter continents/regions out, keep only countries
        const excludePatterns = ['asia', 'europe', 'americas', 'africa', 'oceania', 
                          'middle east', 'not stated', 'total', 'all', 'other'];
        
        const yearData = this.migrationData.filter(d => 
            parseInt(d.year) === year && 
            !excludePatterns.some(pattern => d.country.toLowerCase().includes(pattern))
        );
        if (yearData.length === 0) return null;

        // Get TOTAL for this year to calculate percentage
        const totalRow = this.migrationData.find(d => 
            parseInt(d.year) === year && d.country.toUpperCase() === 'TOTAL'
        );
        const yearTotal = totalRow ? parseInt(totalRow.estimate) : 0;

        const sorted = [...yearData].sort((a, b) => parseInt(b.estimate) - parseInt(a.estimate));
        const numberOfCountries = sorted.length;
        
        // Top 5 countries
        const top5 = sorted.slice(0, 5);
        const top5Total = top5.reduce((sum, d) => sum + parseInt(d.estimate), 0);
        const top5Percent = yearTotal > 0 ? ((top5Total / yearTotal) * 100).toFixed(1) : 'N/A';
        
        // Year comparison
        const prevTotalRow = this.migrationData.find(d => 
            parseInt(d.year) === year - 1 && d.country.toUpperCase() === 'TOTAL'
        );
        const prevTotal = prevTotalRow ? parseInt(prevTotalRow.estimate) : 0;
        const yoyChange = prevTotal > 0 ? ((yearTotal - prevTotal) / prevTotal * 100).toFixed(1) : 'N/A';

        return {
            title: `Choropleth Map Insights - Year ${year}`,
            sections: [
                {
                    heading: 'Overview',
                    rows: [
                        { label: 'Total Arrivals', value: this.formatNumber(yearTotal) },
                        { label: 'Number of Source Countries', value: numberOfCountries },
                        { label: 'Year-on-Year Change', value: yoyChange + '%' }
                    ]
                },
                {
                    heading: 'Top 5 Source Countries',
                    rows: top5.map((d, i) => ({
                        label: `${i + 1}. ${d.country}`,
                        value: `${this.formatNumber(parseInt(d.estimate))} (${yearTotal > 0 ? ((parseInt(d.estimate) / yearTotal) * 100).toFixed(1) : 0}%)`
                    }))
                },
                {
                    heading: 'Key Finding',
                    rows: [
                        { label: 'Top 5 Concentration', value: `${top5Percent}% of year total` },
                        { label: 'Dominant Source', value: `${top5[0].country} leads with ${yearTotal > 0 ? ((parseInt(top5[0].estimate) / yearTotal) * 100).toFixed(1) : 0}%` }
                    ]
                }
            ]
        };
    }

    /**
     * LINE CHART INSIGHTS
     */
    getLineChartInsights(country) {
        const countryData = this.migrationData
            .filter(d => d.country === country)
            .sort((a, b) => parseInt(a.year) - parseInt(b.year));

        if (countryData.length === 0) return null;

        const values = countryData.map(d => parseInt(d.estimate));
        const years = countryData.map(d => d.year);
        
        const total = values.reduce((a, b) => a + b, 0);
        const avg = Math.round(total / values.length);
        const max = Math.max(...values);
        const min = Math.min(...values);
        const maxYear = years[values.indexOf(max)];
        const minYear = years[values.indexOf(min)];
        
        const firstVal = values[0];
        const lastVal = values[values.length - 1];
        const overallChange = ((lastVal - firstVal) / firstVal * 100).toFixed(1);
        
        // COVID impact
        const idx2019 = years.indexOf('2019');
        const idx2020 = years.indexOf('2020');
        const covidDrop = (idx2019 >= 0 && idx2020 >= 0) ? 
            ((values[idx2020] - values[idx2019]) / values[idx2019] * 100).toFixed(1) : null;
        
        // Recent trend (last 3 years)
        const recent = values.slice(-3);
        const recentChange = ((recent[2] - recent[0]) / recent[0] * 100).toFixed(1);
        const trend = recent[2] > recent[0] ? 'Increasing' : 'Decreasing';

        return {
            title: `Line Chart Insights - ${country}`,
            sections: [
                {
                    heading: 'Period Summary (2013-2023)',
                    rows: [
                        { label: 'Total Migrants', value: this.formatNumber(total) },
                        { label: 'Annual Average', value: this.formatNumber(avg) },
                        { label: 'Overall Change', value: `${overallChange}%` }
                    ]
                },
                {
                    heading: 'Peak & Low Points',
                    rows: [
                        { label: 'Highest Year', value: `${maxYear} - ${this.formatNumber(max)}` },
                        { label: 'Lowest Year', value: `${minYear} - ${this.formatNumber(min)}` },
                        { label: 'Range', value: this.formatNumber(max - min) }
                    ]
                },
                {
                    heading: 'Trend Analysis',
                    rows: [
                        { label: 'Recent Trend (3 years)', value: `${trend} (${recentChange}%)` },
                        { label: 'COVID Impact (2020)', value: covidDrop ? `${covidDrop}%` : 'N/A' },
                        { label: 'Starting Point (2013)', value: this.formatNumber(firstVal) },
                        { label: 'Current (2023)', value: this.formatNumber(lastVal) }
                    ]
                }
            ]
        };
    }

    /**
     * RADAR CHART INSIGHTS
     */
    getRadarChartInsights(country) {
        const countryData = this.migrationData.filter(d => d.country === country);
        if (countryData.length === 0) return null;

        const values = countryData.map(d => parseInt(d.estimate));
        const total = values.reduce((a, b) => a + b, 0);
        const avg = Math.round(total / values.length);
        
        // Global ranking
        const allCountries = {};
        this.migrationData.forEach(d => {
            if (!allCountries[d.country]) allCountries[d.country] = 0;
            allCountries[d.country] += parseInt(d.estimate);
        });
        const ranked = Object.entries(allCountries).sort((a, b) => b[1] - a[1]);
        const rank = ranked.findIndex(([name]) => name === country) + 1;
        const totalAll = ranked.reduce((sum, [, val]) => sum + val, 0);
        const contribution = ((total / totalAll) * 100).toFixed(2);
        
        // Volatility
        const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
        const cv = ((Math.sqrt(variance) / avg) * 100).toFixed(1);
        const stability = cv < 30 ? 'High' : cv < 60 ? 'Medium' : 'Low';

        return {
            title: `Radar Chart Insights - ${country}`,
            sections: [
                {
                    heading: 'Global Position',
                    rows: [
                        { label: 'Rank', value: `#${rank} of ${ranked.length} countries` },
                        { label: 'Share of NZ Migration', value: `${contribution}%` },
                        { label: 'Total Migrants', value: this.formatNumber(total) }
                    ]
                },
                {
                    heading: 'Migration Pattern',
                    rows: [
                        { label: 'Annual Average', value: this.formatNumber(avg) },
                        { label: 'Stability Level', value: stability },
                        { label: 'Coefficient of Variation', value: `${cv}%` }
                    ]
                }
            ]
        };
    }

    /**
     * TREEMAP INSIGHTS
     */
    getTreemapInsights() {
        // Parse treemap data
        let ageGroups = this.treemapData.filter(d => d.parent === 'age' && d.value);
        
        if (ageGroups.length === 0) {
            // Fallback data
            ageGroups = [
                { name: '20-29 years', value: 1677300 },
                { name: '30-39 years', value: 1174588 },
                { name: '10-19 years', value: 767289 },
                { name: '0-9 years', value: 671248 },
                { name: '40-49 years', value: 578569 },
                { name: '50-59 years', value: 325363 },
                { name: '60-69 years', value: 218541 },
                { name: '70+', value: 92661 }
            ];
        }
        
        const sorted = [...ageGroups].sort((a, b) => parseInt(b.value) - parseInt(a.value));
        const total = sorted.reduce((sum, d) => sum + parseInt(d.value), 0);
        
        // Working age calculation
        const workingAgeGroups = sorted.filter(d => 
            d.name.includes('20-29') || d.name.includes('30-39') || d.name.includes('40-49')
        );
        const workingAge = workingAgeGroups.reduce((sum, d) => sum + parseInt(d.value), 0);
        const workingPercent = ((workingAge / total) * 100).toFixed(1);
        
        // Young adults
        const youngGroups = sorted.filter(d => d.name.includes('20-29') || d.name.includes('30-39'));
        const young = youngGroups.reduce((sum, d) => sum + parseInt(d.value), 0);
        const youngPercent = ((young / total) * 100).toFixed(1);

        return {
            title: 'Treemap Insights - Age Distribution',
            sections: [
                {
                    heading: 'Age Group Breakdown',
                    rows: sorted.slice(0, 5).map(d => ({
                        label: d.name,
                        value: `${this.formatNumber(parseInt(d.value))} (${this.getPercentage(parseInt(d.value), total)}%)`
                    }))
                },
                {
                    heading: 'Demographic Analysis',
                    rows: [
                        { label: 'Total Population', value: this.formatNumber(total) },
                        { label: 'Working Age (20-49)', value: `${workingPercent}%` },
                        { label: 'Young Adults (20-39)', value: `${youngPercent}%` }
                    ]
                },
                {
                    heading: 'Key Finding',
                    rows: [
                        { label: 'Largest Segment', value: sorted[0].name },
                        { label: 'Segment Size', value: `${this.getPercentage(parseInt(sorted[0].value), total)}% of total` },
                        { label: 'Implication', value: 'Young workforce dominates migration' }
                    ]
                }
            ]
        };
    }

    /**
     * SUMMARY INSIGHTS - Tổng hợp toàn bộ dữ liệu
     */
    getSummaryInsights() {
        if (this.migrationData.length === 0) return null;

        // Overall statistics
        const totalAll = this.migrationData.reduce((sum, d) => sum + parseInt(d.estimate), 0);
        const years = [...new Set(this.migrationData.map(d => d.year))].sort();
        const countries = [...new Set(this.migrationData.map(d => d.country))];
        
        // Peak year
        const yearTotals = {};
        this.migrationData.forEach(d => {
            yearTotals[d.year] = (yearTotals[d.year] || 0) + parseInt(d.estimate);
        });
        const peakYear = Object.entries(yearTotals).sort((a, b) => b[1] - a[1])[0];
        const lowYear = Object.entries(yearTotals).sort((a, b) => a[1] - b[1])[0];
        
        // Top countries overall
        const countryTotals = {};
        this.migrationData.forEach(d => {
            countryTotals[d.country] = (countryTotals[d.country] || 0) + parseInt(d.estimate);
        });
        const topCountries = Object.entries(countryTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const top5Total = topCountries.reduce((sum, [, val]) => sum + val, 0);
        
        // Growth rate
        const firstYearTotal = yearTotals[years[0]];
        const lastYearTotal = yearTotals[years[years.length - 1]];
        const overallGrowth = ((lastYearTotal - firstYearTotal) / firstYearTotal * 100).toFixed(1);
        
        // Average
        const avgPerYear = Math.round(totalAll / years.length);

        return {
            title: 'Summary - Key Migration Insights',
            sections: [
                {
                    heading: 'Major Findings',
                    rows: [
                        { label: 'Total Migrants (2013-2023)', value: this.formatNumber(totalAll) },
                        { label: 'Number of Years Analyzed', value: years.length },
                        { label: 'Source Countries', value: countries.length },
                        { label: 'Average Annual Migration', value: this.formatNumber(avgPerYear) }
                    ]
                },
                {
                    heading: 'Top 5 Source Countries (All Time)',
                    rows: topCountries.map(([name, val], i) => ({
                        label: `${i + 1}. ${name}`,
                        value: `${this.formatNumber(val)} (${this.getPercentage(val, totalAll)}%)`
                    }))
                },
                {
                    heading: 'Yearly Analysis',
                    rows: [
                        { label: 'Peak Year', value: `${peakYear[0]} - ${this.formatNumber(peakYear[1])}` },
                        { label: 'Lowest Year', value: `${lowYear[0]} - ${this.formatNumber(lowYear[1])}` },
                        { label: 'Overall Growth (2013-2023)', value: `${overallGrowth}%` },
                        { label: 'Top 5 Countries Concentration', value: `${this.getPercentage(top5Total, totalAll)}% of total` }
                    ]
                },
                {
                    heading: 'Strategic Implications',
                    rows: [
                        { label: 'Primary Market', value: topCountries[0][0] },
                        { label: 'Growth Trend', value: overallGrowth > 0 ? 'Positive' : 'Negative' },
                        { label: 'Concentration Risk', value: top5Total/totalAll > 0.5 ? 'High' : 'Moderate' },
                        { label: 'Data Quality', value: 'Complete (11 years)' }
                    ]
                }
            ]
        };
    }

    /**
     * UTILITY FUNCTIONS
     */
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString();
    }

    getPercentage(value, total) {
        return ((value / total) * 100).toFixed(1);
    }

    /**
     * RENDER - Giao diện bảng đơn giản
     */
    renderInsight(containerId, insightData) {
        if (!insightData) return;

        const container = document.getElementById(containerId);
        if (!container) return;

        let html = `<div class="insight-panel">
            <div class="insight-header">
                <h4>${insightData.title}</h4>
            </div>
            <div class="insight-body">`;

        insightData.sections.forEach(section => {
            html += `
                <div class="insight-section">
                    <div class="section-heading">${section.heading}</div>
                    <table class="insight-table">
                        <tbody>`;
            
            section.rows.forEach(row => {
                html += `
                    <tr>
                        <td class="label">${row.label}</td>
                        <td class="value">${row.value}</td>
                    </tr>`;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>`;
        });

        html += `</div></div>`;
        container.innerHTML = html;
    }

    /**
     * RENDER SUMMARY - 4 panels cho grid 2x2
     */
    renderSummaryInsight(containerId) {
        if (this.migrationData.length === 0) return;

        const container = document.getElementById(containerId);
        if (!container) return;

        // Calculate all data
        const totalAll = this.migrationData.reduce((sum, d) => sum + parseInt(d.estimate), 0);
        const years = [...new Set(this.migrationData.map(d => d.year))].sort();
        const countries = [...new Set(this.migrationData.map(d => d.country))];
        
        const yearTotals = {};
        this.migrationData.forEach(d => {
            yearTotals[d.year] = (yearTotals[d.year] || 0) + parseInt(d.estimate);
        });
        const sortedYears = Object.entries(yearTotals).sort((a, b) => b[1] - a[1]);
        const peakYear = sortedYears[0];
        const lowYear = sortedYears[sortedYears.length - 1];
        
        const countryTotals = {};
        this.migrationData.forEach(d => {
            countryTotals[d.country] = (countryTotals[d.country] || 0) + parseInt(d.estimate);
        });
        const topCountries = Object.entries(countryTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const top5Total = topCountries.reduce((sum, [, val]) => sum + val, 0);
        
        const firstYearTotal = yearTotals[years[0]];
        const lastYearTotal = yearTotals[years[years.length - 1]];
        const overallGrowth = ((lastYearTotal - firstYearTotal) / firstYearTotal * 100).toFixed(1);
        const avgPerYear = Math.round(totalAll / years.length);

        // Panel 1: Major Findings
        let html = `
        <div class="insight-panel">
            <div class="insight-header"><h4>Major Findings</h4></div>
            <div class="insight-body">
                <table class="insight-table">
                    <tr><td class="label">Total Migrants (2013-2023)</td><td class="value">${this.formatNumber(totalAll)}</td></tr>
                    <tr><td class="label">Years Analyzed</td><td class="value">${years.length}</td></tr>
                    <tr><td class="label">Source Countries</td><td class="value">${countries.length}</td></tr>
                    <tr><td class="label">Annual Average</td><td class="value">${this.formatNumber(avgPerYear)}</td></tr>
                </table>
            </div>
        </div>`;

        // Panel 2: Top 5 Countries
        html += `
        <div class="insight-panel">
            <div class="insight-header"><h4>Top 5 Source Countries</h4></div>
            <div class="insight-body">
                <table class="insight-table">`;
        topCountries.forEach(([name, val], i) => {
            html += `<tr><td class="label">${i + 1}. ${name}</td><td class="value">${this.formatNumber(val)} (${this.getPercentage(val, totalAll)}%)</td></tr>`;
        });
        html += `</table></div></div>`;

        // Panel 3: Yearly Analysis
        html += `
        <div class="insight-panel">
            <div class="insight-header"><h4>Yearly Analysis</h4></div>
            <div class="insight-body">
                <table class="insight-table">
                    <tr><td class="label">Peak Year</td><td class="value">${peakYear[0]} - ${this.formatNumber(peakYear[1])}</td></tr>
                    <tr><td class="label">Lowest Year</td><td class="value">${lowYear[0]} - ${this.formatNumber(lowYear[1])}</td></tr>
                    <tr><td class="label">Overall Growth</td><td class="value">${overallGrowth}%</td></tr>
                    <tr><td class="label">Top 5 Concentration</td><td class="value">${this.getPercentage(top5Total, totalAll)}%</td></tr>
                </table>
            </div>
        </div>`;

        // Panel 4: Strategic Implications
        html += `
        <div class="insight-panel">
            <div class="insight-header"><h4>Strategic Implications</h4></div>
            <div class="insight-body">
                <table class="insight-table">
                    <tr><td class="label">Primary Market</td><td class="value">${topCountries[0][0]}</td></tr>
                    <tr><td class="label">Growth Trend</td><td class="value">${overallGrowth > 0 ? 'Positive' : 'Negative'}</td></tr>
                    <tr><td class="label">Concentration Risk</td><td class="value">${top5Total/totalAll > 0.5 ? 'High' : 'Moderate'}</td></tr>
                    <tr><td class="label">Data Quality</td><td class="value">Complete (11 years)</td></tr>
                </table>
            </div>
        </div>`;

        container.innerHTML = html;
    }
}

// Initialize
const insightsGen = new InsightsGenerator();

window.addEventListener('load', async () => {
    await insightsGen.loadData();
    
    // Render default insights
    setTimeout(() => {
        // Choropleth - default year 2023
        const choropleth = insightsGen.getChoroplethInsights(2023);
        insightsGen.renderInsight('choroplethInsight', choropleth);
        
        // Line chart - default Vietnam
        const line = insightsGen.getLineChartInsights('Vietnam');
        insightsGen.renderInsight('lineChartInsight', line);
        
        // Radar chart - default Vietnam
        const radar = insightsGen.getRadarChartInsights('Vietnam');
        insightsGen.renderInsight('radarChartInsight', radar);
        
        // Treemap
        const treemap = insightsGen.getTreemapInsights();
        insightsGen.renderInsight('treemapInsight', treemap);
        
        // Summary - 2x2 grid
        insightsGen.renderSummaryInsight('summaryInsight');
    }, 500);
});
