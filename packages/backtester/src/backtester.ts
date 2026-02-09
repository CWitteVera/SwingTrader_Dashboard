import {
  BacktestConfig,
  BacktestResult,
  MarketData,
  Position,
  Trade,
  AccountState,
  Candle,
} from './types.js';
import { Strategy } from './strategy.js';
import { DataLoader } from './dataLoader.js';

export class Backtester {
  private config: BacktestConfig;
  private marketData: MarketData;

  constructor(config: BacktestConfig, marketData: MarketData) {
    this.config = config;
    this.marketData = marketData;
  }

  /**
   * Run the backtest
   */
  run(): BacktestResult {
    const trades: Trade[] = [];
    const equityCurve: AccountState[] = [];

    let cash = this.config.initialCapital;
    let unsettledCash = 0;
    let position: Position | null = null;
    let lastExitDate: Date | null = null;
    let lastDepositDate: Date | null = null;

    // Get all unique dates from hourly data (primary timeframe for execution)
    const allDates = this.getAllUniqueDates();
    allDates.sort((a, b) => a.getTime() - b.getTime());

    console.log(`Starting backtest from ${allDates[0]} to ${allDates[allDates.length - 1]}`);
    console.log(`Initial capital: $${cash.toFixed(2)}`);

    for (let i = 0; i < allDates.length; i++) {
      const currentDate = allDates[i];

      // Process biweekly deposits (every 14 days)
      if (!lastDepositDate || this.getDaysDiff(lastDepositDate, currentDate) >= 14) {
        cash += this.config.biweeklyDeposit;
        lastDepositDate = currentDate;
      }

      // Settle cash (T+1)
      if (this.config.cashSettlement === 'T+1' && unsettledCash > 0) {
        if (lastExitDate && this.getDaysDiff(lastExitDate, currentDate) >= 1) {
          cash += unsettledCash;
          unsettledCash = 0;
        }
      }

      // Check for position exit
      if (position) {
        const exitInfo = this.checkExit(position, currentDate);
        
        if (exitInfo.shouldExit) {
          const trade = this.closePosition(position, currentDate, exitInfo.exitPrice, exitInfo.reason);
          trades.push(trade);
          
          if (this.config.cashSettlement === 'T+1') {
            unsettledCash += trade.shares * exitInfo.exitPrice;
          } else {
            cash += trade.shares * exitInfo.exitPrice;
          }
          
          lastExitDate = currentDate;
          position = null;
        } else {
          // Update days held
          position.daysHeld = this.getDaysDiff(position.entryDate, currentDate);
        }
      }

      // Check for new entry (only if no position and PDT guard passed)
      if (!position && this.canEnter(lastExitDate, currentDate)) {
        const entrySignal = this.checkEntrySignal(currentDate);
        
        if (entrySignal.canEnter) {
          position = this.openPosition(
            currentDate,
            entrySignal.ticker!,
            entrySignal.direction!,
            entrySignal.entryPrice!,
            cash
          );
          
          if (position) {
            cash -= position.shares * position.entryPrice;
          }
        }
      }

      // Record account state
      const equity = cash + unsettledCash + (position ? position.shares * this.getCurrentPrice(position.ticker, currentDate) : 0);
      equityCurve.push({
        date: currentDate,
        cash,
        equity,
        position: position ? { ...position } : null,
        unsettledCash,
      });
    }

    // Close any open position at the end
    if (position) {
      const finalDate = allDates[allDates.length - 1];
      const exitPrice = this.getCurrentPrice(position.ticker, finalDate);
      const trade = this.closePosition(position, finalDate, exitPrice, 'SIGNAL_EXIT');
      trades.push(trade);
    }

    const summary = this.calculateSummary(trades, equityCurve);

    return { trades, equityCurve, summary };
  }

  private getAllUniqueDates(): Date[] {
    const dates = new Set<number>();
    
    // Collect all hourly dates
    for (const candles of this.marketData.hourly.values()) {
      for (const candle of candles) {
        dates.add(candle.timestamp.getTime());
      }
    }
    
    return Array.from(dates).map((ts) => new Date(ts));
  }

  private getDaysDiff(date1: Date, date2: Date): number {
    return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
  }

  private canEnter(lastExitDate: Date | null, currentDate: Date): boolean {
    if (!this.config.enablePDTGuard) {
      return true;
    }
    
    // PDT guard: no same-day exit and entry
    if (!lastExitDate) {
      return true;
    }
    
    return this.getDaysDiff(lastExitDate, currentDate) > 0;
  }

  private checkEntrySignal(currentDate: Date): {
    canEnter: boolean;
    ticker?: string;
    direction?: 'LONG' | 'SHORT';
    entryPrice?: number;
  } {
    // Check bull ETF
    const bullDaily = DataLoader.getCandlesUpToDate(
      this.marketData.daily.get(this.config.bullETF) || [],
      currentDate
    );
    const bullHourly = DataLoader.getCandlesUpToDate(
      this.marketData.hourly.get(this.config.bullETF) || [],
      currentDate
    );

    const bullTrend = Strategy.checkDailyTrend(bullDaily);
    
    if (bullTrend.isBullish && Strategy.checkHourlyEntry(bullHourly)) {
      const currentCandle = bullHourly[bullHourly.length - 1];
      return {
        canEnter: true,
        ticker: this.config.bullETF,
        direction: 'LONG',
        entryPrice: currentCandle.close,
      };
    }

    // Check bear ETF
    const bearDaily = DataLoader.getCandlesUpToDate(
      this.marketData.daily.get(this.config.bearETF) || [],
      currentDate
    );
    const bearHourly = DataLoader.getCandlesUpToDate(
      this.marketData.hourly.get(this.config.bearETF) || [],
      currentDate
    );

    const bearTrend = Strategy.checkDailyTrend(bearDaily);
    
    if (bearTrend.isBearish && Strategy.checkHourlyEntry(bearHourly)) {
      const currentCandle = bearHourly[bearHourly.length - 1];
      return {
        canEnter: true,
        ticker: this.config.bearETF,
        direction: 'SHORT',
        entryPrice: currentCandle.close,
      };
    }

    return { canEnter: false };
  }

  private openPosition(
    date: Date,
    ticker: string,
    direction: 'LONG' | 'SHORT',
    entryPrice: number,
    availableCash: number
  ): Position | null {
    const dailyCandles = DataLoader.getCandlesUpToDate(
      this.marketData.daily.get(ticker) || [],
      date
    );

    if (dailyCandles.length === 0) {
      return null;
    }

    const stopLoss = Strategy.calculateStopLoss(
      dailyCandles,
      entryPrice,
      direction,
      this.config.stopLossMultiplier
    );

    const shares = Strategy.calculatePositionSize(
      availableCash,
      entryPrice,
      stopLoss,
      this.config.riskPercentSmall,
      this.config.riskPercentLarge,
      this.config.minRiskDollar,
      this.config.maxPositionSize
    );

    if (shares <= 0 || shares * entryPrice > availableCash) {
      return null;
    }

    console.log(
      `${date.toISOString()}: OPEN ${direction} ${shares.toFixed(4)} ${ticker} @ $${entryPrice.toFixed(2)}, SL: $${stopLoss.toFixed(2)}`
    );

    return {
      entryDate: date,
      entryPrice,
      shares,
      direction,
      ticker,
      stopLoss,
      daysHeld: 0,
    };
  }

  private checkExit(position: Position, currentDate: Date): {
    shouldExit: boolean;
    exitPrice: number;
    reason: 'STOP_LOSS' | 'TIME_STOP' | 'SIGNAL_EXIT';
  } {
    const currentPrice = this.getCurrentPrice(position.ticker, currentDate);

    // Check stop loss
    if (position.direction === 'LONG' && currentPrice <= position.stopLoss) {
      return { shouldExit: true, exitPrice: currentPrice, reason: 'STOP_LOSS' };
    }
    if (position.direction === 'SHORT' && currentPrice >= position.stopLoss) {
      return { shouldExit: true, exitPrice: currentPrice, reason: 'STOP_LOSS' };
    }

    // Check time stop
    if (position.daysHeld >= this.config.timeStopDays) {
      return { shouldExit: true, exitPrice: currentPrice, reason: 'TIME_STOP' };
    }

    return { shouldExit: false, exitPrice: currentPrice, reason: 'SIGNAL_EXIT' };
  }

  private closePosition(
    position: Position,
    exitDate: Date,
    exitPrice: number,
    exitReason: 'STOP_LOSS' | 'TIME_STOP' | 'SIGNAL_EXIT'
  ): Trade {
    const pnl = position.direction === 'LONG'
      ? (exitPrice - position.entryPrice) * position.shares
      : (position.entryPrice - exitPrice) * position.shares;

    const pnlPercent = position.direction === 'LONG'
      ? ((exitPrice - position.entryPrice) / position.entryPrice) * 100
      : ((position.entryPrice - exitPrice) / position.entryPrice) * 100;

    console.log(
      `${exitDate.toISOString()}: CLOSE ${position.direction} ${position.shares.toFixed(4)} ${position.ticker} @ $${exitPrice.toFixed(2)}, PnL: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%), Reason: ${exitReason}`
    );

    return {
      entryDate: position.entryDate,
      exitDate,
      ticker: position.ticker,
      direction: position.direction,
      entryPrice: position.entryPrice,
      exitPrice,
      shares: position.shares,
      pnl,
      pnlPercent,
      exitReason,
      daysHeld: position.daysHeld,
    };
  }

  private getCurrentPrice(ticker: string, date: Date): number {
    const hourlyCandles = this.marketData.hourly.get(ticker) || [];
    const candle = DataLoader.getCandleAtDate(hourlyCandles, date);
    return candle ? candle.close : 0;
  }

  private calculateSummary(trades: Trade[], equityCurve: AccountState[]) {
    const winningTrades = trades.filter((t) => t.pnl > 0);
    const losingTrades = trades.filter((t) => t.pnl < 0);

    const totalReturn = equityCurve.length > 0
      ? equityCurve[equityCurve.length - 1].equity - equityCurve[0].equity
      : 0;

    const totalReturnPercent = equityCurve.length > 0
      ? (totalReturn / equityCurve[0].equity) * 100
      : 0;

    const averageWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
      : 0;

    const averageLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length
      : 0;

    const profitFactor = losingTrades.length > 0 && averageLoss !== 0
      ? Math.abs(averageWin * winningTrades.length / (averageLoss * losingTrades.length))
      : 0;

    const averageDaysHeld = trades.length > 0
      ? trades.reduce((sum, t) => sum + t.daysHeld, 0) / trades.length
      : 0;

    // Calculate max drawdown
    let maxEquity = equityCurve[0]?.equity || 0;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;

    for (const state of equityCurve) {
      if (state.equity > maxEquity) {
        maxEquity = state.equity;
      }
      const drawdown = maxEquity - state.equity;
      const drawdownPercent = (drawdown / maxEquity) * 100;
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPercent;
      }
    }

    // Calculate Sharpe ratio (simplified)
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const ret = (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
      returns.push(ret);
    }

    const avgReturn = returns.length > 0
      ? returns.reduce((sum, r) => sum + r, 0) / returns.length
      : 0;

    const variance = returns.length > 0
      ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
      : 0;

    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev !== 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      totalReturn,
      totalReturnPercent,
      maxDrawdown,
      maxDrawdownPercent,
      sharpeRatio,
      averageWin,
      averageLoss,
      profitFactor,
      averageDaysHeld,
    };
  }
}
