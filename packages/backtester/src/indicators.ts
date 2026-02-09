import { Candle } from './types.js';

export class Indicators {
  /**
   * Calculate Exponential Moving Average
   */
  static ema(data: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for first value
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
      } else if (i === period - 1) {
        result.push(ema);
      } else {
        ema = (data[i] - ema) * multiplier + ema;
        result.push(ema);
      }
    }
    
    return result;
  }

  /**
   * Calculate Average True Range
   */
  static atr(candles: Candle[], period: number): number[] {
    const trueRanges: number[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      if (i === 0) {
        trueRanges.push(candles[i].high - candles[i].low);
      } else {
        const tr = Math.max(
          candles[i].high - candles[i].low,
          Math.abs(candles[i].high - candles[i - 1].close),
          Math.abs(candles[i].low - candles[i - 1].close)
        );
        trueRanges.push(tr);
      }
    }
    
    return this.ema(trueRanges, period);
  }

  /**
   * Calculate Average Directional Index (ADX)
   */
  static adx(candles: Candle[], period: number = 14): number[] {
    const plusDM: number[] = [];
    const minusDM: number[] = [];
    const tr: number[] = [];
    
    // Calculate +DM, -DM, and TR
    for (let i = 1; i < candles.length; i++) {
      const highDiff = candles[i].high - candles[i - 1].high;
      const lowDiff = candles[i - 1].low - candles[i].low;
      
      plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
      minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
      
      const trueRange = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      );
      tr.push(trueRange);
    }
    
    // Smooth using EMA
    const smoothPlusDM = this.ema(plusDM, period);
    const smoothMinusDM = this.ema(minusDM, period);
    const smoothTR = this.ema(tr, period);
    
    // Calculate +DI and -DI
    const plusDI: number[] = [];
    const minusDI: number[] = [];
    
    for (let i = 0; i < smoothTR.length; i++) {
      if (smoothTR[i] === 0 || isNaN(smoothTR[i])) {
        plusDI.push(0);
        minusDI.push(0);
      } else {
        plusDI.push((smoothPlusDM[i] / smoothTR[i]) * 100);
        minusDI.push((smoothMinusDM[i] / smoothTR[i]) * 100);
      }
    }
    
    // Calculate DX
    const dx: number[] = [];
    for (let i = 0; i < plusDI.length; i++) {
      const sum = plusDI[i] + minusDI[i];
      if (sum === 0) {
        dx.push(0);
      } else {
        dx.push((Math.abs(plusDI[i] - minusDI[i]) / sum) * 100);
      }
    }
    
    // Calculate ADX (EMA of DX)
    const adxValues = this.ema(dx, period);
    
    // Prepend NaN to match original array length
    return [NaN, ...adxValues];
  }

  /**
   * Check if EMA is rising over N periods
   */
  static isRising(emaValues: number[], lookback: number = 3): boolean[] {
    const result: boolean[] = [];
    
    for (let i = 0; i < emaValues.length; i++) {
      if (i < lookback || isNaN(emaValues[i])) {
        result.push(false);
      } else {
        let rising = true;
        for (let j = 1; j <= lookback; j++) {
          if (emaValues[i - j + 1] <= emaValues[i - j]) {
            rising = false;
            break;
          }
        }
        result.push(rising);
      }
    }
    
    return result;
  }
}
