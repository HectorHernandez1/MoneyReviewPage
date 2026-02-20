import React from 'react';
import BarChart from './BarChart';
import LineChart from './LineChart';
import SummaryCards from './SummaryCards';
import TransactionTable from './TransactionTable';

const Dashboard = ({
  transactions,
  rawTransactions,
  categories,
  categoryLimits,
  summary,
  period,
  onCategoryClick,
  selectedCategory,
  categoryTransactions,
  loadingTransactions,
  onCloseTransactionTable,
  categoryLimitInfo,
  onTransactionUpdate
}) => {
  const getTimeframeName = () => {
    switch (period) {
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

      {/* Bar Chart - Full Width */}
      <div className="chart-section">
        <h2>Spending by Category</h2>
        <BarChart data={transactions} period={period} categoryLimits={categoryLimits} onCategoryClick={onCategoryClick} />
      </div>

      {/* Transaction Table Section */}
      {selectedCategory && (
        <TransactionTable
          transactions={categoryTransactions}
          category={selectedCategory}
          limitInfo={categoryLimitInfo}
          onClose={onCloseTransactionTable}
          onTransactionUpdate={onTransactionUpdate}
        />
      )}

      {loadingTransactions && (
        <div className="loading">Loading transactions...</div>
      )}
    </div>
  );
};

export default Dashboard;
