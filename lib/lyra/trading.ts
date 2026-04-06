/**
 * lib/lyra/trading.ts
 *
 * Alpaca trading agent for Lyra.
 * Paper trading by default — set ALPACA_PAPER=false + real keys to go live.
 *
 * Docs: https://docs.alpaca.markets/
 */

const PAPER = process.env.ALPACA_PAPER !== "false";
const BASE_URL = PAPER
  ? "https://paper-api.alpaca.markets"
  : "https://api.alpaca.markets";
const DATA_URL = "https://data.alpaca.markets";

const KEY_ID  = process.env.ALPACA_KEY_ID ?? "";
const SECRET  = process.env.ALPACA_SECRET ?? "";

const HEADERS = {
  "APCA-API-KEY-ID":     KEY_ID,
  "APCA-API-SECRET-KEY": SECRET,
  "Content-Type":        "application/json",
};

async function alpaca(method: string, path: string, body?: object) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Alpaca ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function alpacaData(path: string) {
  const res = await fetch(`${DATA_URL}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Alpaca data ${path} → ${res.status}`);
  return res.json();
}

// ── Account ───────────────────────────────────────────────────────────────────

export async function getAccount() {
  const acct = await alpaca("GET", "/v2/account");
  return {
    cash:         parseFloat(acct.cash),
    equity:       parseFloat(acct.equity),
    buyingPower:  parseFloat(acct.buying_power),
    portfolioValue: parseFloat(acct.portfolio_value),
    dayPL:        parseFloat(acct.unrealized_intraday_pl ?? "0"),
    dayPLPct:     parseFloat(acct.unrealized_intraday_plpc ?? "0"),
    paper:        PAPER,
    status:       acct.status,
  };
}

// ── Positions ─────────────────────────────────────────────────────────────────

export async function getPositions() {
  const positions = await alpaca("GET", "/v2/positions") as Array<Record<string, string>>;
  return positions.map(p => ({
    symbol:    p.symbol,
    qty:       parseFloat(p.qty),
    avgEntry:  parseFloat(p.avg_entry_price),
    current:   parseFloat(p.current_price),
    marketValue: parseFloat(p.market_value),
    pl:        parseFloat(p.unrealized_pl),
    plPct:     parseFloat(p.unrealized_plpc),
    side:      p.side,
  }));
}

// ── Orders ────────────────────────────────────────────────────────────────────

export interface OrderParams {
  symbol:    string;
  qty?:      number;
  notional?: number;   // dollar amount instead of qty
  side:      "buy" | "sell";
  type:      "market" | "limit" | "stop" | "stop_limit";
  limitPrice?: number;
  stopPrice?:  number;
  timeInForce?: "day" | "gtc" | "ioc";
  note?:     string;   // Lyra's reasoning (stored in client_order_id prefix)
}

export async function placeOrder(params: OrderParams) {
  const body: Record<string, unknown> = {
    symbol:        params.symbol.toUpperCase(),
    side:          params.side,
    type:          params.type,
    time_in_force: params.timeInForce ?? "day",
  };

  if (params.notional) {
    body.notional = params.notional.toFixed(2);
  } else {
    body.qty = params.qty;
  }

  if (params.limitPrice) body.limit_price = params.limitPrice.toFixed(2);
  if (params.stopPrice)  body.stop_price  = params.stopPrice.toFixed(2);

  // Store Lyra's reasoning in the order ID prefix
  if (params.note) {
    const safe = params.note.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, "_");
    body.client_order_id = `lyra_${safe}_${Date.now()}`;
  }

  const order = await alpaca("POST", "/v2/orders", body);
  return {
    id:     order.id,
    symbol: order.symbol,
    side:   order.side,
    qty:    order.qty,
    notional: order.notional,
    type:   order.order_type,
    status: order.status,
    paper:  PAPER,
  };
}

export async function cancelOrder(orderId: string) {
  await alpaca("DELETE", `/v2/orders/${orderId}`);
  return `Order ${orderId} cancelled.`;
}

export async function getOrders(status = "all", limit = 20) {
  const orders = await alpaca("GET", `/v2/orders?status=${status}&limit=${limit}`) as Array<Record<string, string>>;
  return orders.map(o => ({
    id:        o.id,
    symbol:    o.symbol,
    side:      o.side,
    qty:       o.qty,
    notional:  o.notional,
    type:      o.order_type,
    status:    o.status,
    filled:    o.filled_avg_price,
    createdAt: o.created_at,
  }));
}

// ── Market data ───────────────────────────────────────────────────────────────

export async function getQuote(symbol: string) {
  const data = await alpacaData(`/v2/stocks/${symbol.toUpperCase()}/quotes/latest`);
  const q = data.quote;
  return {
    symbol: symbol.toUpperCase(),
    ask:    q.ap,
    bid:    q.bp,
    mid:    ((q.ap + q.bp) / 2).toFixed(2),
    time:   q.t,
  };
}

export async function getBars(symbol: string, timeframe = "1Day", limit = 30) {
  const data = await alpacaData(
    `/v2/stocks/${symbol.toUpperCase()}/bars?timeframe=${timeframe}&limit=${limit}&adjustment=raw`
  );
  return (data.bars as Array<Record<string, number>>).map(b => ({
    time:   b.t,
    open:   b.o,
    high:   b.h,
    low:    b.l,
    close:  b.c,
    volume: b.v,
  }));
}

// ── Simple analysis ───────────────────────────────────────────────────────────

export async function analyzeSymbol(symbol: string): Promise<string> {
  const [bars, quote] = await Promise.all([
    getBars(symbol, "1Day", 20),
    getQuote(symbol),
  ]);

  if (bars.length < 5) return `Not enough data for ${symbol}`;

  const closes = bars.map(b => b.close);
  const current = closes[closes.length - 1];
  const prev    = closes[closes.length - 2];
  const sma5    = closes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const sma20   = closes.reduce((a, b) => a + b, 0) / closes.length;
  const change  = ((current - prev) / prev * 100).toFixed(2);
  const high20  = Math.max(...closes);
  const low20   = Math.min(...closes);

  // Simple RSI (14-period approximation)
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
  const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
  const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  const trend = sma5 > sma20 ? "📈 Uptrend" : "📉 Downtrend";
  const rsiSignal = rsi > 70 ? "⚠️ Overbought" : rsi < 30 ? "🟢 Oversold (possible buy)" : "➡️ Neutral";

  return `**${symbol.toUpperCase()} Analysis**
Price: $${current} (${change}% today)
Bid/Ask: $${quote.bid} / $${quote.ask}
SMA5: $${sma5.toFixed(2)} | SMA20: $${sma20.toFixed(2)}
20-day range: $${low20.toFixed(2)} – $${high20.toFixed(2)}
RSI(14): ${rsi.toFixed(1)} ${rsiSignal}
Trend: ${trend}`;
}

// ── Portfolio summary ─────────────────────────────────────────────────────────

export async function getPortfolioSummary(): Promise<string> {
  const [acct, positions] = await Promise.all([getAccount(), getPositions()]);

  const mode = acct.paper ? "📝 PAPER TRADING" : "💵 LIVE TRADING";
  const posLines = positions.length === 0
    ? "No open positions."
    : positions.map(p =>
        `• **${p.symbol}** ${p.qty} shares @ $${p.avgEntry.toFixed(2)} → $${p.current.toFixed(2)} (${p.plPct > 0 ? "+" : ""}${(p.plPct * 100).toFixed(2)}%)`
      ).join("\n");

  return `**Portfolio — ${mode}**
Cash: $${acct.cash.toFixed(2)}
Equity: $${acct.equity.toFixed(2)}
Buying Power: $${acct.buyingPower.toFixed(2)}
Today's P&L: ${acct.dayPL >= 0 ? "+" : ""}$${acct.dayPL.toFixed(2)}

**Positions:**
${posLines}`;
}
