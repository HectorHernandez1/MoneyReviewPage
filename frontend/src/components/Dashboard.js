import React, { useState } from 'react';
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
  onTransactionUpdate,
  onAskAI
}) => {
  const [activeTab, setActiveTab] = useState('Overview');

  const recurringCount = recurring?.recurring?.length || 0;

  const drawerOpen = Boolean(selectedCategory || selectedDate);
  const closeDrawer = () => {
    if (selectedCategory) onCloseTransactionTable();
    if (selectedDate) onDateClick(null);
  };

  return (
    <div className="dashboard">
      {/* Status strip — visible on every tab */}
      <SummaryCards summary={summary} overview={overview} />

      <div className="dashboard-tabs">
        <button
          className={activeTab === 'Overview' ? 'active' : ''}
          onClick={() => setActiveTab('Overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'Spending' ? 'active' : ''}
          onClick={() => setActiveTab('Spending')}
        >
          Spending
        </button>
        <button
          className={activeTab === 'Subscriptions' ? 'active' : ''}
          onClick={() => setActiveTab('Subscriptions')}
        >
          Subscriptions
          {recurringCount > 0 && <span className="tab-count">{recurringCount}</span>}
        </button>
      </div>

      {activeTab === 'Overview' && (
        <div className="overview-grid">
          <BudgetOverviewPanel
            overview={overview}
            onCategoryClick={onCategoryClick}
            onAskAI={onAskAI}
            compact
          />
          <div className="chart-section line-chart-section">
            <h2>Spending Trend</h2>
            <LineChart
              data={rawTransactions}
              period={period}
              onDateClick={onDateClick}
              month={month}
              year={year}
              periodBudget={overview?.totals?.total_limit || 0}
              defaultView="cumulative"
            />
          </div>
        </div>
      )}

      {activeTab === 'Spending' && (
        <>
          <div className="chart-section">
            <h2>Spending by Category</h2>
            <BarChart data={transactions} period={period} categoryLimits={categoryLimits} onCategoryClick={onCategoryClick} />
          </div>
          <div className="chart-section line-chart-section">
            <h2>Spending Trend</h2>
            <LineChart
              data={rawTransactions}
              period={period}
              onDateClick={onDateClick}
              month={month}
              year={year}
              periodBudget={overview?.totals?.total_limit || 0}
            />
          </div>
        </>
      )}

      {activeTab === 'Subscriptions' && (
        <RecurringChargesPanel
          recurring={recurring?.recurring}
          estimatedTotal={recurring?.estimated_monthly_total}
          defaultExpanded
        />
      )}

      {/* Transactions slide in from the right instead of reflowing the page */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={closeDrawer}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            {selectedCategory ? (
              <TransactionTable
                transactions={categoryTransactions}
                category={selectedCategory}
                limitInfo={categoryLimitInfo}
                onClose={closeDrawer}
                onTransactionUpdate={onTransactionUpdate}
              />
            ) : (
              <TransactionTable
                transactions={dateTransactions}
                category={selectedDate}
                limitInfo={null}
                onClose={closeDrawer}
                onTransactionUpdate={onTransactionUpdate}
              />
            )}
          </div>
        </div>
      )}

      {loadingTransactions && (
        <div className="loading">Loading transactions...</div>
      )}
    </div>
  );
};

export default Dashboard;
