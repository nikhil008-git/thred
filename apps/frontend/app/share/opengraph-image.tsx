import { ImageResponse } from "next/og";
import type { ReactNode } from "react";

export const runtime = "edge";
export const alt = "One shared context stream — Claude, Thred, Memory, Codex";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "https://www.thred.fun";

function ThreadMark({ size = 72 }: { size?: number }) {
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

function FlowNode({
  label,
  children,
  tileBackground = "#ffffff",
  bordered = true,
}: {
  label: string;
  children: ReactNode;
  tileBackground?: string;
  bordered?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: tileBackground,
          border: bordered ? "1px solid #e3e6e1" : "none",
          boxShadow: bordered ? "0 10px 24px rgba(20, 24, 21, 0.08)" : "none",
        }}
      >
        {children}
      </div>
      <div
        style={{
          fontSize: 22,
          color: "#8d918b",
          fontWeight: 500,
          letterSpacing: -0.3,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        color: "#c5c9c3",
        fontSize: 34,
        fontWeight: 400,
        margin: "0 18px",
        marginBottom: 40,
      }}
    >
      →
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
          background: "#fafaf9",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 15,
            letterSpacing: 6,
            color: "#b0b4ae",
            fontWeight: 600,
            textTransform: "uppercase",
            marginBottom: 56,
          }}
        >
          One shared context stream
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <FlowNode label="Claude" tileBackground="#D87551" bordered={false}>
            <div style={{ fontSize: 46, color: "#fff7f1", fontWeight: 700 }}>
              ✺
            </div>
          </FlowNode>
          <Arrow />
          <FlowNode label="Thred" bordered={false}>
            <ThreadMark size={72} />
          </FlowNode>
          <Arrow />
          <FlowNode label="Memory">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${baseUrl}/hydradb-logo-white.png`}
              alt=""
              width={58}
              height={58}
              style={{ objectFit: "contain" }}
            />
          </FlowNode>
          <Arrow />
          <FlowNode label="Codex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${baseUrl}/codex-mark.png`}
              alt=""
              width={54}
              height={54}
              style={{ objectFit: "contain" }}
            />
          </FlowNode>
        </div>
      </div>
    ),
    size,
  );
}
