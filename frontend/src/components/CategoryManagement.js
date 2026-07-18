import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? '/budget/api'
    : 'http://localhost:8000';

const CategoryManagement = ({ onClose }) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryLimit, setNewCategoryLimit] = useState('0');
    const [successMessage, setSuccessMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [suggestions, setSuggestions] = useState({});

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const [catRes, suggRes] = await Promise.all([
                fetch(`${API_BASE_URL}/categories-with-limits`),
                fetch(`${API_BASE_URL}/category-suggested-limits`)
            ]);
            const data = await catRes.json();
            setCategories(data.categories || []);

            const suggData = await suggRes.json();
            const byCategory = {};
            (suggData.suggestions || []).forEach(s => {
                byCategory[s.category.toLowerCase()] = s;
            });
            setSuggestions(byCategory);
        } catch (error) {
            console.error('Error fetching categories:', error);
            showError('Failed to load categories');
        }
        setLoading(false);
    };

    // Round the recent average up to the nearest $10 for a realistic limit
    const suggestedLimitFor = (categoryName) => {
        const s = suggestions[categoryName.toLowerCase()];
        if (!s || !s.avg_monthly_spend) return null;
        return Math.ceil(parseFloat(s.avg_monthly_spend) / 10) * 10;
    };

    const handleEditClick = (category) => {
        setEditingCategory(category.category_name);
        setEditValue(category.spending_limit.toString());
    };

    const handleCancelEdit = () => {
        setEditingCategory(null);
        setEditValue('');
    };

    const handleSaveEdit = async (categoryName) => {
        const newLimit = parseFloat(editValue);

        if (isNaN(newLimit) || newLimit < 0) {
            showError('Please enter a valid positive number');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/category/limit`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    category_name: categoryName,
                    new_limit: newLimit,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update limit');
            }

            showSuccess('Category limit updated successfully');
            setEditingCategory(null);
            setEditValue('');
            fetchCategories();
        } catch (error) {
            console.error('Error updating limit:', error);
            showError('Failed to update category limit');
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();

        const limit = parseFloat(newCategoryLimit);

        if (!newCategoryName.trim()) {
            showError('Category name cannot be empty');
            return;
        }

        if (isNaN(limit) || limit < 0) {
            showError('Please enter a valid positive number for the limit');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/category`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    category_name: newCategoryName.trim(),
                    spending_limit: limit,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to add category');
            }

            showSuccess('Category added successfully');
            setShowAddForm(false);
            setNewCategoryName('');
            setNewCategoryLimit('0');
            fetchCategories();
        } catch (error) {
            console.error('Error adding category:', error);
            showError(error.message || 'Failed to add category');
        }
    };

    const showSuccess = (message) => {
        setSuccessMessage(message);
        setErrorMessage(null);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const showError = (message) => {
        setErrorMessage(message);
        setSuccessMessage(null);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    return (
        <div className="category-management-overlay" onClick={onClose}>
            <div className="category-management-container" onClick={(e) => e.stopPropagation()}>
                <div className="category-management-header">
                    <h2>Manage Categories</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                {successMessage && (
                    <div className="success-message">{successMessage}</div>
                )}

                {errorMessage && (
                    <div className="error-message">{errorMessage}</div>
                )}

                <div className="category-management-body">
                    {loading ? (
                        <div className="loading">Loading categories...</div>
                    ) : (
                        <>
                            <div className="category-table-wrapper">
                                <table className="category-table">
                                    <thead>
                                        <tr>
                                            <th>Category Name</th>
                                            <th>Spending Limit</th>
                                            <th>Avg / Month</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categories.map((category) => (
                                            <tr key={category.category_name}>
                                                <td className="category-name">{category.category_name}</td>
                                                <td className="category-limit">
                                                    {editingCategory === category.category_name ? (
                                                        <input
                                                            type="number"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            className="limit-input"
                                                            min="0"
                                                            step="0.01"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        formatCurrency(category.spending_limit)
                                                    )}
                                                </td>
                                                <td className="category-avg">
                                                    {(() => {
                                                        const s = suggestions[category.category_name.toLowerCase()];
                                                        if (!s) return <span className="no-avg">—</span>;
                                                        return (
                                                            <span title={`Average over ${s.months_with_spending} recent month(s) with spending; max month ${formatCurrency(s.max_monthly_spend)}`}>
                                                                {formatCurrency(s.avg_monthly_spend)}
                                                                {editingCategory === category.category_name && suggestedLimitFor(category.category_name) !== null && (
                                                                    <button
                                                                        type="button"
                                                                        className="use-suggested-btn"
                                                                        onClick={() => setEditValue(String(suggestedLimitFor(category.category_name)))}
                                                                        title="Set the limit to the recent average, rounded up to the nearest $10"
                                                                    >
                                                                        Use {formatCurrency(suggestedLimitFor(category.category_name))}
                                                                    </button>
                                                                )}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="category-actions">
                                                    {editingCategory === category.category_name ? (
                                                        <>
                                                            <button
                                                                className="save-btn"
                                                                onClick={() => handleSaveEdit(category.category_name)}
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                className="cancel-btn"
                                                                onClick={handleCancelEdit}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            className="edit-btn"
                                                            onClick={() => handleEditClick(category)}
                                                        >
                                                            Edit
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="add-category-section">
                                {!showAddForm ? (
                                    <button
                                        className="add-category-btn"
                                        onClick={() => setShowAddForm(true)}
                                    >
                                        + Add New Category
                                    </button>
                                ) : (
                                    <form className="add-category-form" onSubmit={handleAddCategory}>
                                        <h3>Add New Category</h3>
                                        <div className="form-group">
                                            <label htmlFor="category-name">Category Name:</label>
                                            <input
                                                id="category-name"
                                                type="text"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                placeholder="Enter category name"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="spending-limit">Spending Limit:</label>
                                            <input
                                                id="spending-limit"
                                                type="number"
                                                value={newCategoryLimit}
                                                onChange={(e) => setNewCategoryLimit(e.target.value)}
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                                required
                                            />
                                        </div>
                                        <div className="form-actions">
                                            <button type="submit" className="submit-btn">
                                                Add Category
                                            </button>
                                            <button
                                                type="button"
                                                className="cancel-btn"
                                                onClick={() => {
                                                    setShowAddForm(false);
                                                    setNewCategoryName('');
                                                    setNewCategoryLimit('0');
                                                    setErrorMessage(null);
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CategoryManagement;
