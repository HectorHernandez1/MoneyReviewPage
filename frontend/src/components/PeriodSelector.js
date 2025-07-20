import React from 'react';

const PeriodSelector = ({ period, year, onPeriodChange, onYearChange }) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="period-selector">
      <div className="selector-group">
        <label htmlFor="period">Period:</label>
        <select 
          id="period"
          value={period} 
          onChange={(e) => onPeriodChange(e.target.value)}
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="ytd">Year to Date</option>
        </select>
      </div>
      
      <div className="selector-group">
        <label htmlFor="year">Year:</label>
        <select 
          id="year"
          value={year} 
          onChange={(e) => onYearChange(parseInt(e.target.value))}
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default PeriodSelector;