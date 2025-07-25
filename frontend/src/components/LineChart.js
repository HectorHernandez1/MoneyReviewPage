import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const LineChart = ({ data, period }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const margin = { top: 20, right: 30, bottom: 80, left: 60 };
      const width = 800 - margin.left - margin.right;
      const height = 300 - margin.top - margin.bottom;

      const g = svg
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Process data for line chart - simpler approach
      let processedData = [];
      
      if (period === 'monthly') {
        // Group by day for monthly view
        const dailyData = d3.rollup(
          data,
          v => d3.sum(v, d => Math.abs(d.amount)),
          d => {
            // Extract date from transaction_date, handle different formats
            let dateStr = d.transaction_date;
            if (typeof dateStr === 'string') {
              dateStr = dateStr.split('T')[0]; // Remove time part if present
            }
            return dateStr;
          }
        );
        
        processedData = Array.from(dailyData, ([dateStr, amount]) => ({
          date: new Date(dateStr),
          amount: amount,
          label: dateStr
        }));

      } else if (period === 'quarterly') {
        // Group by month for quarterly view
        const monthlyData = d3.rollup(
          data,
          v => d3.sum(v, d => Math.abs(d.amount)),
          d => {
            let dateStr = d.transaction_date;
            if (typeof dateStr === 'string') {
              dateStr = dateStr.split('T')[0];
            }
            const date = new Date(dateStr);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          }
        );
        
        processedData = Array.from(monthlyData, ([monthStr, amount]) => ({
          date: new Date(monthStr + '-01'),
          amount: amount,
          label: monthStr
        }));

      } else {
        // Group by quarter for yearly view
        const quarterlyData = d3.rollup(
          data,
          v => d3.sum(v, d => Math.abs(d.amount)),
          d => {
            let dateStr = d.transaction_date;
            if (typeof dateStr === 'string') {
              dateStr = dateStr.split('T')[0];
            }
            const date = new Date(dateStr);
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            return `${date.getFullYear()}-Q${quarter}`;
          }
        );
        
        processedData = Array.from(quarterlyData, ([quarterStr, amount]) => {
          const [year, q] = quarterStr.split('-Q');
          const quarterMonth = (parseInt(q) - 1) * 3;
          return {
            date: new Date(parseInt(year), quarterMonth, 1),
            amount: amount,
            label: quarterStr
          };
        });
      }

      // Sort by date
      processedData.sort((a, b) => a.date - b.date);

      if (processedData.length === 0) return;

      // Create scales
      const xScale = d3.scaleTime()
        .domain(d3.extent(processedData, d => d.date))
        .range([0, width]);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d.amount)])
        .range([height, 0]);

      // Create line generator - straight lines, no smoothing
      const line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.amount));

      // Add the line
      g.append("path")
        .datum(processedData)
        .attr("class", "line")
        .attr("d", line)
        .style("fill", "none")
        .style("stroke", "#60a5fa")
        .style("stroke-width", 3)
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.3))");

      // Add dots
      g.selectAll(".dot")
        .data(processedData)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.date))
        .attr("cy", d => yScale(d.amount))
        .attr("r", 4)
        .style("fill", "#60a5fa")
        .style("stroke", "#3b82f6")
        .style("stroke-width", 2)
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.3))")
        .style("cursor", "pointer");

      // Add x-axis with better formatting and fewer ticks
      let xAxisFormat, tickCount;
      
      if (period === 'monthly') {
        xAxisFormat = d3.timeFormat("%m/%d");
        tickCount = Math.min(processedData.length, 10); // Limit to 10 ticks max
      } else if (period === 'quarterly') {
        xAxisFormat = d3.timeFormat("%b %Y");
        tickCount = Math.min(processedData.length, 6); // Limit to 6 months max
      } else {
        // For yearly, use custom formatting to show Q1, Q2, etc.
        xAxisFormat = (d) => {
          const quarter = Math.floor(d.getMonth() / 3) + 1;
          return `Q${quarter} ${d.getFullYear()}`;
        };
        tickCount = processedData.length; // Show all quarters
      }

      g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
          .tickFormat(xAxisFormat)
          .ticks(tickCount)
        )
        .selectAll("text")
        .style("fill", "#d1d5db")
        .style("font-size", "12px")
        .style("text-anchor", "middle");

      g.select(".x-axis")
        .selectAll(".domain, .tick line")
        .style("stroke", "#4a5568");

      // Add y-axis with better tick spacing
      g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale)
          .tickFormat(d => `$${d3.format(",.0f")(d)}`)
          .ticks(6) // Limit to 6 ticks on y-axis
        )
        .selectAll("text")
        .style("fill", "#d1d5db")
        .style("font-size", "12px");

      g.select(".y-axis")
        .selectAll(".domain, .tick line")
        .style("stroke", "#4a5568");

    } catch (error) {
      console.error('Error rendering LineChart:', error);
      // Don't break the app, just log the error
    }

  }, [data, period]);

  return <svg ref={svgRef}></svg>;
};

export default LineChart;