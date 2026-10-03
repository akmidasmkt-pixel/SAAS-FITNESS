"use client";

import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { IconDir, IconEsq, IconFechar } from "@/lib/icons";
import { rotuloMes, somaMeses } from "@/lib/dates";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`bg-white border border-linha rounded-[14px] ${className}`}>{children}</section>;
}

export function CardTopo({ titulo, sub, direita }: { titulo: ReactNode; sub?: ReactNode; direita?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-extrabold leading-tight">{titulo}</h2>
        {sub ? <p className="text-xs text-mudo mt-1">{sub}</p> : null}
      </div>
      {direita}
    </div>
  );
}

type Variante = "primario" | "secundario" | "fantasma" | "perigo";
const VAR: Record<Variante, string> = {
  primario: "bg-azul text-white border-transparent hover:bg-azul-esc hover:text-white",
  secundario: "bg-white text-azul-esc border-linha hover:bg-fundo",
  fantasma: "bg-transparent text-texto2 border-transparent hover:bg-linha2",
  perigo: "bg-white text-vermelho border-linha hover:bg-vermelho-cl",
};

export function Botao({
  variante = "primario", pequeno = false, className = "", children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; pequeno?: boolean }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 ${pequeno ? "h-9 px-3 text-[13px]" : "h-11 sm:h-10 px-4 text-sm"} rounded-[10px] border font-bold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${VAR[variante]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Campo({ rotulo, dica, children, className = "" }: { rotulo: ReactNode; dica?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 text-xs font-bold text-texto2 ${className}`}>
      {rotulo}
      {children}
      {dica ? <span className="font-medium text-mudo leading-snug">{dica}</span> : null}
    </label>
  );
}

const campo =
  "h-11 w-full px-3 rounded-[10px] border border-linha bg-white text-base sm:text-[15px] text-tinta font-medium placeholder:text-[#9a9994] focus:outline-none focus:border-azul focus:ring-2 focus:ring-azul/25";

export function Entrada({ className = "", ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={`${campo} ${className}`} />;
}
export function Selecao({ className = "", ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={`${campo} pr-8 ${className}`} />;
}
export function AreaTexto({ className = "", ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={`${campo} h-auto min-h-[88px] py-2.5 ${className}`} />;
}

export function Segmentado<T extends string>({
  opcoes, valor, onChange, rotulo, cheio = false,
}: { opcoes: { valor: T; rotulo: string }[]; valor: T; onChange: (v: T) => void; rotulo: string; cheio?: boolean }) {
  return (
    <div role="group" aria-label={rotulo} className={`flex gap-0.5 p-[3px] bg-linha2 rounded-[10px] ${cheio ? "w-full" : ""}`}>
      {opcoes.map((o) => {
        const on = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.valor)}
            className={`h-9 sm:h-8 px-3.5 rounded-lg text-[13px] font-bold cursor-pointer ${cheio ? "flex-1" : ""} ${on ? "bg-white text-tinta shadow-[0_1px_2px_rgba(11,11,11,0.14)]" : "text-texto2 hover:text-tinta"}`}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

export function Filtros<T extends string>({ opcoes, valor, onChange }: { opcoes: { valor: T; rotulo: string; qtd?: number }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto rolagem-fina -mx-1 px-1 pb-1">
      {opcoes.map((o) => {
        const on = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.valor)}
            className={`h-9 px-3.5 rounded-full border text-[13px] font-bold whitespace-nowrap cursor-pointer ${on ? "bg-tinta text-white border-tinta" : "bg-white text-texto2 border-linha hover:border-[#c9c8c3]"}`}
          >
            {o.rotulo}
            {o.qtd != null ? <span className={`ml-1.5 ${on ? "text-white/70" : "text-mudo"}`}>{o.qtd}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function Folha({
  aberta, titulo, onFechar, children, rodape, largura = "max-w-lg",
}: { aberta: boolean; titulo: string; onFechar: () => void; children: ReactNode; rodape?: ReactNode; largura?: string }) {
  useEffect(() => {
    if (!aberta) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
    window.addEventListener("keydown", tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", tecla); document.body.style.overflow = antes; };
  }, [aberta, onFechar]);
  if (!aberta) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/35 cursor-default" onClick={onFechar} />
      <div className={`relative w-full ${largura} max-h-[92dvh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-xl`}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-linha2">
          <h2 className="text-base font-extrabold">{titulo}</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="w-10 h-10 rounded-lg border border-linha flex items-center justify-center text-texto2 cursor-pointer hover:bg-fundo">
            <IconFechar size={16} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {rodape ? (
          <div className="px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-linha2 flex flex-wrap justify-end gap-2">{rodape}</div>
        ) : null}
      </div>
    </div>
  );
}

export function Bloco({
  rotulo, valor, sub, corSub = "#52514e", ponto, selo, pequeno = false,
}: { rotulo: string; valor: ReactNode; sub?: ReactNode; corSub?: string; ponto?: string; selo?: ReactNode; pequeno?: boolean }) {
  return (
    <div className="bg-white border border-linha rounded-[14px] p-4 sm:px-5 flex flex-col gap-1.5 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-mudo uppercase tracking-[0.05em] leading-tight">
          {ponto ? <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ponto }} /> : null}
          {rotulo}
        </span>
        {selo}
      </div>
      <span className={`${pequeno ? "text-lg" : "text-[22px] sm:text-[26px]"} font-extrabold tracking-tight leading-tight tabular-nums break-words`}>{valor}</span>
      {sub ? <span className="text-xs font-semibold leading-snug" style={{ color: corSub }}>{sub}</span> : null}
    </div>
  );
}

export function Barra({ pct, cor = "#2a78d6", altura = 8 }: { pct: number; cor?: string; altura?: number }) {
  return (
    <div className="w-full rounded-full bg-linha2 overflow-hidden" style={{ height: altura }}>
      <div className="rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: altura, background: cor }} />
    </div>
  );
}

export const SELOS = {
  ok: { texto: "Saudável", fundo: "#dff5ec", ponto: "#0ca30c" },
  atencao: { texto: "Atenção", fundo: "#fbf1d6", ponto: "#eda100" },
  alerta: { texto: "Alerta", fundo: "#fdeae2", ponto: "#d03b3b" },
};
export function Selo({ texto, fundo, ponto }: { texto: string; fundo: string; ponto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-bold whitespace-nowrap text-tinta" style={{ background: fundo }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: ponto }} />
      {texto}
    </span>
  );
}

export function SeletorMes({ ym, onChange, min, max }: { ym: string; onChange: (ym: string) => void; min?: string; max?: string }) {
  const podeVoltar = !min || ym > min;
  const podeAvancar = !max || ym < max;
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="Mês anterior" disabled={!podeVoltar} onClick={() => onChange(somaMeses(ym, -1))}
        className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg border border-linha bg-white text-texto2 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-default">
        <IconEsq size={16} />
      </button>
      <span className="min-w-[124px] text-center text-sm font-extrabold">{rotuloMes(ym)}</span>
      <button type="button" aria-label="Próximo mês" disabled={!podeAvancar} onClick={() => onChange(somaMeses(ym, 1))}
        className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg border border-linha bg-white text-texto2 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-default">
        <IconDir size={16} />
      </button>
    </div>
  );
}

export function Vazio({ titulo, texto, acao }: { titulo: string; texto?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 px-6 py-10">
      <p className="text-[15px] font-extrabold">{titulo}</p>
      {texto ? <p className="text-sm text-texto2 max-w-sm leading-relaxed">{texto}</p> : null}
      {acao ? <div className="mt-2">{acao}</div> : null}
    </div>
  );
}

export function Aviso({ tipo = "info", children }: { tipo?: "info" | "erro" | "ok"; children: ReactNode }) {
  const cor = tipo === "erro" ? "bg-vermelho-cl text-vermelho" : tipo === "ok" ? "bg-verde-cl text-verde" : "bg-azul-bg text-azul-esc";
  return <div className={`rounded-[10px] px-3.5 py-2.5 text-[13px] font-semibold leading-snug ${cor}`}>{children}</div>;
}

export function Carregando() {
  return (
    <div className="flex items-center justify-center py-24 text-sm font-semibold text-mudo" role="status">
      Carregando…
    </div>
  );
}
