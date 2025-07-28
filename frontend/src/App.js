import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchData();
  }, [period, year, month, quarter, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build query parameters based on selected period
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

  return (
    <div className="App">
      <header className="App-header">
        <h1>Budget Dashboard</h1>
      </header>
      
      <main className="App-main">
        <div className="app-layout">
          <aside className="sidebar">
            <FilterPanel 
              period={period}
              year={year}
              user={user}
              onPeriodChange={setPeriod}
              onYearChange={setYear}
              onMonthChange={setMonth}
              onQuarterChange={setQuarter}
              onUserChange={setUser}
            />
          </aside>
          
          <div className="content">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <Dashboard 
                transactions={transactions}
                rawTransactions={rawTransactions}
                categories={categories}
                summary={summary}
                period={period}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;