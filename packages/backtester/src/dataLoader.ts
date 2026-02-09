import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { Candle, MarketData } from './types.js';

export class DataLoader {
  /**
   * Load CSV data for a ticker
   * Expected CSV format: timestamp,open,high,low,close,volume
   */
  static async loadCSV(filePath: string): Promise<Candle[]> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      return records.map((record: any) => ({
        timestamp: new Date(record.timestamp || record.date || record.time),
        open: parseFloat(record.open),
        high: parseFloat(record.high),
        low: parseFloat(record.low),
        close: parseFloat(record.close),
        volume: parseFloat(record.volume || 0),
      }));
    } catch (error) {
      console.error(`Error loading CSV from ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Load market data for backtesting
   */
  static async loadMarketData(
    tickers: string[],
    dataDir: string
  ): Promise<MarketData> {
    const daily = new Map<string, Candle[]>();
    const hourly = new Map<string, Candle[]>();

    for (const ticker of tickers) {
      try {
        // Load daily data
        const dailyPath = `${dataDir}/${ticker}_D1.csv`;
        const dailyData = await this.loadCSV(dailyPath);
        daily.set(ticker, dailyData);

        // Load hourly data
        const hourlyPath = `${dataDir}/${ticker}_H1.csv`;
        const hourlyData = await this.loadCSV(hourlyPath);
        hourly.set(ticker, hourlyData);

        console.log(
          `Loaded ${ticker}: ${dailyData.length} daily, ${hourlyData.length} hourly candles`
        );
      } catch (error) {
        console.warn(`Warning: Could not load data for ${ticker}`);
      }
    }

    return { daily, hourly };
  }

  /**
   * Get candle at or before a specific date
   */
  static getCandleAtDate(
    candles: Candle[],
    date: Date,
    lookback: number = 0
  ): Candle | null {
    let index = candles.findIndex((c) => c.timestamp >= date);
    
    if (index === -1) {
      // Date is after all candles
      index = candles.length;
    }
    
    // Go back by lookback periods
    index = index - lookback - 1;
    
    if (index < 0 || index >= candles.length) {
      return null;
    }
    
    return candles[index];
  }

  /**
   * Get all candles up to a specific date
   */
  static getCandlesUpToDate(candles: Candle[], date: Date): Candle[] {
    return candles.filter((c) => c.timestamp <= date);
  }
}
