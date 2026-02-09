# SwingTrader_Dashboard

TypeScript monorepo for a trend-following swing trading backtester with React UI and TradingView Lightweight Charts.

## Features

### Backtester Core (`packages/backtester`)
- **Strategy**: Trend-following swing trading system
- **Entry Logic**: D1 EMA20>50>200 (all rising) + ADX14≥20, H1 pullback below EMA20 then close above
- **Position Management**: 
  - 1 position maximum (long via bull ETF, short via inverse ETF)
  - No same-day exits (PDT guard enabled)
  - T+1 cash settlement
- **Risk Management**:
  - Stop Loss: 1.5 × ATR14 (D1)
  - Time Stop: 10 days maximum
  - Position Sizing: Min(2%, $25) risk for <$1k positions, 1% for ≥$1k
  - Max position size: $1000
  - Fractional shares supported
- **Capital Management**: Biweekly $100 deposits
- **Technical Indicators**: EMA, ADX, ATR (all custom implementations)
- **Data Input**: CSV files (D1/H1 timeframes)
- **Output**: Blotter CSV + Summary JSON

### UI Dashboard (`packages/ui`)
- **Framework**: Vite + React + TypeScript
- **Charts**: TradingView Lightweight Charts for equity curve visualization
- **Features**:
  - Interactive equity curve chart
  - Comprehensive summary statistics
  - Trade blotter table with detailed trade information
  - Responsive dark theme design

## Project Structure

```
SwingTrader_Dashboard/
├── packages/
│   ├── backtester/          # Node.js backtesting engine
│   │   ├── src/
│   │   │   ├── index.ts     # Main entry point
│   │   │   ├── backtester.ts # Core backtesting logic
│   │   │   ├── strategy.ts   # Trading strategy rules
│   │   │   ├── indicators.ts # Technical indicators (EMA, ADX, ATR)
│   │   │   ├── dataLoader.ts # CSV data loader
│   │   │   ├── output.ts     # Output generation
│   │   │   └── types.ts      # TypeScript types
│   │   └── package.json
│   └── ui/                   # React dashboard
│       ├── src/
│       │   ├── components/   # React components
│       │   │   ├── EquityCurveChart.tsx
│       │   │   ├── SummaryStats.tsx
│       │   │   └── TradeBlotter.tsx
│       │   ├── App.tsx       # Main app component
│       │   ├── types.ts      # TypeScript types
│       │   └── App.css       # Styling
│       └── package.json
├── data/                     # Market data CSV files
│   ├── SPXL_D1.csv          # Daily bull ETF data
│   ├── SPXL_H1.csv          # Hourly bull ETF data
│   ├── SPXS_D1.csv          # Daily bear ETF data
│   └── SPXS_H1.csv          # Hourly bear ETF data
├── output/                   # Backtest results
│   ├── blotter.csv          # Trade blotter
│   └── summary.json         # Summary statistics + equity curve
├── scripts/
│   └── generate_sample_data.js  # Generate sample CSV data
└── package.json             # Root workspace config

```

## Installation

```bash
# Install all dependencies
npm install

# Install backtester dependencies
cd packages/backtester && npm install

# Install UI dependencies
cd packages/ui && npm install
```

## Usage

### 1. Generate Sample Data (Optional)

```bash
node scripts/generate_sample_data.js
```

This creates sample CSV files in the `data/` directory:
- `SPXL_D1.csv` / `SPXL_H1.csv` - Bull ETF (3x S&P 500)
- `SPXS_D1.csv` / `SPXS_H1.csv` - Bear ETF (3x Inverse S&P 500)

### 2. Run Backtester

```bash
# From root directory
npm run backtest

# Or directly
cd packages/backtester
npm run build
npm start
```

Output files are generated in `./output/`:
- `blotter.csv` - Detailed trade log
- `summary.json` - Summary statistics and equity curve data

### 3. View Results in Dashboard

```bash
# Copy output to UI public directory (needed for dev server)
cp output/summary.json packages/ui/public/output/

# Start the UI dev server
npm run dev:ui

# Or from ui directory
cd packages/ui
npm run dev
```

Open http://localhost:3000 in your browser.

### 4. Build for Production

```bash
# Build backtester
npm run build -w packages/backtester

# Build UI
npm run build -w packages/ui

# Serve UI build
cd packages/ui/dist
npx serve
```

## CSV Data Format

Both daily (D1) and hourly (H1) CSV files should have the following format:

```csv
timestamp,open,high,low,close,volume
2024-01-01,100.00,102.50,99.50,101.00,1000000
2024-01-02,101.00,103.00,100.50,102.50,1100000
```

For hourly data, use datetime format:
```csv
timestamp,open,high,low,close,volume
2024-01-01 09:00,100.00,100.50,99.80,100.20,50000
2024-01-01 10:00,100.20,100.80,100.10,100.60,55000
```

## Configuration

Edit `packages/backtester/src/index.ts` to customize:

```typescript
const config: BacktestConfig = {
  initialCapital: 10000,       // Starting capital
  biweeklyDeposit: 100,        // Biweekly deposit amount
  bullETF: 'SPXL',             // Bull ETF ticker
  bearETF: 'SPXS',             // Bear ETF ticker
  maxPositions: 1,             // Max concurrent positions
  enablePDTGuard: true,        // Enable PDT protection
  cashSettlement: 'T+1',       // T+1 or T+0 settlement
  riskPercentSmall: 2,         // Risk % for positions < $1k
  riskPercentLarge: 1,         // Risk % for positions >= $1k
  minRiskDollar: 25,           // Minimum risk in dollars
  maxPositionSize: 1000,       // Max position size in dollars
  stopLossMultiplier: 1.5,     // ATR multiplier for stop loss
  timeStopDays: 10,            // Maximum days to hold position
};
```

## Strategy Details

### Entry Rules
1. **Daily Trend Filter**:
   - EMA20 > EMA50 > EMA200 (bullish) OR EMA20 < EMA50 < EMA200 (bearish)
   - All EMAs must be rising (bullish) or falling (bearish) over 3 periods
   - ADX(14) ≥ 20 (trending market)

2. **Hourly Entry Signal**:
   - Price pullback below EMA20
   - Current candle closes above EMA20 (entry trigger)

### Exit Rules
1. **Stop Loss**: Price hits SL = Entry ± 1.5 × ATR14(D1)
2. **Time Stop**: Position held for 10 days
3. **Signal Exit**: Trend reversal (not implemented in current version)

### Position Sizing
- For positions < $1,000: Risk = max(2% of capital, $25)
- For positions ≥ $1,000: Risk = 1% of capital
- Shares = Risk / (Entry Price - Stop Loss)
- Fractional shares allowed

## Technologies

- **TypeScript** - Type-safe development
- **Node.js** - Backtester runtime
- **React** - UI framework
- **Vite** - Build tool and dev server
- **TradingView Lightweight Charts** - Financial charting
- **csv-parse** - CSV data parsing

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
