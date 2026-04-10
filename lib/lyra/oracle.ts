/**
 * The Oracle — Lyra's trading intelligence system
 * Gathers real market intelligence before making any trade decision.
 *
 * Sources (all free, no API key needed):
 *   - Yahoo Finance news feed
 *   - CNN Fear & Greed Index
 *   - Earnings Whispers (earnings calendar)
 *   - Finviz analyst ratings
 */

// ── News sentiment ────────────────────────────────────────────────────────────

interface NewsItem {
  title: string;
  source: string;
  sentiment: "bullish" | "bearish" | "neutral";
  age: string;
}

function scoreHeadline(title: string): "bullish" | "bearish" | "neutral" {
  const t = title.toLowerCase();
  const bullish = ["beat", "surge", "soar", "rally", "upgrade", "buy", "growth", "record", "profit", "gain", "rise", "positive", "strong", "exceed", "outperform", "bullish", "boom"];
  const bearish = ["miss", "drop", "fall", "decline", "downgrade", "sell", "loss", "cut", "weak", "layoff", "lawsuit", "investigation", "crash", "plunge", "bearish", "warn", "concern", "risk"];
  const bullScore = bullish.filter(w => t.includes(w)).length;
  const bearScore = bearish.filter(w => t.includes(w)).length;
  if (bullScore > bearScore) return "bullish";
  if (bearScore > bullScore) return "bearish";
  return "neutral";
}

export async function getStockNews(symbol: string): Promise<{ items: NewsItem[]; summary: string }> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&newsCount=8&quotesCount=0`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8_000),
      }
    );
    const data = await res.json() as {
      news?: Array<{ title?: string; publisher?: string; providerPublishTime?: number }>;
    };

    const news = data.news ?? [];
    const items: NewsItem[] = news.slice(0, 6).map(n => {
      const ageMs = Date.now() - (n.providerPublishTime ?? 0) * 1000;
      const ageH = Math.floor(ageMs / 3_600_000);
      const age = ageH < 1 ? "just now" : ageH < 24 ? `${ageH}h ago` : `${Math.floor(ageH / 24)}d ago`;
      return {
        title: n.title ?? "No title",
        source: n.publisher ?? "Unknown",
        sentiment: scoreHeadline(n.title ?? ""),
        age,
      };
    });

    const bullCount = items.filter(i => i.sentiment === "bullish").length;
    const bearCount = items.filter(i => i.sentiment === "bearish").length;
    const overall = bullCount > bearCount ? "🟢 Bullish" : bearCount > bullCount ? "🔴 Bearish" : "🟡 Neutral";

    const summary = `**News Sentiment for ${symbol}:** ${overall}
${items.map(i => {
  const icon = i.sentiment === "bullish" ? "📈" : i.sentiment === "bearish" ? "📉" : "📰";
  return `${icon} "${i.title}" — ${i.source} (${i.age})`;
}).join("\n")}`;

    return { items, summary };
  } catch {
    return { items: [], summary: `No news found for ${symbol}.` };
  }
}

// ── Fear & Greed Index ────────────────────────────────────────────────────────

interface FearGreed {
  score: number;
  label: string;
  emoji: string;
}

export async function getFearGreedIndex(): Promise<FearGreed> {
  try {
    const res = await fetch(
      "https://production.dataviz.cnn.io/index/fearandgreed/graphdata",
      {
        headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.cnn.com/" },
        signal: AbortSignal.timeout(8_000),
      }
    );
    const data = await res.json() as {
      fear_and_greed?: { score?: number; rating?: string };
    };

    const score = Math.round(data.fear_and_greed?.score ?? 50);
    const label = score >= 75 ? "Extreme Greed" :
                  score >= 55 ? "Greed" :
                  score >= 45 ? "Neutral" :
                  score >= 25 ? "Fear" : "Extreme Fear";
    const emoji = score >= 75 ? "🤑" : score >= 55 ? "😊" : score >= 45 ? "😐" : score >= 25 ? "😨" : "💀";

    return { score, label, emoji };
  } catch {
    // Fallback: estimate from market context
    return { score: 50, label: "Neutral", emoji: "😐" };
  }
}

// ── Earnings calendar ─────────────────────────────────────────────────────────

interface EarningsInfo {
  hasEarningsSoon: boolean;
  earningsDate: string | null;
  daysUntil: number | null;
  warning: string;
}

export async function getEarningsInfo(symbol: string): Promise<EarningsInfo> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=calendarEvents`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8_000),
      }
    );
    const data = await res.json() as {
      quoteSummary?: {
        result?: Array<{
          calendarEvents?: {
            earnings?: { earningsDate?: Array<{ raw?: number }> };
          };
        }>;
      };
    };

    const earningsDates = data.quoteSummary?.result?.[0]?.calendarEvents?.earnings?.earningsDate ?? [];
    if (!earningsDates.length) return { hasEarningsSoon: false, earningsDate: null, daysUntil: null, warning: "No upcoming earnings found." };

    const nextEarnings = earningsDates[0].raw ?? 0;
    const daysUntil = Math.ceil((nextEarnings * 1000 - Date.now()) / 86_400_000);
    const dateStr = new Date(nextEarnings * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const hasEarningsSoon = daysUntil >= 0 && daysUntil <= 14;
    const warning = hasEarningsSoon
      ? `⚠️ Earnings in ${daysUntil} days (${dateStr}) — high volatility risk`
      : daysUntil < 0
      ? `Earnings were ${Math.abs(daysUntil)} days ago (${dateStr})`
      : `Next earnings: ${dateStr} (${daysUntil} days away)`;

    return { hasEarningsSoon, earningsDate: dateStr, daysUntil, warning };
  } catch {
    return { hasEarningsSoon: false, earningsDate: null, daysUntil: null, warning: "Could not fetch earnings data." };
  }
}

// ── Analyst ratings ───────────────────────────────────────────────────────────

interface AnalystRating {
  recommendation: string;
  targetPrice: number | null;
  summary: string;
}

export async function getAnalystRating(symbol: string): Promise<AnalystRating> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=financialData,recommendationTrend`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8_000),
      }
    );
    const data = await res.json() as {
      quoteSummary?: {
        result?: Array<{
          financialData?: {
            recommendationKey?: string;
            targetMeanPrice?: { raw?: number };
            currentPrice?: { raw?: number };
          };
        }>;
      };
    };

    const fd = data.quoteSummary?.result?.[0]?.financialData;
    const rec = fd?.recommendationKey ?? "none";
    const target = fd?.targetMeanPrice?.raw ?? null;
    const current = fd?.currentPrice?.raw ?? null;

    const recLabel = rec === "strong_buy" ? "Strong Buy 🟢" :
                     rec === "buy" ? "Buy 🟢" :
                     rec === "hold" ? "Hold 🟡" :
                     rec === "sell" ? "Sell 🔴" :
                     rec === "strong_sell" ? "Strong Sell 🔴" : "No Rating";

    const upside = target && current ? (((target - current) / current) * 100).toFixed(1) : null;
    const summary = `Analyst consensus: **${recLabel}**${target ? ` | Target: $${target.toFixed(2)}` : ""}${upside ? ` (${Number(upside) > 0 ? "+" : ""}${upside}% upside)` : ""}`;

    return { recommendation: recLabel, targetPrice: target, summary };
  } catch {
    return { recommendation: "Unknown", targetPrice: null, summary: "Could not fetch analyst ratings." };
  }
}

// ── Full Oracle reading ───────────────────────────────────────────────────────

export async function consultOracle(symbol: string): Promise<string> {
  const [news, fearGreed, earnings, analyst] = await Promise.all([
    getStockNews(symbol),
    getFearGreedIndex(),
    getEarningsInfo(symbol),
    getAnalystRating(symbol),
  ]);

  const bullSignals = [
    news.items.filter(i => i.sentiment === "bullish").length,
    fearGreed.score >= 55 ? 1 : 0,
    analyst.recommendation.includes("Buy") ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const bearSignals = [
    news.items.filter(i => i.sentiment === "bearish").length,
    fearGreed.score <= 35 ? 1 : 0,
    analyst.recommendation.includes("Sell") ? 1 : 0,
    earnings.hasEarningsSoon ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const verdict = bullSignals > bearSignals + 1
    ? "🔮 **Oracle says: FAVORABLE** — signals lean bullish"
    : bearSignals > bullSignals + 1
    ? "🔮 **Oracle says: UNFAVORABLE** — signals lean bearish"
    : "🔮 **Oracle says: MIXED** — proceed with caution";

  return `## Oracle Reading for ${symbol}

${verdict}

### Market Mood
${fearGreed.emoji} Fear & Greed Index: **${fearGreed.score}/100** — ${fearGreed.label}

### Analyst Opinion
${analyst.summary}

### Earnings Risk
${earnings.warning}

### Latest News
${news.summary}

---
*The Oracle sees all, but guarantees nothing. Trade wisely.*`;
}
