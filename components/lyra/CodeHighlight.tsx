"use client";

// This component is dynamically imported with ssr:false in MessageRenderer.
// Isolating react-syntax-highlighter here keeps its CJS circular-dependency
// graph out of the SSR bundle — Turbopack's SSR evaluator overflows on it.

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface Props {
  language: string;
  children: string;
}

export default function CodeHighlight({ language, children }: Props) {
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
