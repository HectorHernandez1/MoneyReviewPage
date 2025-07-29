import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import FilterPanel from './components/FilterPanel';
import './App.css';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [rawTransactions, setRawTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState('');
  const [quarter, setQuarter] = useState('');
  const [user, setUser] = useState('all');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryTransactions, setCategoryTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const fetchInProgress = useRef(false);

  useEffect(() => {
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;
    
    fetchData().finally(() => {
      fetchInProgress.current = false;
    });
  }, [period, year, month, quarter, user]);

  const handleFiltersChange = (filters) => {
    flushSync(() => {
      setPeriod(filters.period);
      setYear(filters.year);
      setUser(filters.user);
      setMonth(filters.month || '');
      setQuarter(filters.quarter || '');
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
      } else if (period === 'quarterly' && quarter) {
        params.append('quarter', quarter);
      } else if (period === 'ytd' && year) {
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
    try {
      const params = new URLSearchParams({
        category,
        period,
        user
      });
      
      if (period === 'monthly' && month) {
        params.append('month', month);
      } else if (period === 'quarterly' && quarter) {
        params.append('quarter', quarter);
      } else if (period === 'ytd' && year) {
        params.append('year', year);
      }
      
      const response = await axios.get(`${API_BASE_URL}/category-transactions?${params.toString()}`);
      setCategoryTransactions(response.data.transactions || []);
      setSelectedCategory(category);
    } catch (error) {
      console.error('Error fetching category transactions:', error);
      
      // If endpoint doesn't exist (404), provide helpful feedback
      if (error.response?.status === 404) {
        console.warn('Category transactions endpoint not implemented yet. Using mock data for demo.');
        // Set mock data for demonstration
        setCategoryTransactions([
          {
            transaction_date: '2024-01-15',
            description: `Sample transaction for ${category}`,
            amount: -50.00,
            user_name: user === 'all' ? 'Demo User' : user
          },
          {
            transaction_date: '2024-01-10',
            description: `Another ${category} transaction`,
            amount: -25.50,
            user_name: user === 'all' ? 'Demo User' : user
          }
        ]);
        setSelectedCategory(category);
      } else {
        // For other errors, show empty state
        setCategoryTransactions([]);
        setSelectedCategory(category);
      }
    }
    setLoadingTransactions(false);
  };

  const handleCategoryClick = (category) => {
    fetchCategoryTransactions(category);
  };

  const handleCloseTransactionTable = () => {
    setSelectedCategory(null);
    setCategoryTransactions([]);
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
              quarter={quarter}
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