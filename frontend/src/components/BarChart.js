import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getCategoryColor } from '../utils/colors';

const BarChart = ({ data, period, categoryLimits, onCategoryClick }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Get the container dimensions dynamically
    const container = svgRef.current.parentNode;
    const containerWidth = container.getBoundingClientRect().width;

    const margin = { top: 20, right: 30, bottom: 120, left: 60 };
    const width = containerWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    const g = svg
      .attr("width", "100%")
      .attr("height", height + margin.top + margin.bottom)
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Build a lookup for budget limits
    const limitsMap = {};
    if (categoryLimits && categoryLimits.length > 0) {
      categoryLimits.forEach(c => {
        if (c.spending_limit > 0) {
          limitsMap[c.category_name] = c.spending_limit;
        }
      });
    }

    // Always show spending by category regardless of time frame
    const aggregatedData = d3.rollup(
      data,
      v => d3.sum(v, d => Math.abs(d.amount)), // Use absolute value to avoid negative amounts
      d => d.spending_category
    );
    const categoryData = Array.from(aggregatedData, ([key, value]) => ({
      category: key,
      amount: value,
      limit: limitsMap[key] || null
    }))
      .sort((a, b) => b.amount - a.amount); // Sort from largest to smallest

    const xScale = d3.scaleBand()
      .domain(categoryData.map(d => d.category))
      .range([0, width])
      .padding(0.1);

    // Adjust yScale to include budget limits so markers aren't cut off
    const maxSpending = d3.max(categoryData, d => d.amount);
    const maxLimit = d3.max(categoryData, d => d.limit || 0);
    const yMax = Math.max(maxSpending, maxLimit) * 1.05;

    const yScale = d3.scaleLinear()
      .domain([0, yMax])
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
      .attr("fill", d => {
        // Color red/coral when over budget
        if (d.limit && d.amount > d.limit) {
          return "#ef4444";
        }
        return getCategoryColor(d.category);
      })
      .attr("stroke", "#1a202c")
      .attr("stroke-width", 2)
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.3))")
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
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

        // Dim other limit markers
        g.selectAll(".budget-limit-group")
          .transition()
          .duration(200)
          .style("opacity", function () {
            return d3.select(this).attr("data-category") === d.category ? 1 : 0.3;
          });

        // Dispatch custom event for cross-chart communication
        document.dispatchEvent(new CustomEvent('categoryHover', {
          detail: { category: d.category, source: 'bar' }
        }));
      })
      .on("mouseout", function () {
        // Reset all bars
        bars
          .transition()
          .duration(200)
          .style("opacity", 1)
          .attr("stroke-width", 2);

        // Reset all limit markers
        g.selectAll(".budget-limit-group")
          .transition()
          .duration(200)
          .style("opacity", 1);

        // Dispatch custom event for cross-chart communication
        document.dispatchEvent(new CustomEvent('categoryHoverEnd', {
          detail: { source: 'bar' }
        }));
      })
      .on("click", function (_, d) {
        if (onCategoryClick) {
          onCategoryClick(d.category);
        }
      });

    // Draw budget limit markers
    categoryData.forEach(d => {
      if (!d.limit) return;

      const x = xScale(d.category);
      const barWidth = xScale.bandwidth();
      const y = yScale(d.limit);

      const limitGroup = g.append("g")
        .attr("class", "budget-limit-group")
        .attr("data-category", d.category);

      // Dashed line across bar width
      limitGroup.append("line")
        .attr("x1", x - 4)
        .attr("x2", x + barWidth + 4)
        .attr("y1", y)
        .attr("y2", y)
        .attr("stroke", d.amount > d.limit ? "#fbbf24" : "#9ca3af")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "6,3");

      // Small label showing limit amount
      limitGroup.append("text")
        .attr("x", x + barWidth + 6)
        .attr("y", y + 4)
        .text(`$${d3.format(",.0f")(d.limit)}`)
        .style("fill", d.amount > d.limit ? "#fbbf24" : "#9ca3af")
        .style("font-size", "9px")
        .style("font-weight", "600");
    });

    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("text-anchor", "end")
      .style("fill", "#d1d5db")
      .style("font-size", "11px")
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

      // Also highlight/dim limit markers
      g.selectAll(".budget-limit-group")
        .style("opacity", function () {
          return d3.select(this).attr("data-category") === category ? 1 : 0.3;
        });
    };

    const handleCategoryHoverEnd = (event) => {
      if (event.detail.source === 'bar') return; // Ignore events from this chart

      // Reset all bars
      bars.style("opacity", 1)
        .attr("stroke-width", 2);

      // Reset all limit markers
      g.selectAll(".budget-limit-group")
        .style("opacity", 1);
    };

    document.addEventListener('categoryHover', handleCategoryHover);
    document.addEventListener('categoryHoverEnd', handleCategoryHoverEnd);

    // Add resize listener
    const handleResize = () => {
      if (!data || data.length === 0) return;
      // Re-render chart on window resize
      const container = svgRef.current.parentNode;
      const containerWidth = container.getBoundingClientRect().width;
      const margin = { top: 20, right: 30, bottom: 120, left: 60 };
      const width = containerWidth - margin.left - margin.right;

      svg.attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      document.removeEventListener('categoryHover', handleCategoryHover);
      document.removeEventListener('categoryHoverEnd', handleCategoryHoverEnd);
      window.removeEventListener('resize', handleResize);
    };

  }, [data, period, categoryLimits]);

  return <svg ref={svgRef} style={{ width: '100%', height: 'auto' }}></svg>;
};

export default BarChart;