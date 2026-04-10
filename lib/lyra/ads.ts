/**
 * Google Ads integration for Lyra
 *
 * Setup:
 *   GOOGLE_ADS_DEVELOPER_TOKEN  — from ads.google.com/aw/apicenter (Explorer tier is instant)
 *   GOOGLE_ADS_CLIENT_ID        — OAuth2 client ID (Google Cloud Console)
 *   GOOGLE_ADS_CLIENT_SECRET    — OAuth2 client secret
 *   GOOGLE_ADS_REFRESH_TOKEN    — long-lived refresh token from OAuth2 consent
 *   GOOGLE_ADS_CUSTOMER_ID      — 10-digit customer ID (no dashes) e.g. 1234567890
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID — MCC account ID (same as CUSTOMER_ID if no MCC)
 */

// We use the REST API directly so we don't need a heavy gRPC dependency
const ADS_API_BASE = "https://googleads.googleapis.com/v18";

function getConfig() {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID?.replace(/-/g, "");
  const loginCustomerId = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? customerId)?.replace(/-/g, "");

  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    throw new Error(
      "Google Ads not configured. Add GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CUSTOMER_ID to your environment."
    );
  }

  return { developerToken, clientId, clientSecret, refreshToken, customerId, loginCustomerId };
}

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json() as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`OAuth2 token refresh failed: ${data.error}`);
  return data.access_token;
}

async function adsRequest(path: string, method = "GET", body?: unknown) {
  const cfg = getConfig();
  const token = await getAccessToken(cfg.clientId, cfg.clientSecret, cfg.refreshToken);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "developer-token": cfg.developerToken,
    "Content-Type": "application/json",
  };
  if (cfg.loginCustomerId) headers["login-customer-id"] = cfg.loginCustomerId;

  const url = `${ADS_API_BASE}/customers/${cfg.customerId}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });

  const text = await res.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch { return text; }

  if (!res.ok) {
    const err = (json as { error?: { message?: string } })?.error?.message ?? text;
    throw new Error(`Google Ads API ${res.status}: ${err}`);
  }
  return json;
}

async function adsSearch(query: string) {
  const cfg = getConfig();
  const token = await getAccessToken(cfg.clientId, cfg.clientSecret, cfg.refreshToken);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "developer-token": cfg.developerToken,
    "Content-Type": "application/json",
  };
  if (cfg.loginCustomerId) headers["login-customer-id"] = cfg.loginCustomerId;

  const url = `${ADS_API_BASE}/customers/${cfg.customerId}/googleAds:search`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(15_000),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Google Ads API ${res.status}: ${text.slice(0, 200)}`);
  const json = JSON.parse(text) as { results?: unknown[] };
  return json.results ?? [];
}

// ─── Public functions ────────────────────────────────────────────────────────

export async function getAccountOverview(): Promise<string> {
  const rows = await adsSearch(`
    SELECT
      customer.id,
      customer.descriptive_name,
      customer.currency_code,
      customer.time_zone
    FROM customer
    LIMIT 1
  `) as Array<{ customer: { id: string; descriptive_name: string; currency_code: string; time_zone: string } }>;

  if (!rows.length) return "No account data found.";
  const c = rows[0].customer;
  return `**Google Ads Account**
ID: ${c.id}
Name: ${c.descriptive_name}
Currency: ${c.currency_code}
Timezone: ${c.time_zone}`;
}

export async function getCampaignPerformance(days = 30): Promise<string> {
  const rows = await adsSearch(`
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE segments.date DURING LAST_${days}_DAYS
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.impressions DESC
    LIMIT 20
  `) as Array<{
    campaign: { id: string; name: string; status: string; advertising_channel_type: string };
    metrics: { impressions: string; clicks: string; cost_micros: string; conversions: string; ctr: string; average_cpc: string };
  }>;

  if (!rows.length) return "No campaigns found.";

  const lines = rows.map(r => {
    const spend = (Number(r.metrics.cost_micros) / 1_000_000).toFixed(2);
    const cpc = (Number(r.metrics.average_cpc) / 1_000_000).toFixed(2);
    const ctr = (Number(r.metrics.ctr) * 100).toFixed(2);
    const status = r.campaign.status === "ENABLED" ? "🟢" : r.campaign.status === "PAUSED" ? "⏸️" : "🔴";
    return `${status} **${r.campaign.name}**
   Impressions: ${Number(r.metrics.impressions).toLocaleString()} | Clicks: ${Number(r.metrics.clicks).toLocaleString()} | CTR: ${ctr}%
   Spend: $${spend} | Avg CPC: $${cpc} | Conversions: ${r.metrics.conversions}`;
  });

  return `**Campaign Performance — Last ${days} Days**\n\n${lines.join("\n\n")}`;
}

export async function getTopKeywords(days = 30): Promise<string> {
  const rows = await adsSearch(`
    SELECT
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM keyword_view
    WHERE segments.date DURING LAST_${days}_DAYS
      AND ad_group_criterion.status = 'ENABLED'
    ORDER BY metrics.clicks DESC
    LIMIT 15
  `) as Array<{
    ad_group_criterion: { keyword: { text: string; match_type: string } };
    metrics: { impressions: string; clicks: string; cost_micros: string; conversions: string };
  }>;

  if (!rows.length) return "No keywords found.";

  const lines = rows.map(r => {
    const spend = (Number(r.metrics.cost_micros) / 1_000_000).toFixed(2);
    const kw = r.ad_group_criterion.keyword;
    const matchType = kw.match_type === "EXACT" ? "[exact]" : kw.match_type === "PHRASE" ? '"phrase"' : "broad";
    return `• **${kw.text}** (${matchType}) — ${Number(r.metrics.clicks).toLocaleString()} clicks, $${spend} spend, ${r.metrics.conversions} conv.`;
  });

  return `**Top Keywords — Last ${days} Days**\n\n${lines.join("\n")}`;
}

interface CreateCampaignOptions {
  name: string;
  dailyBudgetUsd: number;
  targetUrl: string;
  keywords: string[];
  headline1: string;
  headline2: string;
  headline3: string;
  description1: string;
  description2: string;
}

export async function createSearchCampaign(opts: CreateCampaignOptions): Promise<string> {
  // Step 1: Create budget
  const budgetRes = await adsRequest("/campaignBudgets:mutate", "POST", {
    operations: [{
      create: {
        name: `${opts.name} Budget`,
        amountMicros: String(Math.round(opts.dailyBudgetUsd * 1_000_000)),
        deliveryMethod: "STANDARD",
      },
    }],
  }) as { results: Array<{ resourceName: string }> };

  const budgetResource = budgetRes.results?.[0]?.resourceName;
  if (!budgetResource) throw new Error("Failed to create campaign budget");

  // Step 2: Create campaign
  const campRes = await adsRequest("/campaigns:mutate", "POST", {
    operations: [{
      create: {
        name: opts.name,
        status: "PAUSED", // Start paused so user can review
        advertisingChannelType: "SEARCH",
        campaignBudget: budgetResource,
        networkSettings: {
          targetGoogleSearch: true,
          targetSearchNetwork: true,
          targetContentNetwork: false,
        },
        biddingStrategyType: "TARGET_SPEND",
      },
    }],
  }) as { results: Array<{ resourceName: string }> };

  const campaignResource = campRes.results?.[0]?.resourceName;
  if (!campaignResource) throw new Error("Failed to create campaign");

  // Step 3: Create ad group
  const agRes = await adsRequest("/adGroups:mutate", "POST", {
    operations: [{
      create: {
        name: `${opts.name} Ad Group`,
        campaign: campaignResource,
        status: "ENABLED",
        type: "SEARCH_STANDARD",
      },
    }],
  }) as { results: Array<{ resourceName: string }> };

  const adGroupResource = agRes.results?.[0]?.resourceName;
  if (!adGroupResource) throw new Error("Failed to create ad group");

  // Step 4: Add keywords
  await adsRequest("/adGroupCriteria:mutate", "POST", {
    operations: opts.keywords.map(kw => ({
      create: {
        adGroup: adGroupResource,
        status: "ENABLED",
        keyword: { text: kw, matchType: "BROAD" },
      },
    })),
  });

  // Step 5: Create responsive search ad
  const cfg = getConfig();
  await adsRequest("/adGroupAds:mutate", "POST", {
    operations: [{
      create: {
        adGroup: adGroupResource,
        status: "PAUSED",
        ad: {
          finalUrls: [opts.targetUrl],
          responsiveSearchAd: {
            headlines: [
              { text: opts.headline1 },
              { text: opts.headline2 },
              { text: opts.headline3 },
            ],
            descriptions: [
              { text: opts.description1 },
              { text: opts.description2 },
            ],
          },
        },
      },
    }],
  });

  return `✅ **Campaign created (PAUSED for review)**
Name: **${opts.name}**
Daily budget: $${opts.dailyBudgetUsd}/day
Keywords: ${opts.keywords.length} added
Ad: Responsive Search Ad
URL: ${opts.targetUrl}
Customer: ${cfg.customerId}

⚠️ Campaign is paused — enable it in Google Ads dashboard when ready.`;
}

export async function pauseCampaign(campaignName: string): Promise<string> {
  const cfg = getConfig();
  // Find campaign by name
  const rows = await adsSearch(`
    SELECT campaign.id, campaign.name, campaign.status, campaign.resource_name
    FROM campaign
    WHERE campaign.name = '${campaignName.replace(/'/g, "\\'")}'
    LIMIT 1
  `) as Array<{ campaign: { id: string; name: string; status: string; resource_name: string } }>;

  if (!rows.length) return `❌ Campaign "${campaignName}" not found.`;
  const c = rows[0].campaign;
  if (c.status === "PAUSED") return `Campaign "${campaignName}" is already paused.`;

  await adsRequest("/campaigns:mutate", "POST", {
    operations: [{
      update: { resourceName: c.resource_name, status: "PAUSED" },
      updateMask: "status",
    }],
  });

  return `⏸️ Campaign **"${campaignName}"** paused (ID: ${c.id}).`;
}

export async function enableCampaign(campaignName: string): Promise<string> {
  const rows = await adsSearch(`
    SELECT campaign.id, campaign.name, campaign.status, campaign.resource_name
    FROM campaign
    WHERE campaign.name = '${campaignName.replace(/'/g, "\\'")}'
    LIMIT 1
  `) as Array<{ campaign: { id: string; name: string; status: string; resource_name: string } }>;

  if (!rows.length) return `❌ Campaign "${campaignName}" not found.`;
  const c = rows[0].campaign;
  if (c.status === "ENABLED") return `Campaign "${campaignName}" is already running.`;

  await adsRequest("/campaigns:mutate", "POST", {
    operations: [{
      update: { resourceName: c.resource_name, status: "ENABLED" },
      updateMask: "status",
    }],
  });

  return `🟢 Campaign **"${campaignName}"** enabled (ID: ${c.id}).`;
}

export async function getAdSpendSummary(days = 7): Promise<string> {
  const rows = await adsSearch(`
    SELECT
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions
    FROM customer
    WHERE segments.date DURING LAST_${days}_DAYS
  `) as Array<{
    metrics: { cost_micros: string; impressions: string; clicks: string; conversions: string };
  }>;

  let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalConversions = 0;
  for (const r of rows) {
    totalSpend += Number(r.metrics.cost_micros);
    totalImpressions += Number(r.metrics.impressions);
    totalClicks += Number(r.metrics.clicks);
    totalConversions += Number(r.metrics.conversions);
  }

  const spendUsd = (totalSpend / 1_000_000).toFixed(2);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
  const cpc = totalClicks > 0 ? ((totalSpend / 1_000_000) / totalClicks).toFixed(2) : "0.00";

  return `**Ad Spend Summary — Last ${days} Days**
Total Spend: **$${spendUsd}**
Impressions: ${totalImpressions.toLocaleString()}
Clicks: ${totalClicks.toLocaleString()}
CTR: ${ctr}%
Avg CPC: $${cpc}
Conversions: ${totalConversions.toLocaleString()}`;
}
