import React from 'react';

const SummaryCards = ({ summary }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount) || 0);
  };

  const getPeriodLabel = (period) => {
    switch(period) {
      case 'monthly': return 'This Month';
      case 'quarterly': return 'This Quarter';
      case 'yearly': return 'Yearly';
      default: return period;
    }
  };

  return (
    <div className="summary-cards">
      <div className="summary-card">
        <h3>Total Spent - {getPeriodLabel(summary.period)}</h3>
        <div className="amount">{formatCurrency(summary.total_amount)}</div>
      </div>
      
      <div className="summary-card">
        <h3>Transactions</h3>
        <div className="count">{summary.transaction_count || 0}</div>
      </div>
      
      <div className="summary-card">
        <h3>Period</h3>
        <div className="period">{summary.period} {summary.year}</div>
      </div>
    </div>
  );
};

export default SummaryCards;