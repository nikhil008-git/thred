import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Thred shared memory for AI agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function Tile({
  children,
  background = "#ffffff",
  color = "#20231f",
}: {
  children: string;
  background?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        width: 110,
        height: 110,
        borderRadius: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background,
        color,
        fontSize: children === "thred" ? 20 : 32,
        fontWeight: 700,
        boxShadow: "0 18px 35px rgba(20, 45, 28, 0.12)",
      }}
    >
      {children}
    </div>
  );
}

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background:
          "radial-gradient(circle at 13% 18%, #b9ebdf 0, transparent 31%), radial-gradient(circle at 84% 75%, #cfde7c 0, transparent 32%), linear-gradient(135deg, #b8e0ca, #74b488)",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 18,
          letterSpacing: 5,
          color: "#476751",
          fontWeight: 700,
        }}
      >
        ONE SHARED CONTEXT STREAM
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: 42,
          gap: 28,
        }}
      >
        <Tile background="#D87551" color="#fff7f1">
          ✺
        </Tile>
        <div style={{ fontSize: 42, color: "#4d7059" }}>→</div>
        <Tile background="#1c211e" color="#f6f8f4">
          thred
        </Tile>
        <div style={{ fontSize: 42, color: "#4d7059" }}>→</div>
        <Tile background="#ffffff" color="#ff5625">
          ╬
        </Tile>
        <div style={{ fontSize: 42, color: "#4d7059" }}>→</div>
        <Tile background="#ffffff" color="#5669f5">
          ›_
        </Tile>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 46,
          fontSize: 44,
          letterSpacing: -2,
          color: "#172018",
          fontWeight: 700,
        }}
      >
        Memory for the work in motion.
      </div>
    </div>,
    size,
  );
}
