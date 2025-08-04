import React from 'react';
import BarChart from './BarChart';
import PieChart from './PieChart';
import LineChart from './LineChart';
import SummaryCards from './SummaryCards';
import TransactionTable from './TransactionTable';

const Dashboard = ({ 
  transactions, 
  rawTransactions, 
  categories, 
  summary, 
  period, 
  onCategoryClick,
  selectedCategory,
  categoryTransactions,
  loadingTransactions,
  onCloseTransactionTable
}) => {
  const getTimeframeName = () => {
    switch(period) {
      case 'monthly': return 'Daily';
      case 'yearly': return 'Monthly';
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
          <BarChart data={transactions} period={period} onCategoryClick={onCategoryClick} />
        </div>
        
        <div className="chart-section">
          <h2>Category Breakdown</h2>
          <PieChart data={categories} onCategoryClick={onCategoryClick} />
        </div>
      </div>
      
      {/* Transaction Table Section */}
      {selectedCategory && (
        <TransactionTable 
          transactions={categoryTransactions}
          category={selectedCategory}
          onClose={onCloseTransactionTable}
        />
      )}
      
      {loadingTransactions && (
        <div className="loading">Loading transactions...</div>
      )}
    </div>
  );
};

export default Dashboard;