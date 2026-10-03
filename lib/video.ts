"use client";

/**
 * Deixa o vídeo do exercício leve antes de subir: converte no próprio celular para MP4 H.264
 * (abre em qualquer aparelho), no máximo 720p e 30 quadros por segundo, com início rápido
 * (toca antes de terminar de baixar). Também tira uma capa em JPEG para mostrar enquanto carrega.
 * A biblioteca só é baixada quando o personal escolhe um vídeo.
 */

/** Limite do balde "videos" no Supabase: só vale para quando não dá para reduzir. */
export const LIMITE_ENVIO_MB = 50;
/** Arquivo original aceito para reduzir (o celular lê aos pedaços, sem carregar tudo na memória). */
const LIMITE_ORIGINAL_MB = 1024;
const DURACAO_MAX_SEG = 120;
const LADO_MENOR = 720;
const QUADROS = 30;

export interface VideoPronto {
  blob: Blob;
  tipo: string;
  ext: string;
  capa: Blob | null;
  /** Tamanho original e final, em bytes. */
  antes: number;
  depois: number;
  reduzido: boolean;
  aviso?: string;
}

/** Mensagem pronta para o personal (as demais falhas caem no envio do original). */
class ErroVideo extends Error {}

const mb = (bytes: number) => bytes / 1024 / 1024;
const par = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/** Mantém a proporção e limita o lado menor a 720 px. */
function medidas(largura: number, altura: number) {
  const escala = Math.min(1, LADO_MENOR / Math.min(largura, altura));
  return { width: par(largura * escala), height: par(altura * escala) };
}

function extensao(tipo: string) {
  return tipo === "video/quicktime" ? "mov" : tipo === "video/webm" ? "webm" : "mp4";
}

/** Sem como reduzir neste navegador: envia o original, se couber. */
function semReduzir(arquivo: File, motivo: string): VideoPronto {
  if (arquivo.size > LIMITE_ENVIO_MB * 1024 * 1024) {
    throw new ErroVideo(`${motivo} O vídeo tem ${Math.round(mb(arquivo.size))} MB e, sem reduzir, o limite é ${LIMITE_ENVIO_MB} MB. Abra o app no Chrome ou no Safari atualizado, grave mais curto ou use um link do YouTube.`);
  }
  if (!/^video\/(mp4|quicktime|webm|x-m4v)$/.test(arquivo.type)) throw new ErroVideo("Formato não aceito. Use MP4, MOV ou WEBM.");
  return { blob: arquivo, tipo: arquivo.type, ext: extensao(arquivo.type), capa: null, antes: arquivo.size, depois: arquivo.size, reduzido: false, aviso: `${motivo} Ele vai como foi gravado.` };
}

async function paraJpeg(c: HTMLCanvasElement | OffscreenCanvas): Promise<Blob | null> {
  if ("convertToBlob" in c) return c.convertToBlob({ type: "image/jpeg", quality: 0.8 });
  return new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.8));
}

export async function prepararVideo(arquivo: File, onProgresso: (p: number) => void, sinal: AbortSignal): Promise<VideoPronto> {
  if (arquivo.type && !arquivo.type.startsWith("video/")) throw new ErroVideo("Escolha um arquivo de vídeo.");
  if (mb(arquivo.size) > LIMITE_ORIGINAL_MB) throw new ErroVideo(`O vídeo tem ${(mb(arquivo.size) / 1024).toFixed(1)} GB. Grave mais curto, de 10 a 30 segundos.`);
  try {
    return await reduzir(arquivo, onProgresso, sinal);
  } catch (e) {
    if (e instanceof ErroVideo || foiCancelado(e) || sinal.aborted) throw e;
    console.warn("Vídeo não reduzido:", e);
    return semReduzir(arquivo, "Não conseguimos reduzir este vídeo.");
  }
}

async function reduzir(arquivo: File, onProgresso: (p: number) => void, sinal: AbortSignal): Promise<VideoPronto> {
  const m = await import("mediabunny");
  const input = new m.Input({ formats: m.ALL_FORMATS, source: new m.BlobSource(arquivo) });
  try {
    const trilha = await input.getPrimaryVideoTrack();
    if (!trilha) throw new ErroVideo("Este arquivo não tem imagem de vídeo.");
    const duracao = await input.computeDuration();
    if (duracao > DURACAO_MAX_SEG) throw new ErroVideo(`O vídeo tem ${Math.round(duracao)} segundos. Para demonstração, grave até ${DURACAO_MAX_SEG / 60} minutos (o ideal é de 10 a 30 segundos).`);

    if (typeof VideoEncoder === "undefined" || !(await trilha.canDecode())) {
      return semReduzir(arquivo, trilha.codec === "hevc"
        ? "Este navegador não lê o formato HEVC do iPhone. Dica: no iPhone, use Ajustes › Câmera › Formatos › “Mais compatível”."
        : "Este navegador não consegue reduzir vídeos.");
    }

    const { width, height } = medidas(trilha.displayWidth, trilha.displayHeight);
    const bitrate = Math.max(500_000, Math.round(width * height * 1.95));
    if (!(await m.canEncodeVideo("avc", { width, height, bitrate }))) return semReduzir(arquivo, "Este navegador não consegue reduzir vídeos.");
    const { averagePacketRate } = await trilha.computePacketStats(60);

    const saida = new m.Output({ format: new m.Mp4OutputFormat({ fastStart: "in-memory" }), target: new m.BufferTarget() });
    const conversao = await m.Conversion.init({
      input, output: saida, tracks: "primary",
      video: { width, height, fit: "fill", codec: "avc", quality: new m.Quality({ bitrate }), frameRate: averagePacketRate > QUADROS + 2 ? QUADROS : undefined },
    });
    if (!conversao.isValid) return semReduzir(arquivo, "Não conseguimos reduzir este vídeo.");
    conversao.onProgress = (p) => onProgresso(p);
    const cancelar = () => { conversao.cancel(); };
    if (sinal.aborted) throw new DOMException("cancelado", "AbortError");
    sinal.addEventListener("abort", cancelar, { once: true });
    try {
      await conversao.execute();
    } finally {
      sinal.removeEventListener("abort", cancelar);
    }

    let capa: Blob | null = null;
    try {
      const sink = new m.CanvasSink(trilha, { width: par(width / 2), height: par(height / 2), fit: "fill" });
      const quadro = await sink.getCanvas((await trilha.getFirstTimestamp()) + Math.min(1, duracao / 2));
      if (quadro) capa = await paraJpeg(quadro.canvas);
    } catch {
      capa = null;
    }

    const blob = new Blob([saida.target.buffer!], { type: "video/mp4" });
    // Arquivo que já era pequeno e compatível: fica o original.
    if (blob.size >= arquivo.size && trilha.codec === "avc" && arquivo.type === "video/mp4") {
      return { blob: arquivo, tipo: "video/mp4", ext: "mp4", capa, antes: arquivo.size, depois: arquivo.size, reduzido: false };
    }
    if (mb(blob.size) > LIMITE_ENVIO_MB) throw new ErroVideo(`Mesmo reduzido, o vídeo ficou com ${Math.round(mb(blob.size))} MB. Grave mais curto, de 10 a 30 segundos.`);
    return { blob, tipo: "video/mp4", ext: "mp4", capa, antes: arquivo.size, depois: blob.size, reduzido: true };
  } finally {
    input.dispose();
  }
}

/** Erro de cancelamento (o personal trocou de vídeo ou fechou a tela): não é para mostrar. */
export function foiCancelado(e: unknown) {
  return (e instanceof DOMException && e.name === "AbortError") || (e instanceof Error && e.name === "ConversionCanceledError");
}
