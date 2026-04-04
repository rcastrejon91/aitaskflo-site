content = open('/home/aitaskflo/components/lyra/Dashboard.tsx').read()

# ── 1. Add usage meter + Cmd+K + sidebar toggle to header ──────────────────
old_header_actions = """        <div className="ml-auto flex items-center gap-2">
          {activeAgent.averageScore > 0 && (
            <span className="text-[11px] hidden md:block" style={{ color: "rgba(255,255,255,0.2)" }}>
              ★ {activeAgent.averageScore.toFixed(1)}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1.5 transition-colors"
            style={{ color: "rgba(255,255,255,0.2)" }}
            title="Sign out"
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>"""

new_header_actions = """        <div className="ml-auto flex items-center gap-2">
          {activeAgent.averageScore > 0 && (
            <span className="text-[11px] hidden md:block" style={{ color: "rgba(255,255,255,0.2)" }}>
              ★ {activeAgent.averageScore.toFixed(1)}
            </span>
          )}
          {/* Usage meter pill */}
          {todayUsage > 0 && (
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((todayUsage / dailyLimit) * 100, 100)}%`, background: todayUsage >= dailyLimit ? "rgb(239,68,68)" : "rgb(139,92,246)" }} />
              </div>
              <span className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.3)" }}>{todayUsage}/{dailyLimit}</span>
            </div>
          )}
          {/* Cmd+K trigger */}
          <button
            onClick={() => { setShowCmdPalette(true); setCmdQuery(""); }}
            className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.15)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
          >
            <Command className="w-3 h-3" />
            <span>K</span>
          </button>
          {/* Sidebar toggle */}
          <button
            onClick={() => setLeftSidebarOpen(p => !p)}
            className="p-1.5 transition-colors hidden lg:block"
            style={{ color: leftSidebarOpen ? "rgba(139,92,246,0.7)" : "rgba(255,255,255,0.2)" }}
            title="Toggle sidebar"
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = leftSidebarOpen ? "rgba(139,92,246,0.7)" : "rgba(255,255,255,0.2)")}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1.5 transition-colors"
            style={{ color: "rgba(255,255,255,0.2)" }}
            title="Sign out"
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>"""

if old_header_actions in content:
    content = content.replace(old_header_actions, new_header_actions, 1)
    print('header actions: OK')
else:
    print('header actions: FAIL')

# ── 2. Insert left sidebar before main chat panel ───────────────────────────
old_body_start = """{/* ── Body ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Center — Chat */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">"""

new_body_start = """{/* ── Body ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Left — History + Usage sidebar */}
        {leftSidebarOpen && (
          <aside className="w-56 flex-col flex-shrink-0 overflow-hidden hidden lg:flex" style={{ background: "rgba(0,0,0,0.3)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
            {/* New chat */}
            <div className="px-3 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all"
                style={{ background: "rgba(109,40,217,0.15)", border: "1px solid rgba(109,40,217,0.3)", color: "rgb(196,181,253)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(109,40,217,0.25)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(109,40,217,0.15)"; }}
              >
                <Plus className="w-3.5 h-3.5" />
                New Chat
              </button>
            </div>

            {/* Conversation history list */}
            <div className="flex-1 overflow-y-auto py-2">
              {conversations.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <MessageSquare className="w-5 h-5 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.12)" }} />
                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>No history yet</p>
                </div>
              ) : (
                <>
                  <p className="px-3 pb-1.5 text-[10px] font-medium uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.18)" }}>Recent</p>
                  {conversations.map((c) => (
                    <button
                      key={c.id}
                      className="w-full text-left px-3 py-2.5 transition-all"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                      onClick={() => {
                        if (c.summary) { setInput("Continue from: " + c.summary.slice(0, 80)); textareaRef.current?.focus(); }
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      <p className="text-[11px] leading-relaxed truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
                        {c.summary || "Conversation"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.22)" }}>
                          {new Date(c.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>{c.message_count}m</span>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Usage meter */}
            <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>Today</span>
                <span className="text-[10px] tabular-nums font-medium" style={{ color: todayUsage >= dailyLimit ? "rgb(239,68,68)" : "rgba(255,255,255,0.4)" }}>
                  {todayUsage} / {dailyLimit}
                </span>
              </div>
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((todayUsage / dailyLimit) * 100, 100)}%`, background: todayUsage >= dailyLimit ? "rgb(239,68,68)" : "linear-gradient(90deg, rgb(109,40,217), rgb(168,85,247))" }} />
              </div>
              {todayUsage >= dailyLimit && (
                <p className="text-[10px] mt-1.5" style={{ color: "rgb(252,165,165)" }}>Daily limit reached</p>
              )}
            </div>
          </aside>
        )}

        {/* Center — Chat */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">"""

if old_body_start in content:
    content = content.replace(old_body_start, new_body_start, 1)
    print('left sidebar: OK')
else:
    print('left sidebar: FAIL')

# ── 3. Cmd+K palette (insert before mobile overlay) ─────────────────────────
old_mobile_overlay = """      {/* ── Mobile right panel overlay ────────────────────────── */}"""

new_mobile_overlay = """      {/* ── Cmd+K Command Palette ──────────────────────────────── */}
      <AnimatePresence>
        {showCmdPalette && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowCmdPalette(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: "spring", damping: 22, stiffness: 320 }}
              className="w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <Search className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
                <input
                  autoFocus
                  value={cmdQuery}
                  onChange={(e) => setCmdQuery(e.target.value)}
                  placeholder="Search actions..."
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/30"
                />
                <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.3)" }}>ESC</kbd>
              </div>
              <div className="py-2 max-h-72 overflow-y-auto">
                {([
                  { icon: "✨", label: "New Chat", desc: "Start a fresh conversation", action: () => { window.location.reload(); } },
                  { icon: "🎮", label: "Build a game", desc: "Create a browser game with Phaser", action: () => { setInput("Build me a browser snake game"); setShowCmdPalette(false); textareaRef.current?.focus(); } },
                  { icon: "📧", label: "Send an email", desc: "Draft and send via Gmail", action: () => { setInput("Draft and send an email to"); setShowCmdPalette(false); textareaRef.current?.focus(); } },
                  { icon: "🔍", label: "Search the web", desc: "Research any topic in real time", action: () => { setInput("Search the web for "); setShowCmdPalette(false); textareaRef.current?.focus(); } },
                  { icon: "🎵", label: "Generate music", desc: "Create a custom audio track", action: () => { setInput("Generate a chill lo-fi track"); setShowCmdPalette(false); textareaRef.current?.focus(); } },
                  { icon: "🖼️", label: "Generate image", desc: "Create an AI image", action: () => { setInput("Generate an image of "); setShowCmdPalette(false); textareaRef.current?.focus(); } },
                  { icon: "📊", label: "Stock price", desc: "Look up live market data", action: () => { setInput("What is the current stock price of "); setShowCmdPalette(false); textareaRef.current?.focus(); } },
                  { icon: "🌐", label: "Games marketplace", desc: "Browse built games", action: () => { window.open("/games", "_blank"); setShowCmdPalette(false); } },
                ] as Array<{ icon: string; label: string; desc: string; action: () => void }>)
                  .filter(a => !cmdQuery || a.label.toLowerCase().includes(cmdQuery.toLowerCase()) || a.desc.toLowerCase().includes(cmdQuery.toLowerCase()))
                  .map((action, i) => (
                    <button
                      key={i}
                      onClick={action.action}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(109,40,217,0.1)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      <span className="text-base w-6 text-center flex-shrink-0">{action.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{action.label}</p>
                        <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{action.desc}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile right panel overlay ────────────────────────── */}"""

if old_mobile_overlay in content:
    content = content.replace(old_mobile_overlay, new_mobile_overlay, 1)
    print('cmd palette: OK')
else:
    print('cmd palette: FAIL')

open('/home/aitaskflo/components/lyra/Dashboard.tsx', 'w').write(content)
print('File written.')
