"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ddmm } from "@/lib/format";

export function useLargura<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export interface PontoGrafico {
  data: string;
  pct: number;
  destaque?: boolean;
  rotulo: string;
}

const dia = (iso: string) => new Date(iso + "T12:00:00Z").getTime();

/** Progresso até a meta no tempo: 0% no marco zero, 100% na meta. Sobe ao se aproximar. */
export function GraficoProgresso({ pontos, altura = 220, cor = "#2a78d6" }: { pontos: PontoGrafico[]; altura?: number; cor?: string }) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const [sel, setSel] = useState<number | null>(null);
  const ultimo = pontos.length - 1;
  const ativo = sel ?? ultimo;

  const g = useMemo(() => {
    if (!largura || !pontos.length) return null;
    const esq = 38, dir = 14, topo = 16, base = 26;
    const minP = Math.min(0, ...pontos.map((p) => p.pct));
    const maxP = Math.max(100, ...pontos.map((p) => p.pct));
    const t0 = dia(pontos[0].data);
    const t1 = Math.max(dia(pontos[ultimo].data), t0 + 86400000);
    const x = (d: string) => esq + ((dia(d) - t0) / (t1 - t0)) * (largura - esq - dir);
    const y = (p: number) => topo + (1 - (p - minP) / (maxP - minP)) * (altura - topo - base);
    const xy = pontos.map((p) => ({ x: pontos.length === 1 ? (esq + largura - dir) / 2 : x(p.data), y: y(p.pct) }));
    const linha = xy.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = `${linha} L${xy[xy.length - 1].x.toFixed(1)},${y(minP).toFixed(1)} L${xy[0].x.toFixed(1)},${y(minP).toFixed(1)} Z`;
    const marcas = [0, 25, 50, 75, 100].filter((v) => v >= minP && v <= maxP);
    return { xy, linha, area, y, marcas, esq, dir, base };
  }, [largura, pontos, altura, ultimo]);

  function escolher(clientX: number) {
    if (!g || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = clientX - r.left;
    let melhor = 0;
    g.xy.forEach((p, i) => { if (Math.abs(p.x - px) < Math.abs(g.xy[melhor].x - px)) melhor = i; });
    setSel(melhor);
  }

  return (
    <div ref={ref} className="relative w-full select-none touch-pan-y" style={{ height: altura }}
      onPointerMove={(e) => e.pointerType === "mouse" && escolher(e.clientX)}
      onPointerDown={(e) => escolher(e.clientX)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setSel(null)}>
      {g ? (
        <svg width={largura} height={altura} className="absolute inset-0" role="img" aria-label="Gráfico de progresso até a meta">
          <defs>
            <linearGradient id="grad-prog" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity="0.22" />
              <stop offset="100%" stopColor={cor} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {g.marcas.map((v) => (
            <g key={v}>
              <line x1={g.esq} x2={largura - g.dir} y1={g.y(v)} y2={g.y(v)} stroke={v === 100 ? "#006300" : "#eceae5"} strokeDasharray={v === 100 ? "5 4" : undefined} strokeWidth={v === 100 ? 1.5 : 1} />
              <text x={g.esq - 6} y={g.y(v) + 4} textAnchor="end" fontSize="11" fontWeight="700" fill={v === 100 ? "#006300" : "#9a9994"}>{v === 100 ? "Meta" : `${v}%`}</text>
            </g>
          ))}
          <path d={g.area} fill="url(#grad-prog)" />
          <path d={g.linha} fill="none" stroke={cor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {g.xy.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={i === ativo ? 6 : pontos[i].destaque ? 4.5 : 2.6}
              fill={i === ativo ? cor : pontos[i].destaque ? "#fff" : cor} stroke={cor} strokeWidth={pontos[i].destaque || i === ativo ? 2.2 : 0} />
          ))}
          <line x1={g.xy[ativo].x} x2={g.xy[ativo].x} y1={g.xy[ativo].y + 7} y2={altura - g.base} stroke={cor} strokeOpacity="0.25" />
          <text x={g.esq} y={altura - 6} fontSize="11" fontWeight="600" fill="#75746f">{ddmm(pontos[0].data)}</text>
          {ultimo > 0 ? <text x={largura - g.dir} y={altura - 6} textAnchor="end" fontSize="11" fontWeight="600" fill="#75746f">{ddmm(pontos[ultimo].data)}</text> : null}
        </svg>
      ) : null}
      {g && pontos[ativo] ? (
        <div className="absolute pointer-events-none -translate-x-1/2 px-2 py-1 rounded-md bg-tinta text-white text-[11px] font-bold whitespace-nowrap"
          style={{ left: Math.min(Math.max(g.xy[ativo].x, 70), largura - 70), top: Math.max(g.xy[ativo].y - 34, 0) }}>
          {pontos[ativo].rotulo}
        </div>
      ) : null}
    </div>
  );
}

/** Linha simples de valores (para medidas sem meta). */
export function MiniLinha({ valores, cor = "#2a78d6", altura = 36 }: { valores: number[]; cor?: string; altura?: number }) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const min = Math.min(...valores), max = Math.max(...valores);
  const pts = valores.map((v, i) => `${((i / Math.max(1, valores.length - 1)) * (largura - 4) + 2).toFixed(1)},${(altura - 3 - ((v - min) / (max - min || 1)) * (altura - 6)).toFixed(1)}`);
  return (
    <div ref={ref} style={{ height: altura }}>
      {largura && valores.length > 1 ? <svg width={largura} height={altura}><polyline points={pts.join(" ")} fill="none" stroke={cor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg> : null}
    </div>
  );
}

/** Anel de progresso. */
export function Anel({ pct, tamanho = 120, espessura = 11, cor = "#2a78d6", children }: { pct: number; tamanho?: number; espessura?: number; cor?: string; children?: React.ReactNode }) {
  const r = (tamanho - espessura) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative shrink-0" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} className="-rotate-90">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="#e3edfa" strokeWidth={espessura} />
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke={cor} strokeWidth={espessura} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
