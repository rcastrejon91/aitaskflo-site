/**
 * Lyra Backtester — Stage 1 of the trading spell
 *
 * Tests trading strategies against historical price data from Yahoo Finance.
 * Runs silently, reports results so Lyra can decide if a strategy is worth
 * promoting to paper trading.
 *
 * Strategies:
 *   rsi_mean_reversion — buy oversold (RSI < 30), sell overbought (RSI > 70)
 *   momentum           — buy when price crosses above 20-day MA, sell below
 *   dual_ma            — buy when 5-day MA crosses above 20-day MA (golden cross)
 *   news_momentum      — placeholder for news-driven strategy
 */

export type Strategy = "rsi_mean_reversion" | "momentum" | "dual_ma" | "all";

interface DailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Trade {
  date: string;
  action: "buy" | "sell";
  price: number;
  shares: number;
  value: number;
  reason: string;
}

interface BacktestResult {
  symbol: string;
  strategy: string;
  startDate: string;
  endDate: string;
  startPrice: number;
  endPrice: number;
  trades: Trade[];
  finalValue: number;
  startingCapital: number;
  totalReturn: number;
  totalReturnPct: number;
  buyAndHoldReturn: number;
  buyAndHoldReturnPct: number;
  beatMarket: boolean;
  winRate: number;
  totalTrades: number;
  maxDrawdown: number;
  summary: string;
}

// ── Fetch historical data from Yahoo Finance ──────────────────────────────────

async function fetchHistoricalData(symbol: string, days = 365): Promise<DailyBar[]> {
  const end = Math.floor(Date.now() / 1000);
  const start = end - days * 86400;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${start}&period2=${end}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(15_000),
  });

  const data = await res.json() as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            open?: number[];
            high?: number[];
            low?: number[];
            close?: number[];
            volume?: number[];
          }>;
        };
      }>;
    };
  };

  const result = data.chart?.result?.[0];
  if (!result) throw new Error(`No historical data for ${symbol}`);

  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};

  const bars: DailyBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = quote.close?.[i];
    const open = quote.open?.[i];
    if (!close || !open) continue;
    bars.push({
      date: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
      open,
      high: quote.high?.[i] ?? close,
      low: quote.low?.[i] ?? close,
      close,
      volume: quote.volume?.[i] ?? 0,
    });
  }

  return bars;
}

// ── Technical indicators ──────────────────────────────────────────────────────

function calcRSI(closes: number[], period = 14): number[] {
  const rsi: number[] = new Array(period).fill(50);
  let avgGain = 0, avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }

  return rsi;
}

function calcSMA(closes: number[], period: number): number[] {
  const sma: number[] = new Array(period - 1).fill(NaN);
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    sma.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return sma;
}

// ── Strategy engines ──────────────────────────────────────────────────────────

function runRsiStrategy(bars: DailyBar[], capital: number): { trades: Trade[]; finalValue: number; maxDrawdown: number } {
  const closes = bars.map(b => b.close);
  const rsi = calcRSI(closes);

  const trades: Trade[] = [];
  let cash = capital;
  let shares = 0;
  let peakValue = capital;
  let maxDrawdown = 0;

  for (let i = 15; i < bars.length; i++) {
    const price = bars[i].close;
    const currentValue = cash + shares * price;
    peakValue = Math.max(peakValue, currentValue);
    const drawdown = (peakValue - currentValue) / peakValue;
    maxDrawdown = Math.max(maxDrawdown, drawdown);

    if (rsi[i] < 30 && shares === 0 && cash > price) {
      // Oversold — buy
      shares = Math.floor(cash / price);
      cash -= shares * price;
      trades.push({ date: bars[i].date, action: "buy", price, shares, value: shares * price, reason: `RSI oversold (${rsi[i].toFixed(1)})` });
    } else if (rsi[i] > 70 && shares > 0) {
      // Overbought — sell
      cash += shares * price;
      trades.push({ date: bars[i].date, action: "sell", price, shares, value: shares * price, reason: `RSI overbought (${rsi[i].toFixed(1)})` });
      shares = 0;
    }
  }

  // Close any open position at end
  if (shares > 0) {
    const lastPrice = bars[bars.length - 1].close;
    cash += shares * lastPrice;
    trades.push({ date: bars[bars.length - 1].date, action: "sell", price: lastPrice, shares, value: shares * lastPrice, reason: "End of backtest" });
    shares = 0;
  }

  return { trades, finalValue: cash, maxDrawdown };
}

function runMomentumStrategy(bars: DailyBar[], capital: number): { trades: Trade[]; finalValue: number; maxDrawdown: number } {
  const closes = bars.map(b => b.close);
  const sma20 = calcSMA(closes, 20);

  const trades: Trade[] = [];
  let cash = capital;
  let shares = 0;
  let peakValue = capital;
  let maxDrawdown = 0;

  for (let i = 21; i < bars.length; i++) {
    const price = bars[i].close;
    const ma = sma20[i];
    const prevMa = sma20[i - 1];
    const prevPrice = bars[i - 1].close;

    const currentValue = cash + shares * price;
    peakValue = Math.max(peakValue, currentValue);
    maxDrawdown = Math.max(maxDrawdown, (peakValue - currentValue) / peakValue);

    // Price crosses above SMA — buy signal
    if (prevPrice <= prevMa && price > ma && shares === 0 && cash > price) {
      shares = Math.floor(cash / price);
      cash -= shares * price;
      trades.push({ date: bars[i].date, action: "buy", price, shares, value: shares * price, reason: `Price crossed above 20-day MA ($${ma.toFixed(2)})` });
    }
    // Price crosses below SMA — sell signal
    else if (prevPrice >= prevMa && price < ma && shares > 0) {
      cash += shares * price;
      trades.push({ date: bars[i].date, action: "sell", price, shares, value: shares * price, reason: `Price crossed below 20-day MA ($${ma.toFixed(2)})` });
      shares = 0;
    }
  }

  if (shares > 0) {
    const lastPrice = bars[bars.length - 1].close;
    cash += shares * lastPrice;
    trades.push({ date: bars[bars.length - 1].date, action: "sell", price: lastPrice, shares, value: shares * lastPrice, reason: "End of backtest" });
  }

  return { trades, finalValue: cash, maxDrawdown };
}

function runDualMAStrategy(bars: DailyBar[], capital: number): { trades: Trade[]; finalValue: number; maxDrawdown: number } {
  const closes = bars.map(b => b.close);
  const sma5 = calcSMA(closes, 5);
  const sma20 = calcSMA(closes, 20);

  const trades: Trade[] = [];
  let cash = capital;
  let shares = 0;
  let peakValue = capital;
  let maxDrawdown = 0;

  for (let i = 21; i < bars.length; i++) {
    const price = bars[i].close;
    const currentValue = cash + shares * price;
    peakValue = Math.max(peakValue, currentValue);
    maxDrawdown = Math.max(maxDrawdown, (peakValue - currentValue) / peakValue);

    const goldenCross = sma5[i - 1] <= sma20[i - 1] && sma5[i] > sma20[i];
    const deathCross  = sma5[i - 1] >= sma20[i - 1] && sma5[i] < sma20[i];

    if (goldenCross && shares === 0 && cash > price) {
      shares = Math.floor(cash / price);
      cash -= shares * price;
      trades.push({ date: bars[i].date, action: "buy", price, shares, value: shares * price, reason: `Golden cross (5MA crossed above 20MA)` });
    } else if (deathCross && shares > 0) {
      cash += shares * price;
      trades.push({ date: bars[i].date, action: "sell", price, shares, value: shares * price, reason: `Death cross (5MA crossed below 20MA)` });
      shares = 0;
    }
  }

  if (shares > 0) {
    const lastPrice = bars[bars.length - 1].close;
    cash += shares * lastPrice;
    trades.push({ date: bars[bars.length - 1].date, action: "sell", price: lastPrice, shares, value: shares * lastPrice, reason: "End of backtest" });
  }

  return { trades, finalValue: cash, maxDrawdown };
}

// ── Main backtest runner ──────────────────────────────────────────────────────

async function runBacktest(symbol: string, strategy: Exclude<Strategy, "all">, capital = 1000, days = 365): Promise<BacktestResult> {
  const bars = await fetchHistoricalData(symbol, days);
  if (bars.length < 30) throw new Error(`Not enough historical data for ${symbol}`);

  const startPrice = bars[0].close;
  const endPrice = bars[bars.length - 1].close;

  let result: { trades: Trade[]; finalValue: number; maxDrawdown: number };

  if (strategy === "rsi_mean_reversion") result = runRsiStrategy(bars, capital);
  else if (strategy === "momentum") result = runMomentumStrategy(bars, capital);
  else result = runDualMAStrategy(bars, capital);

  const { trades, finalValue, maxDrawdown } = result;

  const totalReturn = finalValue - capital;
  const totalReturnPct = (totalReturn / capital) * 100;
  const buyAndHoldReturn = (endPrice - startPrice) / startPrice * capital;
  const buyAndHoldReturnPct = (endPrice - startPrice) / startPrice * 100;
  const beatMarket = totalReturnPct > buyAndHoldReturnPct;

  // Win rate — % of sell trades that were profitable
  const sellTrades = trades.filter(t => t.action === "sell");
  let wins = 0;
  for (let i = 0; i < trades.length - 1; i++) {
    if (trades[i].action === "buy" && trades[i + 1]?.action === "sell") {
      if (trades[i + 1].price > trades[i].price) wins++;
    }
  }
  const winRate = sellTrades.length > 0 ? (wins / sellTrades.length) * 100 : 0;

  const strategyNames: Record<string, string> = {
    rsi_mean_reversion: "RSI Mean Reversion",
    momentum: "Price Momentum (20-day MA)",
    dual_ma: "Dual MA Crossover (Golden/Death Cross)",
  };

  const verdict = beatMarket
    ? `✅ Beat buy-and-hold by ${(totalReturnPct - buyAndHoldReturnPct).toFixed(1)}%`
    : `❌ Underperformed buy-and-hold by ${(buyAndHoldReturnPct - totalReturnPct).toFixed(1)}%`;

  const summary = `## Backtest: ${symbol} — ${strategyNames[strategy]}
**Period:** ${bars[0].date} → ${bars[bars.length - 1].date} (${days} days)
**Starting capital:** $${capital.toLocaleString()}

### Results
| Metric | Value |
|--------|-------|
| Final value | $${finalValue.toFixed(2)} |
| Total return | ${totalReturn >= 0 ? "+" : ""}$${totalReturn.toFixed(2)} (${totalReturnPct >= 0 ? "+" : ""}${totalReturnPct.toFixed(1)}%) |
| Buy & hold return | +$${buyAndHoldReturn.toFixed(2)} (+${buyAndHoldReturnPct.toFixed(1)}%) |
| Total trades | ${trades.length} |
| Win rate | ${winRate.toFixed(0)}% |
| Max drawdown | ${(maxDrawdown * 100).toFixed(1)}% |

### Verdict
${verdict}

### Last 5 Trades
${trades.slice(-5).map(t => `${t.action === "buy" ? "📈 BUY" : "📉 SELL"} ${t.shares} shares @ $${t.price.toFixed(2)} on ${t.date} — ${t.reason}`).join("\n")}

${totalReturnPct > 10 && beatMarket ? "🔮 **Oracle recommends promoting this strategy to paper trading.**" : totalReturnPct > 0 ? "📊 Strategy is profitable but didn't beat buy-and-hold. Consider paper trading with caution." : "⚠️ Strategy lost money on historical data. Not recommended for paper trading yet."}`;

  return {
    symbol, strategy, startDate: bars[0].date, endDate: bars[bars.length - 1].date,
    startPrice, endPrice, trades, finalValue, startingCapital: capital,
    totalReturn, totalReturnPct, buyAndHoldReturn, buyAndHoldReturnPct,
    beatMarket, winRate, totalTrades: trades.length, maxDrawdown, summary,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function backtestSymbol(symbol: string, strategy: Strategy = "all", capital = 1000, days = 365): Promise<string> {
  if (strategy === "all") {
    const strategies: Array<Exclude<Strategy, "all">> = ["rsi_mean_reversion", "momentum", "dual_ma"];
    const results = await Promise.all(strategies.map(s => runBacktest(symbol, s, capital, days)));

    const best = results.reduce((a, b) => a.totalReturnPct > b.totalReturnPct ? a : b);
    const strategyNames: Record<string, string> = {
      rsi_mean_reversion: "RSI Mean Reversion",
      momentum: "Price Momentum",
      dual_ma: "Dual MA Crossover",
    };

    return `# Backtest Results — ${symbol} (${days} days, $${capital} starting capital)

${results.map(r => `### ${strategyNames[r.strategy]}
Return: ${r.totalReturnPct >= 0 ? "+" : ""}${r.totalReturnPct.toFixed(1)}% | Win rate: ${r.winRate.toFixed(0)}% | Max drawdown: ${(r.maxDrawdown * 100).toFixed(1)}% | Trades: ${r.totalTrades} | Beat market: ${r.beatMarket ? "✅" : "❌"}`).join("\n\n")}

---
🏆 **Best strategy: ${strategyNames[best.strategy]}** (${best.totalReturnPct >= 0 ? "+" : ""}${best.totalReturnPct.toFixed(1)}%)

${best.totalReturnPct > 5 ? `🔮 Recommend paper trading with **${strategyNames[best.strategy]}** strategy on ${symbol}.` : "⚠️ No strategy significantly outperformed. Keep on paper trading before going live."}`;
  }

  const result = await runBacktest(symbol, strategy, capital, days);
  return result.summary;
}
