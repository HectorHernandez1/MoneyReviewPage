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

    g.selectAll(".bar")
      .data(categoryData)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.category))
      .attr("width", xScale.bandwidth())
      .attr("y", d => yScale(d.amount))
      .attr("height", d => height - yScale(d.amount))
      .attr("fill", "#60a5fa")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 1);

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