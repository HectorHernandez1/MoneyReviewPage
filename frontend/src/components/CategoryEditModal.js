import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? '/budget/api'
    : 'http://localhost:8000';

const CategoryEditModal = ({ transaction, onClose, onSuccess }) => {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(transaction.spending_category);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loadingCategories, setLoadingCategories] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/categories-list`);
            const data = await response.json();
            setCategories(data.categories || []);
            setLoadingCategories(false);
        } catch (err) {
            console.error('Error fetching categories:', err);
            setError('Failed to load categories');
            setLoadingCategories(false);
        }
    };

    const handleSave = async () => {
        if (selectedCategory === transaction.spending_category) {
            onClose();
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/transaction/category`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transaction_date: transaction.transaction_date,
                    merchant_name: transaction.merchant_name,
                    amount: transaction.amount,
                    person: transaction.person,
                    new_category: selectedCategory,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update category');
            }

            const data = await response.json();
            onSuccess(data.message || 'Category updated successfully');
        } catch (err) {
            console.error('Error updating category:', err);
            setError('Failed to update category. Please try again.');
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(Math.abs(amount));
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Edit Transaction Category</h3>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <div className="transaction-details">
                        <div className="detail-row">
                            <span className="detail-label">Date:</span>
                            <span className="detail-value">{formatDate(transaction.transaction_date)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Merchant:</span>
                            <span className="detail-value">{transaction.merchant_name}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Amount:</span>
                            <span className="detail-value">{formatCurrency(transaction.amount)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Person:</span>
                            <span className="detail-value">{transaction.person}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Account:</span>
                            <span className="detail-value">{transaction.account_type}</span>
                        </div>
                    </div>

                    <div className="category-selector">
                        <label htmlFor="category-select">Category:</label>
                        {loadingCategories ? (
                            <div className="loading-categories">Loading categories...</div>
                        ) : (
                            <select
                                id="category-select"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                disabled={loading}
                            >
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {error && <div className="error-message">{error}</div>}
                </div>

                <div className="modal-footer">
                    <button
                        className="cancel-button"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        className="save-button"
                        onClick={handleSave}
                        disabled={loading || loadingCategories || selectedCategory === transaction.spending_category}
                    >
                        {loading ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CategoryEditModal;
