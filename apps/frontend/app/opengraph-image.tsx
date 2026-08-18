import { ImageResponse } from "next/og";
import type { ReactNode } from "react";

export const runtime = "edge";
export const alt = "Context stays with the work — Thred shared memory for AI agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "https://www.thred.fun";

function ThreadMark({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="8.5" fill="#131514" />
      <path
        d="M9.3 9.1c-2.55 0-2.55 3.82 0 3.82h6.25c2.55 0 2.55 3.82 0 3.82h-3.3c-2.55 0-2.55 3.82 0 3.82h6.45"
        stroke="#F5F7F3"
        strokeWidth="1.95"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.25" cy="9.1" r="1.55" fill="#F5F7F3" />
      <circle cx="20.75" cy="20.57" r="1.55" fill="#F5F7F3" />
    </svg>
  );
}

function AgentNode({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 84,
        height: 84,
        borderRadius: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px solid #d8ded8",
        background: "#ffffff",
        boxShadow: "0 5px 13px rgba(26, 40, 31, 0.08)",
      }}
    >
      {children}
    </div>
  );
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 12% 88%, rgba(145,184,167,.72), transparent 46%), radial-gradient(circle at 84% 18%, rgba(145,184,167,.66), transparent 44%), radial-gradient(circle at 92% 82%, rgba(145,184,167,.48), transparent 40%), #e8f0ec",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 18,
            letterSpacing: 5,
            color: "#466451",
            fontWeight: 700,
            textTransform: "uppercase",
            marginBottom: 36,
          }}
        >
          Context stays with the work
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: "28px 36px",
            borderRadius: 28,
            border: "2px solid rgba(255,255,255,0.85)",
            background: "#eef2ee",
            boxShadow: "0 16px 42px rgba(43, 66, 51, 0.12)",
          }}
        >
          <AgentNode>
            <div style={{ fontSize: 38, color: "#59625b", fontWeight: 700 }}>✺</div>
          </AgentNode>
          <div style={{ fontSize: 28, color: "#93a099" }}>→</div>
          <ThreadMark size={84} />
          <div style={{ fontSize: 28, color: "#93a099" }}>→</div>
          <AgentNode>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${baseUrl}/hydradb-logo-white.png`}
              alt=""
              width={52}
              height={52}
              style={{ objectFit: "contain" }}
            />
          </AgentNode>
          <div style={{ fontSize: 28, color: "#93a099" }}>→</div>
          <AgentNode>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${baseUrl}/codex-mark.png`}
              alt=""
              width={48}
              height={48}
              style={{ objectFit: "contain" }}
            />
          </AgentNode>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 26,
            lineHeight: 1.45,
            color: "#526b58",
            textAlign: "center",
            maxWidth: 760,
          }}
        >
          One current context stream for every agent that picks up the task.
        </div>
      </div>
    ),
    size,
  );
}
