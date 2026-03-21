import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { getActiveAgent, getAgent, incrementConversationCount } from "@/lib/lyra/agents";
import { upsertUser, upsertCrmContact, searchCrmContacts, buildMemoryContext } from "@/lib/lyra/db";


// Real tool definitions
const LYRA_TOOLS: Anthropic.Tool[] = [
  {
    name: "image_gen",
    description:
      "Generate an image from a text description. Use whenever the user asks to create, generate, draw, make, or visualize anything.",
    input_schema: {
      type: "object" as const,
      properties: {
        prompt: { type: "string", description: "Vivid, detailed description including style, lighting, mood." },
      },
      required: ["prompt"],
    },
  },
  {
    name: "send_email",
    description: "Send a real email via Gmail. Use whenever the user asks to send, write, or compose an email.",
    input_schema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string", description: "Email subject line" },
        body: { type: "string", description: "Full email body" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "get_weather",
    description: "Get current weather and forecast for any city or location. Free, no API key needed.",
    input_schema: {
      type: "object" as const,
      properties: {
        location: { type: "string", description: "City name or location, e.g. 'New York' or 'London, UK'" },
      },
      required: ["location"],
    },
  },
  {
    name: "search_web",
    description: "Search the web for current information, news, facts, or anything the user wants to look up.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "read_url",
    description: "Fetch and read the content of any webpage. Use when the user shares a URL or wants you to look at a site.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "Full URL including https://" },
      },
      required: ["url"],
    },
  },
  {
    name: "get_datetime",
    description: "Get the current date and time, optionally in a specific timezone.",
    input_schema: {
      type: "object" as const,
      properties: {
        timezone: { type: "string", description: "IANA timezone, e.g. 'America/New_York'. Defaults to UTC." },
      },
      required: [],
    },
  },
  {
    name: "calculate",
    description: "Evaluate any mathematical expression or calculation.",
    input_schema: {
      type: "object" as const,
      properties: {
        expression: { type: "string", description: "Math expression to evaluate, e.g. '(12 * 8) / 4 + 100'" },
      },
      required: ["expression"],
    },
  },
  {
    name: "crm",
    description: "Create or update a contact in the CRM database. Stores to SQLite — data persists across sessions.",
    input_schema: {
      type: "object" as const,
      properties: {
        action: { type: "string", description: "Action: create, update, or log" },
        contact: { type: "string", description: "Contact name" },
        phone: { type: "string", description: "Phone number" },
        email: { type: "string", description: "Email address" },
        note: { type: "string", description: "Note or details to record" },
      },
      required: ["action", "contact"],
    },
  },
  {
    name: "query_crm",
    description: "Look up contacts in the CRM. Use when user asks who their clients are, to find a contact, or to list everyone in the CRM.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Name, email, or keyword to search. Leave empty to list all contacts." },
      },
      required: [],
    },
  },
];

function pollinationsUrl(prompt: string): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;
}

// ── Real tool implementations ────────────────────────────────────────────────

async function toolSendEmail(to: string, subject: string, body: string): Promise<string> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    return "Email not sent: add GMAIL_USER and GMAIL_APP_PASSWORD to .env.local. Get the app password at myaccount.google.com → Security → App passwords.";
  }
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
    await transporter.sendMail({ from: user, to, subject, text: body });
    return `Email sent to ${to}.`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Email failed: ${msg}`;
  }
}

async function toolGetWeather(location: string): Promise<string> {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
    );
    const geo = await geoRes.json();
    if (!geo.results?.length) return `Location not found: ${location}`;
    const { latitude, longitude, name, country, admin1 } = geo.results[0];
    const wRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=3`
    );
    const w = await wRes.json();
    const c = w.current;
    const codes: Record<number, string> = {
      0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
      45: "Foggy", 51: "Light drizzle", 61: "Light rain", 63: "Moderate rain", 65: "Heavy rain",
      71: "Light snow", 73: "Moderate snow", 75: "Heavy snow",
      80: "Light showers", 81: "Moderate showers", 82: "Heavy showers",
      95: "Thunderstorm", 99: "Thunderstorm with hail",
    };
    const condition = codes[c.weather_code] ?? `Code ${c.weather_code}`;
    const daily = w.daily;
    const forecast = [0, 1, 2].map((i) =>
      `${daily.time[i]}: ${Math.round(daily.temperature_2m_max[i])}°F / ${Math.round(daily.temperature_2m_min[i])}°F`
    ).join(", ");
    return (
      `${name}, ${admin1 ?? ""} ${country}\n` +
      `Now: ${Math.round(c.temperature_2m)}°F (feels ${Math.round(c.apparent_temperature)}°F) — ${condition}\n` +
      `Humidity: ${c.relative_humidity_2m}% | Wind: ${Math.round(c.wind_speed_10m)} mph\n` +
      `3-day forecast: ${forecast}`
    );
  } catch {
    return "Weather lookup failed — try again.";
  }
}

async function toolSearchWeb(query: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { headers: { "User-Agent": "Lyra/1.0" } }
    );
    const data = await res.json();
    const parts: string[] = [];
    if (data.AbstractText) parts.push(data.AbstractText);
    if (data.Answer) parts.push(`Answer: ${data.Answer}`);
    if (data.RelatedTopics?.length) {
      const topics = data.RelatedTopics
        .slice(0, 6)
        .map((t: { Text?: string }) => t.Text)
        .filter(Boolean)
        .join("\n• ");
      if (topics) parts.push(`Related:\n• ${topics}`);
    }
    return parts.length ? parts.join("\n\n") : `No instant results for "${query}". Try being more specific.`;
  } catch {
    return "Search failed — try again.";
  }
}

async function toolReadUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Lyra/1.0)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return `Failed to fetch ${url}: HTTP ${res.status}`;
    const html = await res.text();
    // Strip scripts, styles, tags — keep readable text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);
    return text || "Page loaded but no readable text found.";
  } catch {
    return `Could not fetch ${url} — the site may block external requests.`;
  }
}

function toolGetDatetime(timezone = "UTC"): string {
  try {
    const now = new Date();
    const formatted = now.toLocaleString("en-US", {
      timeZone: timezone,
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short",
    });
    return formatted;
  } catch {
    return new Date().toUTCString();
  }
}

function toolCalculate(expression: string): string {
  try {
    // Sanitize — only allow safe math characters
    const safe = expression.replace(/[^0-9+\-*/().%^, ]/g, "").trim();
    if (!safe) return "Invalid expression.";
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${safe})`)();
    return `${expression} = ${result}`;
  } catch {
    return `Could not evaluate: ${expression}`;
  }
}

// ── Groq fallback (text-only, no tools) ──────────────────────────────────────
async function streamGroqFallback(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    controller.enqueue(encoder.encode("⚠️ AI service unavailable — no API keys configured."));
    return;
  }

  const groqMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: typeof m.content === "string" ? m.content : JSON.stringify(m.content) })),
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      stream: true,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.status.toString());
    controller.enqueue(encoder.encode(`⚠️ Groq error: ${errText}`));
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) return;
  const dec = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      try {
        const json = JSON.parse(line.slice(6));
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) controller.enqueue(encoder.encode(delta));
      } catch { /* skip malformed SSE line */ }
    }
  }
}

// ── Tool dispatcher ───────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  input: Record<string, string>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<string> {
  if (name === "image_gen") {
    const url = pollinationsUrl(input.prompt ?? "");
    controller.enqueue(encoder.encode(`\n__IMG__${url}__IMG__`));
    return "Image generated.";
  }

  if (name === "send_email") {
    const card = JSON.stringify({ tool: "email", to: input.to, subject: input.subject, body: input.body });
    controller.enqueue(encoder.encode(`\n${card}`));
    return await toolSendEmail(input.to ?? "", input.subject ?? "", input.body ?? "");
  }

  if (name === "get_weather") {
    return await toolGetWeather(input.location ?? "");
  }

  if (name === "search_web") {
    return await toolSearchWeb(input.query ?? "");
  }

  if (name === "read_url") {
    return await toolReadUrl(input.url ?? "");
  }

  if (name === "get_datetime") {
    return toolGetDatetime(input.timezone);
  }

  if (name === "calculate") {
    return toolCalculate(input.expression ?? "");
  }

  if (name === "crm") {
    const contact = upsertCrmContact(
      input.contact ?? "",
      input.phone,
      input.email,
      input.note
    );
    const card = JSON.stringify({ tool: "crm", action: input.action, contact: contact.name, phone: contact.phone ?? "", email: contact.email ?? "", note: input.note ?? "" });
    controller.enqueue(encoder.encode(`\n${card}`));
    return `Contact "${contact.name}" saved to CRM (id: ${contact.id}).`;
  }

  if (name === "query_crm") {
    const contacts = searchCrmContacts(input.query);
    if (contacts.length === 0) return input.query ? `No contacts found matching "${input.query}".` : "CRM is empty — no contacts yet.";
    const rows = contacts.map((c) =>
      `• ${c.name}${c.phone ? ` | ${c.phone}` : ""}${c.email ? ` | ${c.email}` : ""}${c.notes ? ` | ${c.notes}` : ""}`
    ).join("\n");
    return `Found ${contacts.length} contact(s):\n${rows}`;
  }

  const card = JSON.stringify({ tool: name, ...input });
  controller.enqueue(encoder.encode(`\n${card}`));
  return `${name} recorded.`;
}

export async function POST(req: NextRequest) {
  try {
    const { message, history, conversationId, agentId, images, userId } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response("Invalid message", { status: 400 });
    }

    const agent = agentId ? getAgent(agentId) : getActiveAgent();
    if (!agent) return new Response("Agent not found", { status: 404 });

    // ── 1. Call Python orchestrator (non-blocking fallback if offline) ─────
    let orchestratorAddendum = "";
    try {
      const orchRes = await fetch(
        `${process.env.PYTHON_ORCHESTRATOR_URL ?? "http://localhost:5328"}/api/lyra`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, userId, history }),
          signal: AbortSignal.timeout(5000),
        }
      );
      if (orchRes.ok) {
        const orch = await orchRes.json();
        const parts: string[] = [];
        if (orch.style_guidance) {
          parts.push(`\n\n## THIS RESPONSE — STYLE\n${orch.style_guidance}`);
        }
        if (orch.approach) {
          parts.push(`\n**Approach:** ${orch.approach}`);
        }
        if (orch.domain_addendum) {
          parts.push(orch.domain_addendum);
        }
        if (orch.user_context?.name) {
          parts.push(`\n\n## USER CONTEXT FROM ORCHESTRATOR\nUser's name: ${orch.user_context.name}`);
        }
        if (orch.user_context?.facts && Object.keys(orch.user_context.facts).length > 0) {
          const factsStr = Object.entries(orch.user_context.facts)
            .map(([k, v]) => `  • ${k}: ${v}`)
            .join("\n");
          parts.push(`Known facts:\n${factsStr}`);
        }
        orchestratorAddendum = parts.join("\n");
      }
    } catch {
      // Orchestrator offline — degrade gracefully, continue with base prompt
    }

    // ── 2. Build memory context from SQLite ───────────────────────────────
    let memoryContext = "";
    if (userId) {
      upsertUser(userId);
      memoryContext = buildMemoryContext(userId);
    }

    const systemPrompt = agent.systemPrompt + orchestratorAddendum + memoryContext;

    // ── 3. Build user content (text + optional images) ────────────────────
    type ImageBlock = { type: "image"; source: { type: "base64"; media_type: string; data: string } };
    type TextBlock = { type: "text"; text: string };
    type ContentBlock = ImageBlock | TextBlock;

    const userContent: ContentBlock[] = [];
    if (Array.isArray(images) && images.length > 0) {
      for (const img of images) {
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: img.mimeType ?? "image/jpeg", data: img.data },
        });
      }
    }
    userContent.push({ type: "text", text: message });

    const messages: Anthropic.MessageParam[] = [
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: userContent.length === 1 ? message : userContent },
    ];

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const anthropicKey = process.env.ANTHROPIC_API_KEY;

          // No Anthropic key — fall back to Groq immediately
          if (!anthropicKey) {
            await streamGroqFallback(systemPrompt, messages as Array<{ role: string; content: string }>, encoder, controller);
            return;
          }

          const client = new Anthropic({ apiKey: anthropicKey });
          let loopMessages = [...messages];
          let iterations = 0;
          const MAX_ITERATIONS = 5;

          while (iterations < MAX_ITERATIONS) {
            iterations++;

            const stream = client.messages.stream({
              model: "claude-opus-4-6",
              max_tokens: 4096,
              system: systemPrompt,
              messages: loopMessages,
              tools: LYRA_TOOLS,
              tool_choice: { type: "auto" },
            });

            let textSoFar = "";
            const toolUses: Array<{ id: string; name: string; inputJson: string }> = [];
            let currentToolUse: { id: string; name: string; inputJson: string } | null = null;

            for await (const event of stream) {
              if (event.type === "content_block_start") {
                if (event.content_block.type === "tool_use") {
                  currentToolUse = {
                    id: event.content_block.id,
                    name: event.content_block.name,
                    inputJson: "",
                  };
                }
              } else if (event.type === "content_block_delta") {
                if (event.delta.type === "text_delta") {
                  textSoFar += event.delta.text;
                  controller.enqueue(encoder.encode(event.delta.text));
                } else if (event.delta.type === "input_json_delta" && currentToolUse) {
                  currentToolUse.inputJson += event.delta.partial_json;
                }
              } else if (event.type === "content_block_stop") {
                if (currentToolUse) {
                  toolUses.push(currentToolUse);
                  currentToolUse = null;
                }
              }
            }

            const finalMessage = await stream.finalMessage();

            if (finalMessage.stop_reason === "end_turn" || toolUses.length === 0) {
              break;
            }

            const assistantContent: Anthropic.ContentBlock[] = finalMessage.content;
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const toolUse of toolUses) {
              let input: Record<string, string> = {};
              try {
                input = JSON.parse(toolUse.inputJson || "{}");
              } catch {
                input = {};
              }
              const result = await executeTool(toolUse.name, input, encoder, controller);
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: result,
              });
            }

            loopMessages = [
              ...loopMessages,
              { role: "assistant", content: assistantContent },
              { role: "user", content: toolResults },
            ];
          }
        } catch (err) {
          // Auth failure → fall back to Groq silently
          if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
            try {
              await streamGroqFallback(systemPrompt, messages as Array<{ role: string; content: string }>, encoder, controller);
            } catch {
              controller.enqueue(encoder.encode("⚠️ AI service unavailable. Please try again."));
            }
          } else {
            controller.error(err);
          }
        } finally {
          controller.close();
        }
      },
    });

    incrementConversationCount(agent.id).catch(console.error);

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Agent-Id": agent.id,
        "X-Agent-Name": agent.name,
        "X-Conversation-Id": conversationId ?? "",
      },
    });
  } catch (error) {
    console.error("Lyra chat error:", error);
    if (error instanceof Anthropic.RateLimitError) {
      return new Response("Rate limited — please try again in a moment.", { status: 429 });
    }
    return new Response("Something went wrong. Please try again.", { status: 500 });
  }
}
