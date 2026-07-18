import React from 'react';
import BarChart from './BarChart';
import LineChart from './LineChart';
import SummaryCards from './SummaryCards';
import TransactionTable from './TransactionTable';
import BudgetOverviewPanel from './BudgetOverviewPanel';
import RecurringChargesPanel from './RecurringChargesPanel';

const Dashboard = ({
  transactions,
  rawTransactions,
  categories,
  categoryLimits,
  summary,
  overview,
  recurring,
  period,
  month,
  year,
  onCategoryClick,
  selectedCategory,
  categoryTransactions,
  selectedDate,
  dateTransactions,
  onDateClick,
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
      <SummaryCards summary={summary} overview={overview} />

      {/* Budget vs Actual panel */}
      <BudgetOverviewPanel overview={overview} onCategoryClick={onCategoryClick} />

      {/* Line Chart at the top */}
      <div className="chart-section line-chart-section">
        <h2>Spending Trend - {getTimeframeName()}</h2>
        <LineChart
          data={rawTransactions}
          period={period}
          onDateClick={onDateClick}
          month={month}
          year={year}
          periodBudget={overview?.totals?.total_limit || 0}
        />
      </div>

      {/* Transaction Table Section - For Date */}
      {selectedDate && (
        <TransactionTable
          transactions={dateTransactions}
          category={selectedDate}
          limitInfo={null} // Don't show limit info for date views
          onClose={() => onDateClick(null)} // Call the handler with null to clear
          onTransactionUpdate={onTransactionUpdate}
        />
      )}

      {/* Bar Chart - Full Width */}
      <div className="chart-section">
        <h2>Spending by Category</h2>
        <BarChart data={transactions} period={period} categoryLimits={categoryLimits} onCategoryClick={onCategoryClick} />
      </div>

      {/* Transaction Table Section - For Category */}
      {selectedCategory && (
        <TransactionTable
          transactions={categoryTransactions}
          category={selectedCategory}
          limitInfo={categoryLimitInfo}
          onClose={onCloseTransactionTable}
          onTransactionUpdate={onTransactionUpdate}
        />
      )}

      {/* Recurring charges / subscriptions */}
      <RecurringChargesPanel
        recurring={recurring?.recurring}
        estimatedTotal={recurring?.estimated_monthly_total}
      />


      {loadingTransactions && (
        <div className="loading">Loading transactions...</div>
      )}
    </div>
  );
};

export default Dashboard;
