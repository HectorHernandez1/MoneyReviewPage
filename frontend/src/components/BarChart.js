import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const BarChart = ({ data, period }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 80, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    let aggregatedData;
    if (period === 'monthly') {
      // For monthly view, show spending by category
      aggregatedData = d3.rollup(
        data,
        v => d3.sum(v, d => d.amount),
        d => d.spending_category
      );
      aggregatedData = Array.from(aggregatedData, ([key, value]) => ({
        category: key,
        amount: value
      }));
    } else {
      // For quarterly and YTD views, show spending by time period
      aggregatedData = d3.rollup(
        data,
        v => d3.sum(v, d => d.amount),
        d => d.period
      );
      aggregatedData = Array.from(aggregatedData, ([key, value]) => ({
        period: key,
        amount: value
      }));
    }

    const xScale = d3.scaleBand()
      .domain(aggregatedData.map(d => period === 'monthly' ? d.category : d.period))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(aggregatedData, d => d.amount)])
      .range([height, 0]);

    g.selectAll(".bar")
      .data(aggregatedData)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(period === 'monthly' ? d.category : d.period))
      .attr("width", xScale.bandwidth())
      .attr("y", d => yScale(d.amount))
      .attr("height", d => height - yScale(d.amount))
      .attr("fill", "#4299e1");

    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");

    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale).tickFormat(d => `$${d3.format(",.0f")(d)}`));

  }, [data, period]);

  return <svg ref={svgRef}></svg>;
};

export default BarChart;