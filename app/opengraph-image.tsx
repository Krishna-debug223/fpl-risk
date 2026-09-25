import { ImageResponse } from "next/og";

export const alt = "FPL Prism — Know the risk behind every move";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#37003c", color: "white", fontFamily: "Arial, Helvetica, sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 34, background: "#00ff87" }} />
      <div style={{ position: "absolute", right: 58, top: 52, width: 320, height: 190, background: "#00ff87", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 28, color: "#37003c" }}>
        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 3 }}>DECISION ENGINE</span>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 72, fontWeight: 900, lineHeight: .9 }}>10K</span>
          <span style={{ fontSize: 22, fontWeight: 800 }}>SIMULATED PATHS</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 105, width: 820 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 30 }}>
          <svg width="30" height="30" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="16" fill="#37003c" />
            <path d="M32 10 53 21v22L32 54 11 43V21L32 10Z" fill="#51205a" stroke="#e8dff0" strokeWidth="1.5" />
            <path d="M32 10v22L11 21 32 10Z" fill="#00ff87" />
            <path d="M32 32v22L11 43l21-11Z" fill="#8c4b93" />
            <path d="m32 32 21-11v22L32 54V32Z" fill="#04f5ff" />
            <path d="m32 19 10 5.3-10 5.2-10-5.2L32 19Z" fill="#fff" opacity=".92" />
            <path d="m32 29.5 10-5.2v10.4L32 40l-10-5.3V24.3l10 5.2Z" fill="#37003c" opacity=".9" />
          </svg>
          <span style={{ fontSize: 25, fontWeight: 900, letterSpacing: 5 }}>FPL PRISM</span>
        </div>
        <div style={{ fontSize: 74, fontWeight: 900, lineHeight: .96, letterSpacing: -3, maxWidth: 760 }}>Know the risk behind every move.</div>
        <div style={{ marginTop: 32, fontSize: 24, color: "#d8cddb" }}>Squad assessment · transfer recommendations · chip planning</div>
      </div>
      <div style={{ position: "absolute", right: 58, bottom: 54, display: "flex", gap: 12 }}>
        <span style={{ background: "white", color: "#37003c", padding: "10px 16px", fontSize: 17, fontWeight: 800 }}>PUBLIC BETA</span>
        <span style={{ background: "#04f5ff", color: "#37003c", padding: "10px 16px", fontSize: 17, fontWeight: 800 }}>LIVE DATA</span>
      </div>
    </div>,
    size,
  );
}
