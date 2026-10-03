import { ImageResponse } from "next/og";
import { SIMBOLO_SVG } from "@/lib/marca";

export const dynamic = "force-static";

// Ícone 512 px do app instalado (Android), gerado a partir do símbolo em vetor.
export function GET() {
  const src = `data:image/svg+xml;base64,${Buffer.from(SIMBOLO_SVG).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
        <img src={src} width={318} height={303} alt="" />
      </div>
    ),
    { width: 512, height: 512 },
  );
}
