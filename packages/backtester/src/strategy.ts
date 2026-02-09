import { Candle } from './types.js';
import { Indicators } from './indicators.js';

export interface TrendSignal {
  isBullish: boolean;
  isBearish: boolean;
  ema20: number;
  ema50: number;
  ema200: number;
  adx: number;
}

export class Strategy {
  /**
   * Check daily trend filter: EMA20 > EMA50 > EMA200, all rising, ADX >= 20
   */
  static checkDailyTrend(dailyCandles: Candle[]): TrendSignal {
    if (dailyCandles.length < 200) {
      return {
        isBullish: false,
        isBearish: false,
        ema20: NaN,
        ema50: NaN,
        ema200: NaN,
        adx: NaN,
      };
    }

    const closes = dailyCandles.map((c) => c.close);
    const ema20 = Indicators.ema(closes, 20);
    const ema50 = Indicators.ema(closes, 50);
    const ema200 = Indicators.ema(closes, 200);
    const adx = Indicators.adx(dailyCandles, 14);

    // Check if EMAs are rising
    const ema20Rising = Indicators.isRising(ema20, 3);
    const ema50Rising = Indicators.isRising(ema50, 3);
    const ema200Rising = Indicators.isRising(ema200, 3);

    const lastIdx = dailyCandles.length - 1;
    const currentEma20 = ema20[lastIdx];
    const currentEma50 = ema50[lastIdx];
    const currentEma200 = ema200[lastIdx];
    const currentAdx = adx[lastIdx];

    // Bullish: EMA20 > EMA50 > EMA200, all rising, ADX >= 20
    const isBullish =
      currentEma20 > currentEma50 &&
      currentEma50 > currentEma200 &&
      ema20Rising[lastIdx] &&
      ema50Rising[lastIdx] &&
      ema200Rising[lastIdx] &&
      currentAdx >= 20;

    // Bearish: EMA20 < EMA50 < EMA200, all falling, ADX >= 20
    const isBearish =
      currentEma20 < currentEma50 &&
      currentEma50 < currentEma200 &&
      !ema20Rising[lastIdx] &&
      !ema50Rising[lastIdx] &&
      !ema200Rising[lastIdx] &&
      currentAdx >= 20;

    return {
      isBullish,
      isBearish,
      ema20: currentEma20,
      ema50: currentEma50,
      ema200: currentEma200,
      adx: currentAdx,
    };
  }

  /**
   * Check H1 entry signal: pullback below EMA20, then close above EMA20
   */
  static checkHourlyEntry(
    hourlyCandles: Candle[],
    lookbackPeriods: number = 20
  ): boolean {
    if (hourlyCandles.length < 20 + lookbackPeriods) {
      return false;
    }

    const closes = hourlyCandles.map((c) => c.close);
    const ema20 = Indicators.ema(closes, 20);

    const lastIdx = hourlyCandles.length - 1;
    const currentEma20 = ema20[lastIdx];
    const currentClose = hourlyCandles[lastIdx].close;

    // Current candle must close above EMA20
    if (currentClose <= currentEma20) {
      return false;
    }

    // Look for a pullback below EMA20 in recent periods
    let foundPullback = false;
    for (let i = 1; i <= lookbackPeriods && i < hourlyCandles.length; i++) {
      const idx = lastIdx - i;
      if (hourlyCandles[idx].close < ema20[idx]) {
        foundPullback = true;
        break;
      }
    }

    return foundPullback;
  }

  /**
   * Calculate stop loss based on ATR
   */
  static calculateStopLoss(
    dailyCandles: Candle[],
    entryPrice: number,
    direction: 'LONG' | 'SHORT',
    atrMultiplier: number = 1.5
  ): number {
    const atr = Indicators.atr(dailyCandles, 14);
    const lastIdx = dailyCandles.length - 1;
    const currentATR = atr[lastIdx];

    if (isNaN(currentATR)) {
      // Fallback: 2% stop loss
      return direction === 'LONG'
        ? entryPrice * 0.98
        : entryPrice * 1.02;
    }

    const stopDistance = currentATR * atrMultiplier;

    return direction === 'LONG'
      ? entryPrice - stopDistance
      : entryPrice + stopDistance;
  }

  /**
   * Calculate position size based on risk rules
   */
  static calculatePositionSize(
    capital: number,
    entryPrice: number,
    stopLoss: number,
    riskPercentSmall: number,
    riskPercentLarge: number,
    minRiskDollar: number,
    maxPositionSize: number
  ): number {
    const potentialPositionValue = Math.min(capital * 0.95, maxPositionSize);
    const positionShares = potentialPositionValue / entryPrice;
    const positionValue = positionShares * entryPrice;

    // Determine risk percentage based on position size
    let riskPercent: number;
    if (positionValue < 1000) {
      riskPercent = riskPercentSmall;
    } else {
      riskPercent = riskPercentLarge;
    }

    // Calculate risk amount
    const riskAmount = Math.max(capital * (riskPercent / 100), minRiskDollar);

    // Calculate position size based on risk
    const priceRisk = Math.abs(entryPrice - stopLoss);
    if (priceRisk === 0) {
      return 0;
    }

    const shares = riskAmount / priceRisk;

    // Ensure we don't exceed available capital or max position size
    const maxShares = Math.min(
      capital * 0.95 / entryPrice,
      maxPositionSize / entryPrice
    );

    return Math.min(shares, maxShares);
  }
}
