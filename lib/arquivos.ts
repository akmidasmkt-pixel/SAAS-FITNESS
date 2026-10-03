import { sb } from "./supabase";

export type Balde = "videos" | "fotos" | "conversas";

const cache = new Map<string, { url: string; ate: number }>();

/** Links temporários (1 h) para arquivos privados, com cache de 50 minutos. */
export async function urlsAssinadas(balde: Balde, caminhos: string[]): Promise<Record<string, string>> {
  const agora = Date.now();
  const saida: Record<string, string> = {};
  const faltam: string[] = [];
  for (const c of [...new Set(caminhos.filter(Boolean))]) {
    const k = `${balde}/${c}`;
    const hit = cache.get(k);
    if (hit && hit.ate > agora) saida[c] = hit.url;
    else faltam.push(c);
  }
  if (faltam.length) {
    const { data } = await sb().storage.from(balde).createSignedUrls(faltam, 3600);
    for (const d of data ?? []) {
      if (d.signedUrl && d.path) {
        saida[d.path] = d.signedUrl;
        cache.set(`${balde}/${d.path}`, { url: d.signedUrl, ate: agora + 50 * 60 * 1000 });
      }
    }
  }
  return saida;
}

export async function urlAssinada(balde: Balde, caminho: string): Promise<string | null> {
  const r = await urlsAssinadas(balde, [caminho]);
  return r[caminho] ?? null;
}

export const nomeArquivo = (ext: string) => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

/** Envia um arquivo e devolve o caminho salvo. */
export async function enviar(balde: Balde, caminho: string, arquivo: Blob, tipo?: string): Promise<string> {
  const contentType = (tipo || arquivo.type || "application/octet-stream").split(";")[0];
  const { error } = await sb().storage.from(balde).upload(caminho, arquivo, { contentType, upsert: false, cacheControl: "3600" });
  if (error) throw new Error(/exceeded|too large|size/i.test(error.message) ? "Arquivo grande demais." : error.message);
  return caminho;
}

export async function apagar(balde: Balde, caminhos: string[]) {
  if (!caminhos.length) return;
  await sb().storage.from(balde).remove(caminhos);
}

/** Reduz a foto para no máximo `max` px no lado maior, em JPEG. */
export async function comprimirImagem(arquivo: Blob, max = 1280, qualidade = 0.82): Promise<Blob> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falha(new Error("Não foi possível ler a imagem."));
      i.src = url;
    });
    const escala = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * escala);
    const h = Math.round(img.naturalHeight * escala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((ok, falha) =>
      canvas.toBlob((b) => (b ? ok(b) : falha(new Error("Não foi possível preparar a imagem."))), "image/jpeg", qualidade),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Id do vídeo do YouTube a partir de um link (watch, youtu.be, shorts, embed). */
export function idYoutube(link: string | null | undefined): string | null {
  if (!link) return null;
  const m = link.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
