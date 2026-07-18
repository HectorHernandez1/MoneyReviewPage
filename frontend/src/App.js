import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import FilterPanel from './components/FilterPanel';
import CategoryManagement from './components/CategoryManagement';
import ChatBot from './components/ChatBot';
import './App.css';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/budget/api' : 'http://localhost:8000';

// Stamped into the build by the deploy scripts (REACT_APP_GIT_SHA); a
// production build without a stamp is a broken deploy, not a quiet default
const IS_PROD_BUILD = process.env.NODE_ENV === 'production';
const UI_VERSION = process.env.REACT_APP_GIT_SHA || (IS_PROD_BUILD ? 'unknown' : 'dev');
const UI_BUILD_TIME = process.env.REACT_APP_BUILD_TIME || '';

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
  const [categoryLimits, setCategoryLimits] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryTransactions, setCategoryTransactions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateTransactions, setDateTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [categoryLimitInfo, setCategoryLimitInfo] = useState(null);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [overview, setOverview] = useState(null);
  const [recurring, setRecurring] = useState(null);
  const [apiVersion, setApiVersion] = useState(null);
  const fetchInProgress = useRef(false);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/version`)
      .then(res => setApiVersion(res.data))
      .catch(() => setApiVersion(null));
  }, []);

  // Show the deployed version in the browser tab as well
  useEffect(() => {
    document.title = `Budget Dashboard · ${UI_VERSION}`;
  }, []);

  // Non-null when the deployed versions can't be trusted; shown in the
  // header badge and footer. Quiet in dev builds.
  const versionProblem = (() => {
    if (!IS_PROD_BUILD || !apiVersion) return null;
    if (UI_VERSION === 'unknown' || apiVersion.version === 'unknown') return 'version unavailable';
    if (apiVersion.version !== UI_VERSION) return 'version mismatch';
    return null;
  })();

  const versionHelp = {
    'version unavailable': 'The deploy did not stamp a version — deploy with ./manage-production.sh update or ./deploy-production.sh so VERSION is written and baked into the build',
    'version mismatch': 'Frontend and backend are running different commits — rebuild the frontend or restart the backend (pm2 restart budget-backend)',
  };

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
      setSelectedDate(null);
      setDateTransactions([]);
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

      const recurringParams = new URLSearchParams({ user });

      const [transactionsRes, categoriesRes, rawTransactionsRes, limitsRes, overviewRes, recurringRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/transactions?${params.toString()}`),
        axios.get(`${API_BASE_URL}/categories?${params.toString()}`),
        axios.get(`${API_BASE_URL}/raw-transactions?${params.toString()}`),
        axios.get(`${API_BASE_URL}/categories-with-limits`),
        axios.get(`${API_BASE_URL}/budget-overview?${params.toString()}`),
        axios.get(`${API_BASE_URL}/recurring-charges?${recurringParams.toString()}`)
      ]);

      setTransactions(transactionsRes.data.data);
      setSummary(transactionsRes.data.summary);
      setCategories(categoriesRes.data.categories);
      setRawTransactions(rawTransactionsRes.data.data);
      setCategoryLimits(limitsRes.data.categories || []);
      setOverview(overviewRes.data);
      setRecurring(recurringRes.data);
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

  const handleDateClick = (dateStr) => {
    if (!dateStr) {
      // Clear date selection
      setSelectedDate(null);
      setDateTransactions([]);
      return;
    }

    // Filter rawTransactions
    const filtered = rawTransactions.filter(t => {
      // transaction_date is usually "YYYY-MM-DD" or similar
      const tDate = String(t.transaction_date).split('T')[0];
      return tDate.startsWith(dateStr);
    });

    setDateTransactions(filtered);
    setSelectedDate(dateStr);
  };

  const handleCloseTransactionTable = () => {
    setSelectedCategory(null);
    setCategoryTransactions([]);
    setCategoryLimitInfo(null);
  };

  const handleTransactionUpdate = () => {
    // Refresh the category transactions after an update
    if (selectedCategory) {
      fetchCategoryTransactions(selectedCategory);
    }
    // Also refresh the main data to update the charts
    fetchData();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>
          Budget Dashboard
          <span
            className={`app-version-badge${versionProblem ? ' badge-warn' : ''}`}
            title={versionProblem
              ? `⚠ ${versionProblem} — ${versionHelp[versionProblem]}`
              : `${UI_BUILD_TIME ? `built ${UI_BUILD_TIME}` : 'app version'}${apiVersion ? ` · API ${apiVersion.version}` : ''}`}
          >
            {versionProblem ? `⚠ ${UI_VERSION}` : UI_VERSION}
          </span>
        </h1>
        <div className="header-actions">
          <button
            className="manage-categories-btn"
            onClick={() => setShowCategoryManagement(true)}
            title="Manage Categories"
          >
            ⚙️ Manage Categories
          </button>
          <div className="user-display">
            <span className="user-label">Viewing data for:</span>
            <span className="user-name">
              {user === 'all' ? 'All Users' : user}
            </span>
          </div>
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
                  categoryLimits={categoryLimits}
                  summary={summary}
                  overview={overview}
                  recurring={recurring}
                  period={period}
                  month={month}
                  year={year}
                  onCategoryClick={handleCategoryClick}
                  selectedCategory={selectedCategory}
                  categoryTransactions={categoryTransactions}
                  selectedDate={selectedDate}
                  dateTransactions={dateTransactions}
                  onDateClick={handleDateClick}
                  loadingTransactions={loadingTransactions}
                  onCloseTransactionTable={handleCloseTransactionTable}
                  categoryLimitInfo={categoryLimitInfo}
                  onTransactionUpdate={handleTransactionUpdate}
                />
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <span>UI {UI_VERSION}{UI_BUILD_TIME ? ` · built ${UI_BUILD_TIME}` : ''}</span>
        <span className="footer-divider">|</span>
        {apiVersion ? (
          <span>API {apiVersion.version} · up since {apiVersion.started_at}</span>
        ) : (
          <span>API unreachable</span>
        )}
        {versionProblem && (
          <span className="footer-mismatch" title={versionHelp[versionProblem]}>
            ⚠ {versionProblem}
          </span>
        )}
      </footer>

      {showCategoryManagement && (
        <CategoryManagement onClose={() => setShowCategoryManagement(false)} />
      )}

      <ChatBot filters={{ period, year, month, user }} />
    </div>
  );
}

export default App;
