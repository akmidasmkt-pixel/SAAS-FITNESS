"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Simbolo } from "@/lib/marca";
import { IconEsq } from "@/lib/icons";

export function Cabecalho({
  titulo, sub, acoes, voltar, extra,
}: { titulo: ReactNode; sub?: ReactNode; acoes?: ReactNode; voltar?: { href: string; rotulo: string }; extra?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-linha">
      <div className="flex items-center justify-between gap-3 px-4 lg:px-8 min-h-14 lg:min-h-16 py-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {voltar ? (
            <Link href={voltar.href} aria-label={voltar.rotulo} className="w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-texto2 hover:bg-fundo shrink-0">
              <IconEsq size={20} />
            </Link>
          ) : (
            <Simbolo className="lg:hidden h-7 w-auto shrink-0" />
          )}
          <div className="min-w-0">
            <h1 className="text-[17px] lg:text-lg font-extrabold tracking-tight truncate">{titulo}</h1>
            {sub ? <p className="text-xs text-mudo truncate">{sub}</p> : null}
          </div>
        </div>
        {acoes ? <div className="flex items-center gap-2 lg:gap-3 shrink-0">{acoes}</div> : null}
      </div>
      {extra ? <div className="px-4 lg:px-8 pb-3">{extra}</div> : null}
    </header>
  );
}

export function Conteudo({ children, largo = false }: { children: ReactNode; largo?: boolean }) {
  return <div className={`px-4 lg:px-8 pt-5 lg:pt-6 pb-28 lg:pb-16 flex flex-col gap-4 lg:gap-5 ${largo ? "max-w-[1400px]" : "max-w-[1180px]"}`}>{children}</div>;
}

/** Círculo com as iniciais do nome. */
export function Avatar({ nome, tamanho = 40, cor = "#e3edfa", texto = "#184f95" }: { nome: string; tamanho?: number; cor?: string; texto?: string }) {
  const ini = nome.trim().split(/\s+/).filter(Boolean);
  const letras = ((ini[0]?.[0] ?? "") + (ini.length > 1 ? ini[ini.length - 1][0] : "")).toUpperCase() || "?";
  return (
    <span className="inline-flex items-center justify-center rounded-full font-extrabold shrink-0 select-none"
      style={{ width: tamanho, height: tamanho, background: cor, color: texto, fontSize: Math.round(tamanho * 0.36) }} aria-hidden>
      {letras}
    </span>
  );
}

export function Contador({ n, escuro = false }: { n: number; escuro?: boolean }) {
  if (!n) return null;
  return (
    <span className={`ml-auto min-w-5 h-5 px-1.5 rounded-full text-[11px] font-extrabold inline-flex items-center justify-center ${escuro ? "bg-azul text-white" : "bg-azul-cl text-azul-esc"}`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}
