"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Exercicio } from "@/lib/types";
import { comprimirImagem, idYoutube, urlAssinada } from "@/lib/arquivos";
import { IconCamera, IconFechar, IconFoto, IconVideo } from "@/lib/icons";
import { Botao } from "./ui";

/** Câmera com a foto anterior como guia transparente, para repetir a mesma pose. */
export function CameraGuia({ titulo, fantasma, onFoto, onFechar }: {
  titulo: string; fantasma?: string | null; onFoto: (b: Blob) => void | Promise<void>; onFechar: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const arquivoRef = useRef<HTMLInputElement | null>(null);
  const [frente, setFrente] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [timer, setTimer] = useState<0 | 3 | 10>(0);
  const [contando, setContando] = useState<number | null>(null);
  const [previa, setPrevia] = useState<{ blob: Blob; url: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [guia, setGuia] = useState(true);

  const parar = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (previa) return;
    let vivo = true;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("sem câmera");
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: frente ? "user" : "environment", width: { ideal: 1440 }, height: { ideal: 1920 } }, audio: false,
        });
        if (!vivo) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play().catch(() => {}); }
        setFalhou(false);
      } catch {
        if (vivo) setFalhou(true);
      }
    })();
    return () => { vivo = false; parar(); };
  }, [frente, previa, parar]);

  useEffect(() => () => { if (previa) URL.revokeObjectURL(previa.url); }, [previa]);

  async function capturar() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    const bruto = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.92));
    if (!bruto) return;
    const blob = await comprimirImagem(bruto);
    parar();
    setPrevia({ blob, url: URL.createObjectURL(blob) });
  }

  function disparar() {
    if (!timer) return capturar();
    let n = timer;
    setContando(n);
    const t = setInterval(() => {
      n -= 1;
      if (n <= 0) { clearInterval(t); setContando(null); capturar(); }
      else setContando(n);
    }, 1000);
  }

  async function daGaleria(f: File | undefined) {
    if (!f) return;
    const blob = await comprimirImagem(f);
    parar();
    setPrevia({ blob, url: URL.createObjectURL(blob) });
  }

  async function usar() {
    if (!previa) return;
    setEnviando(true);
    try { await onFoto(previa.blob); } finally { setEnviando(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="flex items-center justify-between px-4 h-14 text-white shrink-0">
        <span className="font-extrabold">{titulo}</span>
        <button type="button" onClick={() => { parar(); onFechar(); }} aria-label="Fechar câmera" className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center cursor-pointer">
          <IconFechar size={18} />
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        {previa ? (
          <img src={previa.url} alt="Prévia da foto" className="absolute inset-0 w-full h-full object-contain" />
        ) : falhou ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white text-center px-8">
            <IconCamera size={40} />
            <p className="text-sm text-white/80">Não conseguimos abrir a câmera aqui. Você pode tirar a foto pelo celular ou escolher uma da galeria.</p>
            <Botao onClick={() => arquivoRef.current?.click()}>Tirar ou escolher foto</Botao>
          </div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted className={`absolute inset-0 w-full h-full object-contain ${frente ? "-scale-x-100" : ""}`} />
            {fantasma && guia ? (
              <img src={fantasma} alt="" className={`absolute inset-0 w-full h-full object-contain opacity-35 pointer-events-none ${frente ? "-scale-x-100" : ""}`} />
            ) : null}
            {contando != null ? (
              <div className="absolute inset-0 flex items-center justify-center text-white text-[120px] font-black drop-shadow-lg">{contando}</div>
            ) : null}
            <p className="absolute bottom-3 inset-x-0 text-center text-xs font-semibold text-white/85 px-6">
              {fantasma ? "Encaixe o corpo na foto anterior: mesma distância, mesma luz." : "Corpo inteiro no quadro, roupa justa e boa luz. Esta foto vira a referência das próximas."}
            </p>
          </>
        )}
      </div>
      <input ref={arquivoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => daGaleria(e.target.files?.[0])} />
      <div className="shrink-0 px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] flex items-center justify-between gap-3">
        {previa ? (
          <>
            <Botao variante="secundario" onClick={() => setPrevia(null)} disabled={enviando}>Refazer</Botao>
            <Botao onClick={usar} disabled={enviando}>{enviando ? "Enviando…" : "Usar esta foto"}</Botao>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => setTimer(timer === 0 ? 3 : timer === 3 ? 10 : 0)} className="h-9 px-3 rounded-full bg-white/15 text-white text-xs font-bold cursor-pointer">
                {timer ? `Timer ${timer} s` : "Sem timer"}
              </button>
              {fantasma ? (
                <button type="button" onClick={() => setGuia(!guia)} className="h-9 px-3 rounded-full bg-white/15 text-white text-xs font-bold cursor-pointer">
                  {guia ? "Guia ligado" : "Guia desligado"}
                </button>
              ) : null}
            </div>
            <button type="button" onClick={disparar} disabled={falhou || contando != null} aria-label="Tirar foto"
              className="w-[72px] h-[72px] rounded-full border-4 border-white bg-white/25 disabled:opacity-40 cursor-pointer" />
            <div className="flex flex-col gap-2 items-end">
              <button type="button" onClick={() => setFrente(!frente)} className="h-9 px-3 rounded-full bg-white/15 text-white text-xs font-bold cursor-pointer">Virar câmera</button>
              <button type="button" onClick={() => arquivoRef.current?.click()} className="h-9 px-3 rounded-full bg-white/15 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5">
                <IconFoto size={14} /> Galeria
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Vídeo demonstrativo do exercício: arquivo enviado pelo personal ou link do YouTube. */
export function VideoExercicio({ exercicio, personalNome, compacto = false }: { exercicio: Pick<Exercicio, "video_caminho" | "video_link" | "nome">; personalNome?: string; compacto?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!exercicio.video_caminho) return;
    let vivo = true;
    urlAssinada("videos", exercicio.video_caminho).then((u) => { if (vivo) setUrl(u); });
    return () => { vivo = false; };
  }, [exercicio.video_caminho]);

  const yt = idYoutube(exercicio.video_link);
  const caixa = `relative w-full ${compacto ? "aspect-video" : "aspect-[4/5] sm:aspect-video"} rounded-xl overflow-hidden bg-[#1d1d1b]`;

  if (exercicio.video_caminho) {
    return (
      <div className={caixa}>
        {url ? (
          <video key={url} src={url} controls playsInline loop muted autoPlay preload="metadata" className="absolute inset-0 w-full h-full object-contain" aria-label={`Vídeo: ${exercicio.nome}`} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm font-semibold">Carregando vídeo…</div>
        )}
      </div>
    );
  }
  if (yt) {
    return (
      <div className={caixa}>
        <iframe src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0&playsinline=1&modestbranding=1`} title={`Vídeo: ${exercicio.nome}`}
          className="absolute inset-0 w-full h-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
      </div>
    );
  }
  if (exercicio.video_link) {
    return (
      <div className={`${caixa} flex flex-col items-center justify-center gap-3 text-white text-center px-6`}>
        <IconVideo size={32} />
        <a href={exercicio.video_link} target="_blank" rel="noreferrer" className="text-sm font-bold underline text-white hover:text-white">Abrir o vídeo do exercício</a>
      </div>
    );
  }
  return (
    <div className={`${caixa} flex flex-col items-center justify-center gap-2 text-center px-6 bg-[#2a2a28]`}>
      <IconVideo size={30} className="text-white/60" />
      <p className="text-white font-bold text-sm">Vídeo em breve</p>
      <p className="text-white/65 text-xs leading-relaxed">
        {personalNome ? `${personalNome.split(" ")[0]} ainda vai gravar este exercício. Dúvida? Pergunte na conversa.` : "Este exercício ainda não tem vídeo."}
      </p>
    </div>
  );
}
