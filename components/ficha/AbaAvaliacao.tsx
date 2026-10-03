"use client";

import { useEffect, useMemo, useState } from "react";
import { sb, mensagemErro } from "@/lib/supabase";
import { useDados } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { useEvolucao } from "@/lib/useEvolucao";
import type { Aluno, Anamnese, Angulo, Avaliacao, Medida } from "@/lib/types";
import { MEDIDAS, MEDIDAS_DO_OBJETIVO, ORDEM_MEDIDAS, num, serie } from "@/lib/evolucao";
import { enviar, nomeArquivo, urlsAssinadas } from "@/lib/arquivos";
import { hoje } from "@/lib/dates";
import { ddmmaa, parseValor } from "@/lib/format";
import { AreaTexto, Aviso, Botao, Campo, Card, CardTopo, Carregando, Entrada, Folha, Segmentado } from "../ui";
import { CameraGuia } from "../Midia";
import { IconCamera, IconCheck, IconLixo } from "@/lib/icons";

const CAMPOS_AV: { k: Medida; rotulo: string }[] = [
  { k: "peso", rotulo: "Peso (kg)" }, { k: "gordura", rotulo: "Gordura (%)" }, { k: "massa_magra", rotulo: "Massa magra (kg)" },
  { k: "cintura", rotulo: "Cintura (cm)" }, { k: "quadril", rotulo: "Quadril (cm)" }, { k: "braco", rotulo: "Braço (cm)" }, { k: "coxa", rotulo: "Coxa (cm)" },
];
const ANGULOS: Angulo[] = ["frente", "lado", "costas"];
const NOME_ANGULO: Record<Angulo, string> = { frente: "Frente", lado: "Lado", costas: "Costas" };

export function AbaAvaliacao({ aluno }: { aluno: Aluno }) {
  const ev = useEvolucao(aluno.id);
  const [nova, setNova] = useState(false);
  if (ev.carregando) return <Carregando />;
  return (
    <div className="grid gap-4 lg:grid-cols-2 items-start">
      <div className="flex flex-col gap-4">
        <Avaliacoes aluno={aluno} avaliacoes={ev.avaliacoes} onNova={() => setNova(true)} onMudou={ev.recarregar} />
        <Metas aluno={aluno} ev={ev} />
      </div>
      <AnamneseCard aluno={aluno} />
      <NovaAvaliacao aberta={nova} aluno={aluno} ev={ev} onFechar={() => setNova(false)} />
    </div>
  );
}

function Avaliacoes({ aluno, avaliacoes, onNova, onMudou }: { aluno: Aluno; avaliacoes: Avaliacao[]; onNova: () => void; onMudou: () => void }) {
  const { avisar } = useUi();
  const lista = [...avaliacoes].reverse();
  async function apagar(a: Avaliacao) {
    if (!confirm(`Apagar a avaliação de ${ddmmaa(a.data)}? As fotos dessa data continuam no time-lapse.`)) return;
    const { error } = await sb().from("avaliacoes").delete().eq("id", a.id);
    if (error) return avisar(mensagemErro(error), "erro");
    avisar("Avaliação apagada.");
    onMudou();
  }
  const v = (x: number | null, casas = 1) => (x == null ? "—" : num(x, casas));
  return (
    <Card>
      <CardTopo titulo="Avaliações físicas" sub={avaliacoes.length ? `A primeira (${ddmmaa(avaliacoes[0].data)}) é o marco zero` : "A primeira avaliação vira o marco zero"}
        direita={<Botao pequeno onClick={onNova}>Nova avaliação</Botao>} />
      {lista.length ? (
        <div className="overflow-x-auto pb-3">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-[11px] font-bold text-mudo uppercase tracking-[0.05em] border-b border-linha2">
                <th className="px-5 py-2">Data</th><th className="px-2 py-2">Peso</th><th className="px-2 py-2">Gordura</th><th className="px-2 py-2">Cintura</th>
                <th className="px-2 py-2">Quadril</th><th className="px-2 py-2">M. magra</th><th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {lista.map((a, i) => (
                <tr key={a.id} className="border-b border-linha2 last:border-0">
                  <td className="px-5 py-2.5 font-semibold whitespace-nowrap">{ddmmaa(a.data)}{i === lista.length - 1 ? <span className="ml-1.5 text-[10px] font-bold text-azul-esc">MARCO ZERO</span> : null}</td>
                  <td className="px-2 py-2.5 tabular-nums">{v(a.peso)}</td><td className="px-2 py-2.5 tabular-nums">{v(a.gordura)}</td>
                  <td className="px-2 py-2.5 tabular-nums">{v(a.cintura)}</td><td className="px-2 py-2.5 tabular-nums">{v(a.quadril)}</td>
                  <td className="px-2 py-2.5 tabular-nums">{v(a.massa_magra)}</td>
                  <td className="px-3 py-2.5 text-right"><button type="button" onClick={() => apagar(a)} aria-label="Apagar avaliação" className="text-mudo hover:text-vermelho cursor-pointer"><IconLixo size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 pb-5 text-sm text-mudo">Nenhuma avaliação de {aluno.nome.split(" ")[0]} ainda.</p>
      )}
    </Card>
  );
}

function Metas({ aluno, ev }: { aluno: Aluno; ev: ReturnType<typeof useEvolucao> }) {
  const { avisar } = useUi();
  const ordem = useMemo(() => [...new Set([...MEDIDAS_DO_OBJETIVO[aluno.objetivo], ...ORDEM_MEDIDAS])], [aluno.objetivo]);
  const [campos, setCampos] = useState<Record<string, { inicio: string; alvo: string }>>({});
  const [salvando, setSalvando] = useState(false);
  const [todas, setTodas] = useState(false);

  useEffect(() => {
    const c: Record<string, { inicio: string; alvo: string }> = {};
    for (const m of ordem) {
      const meta = ev.metas.find((x) => x.medida === m);
      const primeiro = serie(m, ev.avaliacoes, ev.checkins)[0]?.valor;
      c[m] = { inicio: meta ? num(meta.inicio) : primeiro != null ? num(primeiro) : "", alvo: meta ? num(meta.alvo) : "" };
    }
    setCampos(c);
  }, [ev.metas, ev.avaliacoes, ev.checkins, ordem]);

  async function salvar() {
    setSalvando(true);
    try {
      const s = sb();
      for (const m of ordem) {
        const c = campos[m];
        const atual = ev.metas.find((x) => x.medida === m);
        const ini = parseValor(c?.inicio ?? ""), alvo = parseValor(c?.alvo ?? "");
        if (!c?.alvo.trim()) {
          if (atual) { const { error } = await s.from("metas").delete().eq("id", atual.id); if (error) throw error; }
          continue;
        }
        if (!isFinite(ini) || !isFinite(alvo)) throw new Error(`Confira os números de ${MEDIDAS[m].rotulo.toLowerCase()}.`);
        if (ini === alvo) throw new Error(`Em ${MEDIDAS[m].rotulo.toLowerCase()}, a meta precisa ser diferente do início.`);
        const { error } = await s.from("metas").upsert({ aluno_id: aluno.id, medida: m, inicio: ini, alvo }, { onConflict: "aluno_id,medida" });
        if (error) throw error;
      }
      avisar("Metas salvas.");
      ev.recarregar();
    } catch (e) {
      avisar(mensagemErro(e), "erro");
    } finally {
      setSalvando(false);
    }
  }

  const visiveis = todas ? ordem : ordem.filter((m, i) => i < 3 || ev.metas.some((x) => x.medida === m));
  return (
    <Card>
      <CardTopo titulo="Metas" sub="O progresso sobe quando o aluno se aproxima da meta, seja para descer ou subir" />
      <div className="px-4 sm:px-5 pb-4 flex flex-col gap-3">
        <div className="grid grid-cols-[1fr_96px_96px] gap-2 text-[11px] font-bold text-mudo uppercase tracking-[0.05em]">
          <span>Medida</span><span>Início</span><span>Meta</span>
        </div>
        {visiveis.map((m) => (
          <div key={m} className="grid grid-cols-[1fr_96px_96px] gap-2 items-center">
            <span className="text-sm font-semibold">{MEDIDAS[m].rotulo}<span className="text-mudo font-medium">{MEDIDAS[m].unidade.replace(" ", " ")}</span></span>
            <Entrada inputMode="decimal" aria-label={`${MEDIDAS[m].rotulo}: início`} value={campos[m]?.inicio ?? ""} onChange={(e) => setCampos({ ...campos, [m]: { ...campos[m], inicio: e.target.value } })} className="h-10" />
            <Entrada inputMode="decimal" aria-label={`${MEDIDAS[m].rotulo}: meta`} value={campos[m]?.alvo ?? ""} placeholder="—" onChange={(e) => setCampos({ ...campos, [m]: { ...campos[m], alvo: e.target.value } })} className="h-10" />
          </div>
        ))}
        <div className="flex items-center justify-between gap-2">
          {!todas ? <button type="button" onClick={() => setTodas(true)} className="text-xs font-bold text-azul-esc cursor-pointer">Mostrar todas as medidas</button> : <span />}
          <Botao pequeno onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar metas"}</Botao>
        </div>
        <p className="text-xs text-mudo">Deixe a meta em branco para não acompanhar aquela medida. O início vem da primeira avaliação.</p>
      </div>
    </Card>
  );
}

function AnamneseCard({ aluno }: { aluno: Aluno }) {
  const { avisar } = useUi();
  const [a, setA] = useState<Partial<Anamnese> | null>(null);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    sb().from("anamneses").select("*").eq("aluno_id", aluno.id).maybeSingle().then(({ data }) => setA(data ?? { parq_ok: null, parq_obs: "", lesoes: "", rotina: "", objetivo_texto: "", medicamentos: "" }));
  }, [aluno.id]);
  if (!a) return <Card><Carregando /></Card>;

  async function salvar() {
    setSalvando(true);
    const { error } = await sb().from("anamneses").upsert({
      aluno_id: aluno.id, parq_ok: a!.parq_ok ?? null, parq_obs: a!.parq_obs ?? "", lesoes: a!.lesoes ?? "", rotina: a!.rotina ?? "",
      objetivo_texto: a!.objetivo_texto ?? "", medicamentos: a!.medicamentos ?? "", atualizado_em: new Date().toISOString(),
    }, { onConflict: "aluno_id" });
    setSalvando(false);
    if (error) return avisar(mensagemErro(error), "erro");
    avisar("Anamnese salva.");
  }
  const campo = (k: keyof Anamnese, rotulo: string, ph: string) => (
    <Campo rotulo={rotulo}><AreaTexto value={(a[k] as string) ?? ""} placeholder={ph} onChange={(e) => setA({ ...a, [k]: e.target.value })} className="min-h-[72px]" /></Campo>
  );
  return (
    <Card>
      <CardTopo titulo="Anamnese" sub={a.atualizado_em ? `Atualizada em ${ddmmaa(a.atualizado_em.slice(0, 10))}` : "Saúde, histórico e rotina"} />
      <div className="px-4 sm:px-5 pb-4 flex flex-col gap-3">
        <Campo rotulo="Liberado para atividade física (PAR-Q)?">
          <Segmentado rotulo="PAR-Q" opcoes={[{ valor: "sim", rotulo: "Sim" }, { valor: "nao", rotulo: "Não / precisa de liberação" }, { valor: "na", rotulo: "Não avaliado" }]}
            valor={a.parq_ok === true ? "sim" : a.parq_ok === false ? "nao" : "na"} onChange={(v) => setA({ ...a, parq_ok: v === "sim" ? true : v === "nao" ? false : null })} />
        </Campo>
        {a.parq_ok === false ? campo("parq_obs", "Observações do PAR-Q", "O que precisa de liberação médica?") : null}
        {campo("lesoes", "Lesões, dores e cirurgias", "Ex.: dor no joelho direito ao agachar")}
        {campo("medicamentos", "Medicamentos e condições de saúde", "Ex.: hipertensão controlada")}
        {campo("rotina", "Rotina e disponibilidade", "Ex.: treina 4x por semana, de manhã, academia do prédio")}
        {campo("objetivo_texto", "Objetivo nas palavras do aluno", "Ex.: voltar a correr e caber na roupa do casamento")}
        <div className="flex justify-end"><Botao pequeno onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar anamnese"}</Botao></div>
      </div>
    </Card>
  );
}

function NovaAvaliacao({ aberta, aluno, ev, onFechar }: { aberta: boolean; aluno: Aluno; ev: ReturnType<typeof useEvolucao>; onFechar: () => void }) {
  const { perfil } = useDados();
  const { avisar } = useUi();
  const [data, setData] = useState(hoje());
  const [vals, setVals] = useState<Record<string, string>>({});
  const [obs, setObs] = useState("");
  const [fotos, setFotos] = useState<Partial<Record<Angulo, Blob>>>({});
  const [camera, setCamera] = useState<Angulo | null>(null);
  const [fantasmas, setFantasmas] = useState<Partial<Record<Angulo, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const primeira = !ev.avaliacoes.length;

  useEffect(() => {
    if (!aberta) return;
    setData(hoje()); setVals({}); setObs(""); setFotos({}); setErro("");
    const ultimas: Partial<Record<Angulo, string>> = {};
    for (const ang of ANGULOS) {
      const f = [...ev.fotos].reverse().find((x) => x.angulo === ang);
      if (f) ultimas[ang] = f.caminho;
    }
    const caminhos = Object.values(ultimas) as string[];
    if (caminhos.length) urlsAssinadas("fotos", caminhos).then((u) => {
      const r: Partial<Record<Angulo, string>> = {};
      for (const ang of ANGULOS) if (ultimas[ang] && u[ultimas[ang]!]) r[ang] = u[ultimas[ang]!];
      setFantasmas(r);
    });
  }, [aberta, ev.fotos]);

  async function salvar() {
    setErro("");
    const linha: Record<string, number | null> = {};
    for (const c of CAMPOS_AV) {
      const t = (vals[c.k] ?? "").trim();
      if (!t) { linha[c.k] = null; continue; }
      const n = parseValor(t);
      if (!isFinite(n)) return setErro(`Confira o valor de ${c.rotulo.toLowerCase()}.`);
      linha[c.k] = n;
    }
    if (Object.values(linha).every((v) => v == null) && !Object.keys(fotos).length) return setErro("Preencha pelo menos uma medida ou tire as fotos.");
    setSalvando(true);
    try {
      const s = sb();
      const { error } = await s.from("avaliacoes").insert({ aluno_id: aluno.id, data, observacoes: obs.trim(), ...linha });
      if (error) throw error;
      for (const ang of ANGULOS) {
        const b = fotos[ang];
        if (!b) continue;
        const caminho = await enviar("fotos", `${perfil!.id}/${aluno.id}/${nomeArquivo("jpg")}`, b, "image/jpeg");
        const r = await s.from("fotos").insert({ personal_id: perfil!.id, aluno_id: aluno.id, data, angulo: ang, caminho, origem: "avaliacao" });
        if (r.error) throw r.error;
      }
      avisar(primeira ? "Marco zero registrado. Agora defina as metas." : "Avaliação salva.");
      await ev.recarregar();
      onFechar();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Folha aberta={aberta && !camera} titulo={primeira ? "Primeira avaliação · marco zero" : "Nova avaliação"} onFechar={onFechar} largura="max-w-xl"
        rodape={<><Botao variante="secundario" onClick={onFechar}>Cancelar</Botao><Botao onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar avaliação"}</Botao></>}>
        <div className="flex flex-col gap-3.5">
          <Campo rotulo="Data"><Entrada type="date" value={data} max={hoje()} onChange={(e) => setData(e.target.value)} /></Campo>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CAMPOS_AV.map((c) => (
              <Campo key={c.k} rotulo={c.rotulo}><Entrada inputMode="decimal" value={vals[c.k] ?? ""} onChange={(e) => setVals({ ...vals, [c.k]: e.target.value })} /></Campo>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-texto2">Fotos</span>
            <div className="grid grid-cols-3 gap-2">
              {ANGULOS.map((ang) => (
                <button key={ang} type="button" onClick={() => setCamera(ang)}
                  className={`h-24 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold cursor-pointer ${fotos[ang] ? "border-verde bg-verde-cl text-verde" : "border-dashed border-linha text-texto2 hover:bg-fundo"}`}>
                  {fotos[ang] ? <IconCheck size={20} /> : <IconCamera size={20} />}
                  {NOME_ANGULO[ang]}
                </button>
              ))}
            </div>
            <p className="text-xs text-mudo">{Object.keys(fantasmas).length ? "A câmera mostra a última foto de cada ângulo por cima, para repetir a pose." : "Estas fotos viram a referência (silhueta guia) das próximas."}</p>
          </div>
          <Campo rotulo="Observações"><AreaTexto value={obs} onChange={(e) => setObs(e.target.value)} /></Campo>
          {primeira ? <Aviso>Esta é a primeira avaliação: ela vira o marco zero do time-lapse e do progresso até a meta.</Aviso> : null}
          {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
        </div>
      </Folha>
      {camera ? (
        <CameraGuia titulo={`Foto · ${NOME_ANGULO[camera]}`} fantasma={fantasmas[camera]}
          onFoto={(b) => { setFotos((f) => ({ ...f, [camera]: b })); setCamera(null); }} onFechar={() => setCamera(null)} />
      ) : null}
    </>
  );
}
