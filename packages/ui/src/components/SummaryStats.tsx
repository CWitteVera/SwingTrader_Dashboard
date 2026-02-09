import type { Summary } from '../types';

interface SummaryStatsProps {
  summary: Summary;
}

export function SummaryStats({ summary }: SummaryStatsProps) {
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;
  const formatDollar = (value: number) => `$${value.toFixed(2)}`;
  const formatNumber = (value: number) => value.toFixed(2);

  return (
    <div className="summary-stats">
      <h2>Backtest Summary</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Trades</div>
          <div className="stat-value">{summary.totalTrades}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Win Rate</div>
          <div className="stat-value">{formatPercent(summary.winRate)}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Total Return</div>
          <div className={`stat-value ${summary.totalReturn >= 0 ? 'positive' : 'negative'}`}>
            {formatDollar(summary.totalReturn)} ({formatPercent(summary.totalReturnPercent)})
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Max Drawdown</div>
          <div className="stat-value negative">
            {formatDollar(summary.maxDrawdown)} ({formatPercent(summary.maxDrawdownPercent)})
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Profit Factor</div>
          <div className="stat-value">{formatNumber(summary.profitFactor)}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Sharpe Ratio</div>
          <div className="stat-value">{formatNumber(summary.sharpeRatio)}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Average Win</div>
          <div className="stat-value positive">{formatDollar(summary.averageWin)}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Average Loss</div>
          <div className="stat-value negative">{formatDollar(summary.averageLoss)}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Winning Trades</div>
          <div className="stat-value">{summary.winningTrades}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Losing Trades</div>
          <div className="stat-value">{summary.losingTrades}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Avg Days Held</div>
          <div className="stat-value">{summary.averageDaysHeld.toFixed(1)}</div>
        </div>
      </div>
    </div>
  );
}
