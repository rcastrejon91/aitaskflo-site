"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Bot, Zap, ArrowRight, GitBranch } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-950 to-black text-white">
      <nav className="fixed top-0 w-full z-50 border-b border-gray-800/50 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            AITaskFlo
          </div>
          <div className="flex gap-3">
            <Link href="/lyra">
              <Button variant="outline">
                <GitBranch className="mr-2 h-4 w-4" />
                Lyra Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="min-h-screen flex items-center justify-center pt-20">
        <div className="container mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 mb-8">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">AI-Powered Automation</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Automate Anything
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              with AI in Seconds
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-4 max-w-2xl mx-auto">
            Meet Lyra — a self-improving AI that builds memory, reflects on every conversation, and evolves into smarter versions of itself.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-white/40 mb-10">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
              <Sparkles className="w-3.5 h-3.5" /> Self-Improving
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300">
              <Bot className="w-3.5 h-3.5" /> Persistent Memory
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
              <GitBranch className="w-3.5 h-3.5" /> Lineage Evolution
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-300">
              <Zap className="w-3.5 h-3.5" /> Reflection Engine
            </span>
          </div>

          <div className="flex justify-center">
            <Link href="/lyra">
              <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <GitBranch className="mr-2 h-5 w-5" />
                Open Lyra Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
