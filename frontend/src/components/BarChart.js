import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const BarChart = ({ data, period }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 80, left: 60 };
    const width = 500 - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    const g = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Always show spending by category regardless of time frame
    const aggregatedData = d3.rollup(
      data,
      v => d3.sum(v, d => d.amount),
      d => d.spending_category
    );
    const categoryData = Array.from(aggregatedData, ([key, value]) => ({
      category: key,
      amount: value
    }));

    const xScale = d3.scaleBand()
      .domain(categoryData.map(d => d.category))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(categoryData, d => d.amount)])
      .range([height, 0]);

    // Create consistent color scale for categories
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

    g.selectAll(".bar")
      .data(categoryData)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.category))
      .attr("width", xScale.bandwidth())
      .attr("y", d => yScale(d.amount))
      .attr("height", d => height - yScale(d.amount))
      .attr("fill", d => color(d.category))
      .attr("stroke", "#1a202c")
      .attr("stroke-width", 2)
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.3))");

    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("text-anchor", "end")
      .style("fill", "#d1d5db")
      .style("font-size", "12px")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");

    g.select(".x-axis")
      .selectAll(".domain, .tick line")
      .style("stroke", "#4a5568");

    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale).tickFormat(d => `$${d3.format(",.0f")(d)}`))
      .selectAll("text")
      .style("fill", "#d1d5db")
      .style("font-size", "12px");

    g.select(".y-axis")
      .selectAll(".domain, .tick line")
      .style("stroke", "#4a5568");

  }, [data, period]);

  return <svg ref={svgRef}></svg>;
};

export default BarChart;