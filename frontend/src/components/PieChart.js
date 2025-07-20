import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const PieChart = ({ data }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 400;
    const chartWidth = 300;
    const legendWidth = 200;
    const radius = Math.min(chartWidth, height) / 2 - 10;

    const chartG = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${chartWidth / 2},${height / 2})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

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
      .attr("fill", (d, i) => color(i))
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("cursor", "pointer");

    arcs.append("text")
      .attr("transform", d => `translate(${labelArc.centroid(d)})`)
      .attr("dy", ".35em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "white")
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
      .attr("transform", (d, i) => `translate(0, ${i * 25})`)
      .style("cursor", "pointer");

    legendItems.append("rect")
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", (d, i) => color(i));

    legendItems.append("text")
      .attr("x", 25)
      .attr("y", 9)
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .text(d => d.spending_category);

    // Add hover interactions
    legendItems
      .on("mouseover", function(event, d) {
        const category = d.spending_category;
        
        // Highlight corresponding pie slice
        paths.style("opacity", function(pieData) {
          return pieData.data.spending_category === category ? 1 : 0.3;
        });
        
        // Highlight legend item
        d3.select(this).style("font-weight", "bold");
      })
      .on("mouseout", function() {
        // Reset all pie slices
        paths.style("opacity", 1);
        
        // Reset legend items
        legendItems.style("font-weight", "normal");
      });

    // Add hover to pie slices as well
    paths
      .on("mouseover", function(event, d) {
        const category = d.data.spending_category;
        
        // Highlight this slice
        paths.style("opacity", function(pieData) {
          return pieData.data.spending_category === category ? 1 : 0.3;
        });
        
        // Highlight corresponding legend item
        legendItems.style("font-weight", function(legendData) {
          return legendData.spending_category === category ? "bold" : "normal";
        });
      })
      .on("mouseout", function() {
        // Reset all
        paths.style("opacity", 1);
        legendItems.style("font-weight", "normal");
      });

  }, [data]);

  return <svg ref={svgRef}></svg>;
};

export default PieChart;