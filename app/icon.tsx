import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32, height: 32, borderRadius: 8,
          background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 800, color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        L
      </div>
    ),
    { width: 32, height: 32 }
  );
}
