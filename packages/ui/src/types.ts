export interface Trade {
  entryDate: string;
  exitDate: string;
  ticker: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  shares: number;
  pnl: number;
  pnlPercent: number;
  daysHeld: number;
  exitReason: string;
}

export interface Position {
  ticker: string;
  direction: 'LONG' | 'SHORT';
  shares: number;
  entryPrice: number;
  stopLoss: number;
  daysHeld: number;
}

export interface EquityPoint {
  date: string;
  cash: number;
  equity: number;
  unsettledCash: number;
  position: Position | null;
}

export interface Summary {
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
}

export interface BacktestResults {
  summary: Summary;
  trades: Trade[];
  equityCurve: EquityPoint[];
}
