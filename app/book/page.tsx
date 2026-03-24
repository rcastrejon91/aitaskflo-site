"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Sparkles, Download, ChevronLeft, ChevronRight, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Chapter {
  number: number;
  title: string;
  content: string;
  imageUrl: string;
}

interface Book {
  title: string;
  subtitle: string;
  author: string;
  description: string;
  coverUrl: string;
  chapters: Chapter[];
  genre: string;
  createdAt: string;
}

export default function BookPage() {
  const [concept, setConcept] = useState("");
  const [genre, setGenre] = useState("fantasy");
  const [chapterCount, setChapterCount] = useState(5);
  const [status, setStatus] = useState("");
  const [book, setBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState(0); // 0 = cover
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const GENRES = ["fantasy", "sci-fi", "romance", "thriller", "mystery", "adventure", "horror", "children's"];

  async function generateBook() {
    if (!concept.trim() || generating) return;
    setGenerating(true);
    setBook(null);
    setCurrentPage(0);
    setProgress(0);
    setStatus("Starting…");

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/lyra/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept, genre, chapters: chapterCount }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(await res.text());

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let chaptersReceived = 0;
      let bookData: Partial<Book> = {};
      const chapters: Chapter[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "status") {
              setStatus(event.message);
            } else if (event.type === "outline") {
              bookData = {
                title: event.outline.title,
                subtitle: event.outline.subtitle ?? "",
                author: event.outline.author ?? "Lyra",
                description: event.outline.description ?? "",
                genre,
                createdAt: new Date().toISOString(),
              };
            } else if (event.type === "cover") {
              bookData.coverUrl = event.url;
            } else if (event.type === "chapter") {
              chapters.push(event.chapter);
              chaptersReceived++;
              setProgress(Math.round((chaptersReceived / chapterCount) * 100));
              // Update book in real time as chapters arrive
              setBook({ ...bookData as Book, chapters: [...chapters] });
            } else if (event.type === "complete") {
              setBook(event.book);
              setStatus("Your book is ready!");
            } else if (event.type === "error") {
              setStatus(`Error: ${event.message}`);
            }
          } catch { /* skip malformed line */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setStatus("Generation failed — try again");
      }
    } finally {
      setGenerating(false);
    }
  }

  function downloadBook() {
    if (!book) return;
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${book.title}</title>
<style>
  body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; line-height: 1.8; }
  .cover { text-align: center; padding: 80px 0; border-bottom: 2px solid #333; margin-bottom: 60px; }
  .cover img { width: 300px; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); margin-bottom: 32px; }
  .cover h1 { font-size: 2.5em; margin: 0 0 8px; }
  .cover h2 { font-size: 1.2em; color: #555; font-weight: normal; }
  .cover .author { margin-top: 16px; color: #777; }
  .cover .description { margin-top: 24px; font-style: italic; color: #555; max-width: 500px; margin-left: auto; margin-right: auto; }
  .chapter { margin-bottom: 80px; page-break-before: always; }
  .chapter img { width: 100%; max-width: 600px; border-radius: 8px; margin: 24px auto 32px; display: block; }
  .chapter h2 { font-size: 1.8em; border-bottom: 1px solid #ddd; padding-bottom: 12px; margin-bottom: 24px; }
  .chapter p { margin: 0 0 16px; text-align: justify; }
  .page-num { text-align: center; color: #aaa; font-size: 0.85em; margin-top: 40px; }
</style>
</head>
<body>
<div class="cover">
  <img src="${book.coverUrl}" alt="Cover" />
  <h1>${book.title}</h1>
  ${book.subtitle ? `<h2>${book.subtitle}</h2>` : ""}
  <div class="author">by ${book.author}</div>
  <div class="description">${book.description}</div>
</div>
${book.chapters.map((ch, i) => `
<div class="chapter">
  <h2>Chapter ${ch.number}: ${ch.title}</h2>
  <img src="${ch.imageUrl}" alt="Chapter ${ch.number} illustration" />
  ${ch.content.split("\n").filter(Boolean).map(p => `<p>${p}</p>`).join("")}
  <div class="page-num">— ${i + 2} —</div>
</div>
`).join("")}
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${book.title.replace(/[^a-z0-9]/gi, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = book ? book.chapters.length + 1 : 0; // +1 for cover

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: "#080810" }}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgb(109,40,217) 0%, transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgb(134,25,143) 0%, transparent 70%)", filter: "blur(80px)" }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10 w-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <Link href="/lyra" className="text-white/30 hover:text-white/60 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-violet-400" />
            <h1 className="text-lg font-semibold">Lyra Book Studio</h1>
          </div>
          {book && (
            <button onClick={downloadBook} className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: "rgba(109,40,217,0.2)", border: "1px solid rgba(109,40,217,0.3)", color: "rgb(167,139,250)" }}>
              <Download className="w-4 h-4" /> Download
            </button>
          )}
        </div>

        {/* Generator form */}
        {!book && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-8 mb-8"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 className="text-xl font-semibold mb-6">Create your book</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm text-white/50 mb-2">Your story concept</label>
                <textarea
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="A girl discovers she can talk to stars and must save the universe from silence…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 resize-none"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/50 mb-2">Genre</label>
                  <select value={genre} onChange={(e) => setGenre(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50">
                    {GENRES.map((g) => <option key={g} value={g} className="bg-gray-900">{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/50 mb-2">Chapters</label>
                  <select value={chapterCount} onChange={(e) => setChapterCount(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50">
                    {[3, 5, 7, 10].map((n) => <option key={n} value={n} className="bg-gray-900">{n} chapters</option>)}
                  </select>
                </div>
              </div>

              <button onClick={generateBook} disabled={!concept.trim() || generating}
                className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 4px 20px rgba(109,40,217,0.3)" }}>
                {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> {status}</> : <><Sparkles className="w-4 h-4" /> Write my book</>}
              </button>

              {generating && (
                <div className="space-y-2">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, rgb(109,40,217), rgb(134,25,143))" }}
                      animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
                  </div>
                  <p className="text-xs text-white/40 text-center">{status}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Book viewer */}
        <AnimatePresence>
          {book && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              {/* Page display */}
              <div className="rounded-2xl overflow-hidden mb-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>

                {/* Cover page */}
                {currentPage === 0 && (
                  <motion.div key="cover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col md:flex-row gap-8 p-8">
                    <img src={book.coverUrl} alt="Cover" className="w-full md:w-64 rounded-xl object-cover flex-shrink-0"
                      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.5)", aspectRatio: "3/4" }} />
                    <div className="flex flex-col justify-center">
                      <p className="text-xs text-violet-400 uppercase tracking-widest mb-3">{book.genre}</p>
                      <h2 className="text-3xl font-bold mb-2">{book.title}</h2>
                      {book.subtitle && <p className="text-white/50 text-lg mb-4">{book.subtitle}</p>}
                      <p className="text-white/35 text-sm mb-6">by {book.author}</p>
                      <p className="text-white/60 text-sm leading-relaxed italic">{book.description}</p>
                      <div className="mt-8">
                        <p className="text-xs text-white/25 mb-3">Table of Contents</p>
                        <ul className="space-y-1.5">
                          {book.chapters.map((ch) => (
                            <li key={ch.number}>
                              <button onClick={() => setCurrentPage(ch.number)}
                                className="text-sm text-white/50 hover:text-violet-300 transition-colors text-left">
                                {ch.number}. {ch.title}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Chapter pages */}
                {currentPage > 0 && book.chapters[currentPage - 1] && (() => {
                  const ch = book.chapters[currentPage - 1];
                  return (
                    <motion.div key={`ch-${currentPage}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8">
                      <p className="text-xs text-violet-400 uppercase tracking-widest mb-2">Chapter {ch.number}</p>
                      <h2 className="text-2xl font-bold mb-6">{ch.title}</h2>
                      <img src={ch.imageUrl} alt={ch.title}
                        className="w-full max-w-lg mx-auto rounded-xl object-cover mb-8"
                        style={{ aspectRatio: "16/9", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }} />
                      <div className="prose prose-invert max-w-none">
                        {ch.content.split("\n").filter(Boolean).map((p, i) => (
                          <p key={i} className="text-white/80 text-sm leading-relaxed mb-4">{p}</p>
                        ))}
                      </div>
                      <p className="text-center text-white/20 text-xs mt-8">— {currentPage + 1} —</p>
                    </motion.div>
                  );
                })()}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-25"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                <div className="flex gap-1.5">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button key={i} onClick={() => setCurrentPage(i)}
                      className="w-2 h-2 rounded-full transition-all"
                      style={{ background: i === currentPage ? "rgb(139,92,246)" : "rgba(255,255,255,0.15)" }} />
                  ))}
                </div>

                <button onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-25"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Make another */}
              <div className="text-center mt-8">
                <button onClick={() => { setBook(null); setConcept(""); setProgress(0); setStatus(""); }}
                  className="text-sm text-white/35 hover:text-white/60 transition-colors">
                  Write another book →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
