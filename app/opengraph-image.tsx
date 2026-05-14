import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Lyra by AITaskFlo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "#08080f",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        <div style={{
          position: "absolute", top: 0, left: "50%",
          width: 900, height: 500, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(109,40,217,0.28) 0%, transparent 70%)",
          transform: "translateX(-50%) translateY(-40%)",
          display: "flex",
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40, position: "relative" }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 800, color: "white",
          }}>L</div>
          <span style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>
            AITASKFLO
          </span>
        </div>

        <div style={{
          fontSize: 66, fontWeight: 800,
          color: "white", letterSpacing: "-3px",
          lineHeight: 1.05, textAlign: "center",
          maxWidth: 860, marginBottom: 28,
          position: "relative", display: "flex", flexWrap: "wrap", justifyContent: "center",
        }}>
          The AI that remembers, learns, and executes
        </div>

        <div style={{
          fontSize: 22, color: "rgba(255,255,255,0.4)",
          textAlign: "center", position: "relative",
          display: "flex",
        }}>
          Persistent memory · Real automation · Agent evolution
        </div>

        <div style={{
          position: "absolute", bottom: 40,
          display: "flex", gap: 24,
        }}>
          {["Free tier", "No card needed", "Start in seconds"].map((t) => (
            <div key={t} style={{
              padding: "8px 22px", borderRadius: 100,
              border: "1px solid rgba(139,92,246,0.4)",
              background: "rgba(109,40,217,0.12)",
              color: "rgba(196,181,253,0.9)", fontSize: 14, fontWeight: 500,
              display: "flex",
            }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
