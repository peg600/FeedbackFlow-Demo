import { ImageResponse } from "next/og";

// 固定品牌分享图不包含用户数据，无需数据库或远程字体请求。
export function GET() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: 72, background: "#f0efff", color: "#101828", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 38, fontWeight: 700 }}>
        <svg width="64" height="64" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#675DFF"/><rect x="8" y="8" width="7" height="16" rx="3" fill="white"/><rect x="18" y="14" width="7" height="10" rx="3" fill="#62DFC4"/></svg>
        FeedbackFlow
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 70, fontWeight: 700, lineHeight: 1.1 }}>Better products start with feedback.</div>
        <div style={{ fontSize: 28, color: "#667085" }}>Collect ideas. Prioritize together. Share progress.</div>
      </div>
      <div style={{ display: "flex", fontSize: 22, color: "#675DFF" }}>A full-stack SaaS demo · Next.js + React + PostgreSQL</div>
    </div>,
    { width: 1200, height: 630 },
  );
}
