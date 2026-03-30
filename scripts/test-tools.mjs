// Lyra tool tester — hits live prod at aitaskflo.com
const BASE = "https://www.aitaskflo.com/api/lyra/chat";
const USER_ID = "admin-1";
const API_KEY = "lyra-guardian-f27fc06d4e8d090e"; // ADMIN_PASSWORD from .env.local

const TESTS = [
  { name: "get_datetime",      msg: "What time is it right now?" },
  { name: "calculate",         msg: "Calculate 42 * 7 + 100" },
  { name: "get_weather",       msg: "What's the weather in Miami right now?" },
  { name: "moon_phase",        msg: "What's the current moon phase?" },
  { name: "world_clock",       msg: "Show me the world clock for major cities" },
  { name: "generate_password", msg: "Generate 3 strong passwords" },
  { name: "generate_qr",       msg: "Generate a QR code for https://aitaskflo.com" },
  { name: "translate",         msg: "Translate 'hello, how are you?' to Spanish" },
  { name: "get_news",          msg: "Get me the latest tech news" },
  { name: "currency_convert",  msg: "Convert 100 USD to EUR and JPY" },
  { name: "stock_price",       msg: "What's the stock price of AAPL and TSLA?" },
  { name: "sun_times",         msg: "When is sunrise and sunset in New York today?" },
  { name: "user_location",     msg: "Where am I located? Use my IP address." },
  { name: "search_web",        msg: "Search the web for latest AI news today" },
  { name: "crm",               msg: "Add Jane Doe to my CRM, email jane@test.com" },
  { name: "create_task",       msg: "Create a task called: Review test results, due tomorrow" },
  { name: "image_gen",         msg: "Generate an image of a futuristic city at night" },
  { name: "send_gif",          msg: "Send me a mind blown reaction gif" },
  { name: "send_email",        msg: "Send an email to test@example.com, subject: Test, body: Hello from Lyra" },
  { name: "send_sms",          msg: "Send an SMS to +15550001234 saying Hello from Lyra" },
  { name: "hubspot",           msg: "Add a HubSpot contact named Test Person email test@hubspot.com" },
  { name: "fal_image",         msg: "Use fal.ai to generate a high quality image of a neon dragon" },
  { name: "fal_tts",           msg: "Use fal tts to say: Hello, I am Lyra, your AI assistant" },
  { name: "fal_music",         msg: "Generate 10 seconds of chill lo-fi music using fal.ai" },
  { name: "fal_sing",          msg: "Sing me a short song about the stars using fal.ai" },
  { name: "fal_video",         msg: "Generate a 5 second video of ocean waves using fal.ai" },
];

const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";

async function testTool(name, msg) {
  const start = Date.now();
  try {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": API_KEY },
      body: JSON.stringify({
        message: msg,
        history: [],
        model: "claude",
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { name, status: "HTTP_ERR", detail: `HTTP ${res.status} ${text.slice(0,80)}`, ms: Date.now() - start };
    }

    // Read streaming response
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
      if (full.length > 4000) break;
    }
    reader.cancel().catch(() => {});

    const ms = Date.now() - start;
    let status = "PASS";
    let detail = "";

    if (full.includes("__LIMIT_REACHED__")) {
      status = "RATE_LIMIT";
      detail = "Hit rate limit";
    } else if (full.includes("__CONFIRM__")) {
      status = "CONFIRM";
      try {
        const json = full.match(/__CONFIRM__(\{.*?\})__CONFIRM__/s)?.[1] ?? "{}";
        const obj = JSON.parse(json);
        detail = `Confirm: ${obj.description ?? "action pending"}`;
      } catch { detail = "Confirm card shown"; }
    } else if (full.includes("__IMG__")) {
      const url = full.match(/__IMG__(.*?)__IMG__/)?.[1] ?? "";
      detail = `Image OK: ${url.slice(0, 70)}`;
    } else if (full.includes("__GIF__")) {
      const url = full.match(/__GIF__(.*?)__GIF__/)?.[1] ?? "";
      detail = `GIF OK: ${url.slice(0, 70)}`;
    } else if (full.includes('"fal_audio"')) {
      try {
        const jsonMatch = full.match(/\{"tool":"fal_audio"[^}]+\}/);
        const obj = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        detail = `Audio OK: ${(obj.url ?? "").slice(0, 70)}`;
      } catch { detail = "Audio generated"; }
    } else if (full.includes('"fal_video"')) {
      try {
        const jsonMatch = full.match(/\{"tool":"fal_video"[^}]+\}/);
        const obj = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        detail = `Video OK: ${(obj.url ?? "").slice(0, 70)}`;
      } catch { detail = "Video generated"; }
    } else if (/not configured|not connected|add.*key.*env|missing key/i.test(full)) {
      status = "NO_KEY";
      const m = full.match(/[^\n]*(?:not configured|not connected|add.*key|missing key)[^\n]*/i);
      detail = (m?.[0] ?? "").trim().slice(0, 100);
    } else if (full.length < 5) {
      status = "EMPTY";
      detail = "(empty response)";
    } else {
      detail = full.replace(/\n/g, " ").trim().slice(0, 120);
    }

    return { name, status, detail, ms };
  } catch (e) {
    const ms = Date.now() - start;
    if (e.name === "TimeoutError" || e.message?.includes("timeout")) {
      return { name, status: "TIMEOUT", detail: "90s timeout exceeded", ms };
    }
    return { name, status: "ERR", detail: e.message?.slice(0, 80) ?? "unknown error", ms };
  }
}

function colorStatus(status) {
  switch (status) {
    case "PASS":       return `${GREEN}${BOLD}✓ PASS${RESET}`;
    case "CONFIRM":    return `${CYAN}${BOLD}⚡ CONFIRM${RESET}`;
    case "NO_KEY":     return `${YELLOW}${BOLD}⚠ NO_KEY${RESET}`;
    case "RATE_LIMIT": return `${YELLOW}${BOLD}⚠ LIMIT${RESET}`;
    case "ERR":        return `${RED}${BOLD}✗ ERR${RESET}`;
    case "HTTP_ERR":   return `${RED}${BOLD}✗ HTTP_ERR${RESET}`;
    case "EMPTY":      return `${YELLOW}${BOLD}? EMPTY${RESET}`;
    case "TIMEOUT":    return `${RED}${BOLD}✗ TIMEOUT${RESET}`;
    default:           return status;
  }
}

console.log(`\n${BOLD}🔬 Lyra Tool Test Suite — ${TESTS.length} tools${RESET}`);
console.log(`${CYAN}Target: ${BASE}${RESET}`);
console.log("─".repeat(70) + "\n");

const results = [];
for (const t of TESTS) {
  process.stdout.write(`  ${t.name.padEnd(22)} `);
  const r = await testTool(t.name, t.msg);
  results.push(r);
  const statusStr = colorStatus(r.status).padEnd(28);
  console.log(`${statusStr} ${r.ms}ms   ${r.detail.slice(0, 90)}`);
  await new Promise(res => setTimeout(res, 1200));
}

const pass    = results.filter(r => ["PASS","CONFIRM"].includes(r.status)).length;
const noKey   = results.filter(r => r.status === "NO_KEY").length;
const fail    = results.filter(r => ["ERR","HTTP_ERR","TIMEOUT","EMPTY","RATE_LIMIT"].includes(r.status)).length;

console.log("\n" + "─".repeat(70));
console.log(`${BOLD}Summary:  ${GREEN}${pass} working${RESET}  |  ${YELLOW}${noKey} missing keys${RESET}  |  ${RED}${fail} broken${RESET}\n`);

if (fail > 0) {
  console.log(`${RED}Broken:${RESET}`);
  results.filter(r => ["ERR","HTTP_ERR","TIMEOUT","EMPTY","RATE_LIMIT"].includes(r.status))
    .forEach(r => console.log(`  ✗ ${r.name.padEnd(22)} ${r.detail}`));
  console.log();
}
if (noKey > 0) {
  console.log(`${YELLOW}Missing keys:${RESET}`);
  results.filter(r => r.status === "NO_KEY")
    .forEach(r => console.log(`  ⚠ ${r.name.padEnd(22)} ${r.detail}`));
  console.log();
}
