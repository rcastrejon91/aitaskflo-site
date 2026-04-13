/**
 * lib/lyra/publishgen.ts
 *
 * Professional document publishing suite.
 * Templates: textbook, workbook, report, manual, newsletter, proposal, resume
 * Output: KDP-ready PDF with professional layout
 * Delivery: print, email attachment, Google Drive, Dropbox, OneDrive
 */

import Anthropic from "@anthropic-ai/sdk";
import React from "react";
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Types ─────────────────────────────────────────────────────────────────────

export type DocTemplate =
  | "textbook"
  | "workbook"
  | "report"
  | "manual"
  | "newsletter"
  | "proposal"
  | "novel"
  | "children"
  | "recipe";

export interface DocSection {
  title: string;
  content: string;
  imageUrl?: string;
  subsections?: { title: string; content: string }[];
  exercises?: { question: string; answer: string }[];
  callout?: { type: "tip" | "note" | "warning" | "example"; text: string };
}

export interface PublishedDoc {
  title: string;
  subtitle: string;
  author: string;
  template: DocTemplate;
  description: string;
  coverUrl: string;
  sections: DocSection[];
  createdAt: string;
}

// ── Template configs ──────────────────────────────────────────────────────────

const TEMPLATE_CONFIG: Record<DocTemplate, {
  pageW: number; pageH: number;
  primaryColor: string; accentColor: string;
  fontScale: number; label: string;
}> = {
  textbook:   { pageW: 8.5*72, pageH: 11*72,  primaryColor: "#1e3a5f", accentColor: "#e8f0fe", fontScale: 1,    label: "Textbook" },
  workbook:   { pageW: 8.5*72, pageH: 11*72,  primaryColor: "#1a5c38", accentColor: "#e8f5e9", fontScale: 1,    label: "Workbook" },
  report:     { pageW: 8.5*72, pageH: 11*72,  primaryColor: "#1a1a2e", accentColor: "#f0f0f5", fontScale: 1,    label: "Report" },
  manual:     { pageW: 8.5*72, pageH: 11*72,  primaryColor: "#7c2d12", accentColor: "#fff7ed", fontScale: 0.95, label: "Manual" },
  newsletter: { pageW: 8.5*72, pageH: 11*72,  primaryColor: "#4c1d95", accentColor: "#f5f3ff", fontScale: 1.05, label: "Newsletter" },
  proposal:   { pageW: 8.5*72, pageH: 11*72,  primaryColor: "#0c4a6e", accentColor: "#e0f2fe", fontScale: 1,    label: "Proposal" },
  novel:      { pageW: 6*72,   pageH: 9*72,   primaryColor: "#1a0a2e", accentColor: "#f8f0ff", fontScale: 1,    label: "Novel" },
  children:   { pageW: 8.5*72, pageH: 8.5*72, primaryColor: "#7c3aed", accentColor: "#fdf4ff", fontScale: 1.2,  label: "Children's Book" },
  recipe:     { pageW: 6*72,   pageH: 9*72,   primaryColor: "#92400e", accentColor: "#fffbeb", fontScale: 1,    label: "Recipe Book" },
};

// ── Content generator ─────────────────────────────────────────────────────────

async function generateWithClaude(prompt: string, maxTokens = 4096): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content[0].type === "text" ? msg.content[0].text : "";
}

function imageUrl(prompt: string, w = 800, h = 600): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;
}

const TEMPLATE_PROMPTS: Record<DocTemplate, string> = {
  textbook: `academic textbook for students with clear explanations, examples, key terms in bold, and 3 exercises per section`,
  workbook: `interactive workbook with activities, fill-in exercises, reflection questions, and practice problems`,
  report:   `professional business/research report with executive summary, findings, analysis, and recommendations`,
  manual:   `step-by-step user manual with numbered instructions, warnings, tips, and troubleshooting section`,
  newsletter: `engaging newsletter with feature articles, announcements, tips section, and a closing call to action`,
  proposal: `professional business proposal with problem statement, solution, timeline, budget, and expected outcomes`,
  novel:    `compelling novel with rich prose, vivid characters, immersive world-building, and page-turning plot`,
  children: `fun children's book with simple words, engaging story, and colorful scene descriptions for each page`,
  recipe:   `recipe book with ingredients list, step-by-step instructions, cooking tips, and serving suggestions`,
};

export async function generateDocument(
  topic: string,
  template: DocTemplate,
  userNotes: string,
  sectionCount: number,
  authorName: string,
  onProgress?: (msg: string) => void
): Promise<PublishedDoc> {
  const notify = (msg: string) => onProgress?.(msg);
  const cfg = TEMPLATE_CONFIG[template];
  const style = TEMPLATE_PROMPTS[template];

  notify(`Structuring ${cfg.label}…`);

  const outlineRaw = await generateWithClaude(`You are a professional ${cfg.label} author and publisher.

Topic/Content: "${topic}"
${userNotes ? `User's own words/notes to incorporate: "${userNotes}"` : ""}
Template type: ${cfg.label} — ${style}
Number of sections: ${sectionCount}

Return ONLY valid JSON:
{
  "title": "Professional document title",
  "subtitle": "descriptive subtitle",
  "author": "${authorName}",
  "description": "2-3 sentence description",
  "coverImagePrompt": "detailed cover image prompt",
  "sections": [
    {
      "title": "Section title",
      "summary": "What this section covers",
      "imagePrompt": "illustration/diagram prompt for this section",
      "hasExercises": ${template === "textbook" || template === "workbook"},
      "hasCallout": true
    }
  ]
}`);

  const clean = outlineRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const outline = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0] ?? "{}");

  notify("Generating cover…");
  const coverUrl = imageUrl(
    outline.coverImagePrompt ?? `${topic} ${cfg.label} professional cover`,
    Math.round(cfg.pageW), Math.round(cfg.pageH * 0.6)
  );

  const sections: DocSection[] = [];

  for (const sec of (outline.sections ?? []).slice(0, sectionCount)) {
    notify(`Writing: ${sec.title}…`);

    const contentRaw = await generateWithClaude(`You are writing a ${cfg.label} section.

Document: "${outline.title}"
Section: "${sec.title}"
Style: ${style}
${userNotes ? `Incorporate user's notes where relevant: "${userNotes.slice(0, 500)}"` : ""}

Write the full section content. Be thorough, professional, and match the ${cfg.label} style.
${sec.hasExercises ? "Include 3 practice exercises at the end in format: Q: [question] A: [answer]" : ""}
${sec.hasCallout ? "Include one TIP or NOTE callout box." : ""}
At least 400 words.`);

    // Parse exercises if present
    const exercises: DocSection["exercises"] = [];
    if (sec.hasExercises) {
      // Split on "Q:" markers and extract Q/A pairs
      const parts = contentRaw.split(/Q:\s*/);
      for (let i = 1; i < parts.length; i++) {
        const aIdx = parts[i].indexOf("A:");
        if (aIdx !== -1) {
          const question = parts[i].slice(0, aIdx).trim();
          const answer = parts[i].slice(aIdx + 2).split(/Q:/)[0].trim();
          if (question && answer) exercises.push({ question, answer });
        }
      }
    }

    // Parse callout
    let callout: DocSection["callout"];
    const tipMatch = contentRaw.match(/(?:TIP|NOTE|WARNING|EXAMPLE):\s*([\s\S]*?)(?:\n\n|$)/);
    if (tipMatch) {
      const type = tipMatch[0].split(":")[0].toLowerCase() as "tip" | "note" | "warning" | "example";
      callout = { type, text: tipMatch[1].trim().slice(0, 200) };
    }

    notify(`Illustrating: ${sec.title}…`);
    const sectionImageUrl = imageUrl(
      sec.imagePrompt ?? `${sec.title} ${topic} professional illustration diagram`,
      600, 300
    );

    // Clean exercise and callout text from main content
    let cleanContent = contentRaw;
    if (sec.hasExercises) cleanContent = cleanContent.replace(/Q:[\s\S]*?(?=Q:|$)/g, "");
    cleanContent = cleanContent.replace(/(?:TIP|NOTE|WARNING|EXAMPLE):[\s\S]*?(?:\n\n|$)/, "").trim();

    sections.push({
      title: sec.title,
      content: cleanContent,
      imageUrl: sectionImageUrl,
      exercises: exercises.length > 0 ? exercises : undefined,
      callout,
    });
  }

  return {
    title: outline.title ?? topic,
    subtitle: outline.subtitle ?? "",
    author: authorName,
    template,
    description: outline.description ?? "",
    coverUrl,
    sections,
    createdAt: new Date().toISOString(),
  };
}

// ── PDF Renderer ──────────────────────────────────────────────────────────────

export async function generateDocPdf(doc: PublishedDoc): Promise<Buffer> {
  const cfg = TEMPLATE_CONFIG[doc.template];
  const M = 54; // margin

  const styles = StyleSheet.create({
    page: { width: cfg.pageW, height: cfg.pageH, backgroundColor: "#fff", fontFamily: "Helvetica" },
    coverPage: { width: cfg.pageW, height: cfg.pageH, backgroundColor: cfg.primaryColor },
    coverImg: { width: cfg.pageW, height: cfg.pageH * 0.55, objectFit: "cover" },
    coverContent: { padding: M, flex: 1, justifyContent: "center" as const },
    coverTitle: { fontSize: 28, fontFamily: "Helvetica-Bold", color: "#fff", marginBottom: 8, lineHeight: 1.2 },
    coverSub: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 12 },
    coverAuthor: { fontSize: 11, color: "rgba(255,255,255,0.5)" },
    coverBadge: {
      position: "absolute" as const, top: 16, right: 16,
      backgroundColor: cfg.accentColor, borderRadius: 4,
      paddingHorizontal: 10, paddingVertical: 4,
    },
    coverBadgeText: { fontSize: 9, color: cfg.primaryColor, fontFamily: "Helvetica-Bold", textTransform: "uppercase" as const },

    tocPage: { width: cfg.pageW, height: cfg.pageH, padding: M },
    tocHeader: { fontSize: 18, fontFamily: "Helvetica-Bold", color: cfg.primaryColor, marginBottom: 20, borderBottomWidth: 2, borderBottomColor: cfg.primaryColor, paddingBottom: 8 },
    tocRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, marginBottom: 10 },
    tocText: { fontSize: 11, color: "#333", flex: 1 },
    tocDots: { fontSize: 11, color: "#ccc", flex: 1, textAlign: "center" as const },
    tocNum: { fontSize: 11, color: cfg.primaryColor, fontFamily: "Helvetica-Bold" },

    sectionPage: { width: cfg.pageW, height: cfg.pageH, paddingLeft: M + 8, paddingRight: M, paddingTop: M, paddingBottom: M },
    sectionBar: { width: 4, position: "absolute" as const, left: 0, top: 0, bottom: 0, backgroundColor: cfg.primaryColor },
    sectionNum: { fontSize: 9, color: cfg.primaryColor, fontFamily: "Helvetica-Bold", textTransform: "uppercase" as const, letterSpacing: 1.5, marginBottom: 4 },
    sectionTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: cfg.primaryColor, marginBottom: 6, lineHeight: 1.2 },
    divider: { height: 2, backgroundColor: cfg.primaryColor, width: 40, marginBottom: 16 },
    sectionImg: { width: cfg.pageW - M * 2 - 8, height: 160, objectFit: "cover" as const, borderRadius: 4, marginBottom: 14 },
    body: { fontSize: 10.5, lineHeight: 1.75, color: "#1a1a1a", textAlign: "justify" as const, marginBottom: 8, fontFamily: "Times-Roman" },

    callout: { backgroundColor: cfg.accentColor, borderLeftWidth: 4, borderLeftColor: cfg.primaryColor, padding: 10, marginVertical: 12, borderRadius: 2 },
    calloutLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: cfg.primaryColor, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 3 },
    calloutText: { fontSize: 9.5, color: "#333", lineHeight: 1.5 },

    exerciseBox: { backgroundColor: "#f8f9fa", borderRadius: 6, padding: 12, marginTop: 12, borderWidth: 1, borderColor: "#e2e8f0" },
    exerciseTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: cfg.primaryColor, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 8 },
    exerciseQ: { fontSize: 10, color: "#1a1a1a", marginBottom: 4, fontFamily: "Helvetica-Bold" },
    exerciseA: { fontSize: 9.5, color: "#4a5568", marginBottom: 8, fontFamily: "Times-Italic" },

    pageFooter: { position: "absolute" as const, bottom: 20, left: M, right: M, flexDirection: "row" as const, justifyContent: "space-between" as const, borderTopWidth: 0.5, borderTopColor: "#e2e8f0", paddingTop: 6 },
    footerText: { fontSize: 8, color: "#aaa", fontFamily: "Helvetica" },
  });

  // Cover page
  const CoverEl = React.createElement(Page, { size: [cfg.pageW, cfg.pageH], style: styles.coverPage },
    doc.coverUrl
      ? React.createElement(Image, { src: doc.coverUrl, style: styles.coverImg })
      : React.createElement(View, { style: { ...styles.coverImg, backgroundColor: "rgba(0,0,0,0.3)" } }),
    React.createElement(View, { style: styles.coverBadge },
      React.createElement(Text, { style: styles.coverBadgeText }, cfg.label)
    ),
    React.createElement(View, { style: styles.coverContent },
      React.createElement(Text, { style: styles.coverTitle }, doc.title),
      doc.subtitle ? React.createElement(Text, { style: styles.coverSub }, doc.subtitle) : null,
      React.createElement(Text, { style: styles.coverAuthor }, `by ${doc.author}`),
    )
  );

  // TOC page
  const TocEl = React.createElement(Page, { size: [cfg.pageW, cfg.pageH], style: styles.tocPage },
    React.createElement(Text, { style: styles.tocHeader }, "Contents"),
    ...doc.sections.map((s, i) =>
      React.createElement(View, { key: i, style: styles.tocRow },
        React.createElement(Text, { style: styles.tocText }, `${i + 1}. ${s.title}`),
        React.createElement(Text, { style: styles.tocNum }, String(i + 3)),
      )
    )
  );

  // Section pages
  const sectionEls = doc.sections.map((sec, idx) => {
    const paras = sec.content.split("\n").filter(p => p.trim().length > 6).slice(0, 12);
    return React.createElement(Page, { key: idx, size: [cfg.pageW, cfg.pageH], style: styles.sectionPage },
      React.createElement(View, { style: styles.sectionBar }),
      React.createElement(Text, { style: styles.sectionNum }, `Section ${idx + 1}`),
      React.createElement(Text, { style: styles.sectionTitle }, sec.title),
      React.createElement(View, { style: styles.divider }),
      sec.imageUrl
        ? React.createElement(Image, { src: sec.imageUrl, style: styles.sectionImg })
        : null,
      ...paras.map((p, i) =>
        React.createElement(Text, { key: i, style: styles.body }, p)
      ),
      sec.callout
        ? React.createElement(View, { style: styles.callout },
            React.createElement(Text, { style: styles.calloutLabel }, sec.callout.type),
            React.createElement(Text, { style: styles.calloutText }, sec.callout.text),
          )
        : null,
      sec.exercises && sec.exercises.length > 0
        ? React.createElement(View, { style: styles.exerciseBox },
            React.createElement(Text, { style: styles.exerciseTitle }, "Practice Exercises"),
            ...sec.exercises.map((ex, i) =>
              React.createElement(View, { key: i },
                React.createElement(Text, { style: styles.exerciseQ }, `${i + 1}. ${ex.question}`),
                React.createElement(Text, { style: styles.exerciseA }, `Answer: ${ex.answer}`),
              )
            )
          )
        : null,
      React.createElement(View, { style: styles.pageFooter },
        React.createElement(Text, { style: styles.footerText }, doc.title),
        React.createElement(Text, { style: styles.footerText }, String(idx + 3)),
      )
    );
  });

  const docEl = React.createElement(Document,
    { title: doc.title, author: doc.author, subject: doc.description },
    CoverEl, TocEl, ...sectionEls
  );

  return (await renderToBuffer(docEl)) as Buffer;
}

// ── Cloud delivery ────────────────────────────────────────────────────────────

export async function deliverDocument(options: {
  pdfBuffer: Buffer;
  filename: string;
  method: "email" | "drive" | "dropbox" | "onedrive" | "print";
  destination?: string; // email address or folder path
  userId?: string;
}): Promise<string> {
  const { pdfBuffer, filename, method, destination, userId } = options;

  // Save to public/downloads first
  const fsp = await import("fs/promises");
  const nodePath = await import("path");
  const pdfDir = nodePath.default.join(process.cwd(), "public", "downloads");
  await fsp.default.mkdir(pdfDir, { recursive: true });
  await fsp.default.writeFile(nodePath.default.join(pdfDir, filename), pdfBuffer);
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const downloadUrl = `${baseUrl}/downloads/${filename}`;

  if (method === "email" && destination) {
    // Send via SendGrid/Nodemailer with PDF attachment
    const sgKey = process.env.SENDGRID_API_KEY;
    if (sgKey) {
      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${sgKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: destination }] }],
          from: { email: "lyra@aitaskflo.com", name: "Lyra AI" },
          subject: `Your document is ready: ${filename.replace(/-/g, " ").replace(".pdf", "")}`,
          content: [{ type: "text/plain", value: `Your document has been created by Lyra.\n\nDownload it here: ${downloadUrl}` }],
          attachments: [{
            content: pdfBuffer.toString("base64"),
            filename,
            type: "application/pdf",
            disposition: "attachment",
          }],
        }),
      });
      return `📧 Emailed to ${destination}`;
    }
    return `📧 Download link sent — add SENDGRID_API_KEY to enable email attachments. Link: ${downloadUrl}`;
  }

  if (method === "drive" && userId) {
    // Upload to Google Drive via existing google-tools
    try {
      const { toolDriveWrite } = await import("./google-tools");
      const base64 = pdfBuffer.toString("base64");
      await toolDriveWrite(userId, filename, `data:application/pdf;base64,${base64}`);
      return `☁️ Saved to Google Drive → Lyra Documents/${filename}`;
    } catch (e) {
      return `☁️ Google Drive upload failed: ${e instanceof Error ? e.message : String(e)}. Download: ${downloadUrl}`;
    }
  }

  if (method === "print") {
    // Print via desktop agent computer_use
    return `🖨️ Send this to your printer: ${downloadUrl}\n\nOr say "print this" and I'll use the desktop agent to open and print it.`;
  }

  // Default — just return download link
  return downloadUrl;
}
