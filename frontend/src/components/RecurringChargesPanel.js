import React, { useState } from 'react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(Math.abs(amount) || 0);
};

const RecurringChargesPanel = ({ recurring, estimatedTotal }) => {
  const [expanded, setExpanded] = useState(false);

  if (!recurring || recurring.length === 0) return null;

  return (
    <div className="chart-section recurring-panel">
      <button className="recurring-header" onClick={() => setExpanded(!expanded)}>
        <h2>
          Recurring Charges
          <span className="recurring-count">{recurring.length}</span>
        </h2>
        <span className="recurring-summary">
          ~{formatCurrency(estimatedTotal)}/month in subscriptions & repeat bills
          <span className={`recurring-chevron ${expanded ? 'open' : ''}`}>▾</span>
        </span>
      </button>

      {expanded && (
        <div className="recurring-table-wrap">
          <table className="recurring-table">
            <thead>
              <tr>
                <th>Merchant</th>
                <th>Category</th>
                <th>Typical Amount</th>
                <th>Months Seen</th>
                <th>Last Charged</th>
              </tr>
            </thead>
            <tbody>
              {recurring.map((r, i) => (
                <tr key={i}>
                  <td>{r.merchant}</td>
                  <td>{r.category}</td>
                  <td>{formatCurrency(r.typical_amount)}</td>
                  <td>{r.distinct_months}</td>
                  <td>{r.last_charged ? String(r.last_charged).split('T')[0] : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="recurring-hint">
            Merchants charging a similar amount in 3+ different months over the last 6 months.
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringChargesPanel;
