# -*- coding: utf-8 -*-
import sys

dash_path = '/home/aitaskflo/components/lyra/Dashboard.tsx'
content = open(dash_path, encoding='utf-8', errors='replace').read()

# ── 1. Replace QUICK_PROMPTS block with WORKFLOW_TEMPLATES ──────────────────
# Find the block and replace it
marker = 'const QUICK_PROMPTS = ['
if marker in content:
    idx = content.find(marker)
    # find the closing ]; of the array
    end = content.find('];', idx) + 2
    new_templates = '''const WORKFLOW_TEMPLATES = [
    { icon: "email", category: "Email",    text: "Draft a professional email to follow up on a meeting", color: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.2)" },
    { icon: "search", category: "Research", text: "Research and summarize the latest AI news", color: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.2)" },
    { icon: "game", category: "Game",     text: "Build me a browser snake game", color: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.2)" },
    { icon: "music", category: "Music",    text: "Generate a chill lo-fi background track", color: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.2)" },
    { icon: "write", category: "Content",  text: "Write a blog post about AI automation in 2025", color: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.2)" },
    { icon: "data",  category: "Data",     text: "Get the latest stock price for Tesla and analyze it", color: "rgba(20,184,166,0.12)", border: "rgba(20,184,166,0.2)" },
  ]'''
    content = content[:idx] + new_templates + content[end:]
    print('templates: OK')
else:
    print('templates: marker not found')

# ── 2. Add new imports (MessageSquare, Plus, Search, Clock, Command) ────────
old_imp = '  Zap, ArrowLeft, CheckCircle, AlertCircle, X, LogOut, SlidersHorizontal,'
new_imp = '  Zap, ArrowLeft, CheckCircle, AlertCircle, X, LogOut, SlidersHorizontal,\n  MessageSquare, Plus, Search, Clock, Command,'
if old_imp in content and 'MessageSquare' not in content:
    content = content.replace(old_imp, new_imp, 1)
    print('imports: OK')
else:
    print('imports: skip (already done or not found)')

# ── 3. Add state vars ────────────────────────────────────────────────────────
old_state = '  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);\n  const messagesEndRef'
new_state = '''  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [conversations, setConversations] = useState<Array<{ id: string; summary: string; message_count: number; timestamp: string }>>([]);
  const [todayUsage, setTodayUsage] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(20);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const messagesEndRef'''

if old_state in content and 'leftSidebarOpen' not in content:
    content = content.replace(old_state, new_state, 1)
    print('state: OK')
else:
    print('state: skip (already done or not found)')

# ── 4. Add useEffects ────────────────────────────────────────────────────────
old_send = '  async function sendMessage() {'
new_effects = '''  useEffect(() => {
    fetch("/api/lyra/conversations?limit=20")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setConversations(d.conversations ?? []); setTodayUsage(d.todayUsage ?? 0); setDailyLimit(d.dailyLimit ?? 20); } })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setShowCmdPalette(p => !p); setCmdQuery(""); }
      if (e.key === "Escape") setShowCmdPalette(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  async function sendMessage() {'''

if old_send in content and 'conversations?limit' not in content:
    content = content.replace(old_send, new_effects, 1)
    print('effects: OK')
else:
    print('effects: skip (already done or not found)')

# ── 5. Update header — add usage meter + Cmd+K + sidebar toggle ─────────────
old_ml_auto = '        <div className="ml-auto flex items-center gap-2">'
new_header = '''        <div className="ml-auto flex items-center gap-2">
          {todayUsage > 0 && (
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-14 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min((todayUsage/dailyLimit)*100,100)}%`, background: todayUsage>=dailyLimit?"rgb(239,68,68)":"rgb(139,92,246)" }} />
              </div>
              <span className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.3)" }}>{todayUsage}/{dailyLimit}</span>
            </div>
          )}
          <button
            onClick={() => { setShowCmdPalette(true); setCmdQuery(""); }}
            className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color="rgba(255,255,255,0.7)"; (e.currentTarget as HTMLButtonElement).style.borderColor="rgba(255,255,255,0.15)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color="rgba(255,255,255,0.3)"; (e.currentTarget as HTMLButtonElement).style.borderColor="rgba(255,255,255,0.08)"; }}
          >
            <Command className="w-3 h-3" /><span>K</span>
          </button>
          <button
            onClick={() => setLeftSidebarOpen(p => !p)}
            className="p-1.5 transition-colors hidden lg:block"
            style={{ color: leftSidebarOpen ? "rgba(139,92,246,0.8)" : "rgba(255,255,255,0.2)" }}
            title="Toggle sidebar"
            onMouseEnter={(e) => (e.currentTarget.style.color="rgba(255,255,255,0.6)")}
            onMouseLeave={(e) => (e.currentTarget.style.color=leftSidebarOpen?"rgba(139,92,246,0.8)":"rgba(255,255,255,0.2)")}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>'''

if old_ml_auto in content and 'showCmdPalette' in content and 'todayUsage > 0' not in content:
    content = content.replace(old_ml_auto, new_header, 1)
    print('header: OK')
else:
    print('header: skip')

# ── 6. Insert left sidebar before Center chat ────────────────────────────────
old_body = '''        {/* Center — Chat */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">'''

new_body = '''        {/* Left — Conversation sidebar */}
        {leftSidebarOpen && (
          <aside className="w-52 flex-col flex-shrink-0 overflow-hidden hidden lg:flex" style={{ background: "rgba(0,0,0,0.3)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="px-3 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all"
                style={{ background: "rgba(109,40,217,0.15)", border: "1px solid rgba(109,40,217,0.3)", color: "rgb(196,181,253)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background="rgba(109,40,217,0.25)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background="rgba(109,40,217,0.15)"; }}
              >
                <Plus className="w-3.5 h-3.5" />New Chat
              </button>
            </div>
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
                      onClick={() => { if (c.summary) { setInput("Continue from: " + c.summary.slice(0,80)); textareaRef.current?.focus(); } }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background="rgba(255,255,255,0.04)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background="transparent"; }}
                    >
                      <p className="text-[11px] leading-relaxed truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{c.summary || "Conversation"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.22)" }}>{new Date(c.timestamp).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>{c.message_count}m</span>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
            <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>Today</span>
                <span className="text-[10px] tabular-nums font-medium" style={{ color: todayUsage>=dailyLimit?"rgb(239,68,68)":"rgba(255,255,255,0.4)" }}>{todayUsage}/{dailyLimit}</span>
              </div>
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min((todayUsage/dailyLimit)*100,100)}%`, background: todayUsage>=dailyLimit?"rgb(239,68,68)":"linear-gradient(90deg,rgb(109,40,217),rgb(168,85,247))" }} />
              </div>
              {todayUsage>=dailyLimit && <p className="text-[10px] mt-1" style={{ color: "rgb(252,165,165)" }}>Daily limit reached</p>}
            </div>
          </aside>
        )}

        {/* Center — Chat */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">'''

if old_body in content and 'leftSidebarOpen' in content and 'Conversation sidebar' not in content:
    content = content.replace(old_body, new_body, 1)
    print('sidebar: OK')
else:
    print('sidebar: skip')

# ── 7. Replace empty-state quick prompt grid with workflow templates ──────────
old_grid_marker = '{/* Quick prompt cards */}'
new_grid = '''{/* Workflow templates */}
                <div className="w-full max-w-2xl">
                  <p className="text-[11px] font-medium mb-3 text-center" style={{ color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>START A WORKFLOW</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {WORKFLOW_TEMPLATES.map((p) => (
                      <button
                        key={p.text}
                        onClick={() => { setInput(p.text); textareaRef.current?.focus(); }}
                        className="p-3.5 rounded-xl text-left transition-all"
                        style={{ background: p.color, border: "1px solid " + p.border }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity="0.8"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity="1"; }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.06)" }}>{p.category}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{p.text}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-[10px] mt-3" style={{ color: "rgba(255,255,255,0.18)" }}>
                    Press <kbd style={{ padding: "1px 5px", borderRadius: 4, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.3)" }}>Ctrl+K</kbd> for quick actions
                  </p>
                </div>'''

if old_grid_marker in content and 'WORKFLOW_TEMPLATES' not in content:
    # find and replace the entire grid section
    grid_start = content.find(old_grid_marker)
    # find the closing </div> of the prompt card grid
    # it ends at the </div> that closes the w-full max-w-lg div
    search_from = grid_start
    # find the div containing QUICK_PROMPTS.map
    grid_end_marker = '                </div>\n              </div>'
    grid_end = content.find(grid_end_marker, search_from)
    if grid_end > 0:
        grid_end = grid_end + len(grid_end_marker)
        content = content[:grid_start] + new_grid + content[grid_end:]
        print('empty state grid: OK')
    else:
        print('empty state grid: end not found')
elif 'WORKFLOW_TEMPLATES' in content:
    print('empty state grid: already has WORKFLOW_TEMPLATES')
else:
    print('empty state grid: marker not found')

# ── 8. Fix prompt chips (input area) — replace QUICK_PROMPTS with WORKFLOW_TEMPLATES ─
if 'QUICK_PROMPTS' in content:
    content = content.replace('{QUICK_PROMPTS.map', '{WORKFLOW_TEMPLATES.slice(0,3).map')
    print('chips: OK')
else:
    print('chips: no QUICK_PROMPTS found')

# ── 9. Add Cmd+K palette before mobile overlay ──────────────────────────────
old_mobile = '      {/* ── Mobile right panel overlay'
cmd_palette = '''      {/* Cmd+K Palette */}
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
                <input autoFocus value={cmdQuery} onChange={(e) => setCmdQuery(e.target.value)} placeholder="Search actions..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/30" />
                <kbd style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.3)" }}>ESC</kbd>
              </div>
              <div className="py-2 max-h-72 overflow-y-auto">
                {([
                  { label: "New Chat", desc: "Start a fresh conversation", action: () => window.location.reload() },
                  { label: "Build a game", desc: "Create a browser game with Phaser", action: () => { setInput("Build me a browser snake game"); setShowCmdPalette(false); textareaRef.current?.focus(); } },
                  { label: "Send an email", desc: "Draft and send via Gmail", action: () => { setInput("Draft and send an email to"); setShowCmdPalette(false); textareaRef.current?.focus(); } },
                  { label: "Search the web", desc: "Research any topic in real time", action: () => { setInput("Search the web for "); setShowCmdPalette(false); textareaRef.current?.focus(); } },
                  { label: "Generate music", desc: "Create a custom audio track", action: () => { setInput("Generate a chill lo-fi track"); setShowCmdPalette(false); textareaRef.current?.focus(); } },
                  { label: "Generate image", desc: "Create an AI image with fal", action: () => { setInput("Generate an image of "); setShowCmdPalette(false); textareaRef.current?.focus(); } },
                  { label: "Stock price", desc: "Look up live market data", action: () => { setInput("What is the stock price of "); setShowCmdPalette(false); textareaRef.current?.focus(); } },
                  { label: "Games marketplace", desc: "Browse all built games", action: () => { window.open("/games", "_blank"); setShowCmdPalette(false); } },
                ] as Array<{ label: string; desc: string; action: () => void }>).filter(a =>
                  !cmdQuery || a.label.toLowerCase().includes(cmdQuery.toLowerCase()) || a.desc.toLowerCase().includes(cmdQuery.toLowerCase())
                ).map((action, i) => (
                  <button key={i} onClick={action.action}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background="rgba(109,40,217,0.1)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background="transparent"; }}
                  >
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

      {/* ── Mobile right panel overlay'''

if old_mobile in content and 'Cmd+K Palette' not in content:
    content = content.replace(old_mobile, cmd_palette, 1)
    print('cmd palette: OK')
else:
    print('cmd palette: skip')

# Write final file
open(dash_path, 'w', encoding='utf-8').write(content)
print('Dashboard.tsx written successfully.')
print('Lines:', content.count('\n'))
