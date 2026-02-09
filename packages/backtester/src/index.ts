import { Backtester } from './backtester.js';
import { DataLoader } from './dataLoader.js';
import { OutputGenerator } from './output.js';
import { BacktestConfig } from './types.js';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('Starting Swing Trading Backtester...\n');

  // Configuration
  const config: BacktestConfig = {
    initialCapital: 10000,
    biweeklyDeposit: 100,
    bullETF: 'SPXL',  // 3x Bull S&P 500 ETF
    bearETF: 'SPXS',  // 3x Bear S&P 500 ETF
    maxPositions: 1,
    enablePDTGuard: true,
    cashSettlement: 'T+1',
    riskPercentSmall: 2,  // 2% risk for positions < $1k
    riskPercentLarge: 1,  // 1% risk for positions >= $1k
    minRiskDollar: 25,    // Minimum $25 risk
    maxPositionSize: 1000, // Max $1k position size initially
    stopLossMultiplier: 1.5,
    timeStopDays: 10,
  };

  try {
    // Load market data
    console.log('Loading market data...');
    const rootDir = join(__dirname, '..', '..', '..');
    const dataDir = process.env.DATA_DIR || join(rootDir, 'data');
    const marketData = await DataLoader.loadMarketData(
      [config.bullETF, config.bearETF],
      dataDir
    );

    // Check if data was loaded
    if (marketData.daily.size === 0 || marketData.hourly.size === 0) {
      console.error('\nError: No market data loaded. Please ensure CSV files exist in ./data/');
      console.error('Expected files:');
      console.error(`  - ./data/${config.bullETF}_D1.csv (daily data)`);
      console.error(`  - ./data/${config.bullETF}_H1.csv (hourly data)`);
      console.error(`  - ./data/${config.bearETF}_D1.csv (daily data)`);
      console.error(`  - ./data/${config.bearETF}_H1.csv (hourly data)`);
      console.error('\nCSV format: timestamp,open,high,low,close,volume');
      return;
    }

    // Run backtest
    console.log('\nRunning backtest...\n');
    const backtester = new Backtester(config, marketData);
    const result = backtester.run();

    // Create output directory
    const outputDir = join(rootDir, 'output');
    await mkdir(outputDir, { recursive: true });

    // Generate outputs
    console.log('\nGenerating outputs...');
    await OutputGenerator.generateBlotter(result, join(outputDir, 'blotter.csv'));
    await OutputGenerator.generateSummary(result, join(outputDir, 'summary.json'));

    // Print summary
    OutputGenerator.printSummary(result);

    console.log('Backtest complete! Check ./output/ for results.');
  } catch (error) {
    console.error('Error running backtest:', error);
    process.exit(1);
  }
}

main();
