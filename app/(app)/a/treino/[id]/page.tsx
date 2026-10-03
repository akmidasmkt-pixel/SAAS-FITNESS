"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { sb, mensagemErro } from "@/lib/supabase";
import { useDados } from "@/lib/store";
import { useUi } from "@/lib/ui";
import type { Exercicio, Ficha, FichaItem, SerieFeita, TreinoFeito } from "@/lib/types";
import { TreinoPausado } from "@/components/AlunoComum";
import { VideoExercicio } from "@/components/Midia";
import { Botao, Carregando } from "@/components/ui";
import { numeroSeries, segundosDescanso } from "@/lib/treino";
import { hoje } from "@/lib/dates";
import { IconCheck, IconDir, IconEsq } from "@/lib/icons";

type Linha = { carga: string; reps: string; feito: boolean };
const primeiroNumero = (t: string) => { const m = (t || "").replace(",", ".").match(/\d+(\.\d+)?/); return m ? m[0].replace(".", ",") : ""; };
const numero = (t: string) => { const n = parseFloat((t || "").replace(",", ".")); return isFinite(n) ? n : null; };

export default function TreinoEmExecucao() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { aluno, bloqueado, meuPersonal } = useDados();
  const { avisar } = useUi();
  const [ficha, setFicha] = useState<Ficha | null | undefined>(undefined);
  const [itens, setItens] = useState<FichaItem[]>([]);
  const [exs, setExs] = useState<Exercicio[]>([]);
  const [treino, setTreino] = useState<TreinoFeito | null>(null);
  const [linhas, setLinhas] = useState<Record<string, Linha[]>>({});
  const [anteriores, setAnteriores] = useState<Record<string, { carga: number | null; repeticoes: number | null }[]>>({});
  const [atual, setAtual] = useState(0);
  const [inicio, setInicio] = useState(Date.now());
  const [agora, setAgora] = useState(Date.now());
  const [descanso, setDescanso] = useState<{ ate: number; total: number } | null>(null);
  const [fim, setFim] = useState<{ series: number; minutos: number } | null>(null);
  const [concluindo, setConcluindo] = useState(false);
  const criando = useRef<Promise<TreinoFeito> | null>(null);

  useEffect(() => {
    if (!aluno) return;
    const s = sb();
    (async () => {
      const { data: f } = await s.from("fichas").select("*").eq("id", id).maybeSingle();
      if (!f) { setFicha(null); return; }
      const [it, ex, tr] = await Promise.all([
        s.from("ficha_itens").select("*").eq("ficha_id", id).order("ordem"),
        s.from("exercicios").select("*"),
        s.from("treinos_feitos").select("*").eq("aluno_id", aluno.id).eq("ficha_id", id).eq("data", hoje()).eq("concluido", false).order("criado_em", { ascending: false }).limit(1),
      ]);
      const lista = (it.data ?? []) as FichaItem[];
      const emAndamento = ((tr.data ?? [])[0] as TreinoFeito) ?? null;
      const ids = [...new Set(lista.map((i) => i.exercicio_id))];
      const { data: hist } = ids.length
        ? await s.from("series_feitas").select("*").eq("aluno_id", aluno.id).in("exercicio_id", ids).order("criado_em", { ascending: false }).limit(1500)
        : { data: [] };
      const ant: Record<string, { carga: number | null; repeticoes: number | null }[]> = {};
      const doTreinoAtual: Record<string, SerieFeita[]> = {};
      const treinoAnterior: Record<string, string> = {};
      for (const sf of (hist ?? []) as SerieFeita[]) {
        if (emAndamento && sf.treino_id === emAndamento.id) { (doTreinoAtual[sf.exercicio_id] ??= []).push(sf); continue; }
        if (!treinoAnterior[sf.exercicio_id]) treinoAnterior[sf.exercicio_id] = sf.treino_id;
        if (treinoAnterior[sf.exercicio_id] !== sf.treino_id) continue;
        (ant[sf.exercicio_id] ??= [])[sf.serie - 1] = { carga: sf.carga != null ? Number(sf.carga) : null, repeticoes: sf.repeticoes };
      }
      const l: Record<string, Linha[]> = {};
      for (const i of lista) {
        const n = numeroSeries(i.series);
        l[i.id] = Array.from({ length: n }, (_, k) => {
          const feita = doTreinoAtual[i.exercicio_id]?.find((x) => x.serie === k + 1);
          const a = ant[i.exercicio_id]?.[k];
          return {
            carga: feita?.carga != null ? String(feita.carga).replace(".", ",") : a?.carga != null ? String(a.carga).replace(".", ",") : primeiroNumero(i.carga),
            reps: feita?.repeticoes != null ? String(feita.repeticoes) : primeiroNumero(i.repeticoes),
            feito: !!feita,
          };
        });
      }
      setItens(lista); setExs((ex.data ?? []) as Exercicio[]); setAnteriores(ant); setLinhas(l); setTreino(emAndamento);
      if (emAndamento) setInicio(new Date(emAndamento.criado_em).getTime());
      setFicha(f as Ficha);
    })();
  }, [aluno, id]);

  // relógio do treino e do descanso
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (descanso && agora >= descanso.ate) {
      setDescanso(null);
      try { navigator.vibrate?.([200, 100, 200]); } catch {}
    }
  }, [agora, descanso]);

  // mantém a tela acesa durante o treino
  useEffect(() => {
    let trava: any = null;
    (navigator as any).wakeLock?.request("screen").then((w: any) => { trava = w; }).catch(() => {});
    return () => { trava?.release?.().catch?.(() => {}); };
  }, []);

  const total = useMemo(() => Object.values(linhas).flat().length, [linhas]);
  const feitas = useMemo(() => Object.values(linhas).flat().filter((x) => x.feito).length, [linhas]);

  if (bloqueado) return <div className="pt-6"><TreinoPausado /></div>;
  if (ficha === undefined || !aluno) return <Carregando />;
  if (ficha === null) {
    return (
      <div className="p-6 flex flex-col items-center gap-3 text-center">
        <p className="font-extrabold">Treino não encontrado</p>
        <Link href="/a/treino"><Botao>Ver meus treinos</Botao></Link>
      </div>
    );
  }

  async function garantirTreino(): Promise<TreinoFeito> {
    if (treino) return treino;
    if (!criando.current) {
      criando.current = (async () => {
        const { data, error } = await sb().from("treinos_feitos").insert({ personal_id: aluno!.personal_id, aluno_id: aluno!.id, ficha_id: id, data: hoje() }).select().single();
        if (error) { criando.current = null; throw error; }
        setTreino(data as TreinoFeito);
        setInicio(Date.now());
        return data as TreinoFeito;
      })();
    }
    return criando.current;
  }

  async function marcar(item: FichaItem, k: number) {
    const l = linhas[item.id][k];
    const novo = !l.feito;
    setLinhas((x) => ({ ...x, [item.id]: x[item.id].map((y, j) => (j === k ? { ...y, feito: novo } : y)) }));
    try {
      const t = await garantirTreino();
      const s = sb();
      if (novo) {
        const { error } = await s.from("series_feitas").upsert({
          personal_id: aluno!.personal_id, aluno_id: aluno!.id, treino_id: t.id, exercicio_id: item.exercicio_id, serie: k + 1,
          carga: numero(l.carga), repeticoes: numero(l.reps) != null ? Math.round(numero(l.reps)!) : null,
        }, { onConflict: "treino_id,exercicio_id,serie" });
        if (error) throw error;
        const seg = segundosDescanso(item.descanso);
        const ultimaDoExercicio = linhas[item.id].every((y, j) => (j === k ? true : y.feito));
        if (!ultimaDoExercicio || atual < itens.length - 1) setDescanso({ ate: Date.now() + seg * 1000, total: seg });
      } else {
        await s.from("series_feitas").delete().eq("treino_id", t.id).eq("exercicio_id", item.exercicio_id).eq("serie", k + 1);
      }
    } catch (e) {
      setLinhas((x) => ({ ...x, [item.id]: x[item.id].map((y, j) => (j === k ? { ...y, feito: !novo } : y)) }));
      avisar(mensagemErro(e), "erro");
    }
  }

  async function concluir() {
    setConcluindo(true);
    try {
      const t = await garantirTreino();
      const minutos = Math.min(600, Math.max(1, Math.round((Date.now() - inicio) / 60000)));
      const { error } = await sb().from("treinos_feitos").update({ concluido: true, duracao_min: minutos }).eq("id", t.id);
      if (error) throw error;
      setFim({ series: feitas, minutos });
    } catch (e) {
      avisar(mensagemErro(e), "erro");
    } finally {
      setConcluindo(false);
    }
  }

  if (fim) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="w-20 h-20 rounded-full bg-verde-cl text-verde flex items-center justify-center"><IconCheck size={40} /></span>
        <h1 className="text-2xl font-black">Treino concluído!</h1>
        <p className="text-texto2">{fim.series} séries em {fim.minutos} min. {meuPersonal ? `${meuPersonal.nome.split(" ")[0]} vê o seu treino.` : ""}</p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Link href="/a/evolucao"><Botao className="w-full">Ver minha evolução</Botao></Link>
          <Link href="/a"><Botao variante="secundario" className="w-full">Voltar ao início</Botao></Link>
        </div>
      </div>
    );
  }

  if (!itens.length) {
    return (
      <div className="p-6 flex flex-col items-center gap-3 text-center">
        <p className="font-extrabold">{ficha.nome} ainda não tem exercícios</p>
        <Link href="/a/treino"><Botao variante="secundario">Voltar</Botao></Link>
      </div>
    );
  }

  const item = itens[Math.min(atual, itens.length - 1)];
  const ex = exs.find((e) => e.id === item.exercicio_id);
  const ant = anteriores[item.exercicio_id] ?? [];
  const seg = Math.floor((agora - inicio) / 1000);
  const relogio = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`;
  const resto = descanso ? Math.max(0, Math.ceil((descanso.ate - agora) / 1000)) : 0;
  const fmtNum = (v: number | null) => (v == null ? "" : String(v).replace(".", ","));

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-20 bg-fundo/95 backdrop-blur px-3 pt-[max(10px,env(safe-area-inset-top))] pb-2.5 flex items-center gap-2">
        <button type="button" onClick={() => router.push("/a")} aria-label="Sair do treino" className="w-10 h-10 rounded-full flex items-center justify-center text-texto2 hover:bg-linha2 cursor-pointer"><IconEsq size={22} /></button>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-extrabold truncate">{ficha.nome}</p>
          <p className="text-xs text-mudo">Exercício {atual + 1} de {itens.length} · {treino ? relogio : "não iniciado"}</p>
        </div>
        <span className="text-xs font-bold text-texto2 tabular-nums">{feitas}/{total}</span>
      </header>
      <div className="h-1 bg-linha2 mx-3 rounded-full overflow-hidden"><div className="h-1 bg-azul transition-all" style={{ width: `${total ? (feitas / total) * 100 : 0}%` }} /></div>

      <div className="flex-1 px-4 pt-3 pb-28 flex flex-col gap-3.5">
        {ex ? <VideoExercicio exercicio={ex} personalNome={meuPersonal?.nome} tamanho="h-[36vh] max-h-[360px] min-h-[200px]" /> : null}
        <div>
          <h2 className="text-xl font-extrabold leading-tight">{ex?.nome ?? "Exercício"}</h2>
          <p className="text-sm text-texto2 mt-0.5">{item.series} séries × {item.repeticoes}{item.carga ? ` · ${item.carga}` : ""} · descanso {item.descanso}</p>
        </div>
        {item.observacao || ex?.dica ? (
          <p className="text-sm bg-azul-bg text-azul-esc rounded-xl px-3.5 py-2.5"><b>{meuPersonal?.nome.split(" ")[0] ?? "Personal"}:</b> {item.observacao || ex?.dica}</p>
        ) : null}

        <div className="bg-white border border-linha rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[44px_1fr_72px_64px_52px] gap-1.5 px-3 py-2 text-[10px] font-bold text-mudo uppercase tracking-[0.05em] border-b border-linha2">
            <span>Série</span><span>Anterior</span><span>Kg</span><span>Reps</span><span className="text-center">Feito</span>
          </div>
          {(linhas[item.id] ?? []).map((l, k) => (
            <div key={k} className={`grid grid-cols-[44px_1fr_72px_64px_52px] gap-1.5 items-center px-3 py-2 ${l.feito ? "bg-verde-cl/60" : ""}`}>
              <span className="text-sm font-extrabold text-center w-7 h-7 rounded-full bg-linha2 flex items-center justify-center">{k + 1}</span>
              <span className="text-xs text-mudo tabular-nums">{ant[k] ? `${fmtNum(ant[k].carga)}${ant[k].carga != null ? " kg" : ""}${ant[k].repeticoes != null ? ` × ${ant[k].repeticoes}` : ""}` : "—"}</span>
              <input inputMode="decimal" value={l.carga} aria-label={`Carga da série ${k + 1}`} disabled={l.feito}
                onChange={(e) => setLinhas((x) => ({ ...x, [item.id]: x[item.id].map((y, j) => (j === k ? { ...y, carga: e.target.value } : y)) }))}
                className="h-10 w-full rounded-lg border border-linha bg-white text-center text-base font-bold disabled:bg-transparent disabled:border-transparent" />
              <input inputMode="numeric" value={l.reps} aria-label={`Repetições da série ${k + 1}`} disabled={l.feito}
                onChange={(e) => setLinhas((x) => ({ ...x, [item.id]: x[item.id].map((y, j) => (j === k ? { ...y, reps: e.target.value } : y)) }))}
                className="h-10 w-full rounded-lg border border-linha bg-white text-center text-base font-bold disabled:bg-transparent disabled:border-transparent" />
              <button type="button" onClick={() => marcar(item, k)} aria-label={l.feito ? `Desmarcar série ${k + 1}` : `Marcar série ${k + 1} como feita`}
                className={`w-11 h-10 mx-auto rounded-lg flex items-center justify-center cursor-pointer ${l.feito ? "bg-verde-dot text-white" : "bg-linha2 text-mudo"}`}>
                <IconCheck size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {descanso ? (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-tinta text-white px-5 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] flex items-center gap-4 max-w-[560px] mx-auto">
          <div className="flex-1">
            <p className="text-[11px] font-bold tracking-[0.08em] text-white/60">DESCANSO</p>
            <p className="text-3xl font-black tabular-nums">{Math.floor(resto / 60)}:{String(resto % 60).padStart(2, "0")}</p>
            <div className="h-1 mt-1.5 bg-white/15 rounded-full overflow-hidden"><div className="h-1 bg-white" style={{ width: `${(resto / descanso.total) * 100}%` }} /></div>
          </div>
          <button type="button" onClick={() => setDescanso({ ...descanso, ate: descanso.ate + 15000, total: descanso.total + 15 })} className="h-11 px-3 rounded-full bg-white/15 text-sm font-bold cursor-pointer">+15 s</button>
          <button type="button" onClick={() => setDescanso(null)} className="h-11 px-4 rounded-full bg-white text-tinta text-sm font-extrabold cursor-pointer">Pular</button>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-white border-t border-linha px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] flex items-center gap-2 max-w-[560px] mx-auto">
          <Botao variante="secundario" disabled={atual === 0} onClick={() => setAtual(atual - 1)} aria-label="Exercício anterior"><IconEsq size={18} /></Botao>
          {atual < itens.length - 1 ? (
            <Botao className="flex-1" onClick={() => setAtual(atual + 1)}>Próximo: {exs.find((e) => e.id === itens[atual + 1].exercicio_id)?.nome ?? "exercício"} <IconDir size={16} /></Botao>
          ) : (
            <Botao className="flex-1" onClick={concluir} disabled={concluindo || feitas === 0}>{concluindo ? "Salvando…" : feitas === 0 ? "Marque as séries feitas" : "Concluir treino"}</Botao>
          )}
        </div>
      )}
    </div>
  );
}
