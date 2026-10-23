import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#675DFF", alignItems: "center", justifyContent: "center", gap: 18 }}>
      <div style={{ width: 40, height: 90, borderRadius: 16, background: "white" }} />
      <div style={{ width: 40, height: 56, marginTop: 34, borderRadius: 16, background: "#62DFC4" }} />
    </div>, size,
  );
}
