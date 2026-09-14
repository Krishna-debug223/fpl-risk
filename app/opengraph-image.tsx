import { ImageResponse } from "next/og";

export const alt = "FPL Risk — Know the risk behind every move";
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
          <div style={{ width: 18, height: 18, background: "#00ff87" }} />
          <span style={{ fontSize: 25, fontWeight: 900, letterSpacing: 5 }}>FPL RISK</span>
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
