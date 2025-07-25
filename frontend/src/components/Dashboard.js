import React from 'react';
import BarChart from './BarChart';
import PieChart from './PieChart';
import LineChart from './LineChart';
import SummaryCards from './SummaryCards';

const Dashboard = ({ transactions, rawTransactions, categories, summary, period }) => {
  const getTimeframeName = () => {
    switch(period) {
      case 'monthly': return 'Daily';
      case 'quarterly': return 'Monthly'; 
      case 'ytd': return 'Quarterly';
      default: return 'Time';
    }
  };

  return (
    <div className="dashboard">
      <SummaryCards summary={summary} />
      
      {/* Line Chart at the top */}
      <div className="chart-section line-chart-section">
        <h2>Spending Trend - {getTimeframeName()}</h2>
        <LineChart data={rawTransactions} period={period} />
      </div>
      
      <div className="charts-container">
        <div className="chart-section">
          <h2>Spending by Category</h2>
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