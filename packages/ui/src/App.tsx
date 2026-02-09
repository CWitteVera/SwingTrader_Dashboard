import { useState, useEffect } from 'react';
import './App.css';
import { EquityCurveChart } from './components/EquityCurveChart';
import { SummaryStats } from './components/SummaryStats';
import { TradeBlotter } from './components/TradeBlotter';
import type { BacktestResults } from './types';

function App() {
  const [results, setResults] = useState<BacktestResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load backtest results from JSON file in public directory
    fetch('/output/summary.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load backtest results');
        }
        return response.json();
      })
      .then((data) => {
        setResults(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading backtest results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>Error Loading Results</h2>
          <p>{error}</p>
          <p>Please run the backtester first: <code>npm run backtest</code></p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="app">
        <div className="error">No results available</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Swing Trader Dashboard</h1>
        <p className="subtitle">Trend-Following Strategy Backtester</p>
      </header>

      <main className="app-main">
        <SummaryStats summary={results.summary} />
        <EquityCurveChart data={results.equityCurve} />
        <TradeBlotter trades={results.trades} />
      </main>

      <footer className="app-footer">
        <p>Powered by TradingView Lightweight Charts</p>
      </footer>
    </div>
  );
}

export default App;
