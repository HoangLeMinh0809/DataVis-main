
function init() {
    // Show loading spinner
    showLoading("map");
    
    let w = 1000;
    let h = 700;
    const sensitivity = 75;

    let nzLocation = [];
    let nzCentroid;
    let gdpData = [];  // Store GDP data

    // Function to map country names from world.json to GDP dataset
    function mapCountryName(worldName) {
        const countryMapping = {
            "United States of America": "United States",
            "United Kingdom": "United Kingdom",
            "Russia": "Russia",
            "South Korea": "South Korea",
            "Czech Republic": "Czechia",
            "Taiwan": "Taiwan",
            "Vietnam": "Vietnam",
            "Laos": "Laos",
            "Myanmar": "Myanmar",
            "Republic of the Congo": "Congo",
            "Democratic Republic of the Congo": "Democratic Republic of Congo",
            "United Republic of Tanzania": "Tanzania",
            "Macedonia": "North Macedonia",
            "Syria": "Syria",
            "Iran": "Iran",
            "Venezuela": "Venezuela",
            "Bolivia": "Bolivia",
            "Côte d'Ivoire": "Cote d'Ivoire",
            "Ivory Coast": "Cote d'Ivoire"
        };
        
        return countryMapping[worldName] || worldName;
    }

    let migrationData = [];  // Store migration data


    const tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background-color", "lightgray")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("visibility", "hidden");

    // Create GDP tooltip with chart
    const gdpTooltip = d3.select("body")
        .append("div")
        .attr("id", "gdp-tooltip")
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "2px solid #333")
        .style("border-radius", "8px")
        .style("padding", "15px")
        .style("box-shadow", "0 4px 6px rgba(0,0,0,0.1)")
        .style("visibility", "hidden")
        .style("z-index", "1000");

    // Create a new projection using the Mercator projection
    let projection = d3.geoOrthographic()
        .center([0, 0])
        .scale(330)
        .rotate([190, 50])
        .translate([w / 2, h / 2]);


    const initialScale = projection.scale()
    // Create a new path using the projection
    let path = d3.geoPath()
        .projection(projection);

    let svg = d3.select("#map")
        .append("svg")
        .attr("width", w)
        .attr("height", h);

    let globe = svg.append("circle")
        .attr("fill", "#EEE")
        .attr("stroke", "#000")
        .attr("stroke-width", "0.2")
        .attr("cx", w / 2)
        .attr("cy", h / 2)
        .attr("r", initialScale)

    //var color = d3.scaleSequential(d3.interpolateBlues).domain([0, 20000]).unknown('grey');

    // let color = d3.scaleLinear().domain([1, 8000]).range(["#9ecae1","#08519c"])

    const colorsArray = [
        "#f7fbff",
        "#deebf7",
        "#c6dbef",
        "#9ecae1",
        "#6baed6",
        "#4292c6",
        "#2171b5",
        "#08519c",
        "#08306b"
    ];

    const color2 = colorsArray;

    // Reverse the order of the array
    colorsArray.reverse();

    //let color = d3.scaleOrdinal(d3.schemeBlues[5]).domain("a", "b", "c", "d", "e").unknown('grey');

    let color = d3.scaleThreshold([10, 50, 200, 1000, 2000, 4000, 5000, 10000, 20000], d3.schemeBlues[9]).unknown('grey');

    //let test = d3.scaleOrdinal().range(color2);

    let selectedValue = 2023;


    var geoGenerator = d3.geoPath()
        .projection(projection)
        .pointRadius(4);

    // Load GDP data first
    d3.csv("dataset/gdp-penn-world-table.csv").then(function(gdpCsv) {
        // Store GDP data
        gdpData = gdpCsv;
        
        // Load the JSON file and draw the map
        d3.csv("dataset/NZ_MIGRATION.csv")
            .then(function (d) {
                // Validate data
                if (!d || d.length === 0) {
                    throw new Error("No migration data available");
                }
                
                // Store migration data
                migrationData = d;
                
                return d3.json("dataset/world.json").then(function (json) {
                    // Hide loading spinner after data loaded
                    hideLoading("map");
                
                let dataValue;
                for (var i = 0; i < d.length; i++) {
                    let dataState = d[i].country; // Get the LGA from the CSV 
                    let dataYear = parseInt(d[i].year);
                    if (dataYear == selectedValue) {
                        console.log(dataYear);
                    dataValue = parseFloat(d[i].estimate);
                }// Get the unemployment rate from the CSV data
                for (var j = 0; j < json.features.length; j++) {
                    var jsonState = json.features[j].properties.name; // Get the LGA name from the JSON data

                    if (jsonState == "New Zealand") {
                        const centroid = path.centroid(json.features[j]);
                        nzCentroid = path.centroid(json.features[j]);
                        nzLocation = projection.invert(centroid)

                    }

                    // Check if the LGA names match
                    if (dataState == jsonState) {
                        json.features[j].properties.value = dataValue; // Set the value property in the JSON data
                        break;
                    }
                }
            }
            function updateJson() {
                for (var j = 0; j < json.features.length; j++) {
                    json.features[j].properties.value = undefined;
                }
                //code for setting the value as per the filter
                for (var i = 0; i < d.length; i++) {
                    let dataState = d[i].country; // Get the LGA from the CSV 
                    let dataYear = parseInt(d[i].year);
                    if (dataYear == selectedValue) {
                        console.log(dataYear);
                        dataValue = parseFloat(d[i].estimate);
                    }// Get the unemployment rate from the CSV data
                    for (var j = 0; j < json.features.length; j++) {
                        var jsonState = json.features[j].properties.name; // Get the LGA name from the JSON data

                        if (jsonState == "New Zealand") {
                            const centroid = path.centroid(json.features[j]);
                            nzCentroid = path.centroid(json.features[j]);
                            nzLocation = projection.invert(centroid)

                        }

                        // Check if the LGA names match
                        if (dataState == jsonState) {
                            json.features[j].properties.value = dataValue; // Set the value property in the JSON data
                            break;
                        }
                    }
                }
            }
            d3.select("#mySlider").on("change", async function (d) {

                selectedValue = parseInt(this.value);
                d3.select("#year").text(this.value);
                console.log(selectedValue);
                updateJson();
                
                // Update insights for choropleth
                if (insightsGen) {
                    const insight = insightsGen.getChoroplethInsights(selectedValue);
                    insightsGen.renderInsight('choroplethInsight', insight);
                }
                
                // Update scatter plot when year changes
                updateScatterPlot(null, null, null);
                
                svg.selectAll("path").attr("fill", function (data) {
                    if (data.properties.name === "New Zealand") {
                        return "red";
                    } else {
                        return color(data.properties.value);
                    }
                    // } else if (1000 > parseInt(data.properties.value) > 0) {
                    //     return color("a");
                    // } else if (2000 > data.properties.value > 1000) {
                    //     return color("b");
                    // } else if (3000 > data.properties.value > 2000) {
                    //     return color("c");
                    // } else if (4000 > data.properties.value > 3000) {
                    //     return color("d");
                    // }  else {
                    //     return color("e");
                    // }
                })
                    .attr("class", function (d) {
                        return "country"
                    }).transition().duration(5);

            })
            svg.selectAll("path")
                .data(json.features)
                .enter()
                .append("path")
                .attr("d", path)
                .attr("fill", function (data) {
                    if (data.properties.name === "New Zealand") {
                        return "red";
                    } else {
                        return color(data.properties.value);
                    }
                })
                .attr("class", function (d) {
                    return "country"
                })
                .attr("stroke", "black")
                .attr("stroke-width", 0.2)
                .on("mouseover", function (event, d) {
                    const centroid = path.centroid(d); // Get the centroid of the country
                    const lonlat = projection.invert(centroid)
                    const name = d.properties.name; // Get the name of the country
                    const value = d.properties.value;

                    // Show combined tooltip with migration info and GDP chart
                    drawCombinedTooltip(name, value, event, centroid);

                    d3.select(this).attr("stroke", "black");
                    d3.select(this).attr("stroke-width", "2");


                    d3.selectAll(".country")
                        .transition()
                        .duration(100)
                        .style("opacity", .5)

                    d3.select(this)
                        .transition()
                        .duration(100)
                        .style("opacity", 1)


                    var geoInterpolator = d3.geoInterpolate(lonlat, nzLocation);
                    svg.append('path')
                        .datum({ type: 'LineString', coordinates: [nzLocation, lonlat] })
                        .attr('d', geoGenerator)
                        .style('stroke', 'red')
                        .style('stroke-width', 1)
                        .style('fill', 'none')
                        .attr('id', "lineCountry");
                    svg.append('circle')
                        .attr('id', 'runningCircle')
                        .attr('r', 5)
                        .attr('fill', 'red')
                        .attr('cx', nzCentroid[0])
                        .attr('cy', nzCentroid[1])
                        .transition()
                        .duration(2000)
                        .attrTween('cx', function () {
                            return function (t) {
                                const currentCoord = geoInterpolator(t);
                                return projection(currentCoord)[0];
                            }
                        })
                        .attrTween('cy', function () {
                            return function (t) {
                                const currentCoord = geoInterpolator(t);
                                return projection(currentCoord)[1];
                            }
                        });


                })
                .on("mouseout", function (d) {
                    d3.select(this).attr("stroke", "black");
                    d3.select(this).attr("stroke-width", "0.2");
                    
                    // Hide combined tooltip
                    gdpTooltip.style("visibility", "hidden");
                    
                    d3.selectAll(".country")
                        .transition()
                        .duration(100)
                        .style("opacity", 1)
                    d3.select("#route").remove();
                    d3.select('#lineCountry').remove();
                    d3.select("#runningCircle").remove();
                })
                .on("click", function (event, d) {
                    const name = d.properties.name;
                    d3.select("#line").remove();
                    d3.selectAll(".countryName").text(name);
                    drawGraph(name);
                    drawRadar(name);
                    
                    // Update line chart insights
                    if (insightsGen) {
                        const insight = insightsGen.getLineChartInsights(name);
                        insightsGen.renderInsight('lineChartInsight', insight);
                    }
                    
                    // Update radar chart insights
                    if (insightsGen) {
                        const insight = insightsGen.getRadarChartInsights(name);
                        insightsGen.renderInsight('radarChartInsight', insight);
                    }
                });

            console.log(nzLocation);
        })
        .catch(function(error) {
            // Handle errors gracefully
            console.error("Error loading GeoJSON:", error);
            handleDataError(error, "map");
        });
    })
    .catch(function(error) {
        // Handle CSV loading errors
        console.error("Error loading CSV:", error);
        handleDataError(error, "map");
    });
    
    }).catch(function(error) {
        // Handle GDP data loading errors
        console.error("Error loading GDP data:", error);
        handleDataError(error, "map");
    });

    let zoom = d3.zoom().on('zoom', function (event) {
        if (event.transform.k > 0.3) {
            projection.scale(initialScale * event.transform.k)

            path = d3.geoPath().projection(projection)
            svg.selectAll("path").attr("d", path)
            globe.attr("r", projection.scale())
        } else {
            event.transform.k = 0.3
        }
    });

    let drag = d3.drag().on('drag', function (event) {
        // Change these data to see ho the great circle reacts

        const rotate = projection.rotate()
        const k = sensitivity / projection.scale()
        projection.rotate([
            rotate[0] + event.dx * k,
            rotate[1] - event.dy * k
        ])


        path = d3.geoPath().projection(projection)
        svg.selectAll("path").attr("d", path)


    });

    function drawColorScaleBar(colorScale) {
        const legendSvg = d3.select("#legend")
            .append("svg")
            .attr("width", 240)
            .attr("height", 100);

        const gradient = legendSvg.append("defs")
            .append("linearGradient")
            .attr("id", "colorGradient")
            .attr("x1", "0%")
            .attr("x2", "100%")
            .attr("y1", "0%")
            .attr("y2", "0%");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", colorScale(10));
        gradient.append("stop")
            .attr("offset", "25%")
            .attr("stop-color", colorScale(200));
        gradient.append("stop")
            .attr("offset", "45%")
            .attr("stop-color", colorScale(2000));
        gradient.append("stop")
            .attr("offset", "60%")
            .attr("stop-color", colorScale(5000));
        gradient.append("stop")
            .attr("offset", "75%")
            .attr("stop-color", colorScale(10000));
        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", colorScale(20000));

        legendSvg.append("rect")
            .attr("width", 200)
            .attr("height", 20)
            .style("fill", "url(#colorGradient)").attr("transform", "translate(150, 30)");
        var scale = d3.scaleLinear()
            .domain([0, 25000])
            .range([0, 200]);

        const legendAxis = d3.axisBottom(scale)
            .ticks(4);


        legendSvg.append("g")
            .attr("transform", "translate(150, 55)")
            .call(legendAxis);
    }

    // Call the function passing your color scale
    d3.select("#reset").on("click", function (event, d) {
        projection
            .center([0, 0])
            .scale(330)
            .rotate([190, 50])
            .translate([w / 2, h / 2]);
        globe.attr("r", projection.scale());
        path = d3.geoPath().projection(projection);
        svg.selectAll("path").attr("d", path);
    })
    drawColorScaleBar(color);
    svg.call(drag);
    svg.call(zoom);

    // Create scatter plot container for Migration vs GDP relationship
    const scatterContainer = d3.select("#map")
        .append("div")
        .attr("id", "scatter-container")
        .style("position", "absolute")
        .style("bottom", "20px")
        .style("right", "20px")
        .style("background-color", "white")
        .style("border", "2px solid #333")
        .style("border-radius", "8px")
        .style("padding", "10px")
        .style("box-shadow", "0 4px 6px rgba(0,0,0,0.1)");

    // Function to draw simple tooltip with migration and GDP for selected year
    function drawCombinedTooltip(countryName, migrationValue, event, centroid) {
        // Clear previous content
        gdpTooltip.html("");
        
        // Map country names from world.json to GDP dataset
        const gdpCountryName = mapCountryName(countryName);
        
        // Get GDP for selected year
        const countryGDPForYear = gdpData.find(d => d.Entity === gdpCountryName && +d.Year === selectedValue);
        
        // Format GDP value
        let gdpText = "No data";
        if (countryGDPForYear) {
            const gdpValue = +countryGDPForYear["GDP (output, multiple price benchmarks)"];
            if (gdpValue >= 1e12) {
                gdpText = "$" + (gdpValue / 1e12).toFixed(2) + " trillion";
            } else if (gdpValue >= 1e9) {
                gdpText = "$" + (gdpValue / 1e9).toFixed(2) + " billion";
            } else if (gdpValue >= 1e6) {
                gdpText = "$" + (gdpValue / 1e6).toFixed(2) + " million";
            } else {
                gdpText = "$" + gdpValue.toLocaleString();
            }
        }
        
        // Add country name
        gdpTooltip.append("div")
            .style("font-weight", "bold")
            .style("font-size", "14px")
            .style("margin-bottom", "8px")
            .style("color", "#333")
            .text(countryName);
        
        // Add migration info
        gdpTooltip.append("div")
            .style("font-size", "12px")
            .style("margin-bottom", "4px")
            .style("color", "#555")
            .html("<strong>Migration (" + selectedValue + "):</strong> " + (migrationValue ? migrationValue.toLocaleString() : "No data"));
        
        // Add GDP info
        gdpTooltip.append("div")
            .style("font-size", "12px")
            .style("color", "#2171b5")
            .html("<strong>GDP (" + selectedValue + "):</strong> " + gdpText);
        
        // Position tooltip
        gdpTooltip
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px")
            .style("visibility", "visible");
        
        // Update scatter plot with this country's data across all years
        updateScatterPlot(countryName, gdpCountryName);
    }

    // Function to draw scatter plot showing Migration vs GDP relationship for ONE country across years
    function updateScatterPlot(countryName, gdpCountryName) {
        // Clear previous scatter plot
        scatterContainer.html("");
        
        if (!countryName) {
            scatterContainer.append("div")
                .style("font-size", "11px")
                .style("color", "#999")
                .style("text-align", "center")
                .style("padding", "20px")
                .text("Hover over a country to see Migration vs GDP relationship");
            return;
        }
        
        // Title
        scatterContainer.append("div")
            .style("font-weight", "bold")
            .style("font-size", "12px")
            .style("margin-bottom", "5px")
            .style("text-align", "center")
            .style("color", "#333")
            .text(countryName + ": Migration vs GDP");
        
        // Chart dimensions
        const chartWidth = 280;
        const chartHeight = 200;
        const margin = { top: 15, right: 20, bottom: 40, left: 55 };
        const width = chartWidth - margin.left - margin.right;
        const height = chartHeight - margin.top - margin.bottom;

        // Create SVG
        const scatterSvg = scatterContainer.append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight);

        const g = scatterSvg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Prepare data - get all years for this country
        const scatterData = [];
        for (let year = 2013; year <= 2023; year++) {
            const migRow = migrationData.find(m => m.country === countryName && +m.year === year);
            const gdpRow = gdpData.find(g => g.Entity === gdpCountryName && +g.Year === year);
            
            if (migRow && gdpRow && migRow.estimate) {
                scatterData.push({
                    year: year,
                    migration: +migRow.estimate,
                    gdp: +gdpRow["GDP (output, multiple price benchmarks)"]
                });
            }
        }

        if (scatterData.length === 0) {
            g.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "11px")
                .style("fill", "#999")
                .text("No data available");
            return;
        }

        // Scales
        const xScale = d3.scaleLinear()
            .domain([d3.min(scatterData, d => d.gdp) * 0.95, d3.max(scatterData, d => d.gdp) * 1.05])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([d3.min(scatterData, d => d.migration) * 0.9, d3.max(scatterData, d => d.migration) * 1.1])
            .range([height, 0]);

        // Axes
        const xAxis = d3.axisBottom(xScale)
            .ticks(3)
            .tickFormat(d => {
                if (d >= 1e12) return "$" + (d / 1e12).toFixed(1) + "T";
                if (d >= 1e9) return "$" + (d / 1e9).toFixed(0) + "B";
                return "$" + (d / 1e6).toFixed(0) + "M";
            });

        const yAxis = d3.axisLeft(yScale)
            .ticks(4)
            .tickFormat(d => {
                if (d >= 1000) return (d / 1000).toFixed(1) + "k";
                return d.toFixed(0);
            });

        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis)
            .style("font-size", "9px");

        g.append("g")
            .call(yAxis)
            .style("font-size", "9px");

        // Axis labels
        g.append("text")
            .attr("x", width / 2)
            .attr("y", height + 32)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "#666")
            .text("GDP");

        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", -height / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "#666")
            .text("Migration");

        // Draw connecting line between points (ordered by year)
        const sortedData = scatterData.sort((a, b) => a.year - b.year);
        const line = d3.line()
            .x(d => xScale(d.gdp))
            .y(d => yScale(d.migration));
        
        g.append("path")
            .datum(sortedData)
            .attr("fill", "none")
            .attr("stroke", "#2171b5")
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.5)
            .attr("d", line);

        // Draw dots with year labels
        const dots = g.selectAll("circle")
            .data(scatterData)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d.gdp))
            .attr("cy", d => yScale(d.migration))
            .attr("r", d => d.year === selectedValue ? 6 : 4)
            .attr("fill", d => d.year === selectedValue ? "#e31a1c" : "#2171b5")
            .attr("stroke", d => d.year === selectedValue ? "#000" : "none")
            .attr("stroke-width", 1);

        // Add year labels for first, last, and selected year
        scatterData.forEach(d => {
            if (d.year === 2013 || d.year === 2023 || d.year === selectedValue) {
                g.append("text")
                    .attr("x", xScale(d.gdp))
                    .attr("y", yScale(d.migration) - 8)
                    .attr("text-anchor", "middle")
                    .style("font-size", "9px")
                    .style("fill", d.year === selectedValue ? "#e31a1c" : "#666")
                    .style("font-weight", d.year === selectedValue ? "bold" : "normal")
                    .text(d.year);
            }
        });
    }

    // Initialize scatter plot with empty state
    updateScatterPlot(null, null);
}

window.addEventListener('load', init);