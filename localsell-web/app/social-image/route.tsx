import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  const logo = await readFile(
    path.join(process.cwd(), "public/assets/brand/localsell-logo.png"),
  );
  const brandFont = await readFile(
    path.join(process.cwd(), "public/fonts/Poppins-Bold.ttf"),
  );
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "54px 72px",
        background: "#f4f7fb",
        color: "#16293f",
        fontFamily: "sans-serif",
        borderBottom: "18px solid #1c5bc7",
      }}
    >
      {/* Keep the original image, cropping its transparent side padding in CSS. */}
      <div
        style={{
          display: "flex",
          position: "relative",
          width: 286,
          height: 100,
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${logo.toString("base64")}`}
          alt="Localsell"
          width={360}
          height={100}
          style={{ position: "absolute", left: -38.25, top: 0 }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 68,
            fontWeight: 700,
            fontFamily: "Poppins",
            lineHeight: 1.12,
          }}
        >
          <span>Your neighbourhood.</span>
          <span>Delivered.</span>
        </div>
        <div style={{ fontSize: 28, color: "#526379" }}>
          Food, groceries & everyday essentials in Deogarh
        </div>
      </div>
      <div style={{ fontSize: 25, color: "#1c5bc7" }}>localsell.in</div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Poppins", data: brandFont, weight: 700, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    },
  );
}
