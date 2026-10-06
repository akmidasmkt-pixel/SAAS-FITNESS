"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { sb, mensagemErro } from "@/lib/supabase";
import { useDados } from "@/lib/store";
import { useUi } from "@/lib/ui";
import type { Exercicio, Ficha, FichaItem } from "@/lib/types";
import { GRUPOS } from "@/lib/types";
import { combinaBusca } from "@/lib/format";
import { Cabecalho, Conteudo } from "@/components/Cabecalho";
import { Aviso, Botao, Campo, Card, Carregando, Entrada, Filtros, Folha, Selecao, Vazio } from "@/components/ui";
import { VideoExercicio } from "@/components/Midia";
import { IconBaixo, IconBusca, IconCima, IconLixo, IconMais, IconVideo } from "@/lib/icons";

type ItemLocal = Omit<FichaItem, "id" | "personal_id" | "ficha_id"> & { id?: string; chave: string };
const novaChave = () => Math.random().toString(36).slice(2);
const LETRAS = "ABCDEFGH";

export default function EditorTreino() {
  const { id } = useParams<{ id: string }>();
  const { alunos, exercicios } = useDados();
  const { avisar } = useUi();
  const aluno = alunos.find((a) => a.id === id);
  const [fichas, setFichas] = useState<Ficha[] | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [itens, setItens] = useState<ItemLocal[]>([]);
  const [ficha, setFicha] = useState<{ nome: string; dias: string; valida_ate: string; ativa: boolean }>({ nome: "", dias: "", valida_ate: "", ativa: true });
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [escolher, setEscolher] = useState(false);
  const [copiar, setCopiar] = useState(false);
  const [previa, setPrevia] = useState<Exercicio | null>(null);

  const carregarFichas = useCallback(async (manter?: string) => {
    const { data } = await sb().from("fichas").select("*").eq("aluno_id", id).order("ordem").order("criado_em");
    const lista = (data ?? []) as Ficha[];
    setFichas(lista);
    setSelId((atual) => manter ?? (lista.some((f) => f.id === atual) ? atual : lista[0]?.id ?? null));
  }, [id]);

  useEffect(() => { carregarFichas(); }, [carregarFichas]);

  const sel = fichas?.find((f) => f.id === selId) ?? null;
  useEffect(() => {
    if (!sel) { setItens([]); return; }
    setFicha({ nome: sel.nome, dias: sel.dias, valida_ate: sel.valida_ate ?? "", ativa: sel.ativa });
    setSujo(false);
    sb().from("ficha_itens").select("*").eq("ficha_id", sel.id).order("ordem").then(({ data }) => {
      setItens(((data ?? []) as FichaItem[]).map((i) => ({ ...i, chave: i.id })));
    });
  }, [sel]);

  function trocarFicha(nova: string) {
    if (sujo && !confirm("Há mudanças não salvas neste treino. Sair sem salvar?")) return;
    setSelId(nova);
  }

  async function criarFicha() {
    if (sujo && !confirm("Há mudanças não salvas neste treino. Criar outro sem salvar?")) return;
    const n = fichas?.length ?? 0;
    const { data, error } = await sb().from("fichas").insert({ aluno_id: id, nome: `Treino ${LETRAS[n] ?? n + 1}`, ordem: n }).select().single();
    if (error) return avisar(mensagemErro(error), "erro");
    await carregarFichas((data as Ficha).id);
  }

  async function salvar() {
    if (!sel) return;
    if (!ficha.nome.trim()) return avisar("Dê um nome ao treino.", "erro");
    setSalvando(true);
    try {
      const s = sb();
      const r1 = await s.from("fichas").update({ nome: ficha.nome.trim(), dias: ficha.dias.trim(), valida_ate: ficha.valida_ate || null, ativa: ficha.ativa, atualizado_em: new Date().toISOString() }).eq("id", sel.id);
      if (r1.error) throw r1.error;
      const { data: atuais } = await s.from("ficha_itens").select("id").eq("ficha_id", sel.id);
      const manter = new Set(itens.filter((i) => i.id).map((i) => i.id));
      const remover = (atuais ?? []).map((x: { id: string }) => x.id).filter((x) => !manter.has(x));
      if (remover.length) { const r = await s.from("ficha_itens").delete().in("id", remover); if (r.error) throw r.error; }
      for (const [ordem, i] of itens.entries()) {
        const linha = { ficha_id: sel.id, exercicio_id: i.exercicio_id, ordem, series: i.series.trim() || "3", repeticoes: i.repeticoes.trim() || "12", carga: i.carga.trim(), descanso: i.descanso.trim() || "60 s", observacao: i.observacao.trim() };
        const r = i.id ? await s.from("ficha_itens").update(linha).eq("id", i.id) : await s.from("ficha_itens").insert(linha);
        if (r.error) throw r.error;
      }
      setSujo(false);
      avisar("Treino salvo. O aluno já vê no app.");
      await carregarFichas(sel.id);
    } catch (e) {
      avisar(mensagemErro(e), "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function apagarFicha() {
    if (!sel || !confirm(`Apagar o ${sel.nome}? O histórico de treinos feitos continua.`)) return;
    const { error } = await sb().from("fichas").delete().eq("id", sel.id);
    if (error) return avisar(mensagemErro(error), "erro");
    setSujo(false);
    avisar("Treino apagado.");
    await carregarFichas();
  }

  const mexer = (fn: (xs: ItemLocal[]) => ItemLocal[]) => { setItens(fn); setSujo(true); };
  const adicionar = (e: Exercicio) => {
    mexer((xs) => [...xs, { chave: novaChave(), exercicio_id: e.id, ordem: xs.length, series: "3", repeticoes: "12", carga: "", descanso: "60 s", observacao: "" }]);
  };
  const ex = (eid: string) => exercicios.find((e) => e.id === eid);

  if (!aluno || !fichas) {
    return <><Cabecalho titulo="Montar treino" voltar={{ href: "/treinos", rotulo: "Voltar" }} /><Conteudo><Carregando /></Conteudo></>;
  }

  return (
    <>
      <Cabecalho titulo={`Treino de ${aluno.nome.split(" ")[0]}`} sub={aluno.nome} voltar={{ href: `/alunos/${aluno.id}?aba=treinos`, rotulo: "Voltar para a ficha" }}
        acoes={sel ? <Botao onClick={salvar} disabled={salvando || !sujo}>{salvando ? "Salvando…" : sujo ? "Salvar treino" : "Salvo"}</Botao> : null} />
      <Conteudo>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {fichas.map((f) => (
            <button key={f.id} type="button" onClick={() => trocarFicha(f.id)} aria-pressed={f.id === selId}
              className={`h-10 px-4 rounded-full border text-sm font-bold whitespace-nowrap cursor-pointer ${f.id === selId ? "bg-tinta text-white border-tinta" : "bg-white text-texto2 border-linha"} ${f.ativa ? "" : "opacity-60"}`}>
              {f.nome}
            </button>
          ))}
          <Botao variante="secundario" pequeno onClick={criarFicha}><IconMais size={16} /> Novo treino</Botao>
          <Botao variante="fantasma" pequeno onClick={() => setCopiar(true)}>Copiar de outro aluno</Botao>
        </div>

        {!sel ? (
          <Card>
            <Vazio titulo="Nenhum treino ainda" texto="Crie o Treino A e adicione os exercícios. Você pode montar quantos quiser (A, B, C…)."
              acao={<Botao onClick={criarFicha}>Criar Treino A</Botao>} />
          </Card>
        ) : (
          <>
            <Card className="p-4 sm:p-5">
              <div className="grid sm:grid-cols-[1.3fr_1fr_160px] gap-3">
                <Campo rotulo="Nome do treino"><Entrada value={ficha.nome} onChange={(e) => { setFicha({ ...ficha, nome: e.target.value }); setSujo(true); }} placeholder="Ex.: Treino A · Superiores" /></Campo>
                <Campo rotulo="Dias (opcional)" dica="Ex.: seg e qui. O app sugere o treino do dia."><Entrada value={ficha.dias} onChange={(e) => { setFicha({ ...ficha, dias: e.target.value }); setSujo(true); }} placeholder="seg, qui" /></Campo>
                <Campo rotulo="Válido até"><Entrada type="date" value={ficha.valida_ate} onChange={(e) => { setFicha({ ...ficha, valida_ate: e.target.value }); setSujo(true); }} /></Campo>
              </div>
              <div className="flex items-center justify-between gap-3 mt-3">
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input type="checkbox" checked={ficha.ativa} onChange={(e) => { setFicha({ ...ficha, ativa: e.target.checked }); setSujo(true); }} className="w-5 h-5 accent-[#2a78d6]" />
                  Ativo (o aluno vê no app)
                </label>
                <button type="button" onClick={apagarFicha} className="text-xs font-bold text-vermelho cursor-pointer">Apagar treino</button>
              </div>
            </Card>

            <Card>
              {!itens.length ? (
                <Vazio titulo="Adicione os exercícios" texto="Escolha da sua lista. Os que têm vídeo aparecem com o ícone azul." acao={<Botao onClick={() => setEscolher(true)}><IconMais size={16} /> Adicionar exercício</Botao>} />
              ) : (
                <ul className="divide-y divide-linha2">
                  {itens.map((i, k) => {
                    const e = ex(i.exercicio_id);
                    const temVideo = !!(e?.video_caminho || e?.video_link);
                    const set = (campo: keyof ItemLocal) => (ev: { target: { value: string } }) => mexer((xs) => xs.map((x) => (x.chave === i.chave ? { ...x, [campo]: ev.target.value } : x)));
                    return (
                      <li key={i.chave} className="px-4 sm:px-5 py-3.5 flex flex-col gap-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-linha2 text-xs font-extrabold flex items-center justify-center shrink-0">{k + 1}</span>
                          <button type="button" onClick={() => e && setPrevia(e)} className="flex-1 min-w-0 text-left flex items-center gap-2 cursor-pointer">
                            <IconVideo size={16} className={temVideo ? "text-azul shrink-0" : "text-[#c9c8c3] shrink-0"} />
                            <span className="text-[15px] font-bold truncate">{e?.nome ?? "Exercício removido"}</span>
                          </button>
                          <button type="button" aria-label="Subir" disabled={k === 0} onClick={() => mexer((xs) => { const y = [...xs]; [y[k - 1], y[k]] = [y[k], y[k - 1]]; return y; })} className="w-9 h-9 rounded-lg text-texto2 hover:bg-fundo disabled:opacity-30 flex items-center justify-center cursor-pointer"><IconCima size={16} /></button>
                          <button type="button" aria-label="Descer" disabled={k === itens.length - 1} onClick={() => mexer((xs) => { const y = [...xs]; [y[k + 1], y[k]] = [y[k], y[k + 1]]; return y; })} className="w-9 h-9 rounded-lg text-texto2 hover:bg-fundo disabled:opacity-30 flex items-center justify-center cursor-pointer"><IconBaixo size={16} /></button>
                          <button type="button" aria-label="Remover" onClick={() => mexer((xs) => xs.filter((x) => x.chave !== i.chave))} className="w-9 h-9 rounded-lg text-mudo hover:text-vermelho hover:bg-fundo flex items-center justify-center cursor-pointer"><IconLixo size={16} /></button>
                        </div>
                        <div className="grid grid-cols-4 gap-2 sm:pl-9">
                          <Campo rotulo="Séries"><Entrada value={i.series} onChange={set("series")} className="h-10" /></Campo>
                          <Campo rotulo="Repetições"><Entrada value={i.repeticoes} onChange={set("repeticoes")} className="h-10" placeholder="10-12" /></Campo>
                          <Campo rotulo="Carga"><Entrada value={i.carga} onChange={set("carga")} className="h-10" placeholder="20 kg" /></Campo>
                          <Campo rotulo="Descanso"><Entrada value={i.descanso} onChange={set("descanso")} className="h-10" placeholder="60 s" /></Campo>
                        </div>
                        <div className="sm:pl-9">
                          <Entrada value={i.observacao} onChange={set("observacao")} placeholder="Dica para o aluno (opcional): ex. desça em 3 segundos" className="h-10 text-sm" aria-label="Observação" />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {itens.length ? (
                <div className="px-4 sm:px-5 py-3 border-t border-linha2 flex justify-between items-center gap-2">
                  <Botao variante="secundario" onClick={() => setEscolher(true)}><IconMais size={16} /> Adicionar exercício</Botao>
                  <Botao onClick={salvar} disabled={salvando || !sujo}>{salvando ? "Salvando…" : sujo ? "Salvar treino" : "Salvo"}</Botao>
                </div>
              ) : null}
            </Card>
          </>
        )}
      </Conteudo>

      <EscolherExercicio aberta={escolher} onFechar={() => setEscolher(false)} onEscolher={(e) => adicionar(e)} jaNoTreino={itens.map((i) => i.exercicio_id)} />
      <CopiarTreino aberta={copiar} destinoId={aluno.id} onFechar={() => setCopiar(false)} onCopiado={(nova) => carregarFichas(nova)} />
      <Folha aberta={!!previa} titulo={previa?.nome ?? ""} onFechar={() => setPrevia(null)}>
        {previa ? <div className="flex flex-col gap-3"><VideoExercicio exercicio={previa} compacto />{previa.dica ? <p className="text-sm text-texto2">{previa.dica}</p> : null}</div> : null}
      </Folha>
    </>
  );
}

function EscolherExercicio({ aberta, onFechar, onEscolher, jaNoTreino }: { aberta: boolean; onFechar: () => void; onEscolher: (e: Exercicio) => void; jaNoTreino: string[] }) {
  const { exercicios } = useDados();
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState<string>("Todos");
  const [adicionados, setAdicionados] = useState(0);
  useEffect(() => { if (aberta) { setBusca(""); setAdicionados(0); } }, [aberta]);
  const lista = useMemo(() => exercicios.filter((e) => e.ativo && (grupo === "Todos" || e.grupo === grupo) && combinaBusca(e.nome, busca)), [exercicios, grupo, busca]);
  return (
    <Folha aberta={aberta} titulo="Adicionar exercício" onFechar={onFechar} largura="max-w-xl"
      rodape={<Botao onClick={onFechar}>{adicionados ? `Pronto (${adicionados} adicionados)` : "Fechar"}</Botao>}>
      <div className="flex flex-col gap-3">
        <div className="relative">
          <IconBusca size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-mudo" />
          <Entrada value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar exercício" className="pl-10" autoFocus aria-label="Buscar exercício" />
        </div>
        <Filtros opcoes={["Todos", ...GRUPOS].map((g) => ({ valor: g, rotulo: g }))} valor={grupo} onChange={(v) => setGrupo(v)} />
        <ul className="flex flex-col divide-y divide-linha2 -mx-1">
          {lista.map((e) => {
            const temVideo = !!(e.video_caminho || e.video_link);
            const qtd = jaNoTreino.filter((x) => x === e.id).length;
            return (
              <li key={e.id}>
                <button type="button" onClick={() => { onEscolher(e); setAdicionados((n) => n + 1); }} className="w-full flex items-center gap-3 px-1 py-2.5 text-left hover:bg-fundo rounded-lg cursor-pointer">
                  <IconVideo size={18} className={temVideo ? "text-azul shrink-0" : "text-[#c9c8c3] shrink-0"} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold truncate">{e.nome}</span>
                    <span className="block text-xs text-mudo">{e.grupo}{temVideo ? " · com vídeo" : " · sem vídeo"}</span>
                  </span>
                  {qtd ? <span className="text-[11px] font-bold text-verde">no treino</span> : <IconMais size={18} className="text-azul" />}
                </button>
              </li>
            );
          })}
          {!lista.length ? <li className="py-8 text-center text-sm text-mudo">Nenhum exercício encontrado. Cadastre em Exercícios e vídeos.</li> : null}
        </ul>
      </div>
    </Folha>
  );
}

function CopiarTreino({ aberta, destinoId, onFechar, onCopiado }: { aberta: boolean; destinoId: string; onFechar: () => void; onCopiado: (fichaId: string) => void }) {
  const { alunos } = useDados();
  const { avisar } = useUi();
  const [origem, setOrigem] = useState("");
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [fichaId, setFichaId] = useState("");
  const [copiando, setCopiando] = useState(false);
  useEffect(() => { if (aberta) { setOrigem(""); setFichas([]); setFichaId(""); } }, [aberta]);
  useEffect(() => {
    if (!origem) return;
    sb().from("fichas").select("*").eq("aluno_id", origem).order("ordem").then(({ data }) => { setFichas((data ?? []) as Ficha[]); setFichaId(""); });
  }, [origem]);

  async function copiarAgora() {
    const f = fichas.find((x) => x.id === fichaId);
    if (!f) return;
    setCopiando(true);
    try {
      const s = sb();
      const { count } = await s.from("fichas").select("id", { count: "exact", head: true }).eq("aluno_id", destinoId);
      const { data: nova, error } = await s.from("fichas").insert({ aluno_id: destinoId, nome: f.nome, dias: f.dias, ordem: count ?? 0 }).select().single();
      if (error) throw error;
      const { data: its } = await s.from("ficha_itens").select("*").eq("ficha_id", f.id).order("ordem");
      const linhas = ((its ?? []) as FichaItem[]).map((i) => ({ ficha_id: (nova as Ficha).id, exercicio_id: i.exercicio_id, ordem: i.ordem, series: i.series, repeticoes: i.repeticoes, carga: i.carga, descanso: i.descanso, observacao: i.observacao }));
      if (linhas.length) { const r = await s.from("ficha_itens").insert(linhas); if (r.error) throw r.error; }
      avisar("Treino copiado. Ajuste as cargas se precisar.");
      onCopiado((nova as Ficha).id);
      onFechar();
    } catch (e) {
      avisar(mensagemErro(e), "erro");
    } finally {
      setCopiando(false);
    }
  }

  return (
    <Folha aberta={aberta} titulo="Copiar treino de outro aluno" onFechar={onFechar}
      rodape={<><Botao variante="secundario" onClick={onFechar}>Cancelar</Botao><Botao onClick={copiarAgora} disabled={!fichaId || copiando}>{copiando ? "Copiando…" : "Copiar"}</Botao></>}>
      <div className="flex flex-col gap-3">
        <Campo rotulo="De qual aluno">
          <Selecao value={origem} onChange={(e) => setOrigem(e.target.value)}>
            <option value="">Escolha…</option>
            {alunos.filter((a) => a.id !== destinoId).map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </Selecao>
        </Campo>
        {origem ? (
          fichas.length ? (
            <Campo rotulo="Qual treino">
              <Selecao value={fichaId} onChange={(e) => setFichaId(e.target.value)}>
                <option value="">Escolha…</option>
                {fichas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </Selecao>
            </Campo>
          ) : <Aviso>Esse aluno ainda não tem treinos.</Aviso>
        ) : null}
      </div>
    </Folha>
  );
}
