# -*- coding: utf-8 -*-
"""Apply all Dashboard UI upgrades in one safe pass."""

dash = '/home/aitaskflo/components/lyra/Dashboard.tsx'
streaming = '/home/aitaskflo/lib/lyra/streaming.ts'

# ── streaming.ts fix ─────────────────────────────────────────────────────────
s = open(streaming, encoding='utf-8').read()
old_s = '      controller.enqueue(encoder.encode("\u26a0\ufe0f Hmm, hit an issue. Try again in a moment."));\n      return;'
new_s = '      throw new Error("API " + String(res.status) + ": " + errText.slice(0, 80));'
if old_s in s:
    s = s.replace(old_s, new_s, 1)
    open(streaming, 'w', encoding='utf-8').write(s)
    print('[streaming.ts] throw fix: OK')
elif 'throw new Error' in s:
    print('[streaming.ts] throw fix: already applied')
else:
    print('[streaming.ts] throw fix: pattern not found!')

# ── Dashboard.tsx ─────────────────────────────────────────────────────────────
d = open(dash, encoding='utf-8').read()
original_len = len(d)

changes = 0

# 1. Lucide imports — add new icons
OLD = ('  Sparkles, Send, Loader2, Lightbulb, GitBranch,\n'
       '  Zap, ArrowLeft, CheckCircle, AlertCircle, X, LogOut, SlidersHorizontal,')
NEW = ('  Sparkles, Send, Loader2, Lightbulb, GitBranch,\n'
       '  Zap, ArrowLeft, CheckCircle, AlertCircle, X, LogOut, SlidersHorizontal,\n'
       '  MessageSquare, Plus, Search, Clock, Command,')
if OLD in d:
    d = d.replace(OLD, NEW, 1); changes += 1
    print('[1] imports: OK')
elif 'Command,' in d:
    print('[1] imports: already applied')
else:
    print('[1] imports: FAIL - pattern not found')

# 2. State vars — add after notification state
OLD = ('  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);\n'
       '  const messagesEndRef')
NEW = ('  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);\n'
       '  const [conversations, setConversations] = useState<Array<{ id: string; summary: string; message_count: number; timestamp: string }>>([]);\n'
       '  const [todayUsage, setTodayUsage] = useState(0);\n'
       '  const [dailyLimit, setDailyLimit] = useState(20);\n'
       '  const [showCmdPalette, setShowCmdPalette] = useState(false);\n'
       '  const [cmdQuery, setCmdQuery] = useState("");\n'
       '  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);\n'
       '  const messagesEndRef')
if OLD in d:
    d = d.replace(OLD, NEW, 1); changes += 1
    print('[2] state: OK')
elif 'leftSidebarOpen' in d:
    print('[2] state: already applied')
else:
    print('[2] state: FAIL')

# 3. useEffects for conversations load + Cmd+K shortcut
OLD = '  async function sendMessage() {'
NEW = ('  useEffect(() => {\n'
       '    fetch("/api/lyra/conversations?limit=20")\n'
       '      .then(r => r.ok ? r.json() : null)\n'
       '      .then(d => { if (d) { setConversations(d.conversations ?? []); setTodayUsage(d.todayUsage ?? 0); setDailyLimit(d.dailyLimit ?? 20); } })\n'
       '      .catch(() => {});\n'
       '  }, []);\n\n'
       '  useEffect(() => {\n'
       '    const onKey = (e: KeyboardEvent) => {\n'
       '      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setShowCmdPalette(p => !p); setCmdQuery(""); }\n'
       '      if (e.key === "Escape") setShowCmdPalette(false);\n'
       '    };\n'
       '    window.addEventListener("keydown", onKey);\n'
       '    return () => window.removeEventListener("keydown", onKey);\n'
       '  }, []);\n\n'
       '  async function sendMessage() {')
if OLD in d and 'conversations?limit' not in d:
    d = d.replace(OLD, NEW, 1); changes += 1
    print('[3] effects: OK')
elif 'conversations?limit' in d:
    print('[3] effects: already applied')
else:
    print('[3] effects: FAIL')

# 4. QUICK_PROMPTS array -> WORKFLOW_TEMPLATES
OLD = ('  const QUICK_PROMPTS = [\n'
       '    { icon: "\u26a1", text: "How can I automate my email workflow?" },\n'
       '    { icon: "\u270d\ufe0f", text: "Write a blog post about AI automation" },\n'
       '    { icon: "\U0001f399\ufe0f", text: "Create a podcast script about productivity" },\n'
       '  ];')
NEW = ('  const WORKFLOW_TEMPLATES = [\n'
       '    { category: "Email",    text: "Draft a professional follow-up email from our last meeting", color: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.22)" },\n'
       '    { category: "Research", text: "Research and summarize the latest AI news today",            color: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.22)" },\n'
       '    { category: "Game",     text: "Build me a browser snake game",                              color: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.22)" },\n'
       '    { category: "Music",    text: "Generate a chill lo-fi background track",                   color: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.22)" },\n'
       '    { category: "Content",  text: "Write a blog post about AI automation in 2025",             color: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.22)" },\n'
       '    { category: "Data",     text: "Look up the current stock price for Tesla",                 color: "rgba(20,184,166,0.12)",  border: "rgba(20,184,166,0.22)" },\n'
       '  ];')
if OLD in d:
    d = d.replace(OLD, NEW, 1); changes += 1
    print('[4] templates: OK')
elif 'WORKFLOW_TEMPLATES' in d:
    print('[4] templates: already applied')
else:
    # Try fuzzy — just find QUICK_PROMPTS = [  and replace whole block
    import re
    m = re.search(r'  const QUICK_PROMPTS = \[.*?\];', d, re.DOTALL)
    if m:
        d = d[:m.start()] + NEW + d[m.end():]
        changes += 1
        print('[4] templates: OK (regex fallback)')
    else:
        print('[4] templates: FAIL - not found')

# 5. Header — usage meter + Cmd+K button + sidebar toggle
OLD = '        <div className="ml-auto flex items-center gap-2">\n          {activeAgent.averageScore > 0 && ('
NEW = ('        <div className="ml-auto flex items-center gap-2">\n'
       '          {todayUsage > 0 && (\n'
       '            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>\n'
       '              <div className="w-14 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>\n'
       '                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((todayUsage/dailyLimit)*100,100)}%`, background: todayUsage>=dailyLimit?"rgb(239,68,68)":"rgb(139,92,246)" }} />\n'
       '              </div>\n'
       '              <span className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.3)" }}>{todayUsage}/{dailyLimit}</span>\n'
       '            </div>\n'
       '          )}\n'
       '          <button\n'
       '            onClick={() => { setShowCmdPalette(true); setCmdQuery(""); }}\n'
       '            className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-all"\n'
       '            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}\n'
       '            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color="rgba(255,255,255,0.7)"; (e.currentTarget as HTMLButtonElement).style.borderColor="rgba(255,255,255,0.15)"; }}\n'
       '            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color="rgba(255,255,255,0.3)"; (e.currentTarget as HTMLButtonElement).style.borderColor="rgba(255,255,255,0.08)"; }}\n'
       '          >\n'
       '            <Command className="w-3 h-3" /><span>K</span>\n'
       '          </button>\n'
       '          <button\n'
       '            onClick={() => setLeftSidebarOpen(p => !p)}\n'
       '            className="p-1.5 transition-colors hidden lg:block"\n'
       '            style={{ color: leftSidebarOpen ? "rgba(139,92,246,0.8)" : "rgba(255,255,255,0.2)" }}\n'
       '            title="Toggle sidebar"\n'
       '            onMouseEnter={(e) => (e.currentTarget.style.color="rgba(255,255,255,0.6)")}\n'
       '            onMouseLeave={(e) => (e.currentTarget.style.color=leftSidebarOpen?"rgba(139,92,246,0.8)":"rgba(255,255,255,0.2)")}\n'
       '          >\n'
       '            <SlidersHorizontal className="w-3.5 h-3.5" />\n'
       '          </button>\n'
       '          {activeAgent.averageScore > 0 && (')
if OLD in d and 'todayUsage > 0' not in d:
    d = d.replace(OLD, NEW, 1); changes += 1
    print('[5] header: OK')
elif 'todayUsage > 0' in d:
    print('[5] header: already applied')
else:
    print('[5] header: FAIL')

# 6. Left sidebar — insert before Center chat main
OLD = ('        {/* Center \u2014 Chat */}\n'
       '        <main className="flex-1 flex flex-col overflow-hidden min-w-0">')
NEW = ('        {/* Left sidebar \u2014 History */}\n'
       '        {leftSidebarOpen && (\n'
       '          <aside className="w-52 flex-col flex-shrink-0 overflow-hidden hidden lg:flex" style={{ background: "rgba(0,0,0,0.3)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>\n'
       '            <div className="px-3 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>\n'
       '              <button\n'
       '                onClick={() => window.location.reload()}\n'
       '                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all"\n'
       '                style={{ background: "rgba(109,40,217,0.15)", border: "1px solid rgba(109,40,217,0.3)", color: "rgb(196,181,253)" }}\n'
       '                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background="rgba(109,40,217,0.25)"; }}\n'
       '                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background="rgba(109,40,217,0.15)"; }}\n'
       '              >\n'
       '                <Plus className="w-3.5 h-3.5" /> New Chat\n'
       '              </button>\n'
       '            </div>\n'
       '            <div className="flex-1 overflow-y-auto py-2">\n'
       '              {conversations.length === 0 ? (\n'
       '                <div className="px-3 py-6 text-center">\n'
       '                  <MessageSquare className="w-5 h-5 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.12)" }} />\n'
       '                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>No history yet</p>\n'
       '                </div>\n'
       '              ) : (\n'
       '                <>\n'
       '                  <p className="px-3 pb-1.5 text-[10px] font-medium uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.18)" }}>Recent</p>\n'
       '                  {conversations.map((c) => (\n'
       '                    <button key={c.id} className="w-full text-left px-3 py-2.5 transition-all"\n'
       '                      style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}\n'
       '                      onClick={() => { if (c.summary) { setInput("Continue from: " + c.summary.slice(0,80)); textareaRef.current?.focus(); } }}\n'
       '                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background="rgba(255,255,255,0.04)"; }}\n'
       '                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background="transparent"; }}\n'
       '                    >\n'
       '                      <p className="text-[11px] leading-relaxed truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{c.summary || "Conversation"}</p>\n'
       '                      <div className="flex items-center gap-1.5 mt-0.5">\n'
       '                        <Clock className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />\n'
       '                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.22)" }}>{new Date(c.timestamp).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>\n'
       '                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>{c.message_count}m</span>\n'
       '                      </div>\n'
       '                    </button>\n'
       '                  ))}\n'
       '                </>\n'
       '              )}\n'
       '            </div>\n'
       '            <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>\n'
       '              <div className="flex items-center justify-between mb-1.5">\n'
       '                <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>Today</span>\n'
       '                <span className="text-[10px] tabular-nums font-medium" style={{ color: todayUsage>=dailyLimit?"rgb(239,68,68)":"rgba(255,255,255,0.4)" }}>{todayUsage}/{dailyLimit}</span>\n'
       '              </div>\n'
       '              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>\n'
       '                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((todayUsage/dailyLimit)*100,100)}%`, background: todayUsage>=dailyLimit?"rgb(239,68,68)":"linear-gradient(90deg,rgb(109,40,217),rgb(168,85,247))" }} />\n'
       '              </div>\n'
       '              {todayUsage>=dailyLimit && <p className="text-[10px] mt-1" style={{ color: "rgb(252,165,165)" }}>Daily limit reached</p>}\n'
       '            </div>\n'
       '          </aside>\n'
       '        )}\n\n'
       '        {/* Center \u2014 Chat */}\n'
       '        <main className="flex-1 flex flex-col overflow-hidden min-w-0">')
if OLD in d and 'Left sidebar' not in d:
    d = d.replace(OLD, NEW, 1); changes += 1
    print('[6] sidebar: OK')
elif 'Left sidebar' in d:
    print('[6] sidebar: already applied')
else:
    print('[6] sidebar: FAIL')

# 7. Empty state — replace quick prompt cards grid with workflow template grid
OLD = ('{/* Quick prompt cards */}\n'
       '                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">\n'
       '                  {QUICK_PROMPTS.map((p) => (\n'
       '                    <button\n'
       '                      key={p.text}\n'
       '                      onClick={() => { setInput(p.text); textareaRef.current?.focus(); }}\n'
       '                      className="p-4 rounded-xl text-left transition-all"\n'
       '                      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}\n'
       '                      onMouseEnter={(e) => {\n'
       '                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(109,40,217,0.4)";\n'
       '                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(109,40,217,0.06)";\n'
       '                      }}\n'
       '                      onMouseLeave={(e) => {\n'
       '                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";\n'
       '                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.025)";\n'
       '                      }}\n'
       '                    >\n'
       '                      <div className="text-xl mb-2.5">{p.icon}</div>\n'
       '                      <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{p.text}</p>\n'
       '                    </button>\n'
       '                  ))}\n'
       '                </div>')
NEW = ('{/* Workflow templates */}\n'
       '                <div className="w-full max-w-2xl">\n'
       '                  <p className="text-[11px] font-medium mb-3 text-center uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>Start a workflow</p>\n'
       '                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">\n'
       '                    {WORKFLOW_TEMPLATES.map((p) => (\n'
       '                      <button\n'
       '                        key={p.text}\n'
       '                        onClick={() => { setInput(p.text); textareaRef.current?.focus(); }}\n'
       '                        className="p-3.5 rounded-xl text-left transition-all"\n'
       '                        style={{ background: p.color, border: "1px solid " + p.border }}\n'
       '                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity="0.8"; }}\n'
       '                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity="1"; }}\n'
       '                      >\n'
       '                        <span className="text-[10px] font-semibold uppercase tracking-widest mb-2 block" style={{ color: "rgba(255,255,255,0.4)" }}>{p.category}</span>\n'
       '                        <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{p.text}</p>\n'
       '                      </button>\n'
       '                    ))}\n'
       '                  </div>\n'
       '                  <p className="text-center text-[10px] mt-3" style={{ color: "rgba(255,255,255,0.18)" }}>\n'
       '                    Press <kbd style={{ padding: "1px 5px", borderRadius: 4, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.3)", fontSize: 10 }}>Ctrl+K</kbd> for all actions\n'
       '                  </p>\n'
       '                </div>')
if OLD in d:
    d = d.replace(OLD, NEW, 1); changes += 1
    print('[7] empty state grid: OK')
elif 'WORKFLOW_TEMPLATES' in d and 'Start a workflow' in d:
    print('[7] empty state grid: already applied')
else:
    print('[7] empty state grid: FAIL - searching...')
    idx = d.find('Quick prompt cards')
    print('  "Quick prompt cards" at:', idx)
    if idx > 0: print('  context:', repr(d[idx:idx+100]))

# 8. Input chips — update QUICK_PROMPTS.map to WORKFLOW_TEMPLATES
if 'QUICK_PROMPTS.map' in d:
    d = d.replace('{QUICK_PROMPTS.map((p) => (', '{WORKFLOW_TEMPLATES.slice(0,3).map((p) => (')
    changes += 1
    print('[8] chips: OK')
else:
    print('[8] chips: QUICK_PROMPTS.map not found (may be ok)')

# 9. Cmd+K palette — insert before mobile overlay
OLD = '      {/* \u2500\u2500 Mobile right panel overlay'
NEW = ('      {/* Cmd+K palette */}\n'
       '      <AnimatePresence>\n'
       '        {showCmdPalette && (\n'
       '          <motion.div\n'
       '            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}\n'
       '            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"\n'
       '            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}\n'
       '            onClick={() => setShowCmdPalette(false)}\n'
       '          >\n'
       '            <motion.div\n'
       '              initial={{ opacity: 0, y: -12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}\n'
       '              exit={{ opacity: 0, y: -8, scale: 0.97 }}\n'
       '              transition={{ type: "spring", damping: 22, stiffness: 320 }}\n'
       '              className="w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl"\n'
       '              style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)" }}\n'
       '              onClick={(e) => e.stopPropagation()}\n'
       '            >\n'
       '              <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>\n'
       '                <Search className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />\n'
       '                <input autoFocus value={cmdQuery} onChange={(e) => setCmdQuery(e.target.value)}\n'
       '                  placeholder="Search actions..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/30" />\n'
       '                <kbd style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.3)" }}>ESC</kbd>\n'
       '              </div>\n'
       '              <div className="py-2 max-h-72 overflow-y-auto">\n'
       '                {([\n'
       '                  { label: "New Chat",           desc: "Start a fresh conversation",         action: () => window.location.reload() },\n'
       '                  { label: "Build a game",       desc: "Browser game with Phaser",            action: () => { setInput("Build me a browser snake game"); setShowCmdPalette(false); textareaRef.current?.focus(); } },\n'
       '                  { label: "Send an email",      desc: "Draft and send via Gmail",            action: () => { setInput("Draft and send an email to"); setShowCmdPalette(false); textareaRef.current?.focus(); } },\n'
       '                  { label: "Search the web",     desc: "Research any topic in real time",     action: () => { setInput("Search the web for "); setShowCmdPalette(false); textareaRef.current?.focus(); } },\n'
       '                  { label: "Generate music",     desc: "Create a custom audio track",         action: () => { setInput("Generate a chill lo-fi track"); setShowCmdPalette(false); textareaRef.current?.focus(); } },\n'
       '                  { label: "Generate image",     desc: "AI image with fal.ai",                action: () => { setInput("Generate an image of "); setShowCmdPalette(false); textareaRef.current?.focus(); } },\n'
       '                  { label: "Stock price",        desc: "Live market data",                    action: () => { setInput("What is the stock price of "); setShowCmdPalette(false); textareaRef.current?.focus(); } },\n'
       '                  { label: "Games marketplace",  desc: "Browse all built games",              action: () => { window.open("/games", "_blank"); setShowCmdPalette(false); } },\n'
       '                ] as Array<{ label: string; desc: string; action: () => void }>)\n'
       '                  .filter(a => !cmdQuery || a.label.toLowerCase().includes(cmdQuery.toLowerCase()) || a.desc.toLowerCase().includes(cmdQuery.toLowerCase()))\n'
       '                  .map((a, i) => (\n'
       '                    <button key={i} onClick={a.action}\n'
       '                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"\n'
       '                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background="rgba(109,40,217,0.1)"; }}\n'
       '                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background="transparent"; }}\n'
       '                    >\n'
       '                      <div>\n'
       '                        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{a.label}</p>\n'
       '                        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{a.desc}</p>\n'
       '                      </div>\n'
       '                    </button>\n'
       '                  ))}\n'
       '              </div>\n'
       '            </motion.div>\n'
       '          </motion.div>\n'
       '        )}\n'
       '      </AnimatePresence>\n\n'
       '      {/* \u2500\u2500 Mobile right panel overlay')
if OLD in d and 'Cmd+K palette' not in d:
    d = d.replace(OLD, NEW, 1); changes += 1
    print('[9] cmd palette: OK')
elif 'Cmd+K palette' in d:
    print('[9] cmd palette: already applied')
else:
    print('[9] cmd palette: FAIL')

# ── Safety check before writing ──────────────────────────────────────────────
if len(d) < original_len:
    print(f'ERROR: file shrank from {original_len} to {len(d)} chars — aborting write!')
    exit(1)

print(f'\nTotal changes applied: {changes}')
print(f'File size: {original_len} -> {len(d)} chars')
open(dash, 'w', encoding='utf-8').write(d)
print('Dashboard.tsx written OK.')
