import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getCategoryColor } from '../utils/colors';

const BarChart = ({ data, period, onCategoryClick }) => {
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
      v => d3.sum(v, d => Math.abs(d.amount)), // Use absolute value to avoid negative amounts
      d => d.spending_category
    );
    const categoryData = Array.from(aggregatedData, ([key, value]) => ({
      category: key,
      amount: value
    }))
    .sort((a, b) => b.amount - a.amount); // Sort from largest to smallest

    const xScale = d3.scaleBand()
      .domain(categoryData.map(d => d.category))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(categoryData, d => d.amount)])
      .range([height, 0]);

    // Use consistent color mapping based on category names

    const bars = g.selectAll(".bar")
      .data(categoryData)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.category))
      .attr("width", xScale.bandwidth())
      .attr("y", d => yScale(d.amount))
      .attr("height", d => height - yScale(d.amount))
      .attr("fill", d => getCategoryColor(d.category))
      .attr("stroke", "#1a202c")
      .attr("stroke-width", 2)
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.3))")
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        // Highlight this bar
        d3.select(this)
          .transition()
          .duration(200)
          .style("opacity", 1)
          .attr("stroke-width", 3);
        
        // Dim other bars
        bars.filter(data => data.category !== d.category)
          .transition()
          .duration(200)
          .style("opacity", 0.3);
        
        // Dispatch custom event for cross-chart communication
        document.dispatchEvent(new CustomEvent('categoryHover', {
          detail: { category: d.category, source: 'bar' }
        }));
      })
      .on("mouseout", function() {
        // Reset all bars
        bars
          .transition()
          .duration(200)
          .style("opacity", 1)
          .attr("stroke-width", 2);
        
        // Dispatch custom event for cross-chart communication
        document.dispatchEvent(new CustomEvent('categoryHoverEnd', {
          detail: { source: 'bar' }
        }));
      })
      .on("click", function(_, d) {
        if (onCategoryClick) {
          onCategoryClick(d.category);
        }
      });

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

    // Listen for cross-chart events
    const handleCategoryHover = (event) => {
      if (event.detail.source === 'bar') return; // Ignore events from this chart
      
      const category = event.detail.category;
      
      // Highlight matching bar, dim others
      bars.style("opacity", d => d.category === category ? 1 : 0.3)
          .attr("stroke-width", d => d.category === category ? 3 : 2);
    };

    const handleCategoryHoverEnd = (event) => {
      if (event.detail.source === 'bar') return; // Ignore events from this chart
      
      // Reset all bars
      bars.style("opacity", 1)
          .attr("stroke-width", 2);
    };

    document.addEventListener('categoryHover', handleCategoryHover);
    document.addEventListener('categoryHoverEnd', handleCategoryHoverEnd);

    // Cleanup function
    return () => {
      document.removeEventListener('categoryHover', handleCategoryHover);
      document.removeEventListener('categoryHoverEnd', handleCategoryHoverEnd);
    };

  }, [data, period]);

  return <svg ref={svgRef}></svg>;
};

export default BarChart;