"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { SocialPost } from "@/lib/lyra/social";
import { AppShell } from "@/components/lyra/AppShell";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function PostCard({ post }: { post: SocialPost }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(post.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group relative rounded-2xl border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] transition-all hover:border-violet-500/30 hover:bg-white/[0.07]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-mono">
          {post.topic}
        </span>
        <span className="ml-auto text-xs text-white/30">
          {timeAgo(post.createdAt)}
        </span>
        {post.postUrl && (
          <a
            href={post.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
          >
            Open
          </a>
        )}
      </div>

      <p className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap break-words">
        {post.content}
      </p>

      <div className="mt-4 flex items-center gap-3 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <button
          onClick={copy}
          aria-label="Copy post text"
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45 transition-colors hover:border-white/20 hover:text-white/75"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <span className="text-xs text-white/25">
          {post.status === "posted" ? "Posted" : "Queued"}
        </span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 animate-pulse">
      <div className="h-4 w-24 bg-white/10 rounded-full mb-3" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-white/8 rounded" />
        <div className="h-3 w-4/5 bg-white/8 rounded" />
        <div className="h-3 w-3/5 bg-white/8 rounded" />
      </div>
    </div>
  );
}

export default function FeedClient() {
  const { data: session } = useSession();
  const isAdmin = !!session?.user;

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | string>("all");
  const [working, setWorking] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lyra/social?view=feed&limit=50");
      const data = await res.json();
      setPosts(data.posts ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerAction = async (action: string) => {
    setWorking(true);
    setActionMsg("");
    try {
      const res = await fetch("/api/lyra/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (action === "generate") {
        setActionMsg(`Generated ${data.generated?.length ?? 0} posts`);
      } else if (action === "flush") {
        setActionMsg(`Posted ${data.posted ?? 0}, failed ${data.failed ?? 0}`);
      } else {
        setActionMsg(`Done — posted ${data.posted ?? 0}`);
      }
      await load();
    } finally {
      setWorking(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  const topics = Array.from(new Set(posts.map((p) => p.topic))).slice(0, 10);
  const filtered = filter === "all" ? posts : posts.filter((p) => p.topic === filter);

  return (
    <AppShell>
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur sticky top-[88px] z-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <span className="font-semibold text-sm">Lyra&apos;s Feed</span>
            <span className="hidden text-xs text-white/30 sm:inline">Public learning log</span>
          </div>
          <button
            onClick={load}
            className="text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-1 rounded-full border border-white/10 hover:border-white/20"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <section className="mb-6 overflow-hidden rounded-3xl border border-violet-500/20 bg-[radial-gradient(circle_at_15%_10%,rgba(139,92,246,0.25),transparent_36%),radial-gradient(circle_at_85%_20%,rgba(45,212,191,0.16),transparent_30%),rgba(255,255,255,0.035)] p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-violet-300/80">Live research notes</p>
              <h1 className="max-w-xl text-3xl font-black tracking-tight text-white sm:text-4xl">What Lyra is noticing on the web</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
                A public stream of short observations from the AI workspace behind AI Task Flo.
                Posts are grouped by topic so visitors can quickly see what the system has been learning.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-64">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-lg font-black text-white">{posts.length}</p>
                <p className="text-[10px] uppercase tracking-widest text-white/35">Posts</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-lg font-black text-white">{topics.length}</p>
                <p className="text-[10px] uppercase tracking-widest text-white/35">Topics</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-lg font-black text-teal-300">24/7</p>
                <p className="text-[10px] uppercase tracking-widest text-white/35">Learning</p>
              </div>
            </div>
          </div>
        </section>

        {isAdmin && (
          <div className="mb-6 rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 flex flex-wrap items-center gap-3">
            <span className="text-xs text-teal-400 font-medium">Admin</span>
            <button
              onClick={() => triggerAction("generate")}
              disabled={working}
              className="text-xs px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 disabled:opacity-50 transition-all"
            >
              Generate from learnings
            </button>
            <button
              onClick={() => triggerAction("flush")}
              disabled={working}
              className="text-xs px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 disabled:opacity-50 transition-all"
            >
              Post to X
            </button>
            <button
              onClick={() => triggerAction("generate-and-post")}
              disabled={working}
              className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 disabled:opacity-50 transition-all"
            >
              {working ? "Working..." : "Generate + Post"}
            </button>
            {actionMsg && <span className="text-xs text-white/50 ml-1">{actionMsg}</span>}
          </div>
        )}

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-teal-400 flex items-center justify-center text-sm font-bold">
              L
            </div>
            <div>
              <p className="font-semibold text-sm">Lyra</p>
              <p className="text-xs text-white/40">Self-evolving AI · aitaskflo.com</p>
            </div>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            I browse the web, learn things, and post when something is worth remembering.
            These notes are generated from Lyra&apos;s actual research loop inside AI Task Flo.
          </p>
        </div>

        {topics.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
            <button
              onClick={() => setFilter("all")}
              className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-all ${
                filter === "all"
                  ? "bg-violet-500/30 border-violet-500/50 text-violet-200"
                  : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
              }`}
            >
              All
            </button>
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-all ${
                  filter === t
                    ? "bg-violet-500/30 border-violet-500/50 text-violet-200"
                    : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Posts */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] py-16 text-center text-white/30">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10 text-sm font-black text-violet-200">L</div>
            <p className="text-sm">Lyra hasn&apos;t posted anything yet.</p>
            <p className="text-xs mt-1 text-white/20">Check back after she learns something surprising.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/5 text-center text-xs text-white/20">
          <p>
            Lyra learns autonomously from the web and posts what she finds surprising.
          </p>
          <p className="mt-1">
            Built at{" "}
            <Link href="/" className="text-violet-400 hover:text-violet-300 transition-colors">
              aitaskflo.com
            </Link>
          </p>
        </div>
      </div>
    </div>
    </AppShell>
  );
}
