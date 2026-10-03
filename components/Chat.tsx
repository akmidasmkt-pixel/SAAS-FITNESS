"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { sb, mensagemErro } from "@/lib/supabase";
import { useDados } from "@/lib/store";
import { useUi } from "@/lib/ui";
import type { Mensagem } from "@/lib/types";
import { comprimirImagem, enviar, nomeArquivo, urlsAssinadas } from "@/lib/arquivos";
import { dataPorExtenso, diaLocal, hoje, horaLocal } from "@/lib/dates";
import { IconCheckin, IconEnviar, IconFechar, IconFoto, IconMic } from "@/lib/icons";

const TIPOS_AUDIO = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/aac"];

export function Chat({ alunoId, personalId, outroNome, linkCheckin }: { alunoId: string; personalId: string; outroNome: string; linkCheckin?: (checkinId: string) => string }) {
  const { perfil, zerarNaoLidas } = useDados();
  const { avisar } = useUi();
  const meuId = perfil!.id;
  const [msgs, setMsgs] = useState<Mensagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState("");
  const [enviandoArq, setEnviandoArq] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [ampliada, setAmpliada] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement | null>(null);
  const fotoRef = useRef<HTMLInputElement | null>(null);

  const marcarLidas = useCallback(async () => {
    await sb().from("mensagens").update({ lida_em: new Date().toISOString() })
      .eq("aluno_id", alunoId).neq("autor_id", meuId).is("lida_em", null);
    zerarNaoLidas(alunoId);
  }, [alunoId, meuId, zerarNaoLidas]);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setMsgs([]);
    sb().from("mensagens").select("*").eq("aluno_id", alunoId).order("criado_em", { ascending: false }).limit(300)
      .then(({ data }) => {
        if (!vivo) return;
        setMsgs(((data ?? []) as Mensagem[]).reverse());
        setCarregando(false);
        marcarLidas();
      });
    const canal = sb()
      .channel(`chat-${alunoId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens", filter: `aluno_id=eq.${alunoId}` }, (p: any) => {
        const m = p.new as Mensagem;
        setMsgs((xs) => (xs.some((x) => x.id === m.id) ? xs : [...xs, m]));
        if (m.autor_id !== meuId) marcarLidas();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "mensagens", filter: `aluno_id=eq.${alunoId}` }, (p: any) => {
        const m = p.new as Mensagem;
        setMsgs((xs) => xs.map((x) => (x.id === m.id ? m : x)));
      })
      .subscribe();
    return () => { vivo = false; sb().removeChannel(canal); };
  }, [alunoId, meuId, marcarLidas]);

  useEffect(() => {
    const caminhos = msgs.filter((m) => m.arquivo && !urls[m.arquivo]).map((m) => m.arquivo!);
    if (!caminhos.length) return;
    urlsAssinadas("conversas", caminhos).then((u) => setUrls((x) => ({ ...x, ...u })));
  }, [msgs, urls]);

  useLayoutEffect(() => { fimRef.current?.scrollIntoView({ block: "end" }); }, [msgs.length, carregando]);

  async function inserir(m: Partial<Mensagem>) {
    const { data, error } = await sb().from("mensagens").insert({ personal_id: personalId, aluno_id: alunoId, ...m }).select().single();
    if (error) throw error;
    setMsgs((xs) => (xs.some((x) => x.id === data.id) ? xs : [...xs, data as Mensagem]));
  }

  async function mandarTexto(e: FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setTexto("");
    try { await inserir({ tipo: "texto", texto: t }); } catch (err) { setTexto(t); avisar(mensagemErro(err), "erro"); }
  }

  async function mandarFoto(f: File | undefined) {
    if (!f) return;
    setEnviandoArq(true);
    try {
      const blob = await comprimirImagem(f);
      const caminho = await enviar("conversas", `${personalId}/${alunoId}/${nomeArquivo("jpg")}`, blob, "image/jpeg");
      await inserir({ tipo: "foto", arquivo: caminho });
    } catch (err) {
      avisar(mensagemErro(err), "erro");
    } finally {
      setEnviandoArq(false);
      if (fotoRef.current) fotoRef.current.value = "";
    }
  }

  async function mandarAudio(blob: Blob, tipo: string, seg: number) {
    setEnviandoArq(true);
    try {
      const ext = tipo.includes("mp4") ? "m4a" : tipo.includes("ogg") ? "ogg" : tipo.includes("aac") ? "aac" : "webm";
      const caminho = await enviar("conversas", `${personalId}/${alunoId}/${nomeArquivo(ext)}`, blob, tipo);
      await inserir({ tipo: "audio", arquivo: caminho, duracao_seg: Math.min(600, Math.round(seg)) });
    } catch (err) {
      avisar(mensagemErro(err), "erro");
    } finally {
      setEnviandoArq(false);
    }
  }

  let ultimoDia = "";
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 flex flex-col gap-1.5 rolagem-fina">
        {carregando ? <p className="text-center text-sm text-mudo py-10">Carregando conversa…</p> : null}
        {!carregando && !msgs.length ? (
          <p className="text-center text-sm text-mudo py-10 px-6">Nenhuma mensagem ainda. Mande um oi para {outroNome.split(" ")[0]}!</p>
        ) : null}
        {msgs.map((m) => {
          const dia = diaLocal(m.criado_em);
          const separador = dia !== ultimoDia;
          ultimoDia = dia;
          const minha = m.autor_id === meuId;
          return (
            <div key={m.id} className="flex flex-col">
              {separador ? (
                <span className="self-center my-2 px-3 py-1 rounded-full bg-linha2 text-[11px] font-bold text-texto2">
                  {dia === hoje() ? "Hoje" : dataPorExtenso(dia)}
                </span>
              ) : null}
              <div className={`max-w-[82%] ${minha ? "self-end" : "self-start"}`}>
                <Bolha m={m} minha={minha} url={m.arquivo ? urls[m.arquivo] : undefined} onAmpliar={setAmpliada} linkCheckin={linkCheckin} />
              </div>
            </div>
          );
        })}
        <div ref={fimRef} />
      </div>
      <form onSubmit={mandarTexto} className="shrink-0 border-t border-linha bg-white px-3 py-2.5 flex items-end gap-2">
        <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={(e) => mandarFoto(e.target.files?.[0])} />
        <button type="button" onClick={() => fotoRef.current?.click()} disabled={enviandoArq} aria-label="Enviar foto"
          className="w-11 h-11 rounded-full flex items-center justify-center text-texto2 hover:bg-fundo shrink-0 disabled:opacity-40 cursor-pointer">
          <IconFoto size={22} />
        </button>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={1} placeholder="Mensagem" aria-label="Mensagem"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(min-width: 1024px)").matches) { e.preventDefault(); mandarTexto(e as unknown as FormEvent); } }}
          className="flex-1 min-h-11 max-h-32 resize-none px-4 py-2.5 rounded-[22px] border border-linha bg-fundo text-base sm:text-[15px] focus:outline-none focus:border-azul" />
        {texto.trim() ? (
          <button type="submit" aria-label="Enviar" className="w-11 h-11 rounded-full bg-azul text-white flex items-center justify-center shrink-0 cursor-pointer">
            <IconEnviar size={20} />
          </button>
        ) : (
          <Gravador onPronto={mandarAudio} desabilitado={enviandoArq} />
        )}
      </form>
      {ampliada ? (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4" onClick={() => setAmpliada(null)} role="dialog" aria-label="Foto">
          <button type="button" aria-label="Fechar" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"><IconFechar size={18} /></button>
          <img src={ampliada} alt="Foto da conversa" className="max-w-full max-h-full object-contain" />
        </div>
      ) : null}
    </div>
  );
}

function Bolha({ m, minha, url, onAmpliar, linkCheckin }: { m: Mensagem; minha: boolean; url?: string; onAmpliar: (u: string) => void; linkCheckin?: (id: string) => string }) {
  const hora = horaLocal(m.criado_em);
  const cor = minha ? "bg-azul text-white" : "bg-white border border-linha text-tinta";
  const rodape = (
    <span className={`block text-[10px] font-semibold mt-1 text-right ${minha ? "text-white/70" : "text-mudo"}`}>
      {hora}{minha ? (m.lida_em ? " · lida" : "") : ""}
    </span>
  );
  if (m.tipo === "foto") {
    return (
      <div className={`rounded-2xl p-1 ${cor}`}>
        {url ? (
          <button type="button" onClick={() => onAmpliar(url)} className="block cursor-zoom-in">
            <img src={url} alt="Foto enviada" className="rounded-xl max-h-72 w-auto object-cover" />
          </button>
        ) : <div className="w-48 h-48 rounded-xl bg-black/10" />}
        <div className="px-2 pb-1">{rodape}</div>
      </div>
    );
  }
  if (m.tipo === "audio") {
    return (
      <div className={`rounded-2xl px-2.5 py-2 ${cor}`}>
        {url ? <audio src={url} controls preload="metadata" className="h-10 max-w-[240px]" /> : <div className="h-10 w-56" />}
        {rodape}
      </div>
    );
  }
  if (m.tipo === "checkin") {
    const conteudo = (
      <div className={`rounded-2xl px-3.5 py-2.5 ${minha ? "bg-azul-esc text-white" : "bg-azul-bg text-azul-esc border border-azul-borda"}`}>
        <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.05em]"><IconCheckin size={14} /> Check-in</span>
        <p className="text-sm font-semibold whitespace-pre-wrap mt-1">{m.texto}</p>
        <span className={`block text-[10px] font-semibold mt-1 text-right ${minha ? "text-white/70" : "text-azul-esc/70"}`}>{hora}</span>
      </div>
    );
    return m.checkin_id && linkCheckin ? <Link href={linkCheckin(m.checkin_id)} className="block hover:opacity-90">{conteudo}</Link> : conteudo;
  }
  return (
    <div className={`rounded-2xl px-3.5 py-2 ${cor}`}>
      <p className="text-[15px] leading-snug whitespace-pre-wrap break-words">{m.texto}</p>
      {rodape}
    </div>
  );
}

function Gravador({ onPronto, desabilitado }: { onPronto: (b: Blob, tipo: string, seg: number) => void; desabilitado: boolean }) {
  const [gravando, setGravando] = useState(false);
  const [seg, setSeg] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const pedacos = useRef<Blob[]>([]);
  const inicio = useRef(0);
  const cancelado = useRef(false);
  const { avisar } = useUi();

  useEffect(() => {
    if (!gravando) return;
    const t = setInterval(() => {
      const s = (Date.now() - inicio.current) / 1000;
      setSeg(s);
      if (s >= 300) recRef.current?.stop();
    }, 250);
    return () => clearInterval(t);
  }, [gravando]);

  async function comecar() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = TIPOS_AUDIO.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
      const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      pedacos.current = [];
      cancelado.current = false;
      rec.ondataavailable = (e) => { if (e.data.size) pedacos.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setGravando(false);
        const dur = (Date.now() - inicio.current) / 1000;
        if (cancelado.current || dur < 0.8) return;
        const final = rec.mimeType || tipo || "audio/webm";
        onPronto(new Blob(pedacos.current, { type: final }), final, dur);
      };
      recRef.current = rec;
      inicio.current = Date.now();
      setSeg(0);
      rec.start(250);
      setGravando(true);
    } catch {
      avisar("Não foi possível usar o microfone. Libere o acesso nas configurações do navegador.", "erro");
    }
  }

  if (gravando) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <button type="button" onClick={() => { cancelado.current = true; recRef.current?.stop(); }} className="h-11 px-3 rounded-full text-sm font-bold text-vermelho cursor-pointer">Cancelar</button>
        <span className="flex items-center gap-1.5 text-sm font-bold tabular-nums text-vermelho">
          <span className="w-2.5 h-2.5 rounded-full bg-vermelho-dot animate-pulse" />
          {Math.floor(seg / 60)}:{String(Math.floor(seg % 60)).padStart(2, "0")}
        </span>
        <button type="button" onClick={() => recRef.current?.stop()} aria-label="Enviar áudio" className="w-11 h-11 rounded-full bg-azul text-white flex items-center justify-center cursor-pointer">
          <IconEnviar size={20} />
        </button>
      </div>
    );
  }
  return (
    <button type="button" onClick={comecar} disabled={desabilitado} aria-label="Gravar áudio"
      className="w-11 h-11 rounded-full bg-azul text-white flex items-center justify-center shrink-0 disabled:opacity-40 cursor-pointer">
      <IconMic size={20} />
    </button>
  );
}
