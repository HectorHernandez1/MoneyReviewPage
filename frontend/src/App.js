import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import FilterPanel from './components/FilterPanel';
import './App.css';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/budget/api' : 'http://localhost:8000';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [rawTransactions, setRawTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState('');
  const [user, setUser] = useState('all');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryTransactions, setCategoryTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [categoryLimitInfo, setCategoryLimitInfo] = useState(null);
  const fetchInProgress = useRef(false);

  useEffect(() => {
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;
    
    fetchData().finally(() => {
      fetchInProgress.current = false;
    });
  }, [period, year, month, user]);

  const handleFiltersChange = (filters) => {
    flushSync(() => {
      setPeriod(filters.period);
      setYear(filters.year);
      setUser(filters.user);
      setMonth(filters.month || '');
      
      // Clear selected category and transaction table data to prevent stale data
      setSelectedCategory(null);
      setCategoryTransactions([]);
      setCategoryLimitInfo(null);
    });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        period,
        user
      });
      
      if (period === 'monthly' && month) {
        params.append('month', month);
      } else if (period === 'yearly' && year) {
        params.append('year', year);
      }
      
      const [transactionsRes, categoriesRes, rawTransactionsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/transactions?${params.toString()}`),
        axios.get(`${API_BASE_URL}/categories?${params.toString()}`),
        axios.get(`${API_BASE_URL}/raw-transactions?${params.toString()}`)
      ]);
      
      setTransactions(transactionsRes.data.data);
      setSummary(transactionsRes.data.summary);
      setCategories(categoriesRes.data.categories);
      setRawTransactions(rawTransactionsRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const fetchCategoryTransactions = async (category) => {
    setLoadingTransactions(true);
    setCategoryLimitInfo(null);
    try {
      const params = new URLSearchParams({
        category,
        period,
        user
      });
      
      if (period === 'monthly' && month) {
        params.append('month', month);
      } else if (period === 'yearly' && year) {
        params.append('year', year);
      }
      
      const response = await axios.get(`${API_BASE_URL}/category-transactions?${params.toString()}`);
      setCategoryTransactions(response.data.transactions || []);
      setCategoryLimitInfo(response.data.limit_info || null);
      setSelectedCategory(category);
    } catch (error) {
      console.error('Error fetching category transactions:', error);
      
      // For any error, show empty state
      setCategoryTransactions([]);
      setSelectedCategory(category);
      setCategoryLimitInfo(null);
    }
    setLoadingTransactions(false);
  };

  const handleCategoryClick = (category) => {
    fetchCategoryTransactions(category);
  };

  const handleCloseTransactionTable = () => {
    setSelectedCategory(null);
    setCategoryTransactions([]);
    setCategoryLimitInfo(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Budget Dashboard</h1>
        <div className="user-display">
          <span className="user-label">Viewing data for:</span>
          <span className="user-name">
            {user === 'all' ? 'All Users' : user}
          </span>
        </div>
      </header>
      
      <main className="App-main">
        <div className="app-layout">
          <aside className="sidebar">
            <FilterPanel 
              period={period}
              year={year}
              user={user}
              month={month}
              onFiltersChange={handleFiltersChange}
            />
          </aside>
          
          <div className="content">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <>
                <Dashboard 
                  transactions={transactions}
                  rawTransactions={rawTransactions}
                  categories={categories}
                  summary={summary}
                  period={period}
                  onCategoryClick={handleCategoryClick}
                  selectedCategory={selectedCategory}
                  categoryTransactions={categoryTransactions}
                  loadingTransactions={loadingTransactions}
                  onCloseTransactionTable={handleCloseTransactionTable}
                  categoryLimitInfo={categoryLimitInfo}
                />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
