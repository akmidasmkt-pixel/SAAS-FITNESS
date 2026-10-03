"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { sb, mensagemErro } from "@/lib/supabase";
import { useDados, numeros } from "@/lib/store";
import { useUi } from "@/lib/ui";
import type { Angulo, Checkin, Foto } from "@/lib/types";
import { TopoAluno, estaSemana } from "@/components/AlunoComum";
import { CameraGuia } from "@/components/Midia";
import { Aviso, AreaTexto, Botao, Carregando, Entrada } from "@/components/ui";
import { enviar, nomeArquivo, urlsAssinadas } from "@/lib/arquivos";
import { num } from "@/lib/evolucao";
import { hoje, horaLocal } from "@/lib/dates";
import { ddmm, parseValor } from "@/lib/format";
import { IconCamera, IconCheck } from "@/lib/icons";

const ANGULOS: Angulo[] = ["frente", "lado", "costas"];
const NOME: Record<Angulo, string> = { frente: "De frente", lado: "De lado", costas: "De costas" };

export default function CheckinAluno() {
  const { aluno, meuPersonal } = useDados();
  const { avisar } = useUi();
  const [historico, setHistorico] = useState<Checkin[] | null>(null);
  const [fotosAnt, setFotosAnt] = useState<Partial<Record<Angulo, string>>>({});
  const [treinosSemana, setTreinosSemana] = useState(0);
  const [passo, setPasso] = useState<"ver" | "dados" | "fotos" | "pronto">("dados");
  const [peso, setPeso] = useState("");
  const [sono, setSono] = useState(0);
  const [energia, setEnergia] = useState(0);
  const [treinos, setTreinos] = useState("");
  const [dor, setDor] = useState(false);
  const [dorTexto, setDorTexto] = useState("");
  const [recado, setRecado] = useState("");
  const [fotos, setFotos] = useState<Partial<Record<Angulo, Blob>>>({});
  const [previas, setPrevias] = useState<Partial<Record<Angulo, string>>>({});
  const [camera, setCamera] = useState<Angulo | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState<Checkin | null>(null);
  const pers = meuPersonal?.nome.split(" ")[0] ?? "seu personal";

  useEffect(() => {
    if (!aluno) return;
    const s = sb();
    (async () => {
      const [c, f, t] = await Promise.all([
        s.from("checkins").select("*").eq("aluno_id", aluno.id).order("data", { ascending: false }).limit(12),
        s.from("fotos").select("*").eq("aluno_id", aluno.id).order("data", { ascending: false }).limit(30),
        s.from("treinos_feitos").select("data, concluido").eq("aluno_id", aluno.id).eq("concluido", true).gte("data", new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10)),
      ]);
      const lista = numeros(c.data as Checkin[], ["peso"]);
      setHistorico(lista);
      const n = ((t.data ?? []) as { data: string }[]).filter((x) => estaSemana(x.data)).length;
      setTreinosSemana(n);
      setTreinos(String(n));
      if (lista[0] && estaSemana(lista[0].data)) setPasso("ver");
      const ultimas: Partial<Record<Angulo, string>> = {};
      for (const ang of ANGULOS) { const x = ((f.data ?? []) as Foto[]).find((y) => y.angulo === ang); if (x) ultimas[ang] = x.caminho; }
      const caminhos = Object.values(ultimas) as string[];
      if (caminhos.length) {
        const u = await urlsAssinadas("fotos", caminhos);
        const r: Partial<Record<Angulo, string>> = {};
        for (const ang of ANGULOS) if (ultimas[ang] && u[ultimas[ang]!]) r[ang] = u[ultimas[ang]!];
        setFotosAnt(r);
      }
    })();
  }, [aluno]);

  useEffect(() => {
    const r: Partial<Record<Angulo, string>> = {};
    for (const ang of ANGULOS) if (fotos[ang]) r[ang] = URL.createObjectURL(fotos[ang]!);
    setPrevias(r);
    return () => { for (const u of Object.values(r)) if (u) URL.revokeObjectURL(u); };
  }, [fotos]);

  if (!aluno || !historico) return <><TopoAluno titulo="Check-in" voltar="/a" /><Carregando /></>;
  const anterior = historico.find((c) => !estaSemana(c.data)) ?? null;
  const desta = historico.find((c) => estaSemana(c.data)) ?? null;

  function irParaFotos() {
    setErro("");
    const p = parseValor(peso);
    if (peso.trim() && !(p >= 20 && p <= 400)) return setErro("Confira o peso (em kg).");
    if (!sono || !energia) return setErro("Dê uma nota para o sono e a energia.");
    setPasso("fotos");
  }

  async function enviarCheckin() {
    setEnviando(true); setErro("");
    try {
      const s = sb();
      const p = peso.trim() ? parseValor(peso) : null;
      const tr = treinos.trim() ? Math.min(14, Math.max(0, parseInt(treinos))) : null;
      const data = hoje();
      const { data: c, error } = await s.from("checkins").insert({
        personal_id: aluno!.personal_id, aluno_id: aluno!.id, data, peso: p, sono, energia, treinos_feitos: tr,
        dor, dor_texto: dor ? dorTexto.trim() : "", recado: recado.trim(),
      }).select().single();
      if (error) throw error;
      let nFotos = 0;
      for (const ang of ANGULOS) {
        const b = fotos[ang];
        if (!b) continue;
        const caminho = await enviar("fotos", `${aluno!.personal_id}/${aluno!.id}/${nomeArquivo("jpg")}`, b, "image/jpeg");
        const r = await s.from("fotos").insert({ personal_id: aluno!.personal_id, aluno_id: aluno!.id, data, angulo: ang, caminho, origem: "checkin" });
        if (r.error) throw r.error;
        nFotos++;
      }
      const dPeso = p != null && anterior?.peso != null ? p - anterior.peso : null;
      const resumo = [
        p != null ? `${num(p)} kg${dPeso != null && Math.abs(dPeso) >= 0.05 ? ` (${num(Math.abs(dPeso))} kg a ${dPeso < 0 ? "menos" : "mais"})` : ""}` : null,
        tr != null ? `${tr} treinos` : null,
        `sono ${sono}/5 · energia ${energia}/5`,
        nFotos ? `${nFotos} fotos` : null,
        dor ? `sentiu dor${dorTexto.trim() ? `: ${dorTexto.trim()}` : ""}` : null,
      ].filter(Boolean).join(" · ") + (recado.trim() ? `\n“${recado.trim()}”` : "");
      await s.from("mensagens").insert({ personal_id: aluno!.personal_id, aluno_id: aluno!.id, tipo: "checkin", texto: resumo, checkin_id: (c as Checkin).id });
      setEnviado({ ...(c as Checkin), peso: p });
      setPasso("pronto");
    } catch (e) {
      setErro(mensagemErro(e));
      avisar("Não foi possível enviar o check-in.", "erro");
    } finally {
      setEnviando(false);
    }
  }

  const notas = (valor: number, set: (n: number) => void, rotulo: string) => (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-bold">{rotulo}</span>
      <div className="grid grid-cols-5 gap-2" role="group" aria-label={rotulo}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => set(n)} aria-pressed={valor === n}
            className={`h-12 rounded-xl text-base font-extrabold cursor-pointer ${valor === n ? "bg-azul text-white" : "bg-white border border-linha text-texto2"}`}>{n}</button>
        ))}
      </div>
      <span className="text-[11px] text-mudo">1 = ruim · 5 = ótimo</span>
    </div>
  );

  if (passo === "ver" && desta) {
    return (
      <>
        <TopoAluno titulo="Check-in da semana" voltar="/a" />
        <div className="px-4 flex flex-col gap-3.5">
          <section className="bg-white border border-linha rounded-2xl p-5 flex flex-col gap-2">
            <span className="text-[11px] font-bold text-mudo tracking-[0.06em]">ENVIADO EM {ddmm(desta.data)} ÀS {horaLocal(desta.criado_em)}</span>
            <p className="text-[15px] font-bold">
              {[desta.peso != null ? `${num(desta.peso)} kg` : null, desta.treinos_feitos != null ? `${desta.treinos_feitos} treinos` : null, desta.sono ? `sono ${desta.sono}/5` : null, desta.energia ? `energia ${desta.energia}/5` : null].filter(Boolean).join(" · ")}
            </p>
            {desta.recado ? <p className="text-sm text-texto2">“{desta.recado}”</p> : null}
          </section>
          <section className={`rounded-2xl p-5 flex flex-col gap-1.5 border ${desta.respondido_em ? "bg-azul-bg border-azul-borda" : "bg-white border-linha"}`}>
            <span className="text-[11px] font-bold text-azul-esc tracking-[0.06em]">{desta.respondido_em ? `RESPOSTA DE ${pers.toUpperCase()}` : "AGUARDANDO RESPOSTA"}</span>
            <p className="text-sm whitespace-pre-wrap">{desta.respondido_em ? desta.resposta : `${pers} vai ler e responder por aqui e na conversa.`}</p>
          </section>
          <Link href="/a/evolucao"><Botao className="w-full">Ver minha evolução</Botao></Link>
          <button type="button" onClick={() => setPasso("dados")} className="text-xs font-bold text-azul-esc cursor-pointer">Enviar outro check-in</button>
        </div>
      </>
    );
  }

  if (passo === "pronto" && enviado) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="w-20 h-20 rounded-full bg-verde-cl text-verde flex items-center justify-center"><IconCheck size={40} /></span>
        <h1 className="text-2xl font-black">Check-in enviado</h1>
        <p className="text-texto2 max-w-xs">{pers} vai ler e responder. Você encontra a resposta aqui e na conversa.</p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Link href="/a/evolucao"><Botao className="w-full">Ver minha evolução</Botao></Link>
          <Link href="/a"><Botao variante="secundario" className="w-full">Voltar ao início</Botao></Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopoAluno titulo={passo === "fotos" ? "Fotos da semana" : "Check-in semanal"} sub={passo === "fotos" ? "Passo 2 de 2" : "Passo 1 de 2 · leva uns 3 minutos"} voltar={passo === "fotos" ? undefined : "/a"}
        direita={passo === "fotos" ? <button type="button" onClick={() => setPasso("dados")} className="text-sm font-bold text-azul-esc cursor-pointer">Voltar</button> : undefined} />
      <div className="px-4 pb-8 flex flex-col gap-5">
        {passo === "dados" ? (
          <>
            <div className="flex flex-col gap-2">
              <label htmlFor="peso" className="text-sm font-bold">Seu peso hoje (kg)</label>
              <Entrada id="peso" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder={anterior?.peso != null ? num(anterior.peso) : "70,0"} className="!h-14 !text-2xl font-extrabold" />
              <span className="text-[11px] text-mudo">{anterior?.peso != null ? `Semana passada: ${num(anterior.peso)} kg · ` : ""}de preferência em jejum, ao acordar</span>
            </div>
            {notas(sono, setSono, "Como foi seu sono?")}
            {notas(energia, setEnergia, "E sua energia nos treinos?")}
            <div className="flex flex-col gap-2">
              <label htmlFor="treinos" className="text-sm font-bold">Quantos treinos você fez nesta semana?</label>
              <Entrada id="treinos" type="number" min={0} max={14} inputMode="numeric" value={treinos} onChange={(e) => setTreinos(e.target.value)} className="max-w-[120px]" />
              {treinosSemana ? <span className="text-[11px] text-mudo">O app registrou {treinosSemana} nesta semana.</span> : null}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold">Sentiu alguma dor nesta semana?</span>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setDor(false)} aria-pressed={!dor} className={`h-12 rounded-xl font-bold cursor-pointer ${!dor ? "bg-azul text-white" : "bg-white border border-linha text-texto2"}`}>Não</button>
                <button type="button" onClick={() => setDor(true)} aria-pressed={dor} className={`h-12 rounded-xl font-bold cursor-pointer ${dor ? "bg-vermelho text-white" : "bg-white border border-linha text-texto2"}`}>Sim</button>
              </div>
              {dor ? <Entrada value={dorTexto} onChange={(e) => setDorTexto(e.target.value)} placeholder="Onde e quando? Ex.: joelho no agachamento" /> : null}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="recado" className="text-sm font-bold">Recado para {pers}</label>
              <AreaTexto id="recado" value={recado} onChange={(e) => setRecado(e.target.value)} placeholder="Como foi a semana? Alguma dúvida?" />
            </div>
            {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
            <Botao onClick={irParaFotos} className="!h-12 !text-base">Continuar para as fotos</Botao>
          </>
        ) : (
          <>
            <p className="text-sm text-texto2 leading-relaxed">
              {Object.keys(fotosAnt).length ? "Encaixe o corpo na foto da semana passada, que aparece transparente na câmera. Mesma distância, mesma luz." : "Corpo inteiro, roupa justa, boa luz. Essas fotos viram a referência das próximas semanas."} Só você e {pers} veem.
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {ANGULOS.map((ang) => (
                <button key={ang} type="button" onClick={() => setCamera(ang)}
                  className={`relative aspect-[3/4] rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-1.5 text-xs font-bold cursor-pointer ${previas[ang] ? "" : "border-2 border-dashed border-linha bg-white text-texto2"}`}>
                  {previas[ang] ? (
                    <>
                      <img src={previas[ang]} alt={NOME[ang]} className="absolute inset-0 w-full h-full object-cover" />
                      <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-verde-dot text-white flex items-center justify-center"><IconCheck size={14} /></span>
                      <span className="absolute bottom-1.5 inset-x-1.5 text-center px-1 py-0.5 rounded-full bg-black/60 text-white text-[10px]">{NOME[ang]}</span>
                    </>
                  ) : (<><IconCamera size={24} />{NOME[ang]}</>)}
                </button>
              ))}
            </div>
            {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
            <Botao onClick={enviarCheckin} disabled={enviando} className="!h-12 !text-base">
              {enviando ? "Enviando…" : Object.keys(fotos).length ? `Enviar check-in com ${Object.keys(fotos).length} ${Object.keys(fotos).length === 1 ? "foto" : "fotos"}` : "Enviar sem fotos"}
            </Botao>
            {!Object.keys(fotos).length ? <p className="text-[11px] text-mudo text-center">Sem fotos, o time-lapse desta semana fica vazio.</p> : null}
          </>
        )}
      </div>
      {camera ? (
        <CameraGuia titulo={NOME[camera]} fantasma={fotosAnt[camera]} onFoto={(b) => { setFotos((f) => ({ ...f, [camera]: b })); setCamera(null); }} onFechar={() => setCamera(null)} />
      ) : null}
    </>
  );
}
