"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Aluno, Angulo, Foto, Medida, Meta } from "@/lib/types";
import { useEvolucao, type DadosEvolucao } from "@/lib/useEvolucao";
import { MEDIDAS, MEDIDAS_DO_OBJETIVO, OBJETIVOS, ORDEM_MEDIDAS, mudanca, num, progresso, serie, valorMedida } from "@/lib/evolucao";
import { urlsAssinadas } from "@/lib/arquivos";
import { ddmm, ddmmaa } from "@/lib/format";
import { hoje, inicioSemana, somaDias } from "@/lib/dates";
import { diasEntre } from "@/lib/cobranca";
import { Anel, GraficoProgresso, type PontoGrafico } from "./Graficos";
import { Barra, Botao, Card, CardTopo, Carregando, Segmentado, Vazio } from "./ui";
import { IconEsq, IconDir, IconPause, IconPlay } from "@/lib/icons";

const ANGULOS: { valor: Angulo; rotulo: string }[] = [
  { valor: "frente", rotulo: "Frente" },
  { valor: "lado", rotulo: "Lado" },
  { valor: "costas", rotulo: "Costas" },
];

export interface ResumoMeta {
  meta: Meta;
  atual: number;
  pct: number;
  texto: string;
  pontos: PontoGrafico[];
}

/** Metas na ordem do objetivo do aluno, com o progresso de cada uma. */
export function resumirMetas(aluno: Aluno, d: Pick<DadosEvolucao, "metas" | "avaliacoes" | "checkins">): ResumoMeta[] {
  const prioridade = [...MEDIDAS_DO_OBJETIVO[aluno.objetivo], ...ORDEM_MEDIDAS];
  return [...d.metas]
    .sort((a, b) => prioridade.indexOf(a.medida) - prioridade.indexOf(b.medida))
    .map((meta) => {
      const s = serie(meta.medida, d.avaliacoes, d.checkins);
      const atual = s.length ? s[s.length - 1].valor : meta.inicio;
      const pct = progresso(meta.inicio, meta.alvo, atual);
      const pontos: PontoGrafico[] = s.map((p) => {
        const pp = progresso(meta.inicio, meta.alvo, p.valor);
        return { data: p.data, pct: pp, destaque: p.origem === "avaliacao", rotulo: `${ddmm(p.data)} · ${valorMedida(meta.medida, p.valor)} · ${pp}%` };
      });
      return { meta, atual, pct, texto: mudanca(meta.medida, meta.inicio, atual, meta).texto, pontos };
    });
}

export function marcoZero(aluno: Aluno, d: Pick<DadosEvolucao, "avaliacoes" | "checkins" | "fotos">) {
  return d.avaliacoes[0]?.data ?? d.checkins[0]?.data ?? d.fotos[0]?.data ?? aluno.criado_em.slice(0, 10);
}

/** Meta semanal de treinos: os dias marcados nas fichas ativas (padrão 3). */
export function metaSemanal(d: Pick<DadosEvolucao, "fichas">) {
  const dias = new Set<string>();
  for (const f of d.fichas.filter((x) => x.ativa)) {
    for (const t of f.dias.toLowerCase().replace(/\be\b/g, " ").split(/[\s,;/·-]+/)) if (/^(seg|ter|qua|qui|sex|s[aá]b|dom)/.test(t)) dias.add(t.slice(0, 3));
  }
  return Math.min(7, Math.max(1, dias.size || 3));
}

export function PainelEvolucao({ aluno, personalNome, visao }: { aluno: Aluno; personalNome: string; visao: "aluno" | "personal" }) {
  const d = useEvolucao(aluno.id);
  const metas = useMemo(() => resumirMetas(aluno, d), [aluno, d]);
  const [medidaSel, setMedidaSel] = useState<Medida | null>(null);
  if (d.carregando) return <Carregando />;
  if (d.erro) return <Vazio titulo="Não foi possível carregar a evolução" texto={d.erro} />;

  const marco = marcoZero(aluno, d);
  const semanas = Math.max(0, Math.floor(diasEntre(marco, hoje()) / 7));
  const principal = metas[0] ?? null;
  const sel = metas.find((m) => m.meta.medida === medidaSel) ?? principal;
  const primeiroPersonal = personalNome.split(" ")[0];
  const vazio = !d.avaliacoes.length && !d.checkins.length && !d.fotos.length;

  if (vazio && !metas.length) {
    return (
      <Card>
        <Vazio
          titulo={visao === "aluno" ? "Sua evolução começa na primeira avaliação" : "Ainda não há avaliação"}
          texto={visao === "aluno"
            ? `Quando ${primeiroPersonal} fizer sua primeira avaliação ou você enviar o primeiro check-in, o marco zero aparece aqui, com gráfico e time-lapse das fotos.`
            : "Faça a primeira avaliação com fotos e metas na aba Avaliação. Ela vira o marco zero do aluno."}
          acao={visao === "aluno" ? <Link href="/a/checkin"><Botao>Fazer meu primeiro check-in</Botao></Link> : null}
        />
      </Card>
    );
  }

  const coluna = visao === "personal" ? "grid gap-4 lg:grid-cols-2 items-start" : "flex flex-col gap-4";

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <div className="p-5 flex items-center gap-5 bg-gradient-to-br from-[#eef4fc] to-white">
          <Anel pct={principal ? principal.pct : 0} tamanho={visao === "aluno" ? 116 : 104}>
            <span className="text-[28px] font-black tracking-tight leading-none tabular-nums">{principal ? Math.max(0, principal.pct) : 0}%</span>
            <span className="text-[11px] font-bold text-mudo mt-0.5">da meta</span>
          </Anel>
          <div className="min-w-0 flex flex-col gap-1">
            <span className="text-[11px] font-bold text-azul-esc uppercase tracking-[0.06em]">
              Objetivo: {OBJETIVOS[aluno.objetivo]} · desde {ddmm(marco)}
            </span>
            {principal ? (
              <>
                <p className="text-[17px] font-extrabold leading-snug">
                  {principal.pct >= 100
                    ? "Meta alcançada!"
                    : principal.pct > 0
                      ? `${visao === "aluno" ? "Você já percorreu" : "Já percorreu"} ${principal.pct}% do caminho até ${valorMedida(principal.meta.medida, principal.meta.alvo)}`
                      : `Rumo a ${valorMedida(principal.meta.medida, principal.meta.alvo)}`}
                </p>
                <p className="text-sm text-texto2">
                  {principal.texto} em {semanas} {semanas === 1 ? "semana" : "semanas"}
                  {principal.pct < 0 ? " · ainda se afastando da meta" : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-texto2">
                {visao === "aluno" ? `${primeiroPersonal} ainda vai definir suas metas.` : "Defina as metas na aba Avaliação para ver o progresso."}
              </p>
            )}
          </div>
        </div>
        {metas.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-linha2">
            {metas.slice(0, 3).map((m) => (
              <button key={m.meta.id} type="button" onClick={() => setMedidaSel(m.meta.medida)}
                className={`text-left px-5 py-3.5 flex flex-col gap-1.5 border-b sm:border-b-0 sm:border-r last:border-0 border-linha2 cursor-pointer ${sel?.meta.id === m.meta.id ? "bg-azul-bg" : "hover:bg-fundo"}`}>
                <span className="text-[11px] font-bold text-mudo uppercase tracking-[0.05em]">{MEDIDAS[m.meta.medida].rotulo} · {Math.max(0, m.pct)}%</span>
                <span className="text-[15px] font-extrabold">{m.texto}</span>
                <Barra pct={m.pct} cor={m.pct >= 100 ? "#0ca30c" : "#2a78d6"} altura={6} />
              </button>
            ))}
          </div>
        ) : null}
      </Card>

      <div className={coluna}>
        {sel && sel.pontos.length ? (
          <Card>
            <CardTopo titulo="Progresso até a meta" sub="Sobe quando se aproxima da meta e cai quando se afasta" />
            {metas.length > 1 ? (
              <div className="px-4 sm:px-5 -mt-1 mb-2 flex gap-2 flex-wrap">
                {metas.map((m) => (
                  <button key={m.meta.id} type="button" onClick={() => setMedidaSel(m.meta.medida)} aria-pressed={sel.meta.id === m.meta.id}
                    className={`h-8 px-3 rounded-full border text-[12px] font-bold cursor-pointer ${sel.meta.id === m.meta.id ? "bg-tinta text-white border-tinta" : "bg-white text-texto2 border-linha"}`}>
                    {MEDIDAS[m.meta.medida].rotulo}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="px-3 sm:px-4 pb-2">
              <GraficoProgresso pontos={sel.pontos} />
            </div>
            <p className="px-4 sm:px-5 pb-4 text-xs text-mudo">
              {MEDIDAS[sel.meta.medida].rotulo}: de {valorMedida(sel.meta.medida, sel.meta.inicio)} para a meta de {valorMedida(sel.meta.medida, sel.meta.alvo)} · hoje {valorMedida(sel.meta.medida, sel.atual)}. Pontos maiores são avaliações.
            </p>
          </Card>
        ) : null}

        <TimeLapse fotos={d.fotos} marco={marco} metas={metas} dados={d} visao={visao} personalNome={personalNome} />
        <AntesDepois fotos={d.fotos} />
        <Frequencia dados={d} marco={marco} />
        <Recordes dados={d} />
        <LinhaDoTempo aluno={aluno} dados={d} metas={metas} marco={marco} personalNome={personalNome} />
        {visao === "aluno" && principal ? <CardCompartilhar aluno={aluno} principal={principal} semanas={semanas} marco={marco} personalNome={personalNome} /> : null}
      </div>
    </div>
  );
}

function useUrlsFotos(fotos: Foto[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const chave = fotos.map((f) => f.caminho).join("|");
  useEffect(() => {
    if (!fotos.length) return;
    let vivo = true;
    urlsAssinadas("fotos", fotos.map((f) => f.caminho)).then((u) => { if (vivo) setUrls(u); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
  return urls;
}

/** Uma foto por data, no ângulo escolhido. */
function quadros(fotos: Foto[], angulo: Angulo) {
  const porData = new Map<string, Foto>();
  for (const f of fotos) if (f.angulo === angulo) porData.set(f.data, f);
  return [...porData.values()].sort((a, b) => a.data.localeCompare(b.data));
}

function anguloInicial(fotos: Foto[]): Angulo {
  const conta = (a: Angulo) => new Set(fotos.filter((f) => f.angulo === a).map((f) => f.data)).size;
  return (["frente", "lado", "costas"] as Angulo[]).sort((a, b) => conta(b) - conta(a))[0];
}

function TimeLapse({ fotos, marco, metas, dados, visao, personalNome }: {
  fotos: Foto[]; marco: string; metas: ResumoMeta[]; dados: DadosEvolucao; visao: "aluno" | "personal"; personalNome: string;
}) {
  const [angulo, setAngulo] = useState<Angulo>(() => anguloInicial(fotos));
  const lista = useMemo(() => quadros(fotos, angulo), [fotos, angulo]);
  const urls = useUrlsFotos(fotos);
  const [i, setI] = useState(Math.max(0, lista.length - 1));
  const [tocando, setTocando] = useState(false);

  useEffect(() => { setI(Math.max(0, lista.length - 1)); setTocando(false); }, [lista.length, angulo]);
  useEffect(() => {
    if (!tocando) return;
    const t = setInterval(() => {
      setI((x) => {
        if (x >= lista.length - 1) { setTocando(false); return x; }
        return x + 1;
      });
    }, 650);
    return () => clearInterval(t);
  }, [tocando, lista.length]);

  // pré-carrega as imagens para o time-lapse rodar liso
  useEffect(() => {
    for (const f of lista) {
      const u = urls[f.caminho];
      if (u) { const im = new Image(); im.src = u; }
    }
  }, [lista, urls]);

  if (!fotos.length) {
    return (
      <Card>
        <CardTopo titulo="Time-lapse" sub="As fotos dos check-ins e avaliações viram um filme da evolução" />
        <Vazio titulo="Nenhuma foto ainda" texto={visao === "aluno" ? "No check-in semanal você tira 3 fotos rápidas. Com elas, o time-lapse começa." : `As fotos chegam pelos check-ins do aluno e pelas avaliações.`} />
      </Card>
    );
  }

  const f = lista[i];
  const principal = metas[0];
  const pesoNoDia = f ? pesoProximo(dados, f.data) : null;
  const pctNoDia = f && principal && principal.meta.medida === "peso" && pesoNoDia != null
    ? progresso(principal.meta.inicio, principal.meta.alvo, pesoNoDia) : null;
  const semana = f ? Math.floor(diasEntre(marco, f.data) / 7) : 0;

  function tocar() {
    if (tocando) return setTocando(false);
    if (i >= lista.length - 1) setI(0);
    setTocando(true);
  }

  return (
    <Card>
      <CardTopo titulo="Time-lapse" sub={`${lista.length} ${lista.length === 1 ? "foto" : "fotos"} · ${visao === "aluno" ? `só você e ${personalNome.split(" ")[0]} veem` : "o aluno vê o mesmo no app"}`}
        direita={<Segmentado rotulo="Ângulo" opcoes={ANGULOS} valor={angulo} onChange={(v) => setAngulo(v)} />} />
      <div className="px-4 sm:px-5 pb-4 flex flex-col gap-3">
        <div className="relative aspect-[3/4] max-h-[520px] w-full mx-auto rounded-xl overflow-hidden bg-[#eceae5]">
          {f && urls[f.caminho] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urls[f.caminho]} alt={`Foto de ${ddmmaa(f.data)}`} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-mudo">{f ? "Carregando foto…" : "Sem fotos neste ângulo"}</div>
          )}
          {f ? (
            <>
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-bold">
                {semana === 0 ? "Marco zero" : `Semana ${semana}`} · {ddmm(f.data)}
              </span>
              {pesoNoDia != null ? (
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/90 text-tinta text-xs font-extrabold">
                  {num(pesoNoDia)} kg{pctNoDia != null ? ` · ${Math.max(0, pctNoDia)}%` : ""}
                </span>
              ) : null}
              {f.origem === "avaliacao" ? (
                <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-azul text-white text-[11px] font-bold">Avaliação</span>
              ) : null}
            </>
          ) : null}
        </div>
        {lista.length > 1 ? (
          <div className="flex items-center gap-3">
            <button type="button" onClick={tocar} aria-label={tocando ? "Pausar" : "Tocar time-lapse"}
              className="w-11 h-11 rounded-full bg-azul text-white flex items-center justify-center shrink-0 cursor-pointer">
              {tocando ? <IconPause size={18} /> : <IconPlay size={18} />}
            </button>
            <input type="range" min={0} max={lista.length - 1} value={i} onChange={(e) => { setTocando(false); setI(Number(e.target.value)); }}
              className="flex-1 accent-[#2a78d6]" aria-label="Escolher a foto no tempo" />
            <span className="text-xs font-bold text-mudo tabular-nums w-12 text-right">{i + 1}/{lista.length}</span>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function pesoProximo(d: Pick<DadosEvolucao, "checkins" | "avaliacoes">, data: string): number | null {
  let melhor: { dist: number; v: number } | null = null;
  for (const x of [...d.checkins, ...d.avaliacoes]) {
    if (x.peso == null) continue;
    const dist = Math.abs(diasEntre(x.data, data));
    if (dist <= 4 && (!melhor || dist < melhor.dist)) melhor = { dist, v: Number(x.peso) };
  }
  return melhor?.v ?? null;
}

function AntesDepois({ fotos }: { fotos: Foto[] }) {
  const [angulo, setAngulo] = useState<Angulo>(() => anguloInicial(fotos));
  const lista = useMemo(() => quadros(fotos, angulo), [fotos, angulo]);
  const urls = useUrlsFotos(fotos);
  const [a, setA] = useState(0);
  const [b, setB] = useState(Math.max(0, lista.length - 1));
  const [pos, setPos] = useState(50);
  useEffect(() => { setA(0); setB(Math.max(0, lista.length - 1)); }, [lista.length, angulo]);
  if (new Set(fotos.map((f) => f.data)).size < 2) return null;

  const fa = lista[a], fb = lista[b];
  const seletor = (titulo: string, idx: number, set: (n: number) => void) => (
    <div className="flex-1 flex items-center justify-between gap-1 rounded-[10px] border border-linha px-1 h-11">
      <button type="button" aria-label={`${titulo}: foto anterior`} disabled={idx <= 0} onClick={() => set(idx - 1)} className="w-9 h-9 flex items-center justify-center text-texto2 disabled:opacity-30 cursor-pointer"><IconEsq size={16} /></button>
      <div className="text-center leading-tight">
        <div className="text-[10px] font-bold text-mudo uppercase">{titulo}</div>
        <div className="text-[13px] font-extrabold">{lista[idx] ? ddmm(lista[idx].data) : "—"}</div>
      </div>
      <button type="button" aria-label={`${titulo}: próxima foto`} disabled={idx >= lista.length - 1} onClick={() => set(idx + 1)} className="w-9 h-9 flex items-center justify-center text-texto2 disabled:opacity-30 cursor-pointer"><IconDir size={16} /></button>
    </div>
  );

  return (
    <Card>
      <CardTopo titulo="Antes e depois" sub="Arraste para comparar" direita={<Segmentado rotulo="Ângulo" opcoes={ANGULOS} valor={angulo} onChange={(v) => setAngulo(v)} />} />
      <div className="px-4 sm:px-5 pb-4 flex flex-col gap-3">
        {lista.length < 2 ? (
          <p className="text-sm text-mudo py-6 text-center">Precisa de duas fotos neste ângulo para comparar.</p>
        ) : (
          <>
            <div className="flex gap-2">{seletor("Antes", a, setA)}{seletor("Depois", b, setB)}</div>
            <div className="relative aspect-[3/4] max-h-[520px] w-full mx-auto rounded-xl overflow-hidden bg-[#eceae5] select-none">
              {fb && urls[fb.caminho] ? <img src={urls[fb.caminho]} alt={`Depois, ${ddmmaa(fb.data)}`} className="absolute inset-0 w-full h-full object-cover" /> : null}
              {fa && urls[fa.caminho] ? (
                <img src={urls[fa.caminho]} alt={`Antes, ${ddmmaa(fa.data)}`} className="absolute inset-0 w-full h-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
              ) : null}
              <div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_6px_rgba(0,0,0,0.4)]" style={{ left: `${pos}%` }}>
                <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white shadow flex items-center justify-center text-texto2">
                  <IconEsq size={12} /><IconDir size={12} />
                </span>
              </div>
              <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-bold">{fa ? ddmm(fa.data) : ""}</span>
              <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-bold">{fb ? ddmm(fb.data) : ""}</span>
              <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize" aria-label="Comparar antes e depois" />
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function Frequencia({ dados, marco }: { dados: DadosEvolucao; marco: string }) {
  const meta = metaSemanal(dados);
  const hj = hoje();
  const semanaAtual = inicioSemana(hj);
  const totalSemanas = Math.min(20, Math.max(8, Math.floor(diasEntre(inicioSemana(marco), semanaAtual) / 7) + 1));
  const semanas: { ini: string; n: number }[] = [];
  for (let k = totalSemanas - 1; k >= 0; k--) semanas.push({ ini: somaDias(semanaAtual, -7 * k), n: 0 });
  const feitos = dados.treinos.filter((t) => t.concluido);
  for (const t of feitos) {
    const s = semanas.find((x) => x.ini === inicioSemana(t.data));
    if (s) s.n++;
  }
  let seguidas = 0;
  for (let k = semanas.length - 1; k >= 0; k--) {
    if (semanas[k].n >= meta) seguidas++;
    else if (k === semanas.length - 1) continue; // a semana atual ainda está em andamento
    else break;
  }
  const max = Math.max(meta, ...semanas.map((s) => s.n));
  return (
    <Card>
      <CardTopo titulo="Frequência" sub={`Meta: ${meta} treinos por semana`} direita={<span className="text-sm font-extrabold tabular-nums">{feitos.length} treinos</span>} />
      <div className="px-4 sm:px-5 pb-4 flex flex-col gap-2">
        <div className="relative flex items-end gap-1 h-28">
          <div className="absolute inset-x-0 border-t border-dashed border-verde/60" style={{ bottom: `${(meta / max) * 100}%` }} />
          {semanas.map((s) => (
            <div key={s.ini} className="flex-1 flex flex-col justify-end h-full" title={`Semana de ${ddmm(s.ini)}: ${s.n} treinos`}>
              <div className="rounded-t-[4px] min-h-[3px]" style={{ height: `${(s.n / max) * 100}%`, background: s.n >= meta ? "#2a78d6" : s.n ? "#9ec5f4" : "#eceae5" }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[11px] font-semibold text-mudo"><span>{ddmm(semanas[0].ini)}</span><span>esta semana</span></div>
        <p className="text-sm font-bold text-texto2">
          {seguidas > 0 ? `${seguidas} ${seguidas === 1 ? "semana" : "semanas"} seguidas na meta` : "Bata a meta desta semana para começar uma sequência"}
        </p>
      </div>
    </Card>
  );
}

function Recordes({ dados }: { dados: DadosEvolucao }) {
  const lista = useMemo(() => {
    const porEx = new Map<string, { primeiroDia: string; primeiro: number; max: number }>();
    for (const s of dados.series) {
      if (s.carga == null || s.carga <= 0) continue;
      const d = s.criado_em.slice(0, 10);
      const r = porEx.get(s.exercicio_id);
      if (!r) porEx.set(s.exercicio_id, { primeiroDia: d, primeiro: s.carga, max: s.carga });
      else {
        if (d === r.primeiroDia) r.primeiro = Math.max(r.primeiro, s.carga);
        r.max = Math.max(r.max, s.carga);
      }
    }
    return [...porEx.entries()]
      .map(([id, r]) => ({ id, nome: dados.exercicios.find((e) => e.id === id)?.nome ?? "Exercício", ...r, ganho: r.max - r.primeiro }))
      .filter((r) => r.ganho > 0)
      .sort((a, b) => b.ganho / b.primeiro - a.ganho / a.primeiro)
      .slice(0, 5);
  }, [dados.series, dados.exercicios]);
  if (!lista.length) return null;
  return (
    <Card>
      <CardTopo titulo="Recordes de carga" sub="Do primeiro treino até hoje" />
      <ul className="px-4 sm:px-5 pb-4 flex flex-col divide-y divide-linha2">
        {lista.map((r) => (
          <li key={r.id} className="py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{r.nome}</p>
              <p className="text-xs text-mudo">{num(r.primeiro, r.primeiro % 1 ? 1 : 0)} kg no início</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-extrabold tabular-nums">{num(r.max, r.max % 1 ? 1 : 0)} kg</p>
              <p className="text-xs font-bold text-verde">+{num(r.ganho, r.ganho % 1 ? 1 : 0)} kg · +{Math.round((r.ganho / r.primeiro) * 100)}%</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function LinhaDoTempo({ aluno, dados, metas, marco, personalNome }: { aluno: Aluno; dados: DadosEvolucao; metas: ResumoMeta[]; marco: string; personalNome: string }) {
  const eventos: { data: string; tipo: string; titulo: ReactNode }[] = [];
  eventos.push({ data: marco, tipo: "Marco zero", titulo: `Início do acompanhamento com ${personalNome.split(" ")[0]}` });
  for (const a of dados.avaliacoes) {
    if (a.data === marco) continue;
    eventos.push({ data: a.data, tipo: "Avaliação", titulo: a.peso != null ? `Avaliação física · ${num(a.peso)} kg` : "Avaliação física" });
  }
  const principal = metas[0];
  if (principal) {
    for (const marca of [25, 50, 75, 100]) {
      const p = principal.pontos.find((x) => x.pct >= marca);
      if (p) eventos.push({ data: p.data, tipo: marca === 100 ? "Meta" : "Marco", titulo: marca === 100 ? `Meta de ${MEDIDAS[principal.meta.medida].rotulo.toLowerCase()} alcançada` : `${marca}% do caminho até a meta` });
    }
  }
  eventos.sort((x, y) => y.data.localeCompare(x.data));
  return (
    <Card>
      <CardTopo titulo="Linha do tempo" sub={`${aluno.nome.split(" ")[0]} desde ${ddmmaa(marco)}`} />
      <ol className="px-4 sm:px-5 pb-4 flex flex-col">
        {eventos.slice(0, 12).map((e, k) => (
          <li key={k} className="relative pl-6 pb-3.5 last:pb-0">
            <span className={`absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full ${e.tipo === "Meta" ? "bg-verde-dot" : e.tipo === "Marco zero" ? "bg-tinta" : "bg-azul"}`} />
            {k < Math.min(eventos.length, 12) - 1 ? <span className="absolute left-[4.5px] top-4 bottom-0 w-px bg-linha" /> : null}
            <p className="text-[11px] font-bold text-mudo uppercase tracking-[0.04em]">{ddmmaa(e.data)} · {e.tipo}</p>
            <p className="text-sm font-semibold">{e.titulo}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function CardCompartilhar({ aluno, principal, semanas, marco, personalNome }: { aluno: Aluno; principal: ResumoMeta; semanas: number; marco: string; personalNome: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gerando, setGerando] = useState(false);
  const pct = Math.max(0, Math.min(100, principal.pct));
  const titulo = principal.pct >= 100 ? "Meta alcançada!" : principal.texto;

  function desenhar(): HTMLCanvasElement {
    const c = canvasRef.current ?? document.createElement("canvas");
    c.width = 1080; c.height = 1350;
    const g = c.getContext("2d")!;
    const fundo = g.createLinearGradient(0, 0, 1080, 1350);
    fundo.addColorStop(0, "#184f95"); fundo.addColorStop(1, "#2a78d6");
    g.fillStyle = fundo; g.fillRect(0, 0, 1080, 1350);
    g.fillStyle = "rgba(255,255,255,0.75)";
    g.font = "700 38px system-ui, sans-serif";
    g.fillText(`${semanas} SEMANAS · ${ddmm(marco)} → ${ddmm(hoje())}`, 90, 150);
    // anel
    const cx = 540, cy = 560, r = 230;
    g.lineWidth = 46; g.lineCap = "round";
    g.strokeStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "#ffffff"; g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100); g.stroke();
    g.fillStyle = "#fff"; g.textAlign = "center";
    g.font = "900 150px system-ui, sans-serif"; g.fillText(`${pct}%`, cx, cy + 40);
    g.font = "700 40px system-ui, sans-serif"; g.fillStyle = "rgba(255,255,255,0.8)"; g.fillText("da meta", cx, cy + 105);
    g.fillStyle = "#fff"; g.font = "900 76px system-ui, sans-serif"; g.fillText(titulo, cx, 980);
    g.font = "600 42px system-ui, sans-serif"; g.fillStyle = "rgba(255,255,255,0.85)";
    g.fillText(`${aluno.nome.split(" ")[0]} · treinando com ${personalNome.split(" ")[0]}`, cx, 1060);
    g.font = "800 34px system-ui, sans-serif"; g.fillStyle = "rgba(255,255,255,0.6)"; g.fillText("C-Level Personal", cx, 1260);
    return c;
  }

  useEffect(() => { desenhar(); });

  async function salvar() {
    setGerando(true);
    try {
      const c = desenhar();
      const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/png"));
      if (!blob) return;
      const arquivo = new File([blob], "minha-evolucao.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: "Minha evolução" }).catch(() => {});
      } else {
        const u = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = u; a.download = "minha-evolucao.png"; a.click();
        setTimeout(() => URL.revokeObjectURL(u), 2000);
      }
    } finally {
      setGerando(false);
    }
  }

  return (
    <Card>
      <CardTopo titulo="Card para compartilhar" sub="Sem fotos: só o seu progresso" />
      <div className="px-4 sm:px-5 pb-4 flex flex-col gap-3 items-center">
        <canvas ref={canvasRef} className="w-full max-w-[280px] rounded-xl shadow-sm" aria-label="Prévia do card de evolução" />
        <Botao onClick={salvar} disabled={gerando} className="w-full sm:w-auto">{gerando ? "Preparando…" : "Salvar ou compartilhar"}</Botao>
        <p className="text-xs text-mudo text-center">Só você decide compartilhar. Suas fotos continuam privadas.</p>
      </div>
    </Card>
  );
}
