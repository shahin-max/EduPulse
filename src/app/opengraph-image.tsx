import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The picture shown when a page link is shared on WhatsApp, Facebook, X or LinkedIn (built once, at build time).
export const alt = "EduPulse Academy, Aligarh: Learn Today, Lead Tomorrow";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const programs = ["Classes 6–10", "Sainik School (AISSEE)", "JEE", "NEET", "AMU & JMI", "CUET", "Spoken English"];

export default async function OpengraphImage() {
  const logo = `data:image/png;base64,${(await readFile(join(process.cwd(), "public", "logo-mark.png"))).toString("base64")}`;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "linear-gradient(135deg, #102716 0%, #173c2a 55%, #276b36 100%)", color: "#ffffff", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> only. */}
        <img src={logo} width={96} height={96} alt="" style={{ borderRadius: 24, background: "#ffffff" }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 44, fontWeight: 700 }}>EduPulse Academy</span>
          <span style={{ fontSize: 26, color: "#8bc77a" }}>Lal Diggi, Civil Lines, Aligarh</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>Learn Today,</span>
        <span style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, color: "#f5d01e" }}>Lead Tomorrow.</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {programs.map(p => (
          <span key={p} style={{ fontSize: 24, padding: "8px 20px", borderRadius: 999, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)" }}>{p}</span>
        ))}
      </div>
    </div>,
    size,
  );
}
