"use client";

// react-syntax-highlighter is loaded lazily via useEffect so it is NEVER
// imported at the module top level. Top-level imports end up evaluated when
// Node.js loads the SSR chunk; the CJS circular dependency graph overflows
// the call stack. Keeping the import() inside useEffect means it only ever
// runs in the browser, creating a separate async client chunk instead.

import { useEffect, useState } from "react";

interface Props {
  language: string;
  children: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HL = { Prism: any; oneDark: any };

let cache: HL | null = null;
let pending: Promise<HL> | null = null;

function load(): Promise<HL> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = Promise.all([
      import("react-syntax-highlighter").then((m) => m.Prism),
      import("react-syntax-highlighter/dist/cjs/styles/prism").then((m) => m.oneDark),
    ]).then(([Prism, oneDark]) => {
      cache = { Prism, oneDark };
      return cache;
    });
  }
  return pending;
}

export default function CodeHighlight({ language, children }: Props) {
  const [hl, setHl] = useState<HL | null>(null);

  useEffect(() => {
    load().then(setHl);
  }, []);

  if (!hl) {
    // Plain fallback while the highlighter loads (also what SSR renders)
    return (
      <pre
        style={{
          background: "rgba(0,0,0,0.45)",
          borderRadius: "0.75rem",
          border: "1px solid rgba(255,255,255,0.07)",
          fontSize: "0.78rem",
          margin: "0.75rem 0",
          padding: "1rem",
          overflow: "auto",
          color: "#abb2bf",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        <code>{children}</code>
      </pre>
    );
  }

  const { Prism: SyntaxHighlighter, oneDark } = hl;
  return (
    <SyntaxHighlighter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style={oneDark as any}
      language={language}
      PreTag="div"
      customStyle={{
        background: "rgba(0,0,0,0.45)",
        borderRadius: "0.75rem",
        border: "1px solid rgba(255,255,255,0.07)",
        fontSize: "0.78rem",
        margin: "0.75rem 0",
        padding: "1rem",
      }}
    >
      {children}
    </SyntaxHighlighter>
  );
}
