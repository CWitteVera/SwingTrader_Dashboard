import type { Trade } from '../types';

interface TradeBlotterProps {
  trades: Trade[];
}

export function TradeBlotter({ trades }: TradeBlotterProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;
  const formatDollar = (value: number) => `$${value.toFixed(2)}`;

  return (
    <div className="trade-blotter">
      <h2>Trade History</h2>
      {trades.length === 0 ? (
        <div className="no-trades">No trades executed</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Entry Date</th>
                <th>Exit Date</th>
                <th>Ticker</th>
                <th>Direction</th>
                <th>Entry Price</th>
                <th>Exit Price</th>
                <th>Shares</th>
                <th>P&L</th>
                <th>P&L %</th>
                <th>Days Held</th>
                <th>Exit Reason</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, idx) => (
                <tr key={idx} className={trade.pnl >= 0 ? 'winning-trade' : 'losing-trade'}>
                  <td>{formatDate(trade.entryDate)}</td>
                  <td>{formatDate(trade.exitDate)}</td>
                  <td>{trade.ticker}</td>
                  <td className={`direction ${trade.direction.toLowerCase()}`}>
                    {trade.direction}
                  </td>
                  <td>{formatDollar(trade.entryPrice)}</td>
                  <td>{formatDollar(trade.exitPrice)}</td>
                  <td>{trade.shares.toFixed(4)}</td>
                  <td className={trade.pnl >= 0 ? 'positive' : 'negative'}>
                    {formatDollar(trade.pnl)}
                  </td>
                  <td className={trade.pnlPercent >= 0 ? 'positive' : 'negative'}>
                    {formatPercent(trade.pnlPercent)}
                  </td>
                  <td>{trade.daysHeld}</td>
                  <td className="exit-reason">{trade.exitReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
