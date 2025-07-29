import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const PieChart = ({ data }) => {
  const svgRef = useRef();

  const renderChart = () => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Get the container dimensions dynamically
    const container = svgRef.current.parentNode;
    const containerWidth = container.getBoundingClientRect().width;
    
    // Make responsive with better proportions
    const width = containerWidth - 40; // Leave some padding
    const height = 400;
    const chartWidth = Math.min(width * 0.6, 300); // Chart takes 60% of width, max 300px
    const legendWidth = width - chartWidth - 40; // Remaining space for legend
    const radius = Math.min(chartWidth, height) / 2 - 20;

    const chartG = svg
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${chartWidth / 2},${height / 2})`);

    const color = d3.scaleOrdinal([
      '#ff6b6b', // Bright Red
      '#4ecdc4', // Teal
      '#45b7d1', // Sky Blue  
      '#f9ca24', // Golden Yellow
      '#6c5ce7', // Purple
      '#fd79a8', // Pink
      '#00b894', // Green
      '#fdcb6e', // Orange
      '#e17055', // Coral
      '#74b9ff', // Light Blue
      '#a29bfe', // Lavender
      '#ff9ff3', // Hot Pink
      '#00cec9', // Cyan
      '#55a3ff', // Blue
      '#ff7675', // Salmon
      '#26de81', // Mint Green
      '#ffa726', // Deep Orange
      '#9c88ff', // Violet
      '#ff9ff3', // Magenta
      '#54a0ff', // Bright Blue
      '#5f27cd', // Deep Purple
      '#00d2d3', // Turquoise
      '#ff9f43', // Bright Orange
      '#ee5a6f', // Rose
      '#0abde3', // Electric Blue
      '#10ac84', // Emerald
      '#f368e0', // Fuchsia
      '#ff6348', // Tomato
      '#7bed9f', // Light Green
      '#70a1ff'  // Periwinkle
    ]);

    const pie = d3.pie()
      .value(d => d.total_amount)
      .sort(null);

    const path = d3.arc()
      .outerRadius(radius)
      .innerRadius(0);

    const labelArc = d3.arc()
      .outerRadius(radius - 30)
      .innerRadius(radius - 30);

    const arcs = chartG.selectAll(".arc")
      .data(pie(data))
      .enter().append("g")
      .attr("class", "arc");

    const paths = arcs.append("path")
      .attr("d", path)
      .attr("fill", (_, i) => color(i))
      .attr("stroke", "#1a202c")
      .attr("stroke-width", 3)
      .style("cursor", "pointer")
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.3))");

    const percentageLabels = arcs.append("text")
      .attr("transform", d => `translate(${labelArc.centroid(d)})`)
      .attr("dy", ".35em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "white")
      .style("opacity", 0)
      .text(d => {
        const percentage = ((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(1);
        return `${percentage}%`;
      });

    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${chartWidth + 20}, 30)`);

    const legendItems = legend.selectAll(".legend-item")
      .data(data)
      .enter().append("g")
      .attr("class", "legend-item")
      .attr("transform", (_, i) => `translate(0, ${i * 25})`)
      .style("cursor", "pointer");

    legendItems.append("rect")
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", (_, i) => color(i));

    legendItems.append("text")
      .attr("x", 25)
      .attr("y", 9)
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .style("fill", "#e5e7eb")
      .text(d => d.spending_category);

    // Add hover interactions
    legendItems
      .on("mouseover", function(_, d) {
        const category = d.spending_category;
        
        // Highlight corresponding pie slice
        paths.style("opacity", function(pieData) {
          return pieData.data.spending_category === category ? 1 : 0.3;
        });
        
        // Show percentage for the corresponding slice
        percentageLabels.style("opacity", function(pieData) {
          return pieData.data.spending_category === category ? 1 : 0;
        });
        
        // Highlight legend item
        d3.select(this).style("font-weight", "bold");
      })
      .on("mouseout", function() {
        // Reset all pie slices
        paths.style("opacity", 1);
        percentageLabels.style("opacity", 0);
        
        // Reset legend items
        legendItems.style("font-weight", "normal");
      });

    // Add hover to pie slices as well
    paths
      .on("mouseover", function(_, d) {
        const category = d.data.spending_category;
        
        // Highlight this slice
        paths.style("opacity", function(pieData) {
          return pieData.data.spending_category === category ? 1 : 0.3;
        });
        
        // Show percentage for this slice
        percentageLabels.style("opacity", function(pieData) {
          return pieData.data.spending_category === category ? 1 : 0;
        });
        
        // Highlight corresponding legend item
        legendItems.style("font-weight", function(legendData) {
          return legendData.spending_category === category ? "bold" : "normal";
        });
      })
      .on("mouseout", function() {
        // Reset all
        paths.style("opacity", 1);
        percentageLabels.style("opacity", 0);
        legendItems.style("font-weight", "normal");
      });
  };

  useEffect(() => {
    renderChart();
    
    // Add resize listener
    const handleResize = () => {
      renderChart();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data]);

  return <svg ref={svgRef} style={{ width: '100%', height: 'auto' }}></svg>;
};

export default PieChart;