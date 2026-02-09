export interface Candle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  entryDate: Date;
  entryPrice: number;
  shares: number;
  direction: 'LONG' | 'SHORT';
  ticker: string;
  stopLoss: number;
  daysHeld: number;
}

export interface Trade {
  entryDate: Date;
  exitDate: Date;
  ticker: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  shares: number;
  pnl: number;
  pnlPercent: number;
  exitReason: 'STOP_LOSS' | 'TIME_STOP' | 'SIGNAL_EXIT';
  daysHeld: number;
}

export interface BacktestConfig {
  initialCapital: number;
  biweeklyDeposit: number;
  bullETF: string;
  bearETF: string;
  maxPositions: 1;
  enablePDTGuard: boolean;
  cashSettlement: 'T+1' | 'T+0';
  riskPercentSmall: number;  // for positions < $1k
  riskPercentLarge: number;  // for positions >= $1k
  minRiskDollar: number;
  maxPositionSize: number;
  stopLossMultiplier: number;
  timeStopDays: number;
}

export interface AccountState {
  date: Date;
  cash: number;
  equity: number;
  position: Position | null;
  unsettledCash: number;
}

export interface BacktestResult {
  trades: Trade[];
  equityCurve: AccountState[];
  summary: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalReturn: number;
    totalReturnPercent: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    sharpeRatio: number;
    averageWin: number;
    averageLoss: number;
    profitFactor: number;
    averageDaysHeld: number;
  };
}

export interface MarketData {
  daily: Map<string, Candle[]>;
  hourly: Map<string, Candle[]>;
}
