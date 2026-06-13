import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            letterSpacing: "0.1em",
            color: "white",
            display: "flex",
          }}
        >
          <span>F</span>
          <span style={{ color: "#fa4141" }}>F</span>
        </div>
        <div
          style={{
            width: 80,
            height: 3,
            background: "#fa4141",
            marginTop: 12,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
