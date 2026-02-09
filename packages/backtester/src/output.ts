import { writeFile } from 'fs/promises';
import { BacktestResult } from './types.js';

export class OutputGenerator {
  /**
   * Generate blotter CSV
   */
  static async generateBlotter(
    result: BacktestResult,
    outputPath: string
  ): Promise<void> {
    const header = 'Entry Date,Exit Date,Ticker,Direction,Entry Price,Exit Price,Shares,PnL,PnL %,Days Held,Exit Reason\n';
    
    const rows = result.trades.map((trade) => {
      return [
        trade.entryDate.toISOString(),
        trade.exitDate.toISOString(),
        trade.ticker,
        trade.direction,
        trade.entryPrice.toFixed(2),
        trade.exitPrice.toFixed(2),
        trade.shares.toFixed(4),
        trade.pnl.toFixed(2),
        trade.pnlPercent.toFixed(2),
        trade.daysHeld,
        trade.exitReason,
      ].join(',');
    });

    const csv = header + rows.join('\n');
    await writeFile(outputPath, csv, 'utf-8');
    console.log(`Blotter saved to ${outputPath}`);
  }

  /**
   * Generate summary JSON
   */
  static async generateSummary(
    result: BacktestResult,
    outputPath: string
  ): Promise<void> {
    const summary = {
      summary: result.summary,
      trades: result.trades.map((trade) => ({
        entryDate: trade.entryDate.toISOString(),
        exitDate: trade.exitDate.toISOString(),
        ticker: trade.ticker,
        direction: trade.direction,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        shares: trade.shares,
        pnl: trade.pnl,
        pnlPercent: trade.pnlPercent,
        daysHeld: trade.daysHeld,
        exitReason: trade.exitReason,
      })),
      equityCurve: result.equityCurve.map((state) => ({
        date: state.date.toISOString(),
        cash: state.cash,
        equity: state.equity,
        unsettledCash: state.unsettledCash,
        position: state.position ? {
          ticker: state.position.ticker,
          direction: state.position.direction,
          shares: state.position.shares,
          entryPrice: state.position.entryPrice,
          stopLoss: state.position.stopLoss,
          daysHeld: state.position.daysHeld,
        } : null,
      })),
    };

    const json = JSON.stringify(summary, null, 2);
    await writeFile(outputPath, json, 'utf-8');
    console.log(`Summary saved to ${outputPath}`);
  }

  /**
   * Print summary to console
   */
  static printSummary(result: BacktestResult): void {
    const s = result.summary;
    
    console.log('\n' + '='.repeat(60));
    console.log('BACKTEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Trades:        ${s.totalTrades}`);
    console.log(`Winning Trades:      ${s.winningTrades} (${s.winRate.toFixed(2)}%)`);
    console.log(`Losing Trades:       ${s.losingTrades}`);
    console.log(`Average Win:         $${s.averageWin.toFixed(2)}`);
    console.log(`Average Loss:        $${s.averageLoss.toFixed(2)}`);
    console.log(`Profit Factor:       ${s.profitFactor.toFixed(2)}`);
    console.log(`Average Days Held:   ${s.averageDaysHeld.toFixed(1)}`);
    console.log(`Total Return:        $${s.totalReturn.toFixed(2)} (${s.totalReturnPercent.toFixed(2)}%)`);
    console.log(`Max Drawdown:        $${s.maxDrawdown.toFixed(2)} (${s.maxDrawdownPercent.toFixed(2)}%)`);
    console.log(`Sharpe Ratio:        ${s.sharpeRatio.toFixed(2)}`);
    console.log('='.repeat(60) + '\n');
  }
}
