"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, FlaskConical, ChevronLeft, ChevronRight,
  Trash2, X, ArrowLeft, Loader2, Search,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/lyra/AppShell";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BookChapter {
  number: number;
  title: string;
  content: string;
  imageUrl?: string;
}

interface PaperSection {
  number: number;
  heading: string;
  content: string;
}

interface PaperRef {
  id: number;
  citation: string;
}

type BookContent = BookChapter[] | {
  title?: string;
  abstract?: string;
  keywords?: string[];
  sections?: PaperSection[];
  references?: PaperRef[];
};

interface ShelfBook {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  genre: string | null;
  description: string | null;
  cover_url: string | null;
  content: BookContent;
  word_count: number;
  created_at: string;
}

// ── Spine colors ──────────────────────────────────────────────────────────────

const SPINE_COLORS = [
  ["#7c3aed", "#6d28d9"], ["#2563eb", "#1d4ed8"], ["#059669", "#047857"],
  ["#dc2626", "#b91c1c"], ["#d97706", "#b45309"], ["#db2777", "#be185d"],
  ["#0891b2", "#0e7490"], ["#65a30d", "#4d7c0f"], ["#9333ea", "#7e22ce"],
  ["#ea580c", "#c2410c"],
];

function spineColor(index: number) {
  return SPINE_COLORS[index % SPINE_COLORS.length];
}

function typeIcon(type: string) {
  return type === "research_paper" ? <FlaskConical className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />;
}

function typeLabel(type: string) {
  if (type === "research_paper") return "Research Paper";
  if (type === "comic") return "Comic";
  if (type === "document") return "Document";
  return "Book";
}

// ── BookSpine ─────────────────────────────────────────────────────────────────

function BookSpine({ book, index, onClick }: { book: ShelfBook; index: number; onClick: () => void }) {
  const [top, bottom] = spineColor(index);
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -12, scale: 1.06 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative flex flex-col items-center cursor-pointer group focus:outline-none"
      style={{ width: 44, height: 180 }}
      title={book.title}
    >
      {/* Spine */}
      <div
        className="w-full h-full rounded-sm shadow-lg flex items-center justify-center"
        style={{ background: `linear-gradient(to bottom, ${top}, ${bottom})` }}
      >
        {/* Title text rotated */}
        <span
          className="text-white font-bold text-[10px] leading-tight px-1"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)", maxHeight: 160, overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {book.title}
        </span>
      </div>
      {/* Tooltip on hover */}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none">
        <div className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white shadow-xl min-w-max max-w-[200px]">
          <div className="font-semibold truncate">{book.title}</div>
          {book.genre && <div className="text-gray-400 capitalize">{book.genre}</div>}
          <div className="text-gray-500 mt-0.5">{typeLabel(book.type)}</div>
        </div>
        <div className="w-2 h-2 bg-gray-900 border-r border-b border-white/10 rotate-45 -mt-1" />
      </div>
    </motion.button>
  );
}

// ── BookReader ────────────────────────────────────────────────────────────────

function BookReader({ book, onClose, onDelete }: { book: ShelfBook; onClose: () => void; onDelete: () => void }) {
  const [page, setPage] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isPaper = book.type === "research_paper";
  const paperData = isPaper && !Array.isArray(book.content) ? book.content as Exclude<BookContent, BookChapter[]> : null;
  const chapters = !isPaper && Array.isArray(book.content) ? book.content as BookChapter[] : null;

  const totalPages = isPaper
    ? 1 + (paperData?.sections?.length ?? 0) + (paperData?.references?.length ? 1 : 0)
    : 1 + (chapters?.length ?? 0);

  function prev() { setPage((p) => Math.max(0, p - 1)); }
  function next() { setPage((p) => Math.min(totalPages - 1, p + 1)); }

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  function renderPage() {
    // Cover page
    if (page === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
          {book.cover_url && (
            <img src={book.cover_url} alt="cover" className="w-48 h-64 object-cover rounded-lg shadow-xl" />
          )}
          {!book.cover_url && (
            <div className="w-48 h-64 rounded-lg shadow-xl flex items-center justify-center text-6xl"
              style={{ background: `linear-gradient(135deg, ${spineColor(0)[0]}, ${spineColor(0)[1]})` }}>
              {isPaper ? "📄" : "📖"}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{book.title}</h1>
            {book.subtitle && <p className="text-gray-400 mt-1">{book.subtitle}</p>}
            {book.author && <p className="text-gray-500 text-sm mt-2">by {book.author}</p>}
            {book.genre && <p className="text-violet-400 text-xs mt-1 uppercase tracking-wider">{book.genre}</p>}
            {book.description && <p className="text-gray-400 text-sm mt-4 max-w-md leading-relaxed">{book.description}</p>}
            {paperData?.keywords && (
              <div className="flex flex-wrap gap-1 justify-center mt-3">
                {paperData.keywords.map((k, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-violet-900/40 text-violet-300 border border-violet-700/30">{k}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Research paper sections
    if (isPaper && paperData) {
      const sections = paperData.sections ?? [];
      const refs = paperData.references ?? [];
      const refsPage = 1 + sections.length;

      if (page === refsPage && refs.length > 0) {
        return (
          <div className="overflow-y-auto max-h-full pr-2">
            <h2 className="text-xl font-bold text-white mb-4">References</h2>
            <ol className="space-y-2">
              {refs.map((r) => (
                <li key={r.id} className="text-gray-300 text-sm leading-relaxed">
                  <span className="text-gray-500 mr-2">[{r.id}]</span>{r.citation}
                </li>
              ))}
            </ol>
          </div>
        );
      }

      const section = sections[page - 1];
      if (!section) return null;
      return (
        <div className="overflow-y-auto max-h-full pr-2">
          <h2 className="text-lg font-bold text-white mb-4">{section.heading}</h2>
          <div className="text-gray-300 text-sm leading-7 whitespace-pre-wrap">{section.content}</div>
        </div>
      );
    }

    // Book chapters
    if (chapters) {
      const chapter = chapters[page - 1];
      if (!chapter) return null;
      return (
        <div className="overflow-y-auto max-h-full pr-2">
          <h2 className="text-lg font-bold text-white mb-1">Chapter {chapter.number}</h2>
          <h3 className="text-violet-400 mb-4">{chapter.title}</h3>
          {chapter.imageUrl && (
            <img src={chapter.imageUrl} alt={chapter.title} className="w-full max-h-48 object-cover rounded-lg mb-4 opacity-80" />
          )}
          <div className="text-gray-300 text-sm leading-7 whitespace-pre-wrap">{chapter.content}</div>
        </div>
      );
    }

    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-2xl bg-gray-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col"
        style={{ height: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            {typeIcon(book.type)}
            <span>{typeLabel(book.type)}</span>
            <span className="text-gray-600">·</span>
            <span>{book.word_count > 0 ? `~${book.word_count.toLocaleString()} words` : book.genre}</span>
          </div>
          <div className="flex items-center gap-2">
            {confirmDelete ? (
              <>
                <span className="text-red-400 text-xs">Delete?</span>
                <button onClick={onDelete} className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white">Yes</button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white">No</button>
              </>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-gray-500 hover:text-red-400 transition-colors p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-hidden px-6 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 flex-shrink-0">
          <button
            onClick={prev}
            disabled={page === 0}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === page ? "bg-violet-400" : "bg-gray-600 hover:bg-gray-400"}`}
              />
            ))}
          </div>
          <button
            onClick={next}
            disabled={page === totalPages - 1}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BookshelfPage() {
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "book" | "research_paper">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ShelfBook | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lyra/bookshelf");
      const data = await res.json() as { books: ShelfBook[] };
      setBooks(data.books ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleDelete() {
    if (!selected) return;
    await fetch(`/api/lyra/bookshelf?id=${selected.id}`, { method: "DELETE" });
    setSelected(null);
    void load();
  }

  const visible = books.filter((b) => {
    if (filter !== "all" && b.type !== filter) return false;
    if (search && !b.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const bookRows = visible.filter((b) => b.type === "book" || b.type === "comic" || b.type === "document");
  const paperRows = visible.filter((b) => b.type === "research_paper");
  const showBoth = filter === "all";

  return (
    <AppShell>
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/book" className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <BookOpen className="w-5 h-5 text-violet-400" />
        <h1 className="text-lg font-bold">Bookshelf</h1>
        <div className="flex-1" />
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles…"
            className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 w-44"
          />
        </div>
        {/* Filter tabs */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {(["all", "book", "research_paper"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filter === f ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              {f === "all" ? "All" : f === "book" ? "Books" : "Papers"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-8 space-y-12">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="text-6xl">📚</div>
            <h2 className="text-xl font-semibold text-gray-300">Your shelf is empty</h2>
            <p className="text-gray-500 max-w-sm">
              Ask Lyra to write a book or research paper and it will appear here automatically.
            </p>
            <Link
              href="/"
              className="mt-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-medium transition-colors"
            >
              Chat with Lyra
            </Link>
          </div>
        )}

        {/* Books shelf */}
        {!loading && (showBoth ? bookRows : filter === "book" ? bookRows : []).length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Books</h2>
              <span className="text-gray-600 text-xs">({(showBoth ? bookRows : bookRows).length})</span>
            </div>
            {/* Shelf plank */}
            <div className="relative">
              {/* Wood shelf background */}
              <div className="absolute bottom-0 left-0 right-0 h-4 rounded-b-sm" style={{ background: "linear-gradient(to bottom, #5c3d1e, #3d2810)" }} />
              <div
                className="flex gap-3 items-end px-6 pb-4 pt-2 overflow-x-auto min-h-[200px] rounded-t-xl"
                style={{ background: "linear-gradient(to bottom, rgba(30,15,5,0.6), rgba(20,10,0,0.8))", borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                {bookRows.map((book, i) => (
                  <BookSpine key={book.id} book={book} index={i} onClick={() => setSelected(book)} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Research Papers shelf */}
        {!loading && (showBoth ? paperRows : filter === "research_paper" ? paperRows : []).length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Research Papers</h2>
              <span className="text-gray-600 text-xs">({paperRows.length})</span>
            </div>
            <div className="relative">
              <div className="absolute bottom-0 left-0 right-0 h-4 rounded-b-sm" style={{ background: "linear-gradient(to bottom, #1a3a4a, #0f2030)" }} />
              <div
                className="flex gap-3 items-end px-6 pb-4 pt-2 overflow-x-auto min-h-[200px] rounded-t-xl"
                style={{ background: "linear-gradient(to bottom, rgba(5,20,35,0.6), rgba(0,15,25,0.8))", borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                {paperRows.map((book, i) => (
                  <BookSpine key={book.id} book={book} index={i + 3} onClick={() => setSelected(book)} />
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Reader modal */}
      <AnimatePresence>
        {selected && (
          <BookReader
            book={selected}
            onClose={() => setSelected(null)}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </div>
    </AppShell>
  );
}
