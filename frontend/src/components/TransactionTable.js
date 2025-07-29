import React from 'react';

const TransactionTable = ({ transactions, category, onClose }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="transaction-table-container">
        <div className="transaction-table-header">
          <h3>Transactions for "{category}"</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="no-transactions">
          No transactions found for this category.
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount));
  };

  return (
    <div className="transaction-table-container">
      <div className="transaction-table-header">
        <h3>Transactions for "{category}" ({transactions.length} transactions)</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      {/* Show notice when using mock data */}
      {transactions.some(t => t.description?.includes('Sample transaction')) && (
        <div className="mock-data-notice">
          <strong>Note:</strong> Backend endpoint not implemented yet. Showing sample data for demonstration.
        </div>
      )}
      
      <div className="transaction-table-wrapper">
        <table className="transaction-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction, index) => (
              <tr key={index}>
                <td>{formatDate(transaction.transaction_date)}</td>
                <td className="description">{transaction.description}</td>
                <td className="amount">{formatAmount(transaction.amount)}</td>
                <td className="user">{transaction.user_name || 'Unknown'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;