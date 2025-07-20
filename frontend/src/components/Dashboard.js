import React from 'react';
import BarChart from './BarChart';
import PieChart from './PieChart';
import SummaryCards from './SummaryCards';

const Dashboard = ({ transactions, categories, summary, period }) => {
  return (
    <div className="dashboard">
      <SummaryCards summary={summary} />
      
      <div className="charts-container">
        <div className="chart-section">
          <h2>Spending by {period === 'ytd' ? 'Category' : 'Period'}</h2>
          <BarChart data={transactions} period={period} />
        </div>
        
        <div className="chart-section">
          <h2>Category Breakdown</h2>
          <PieChart data={categories} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;