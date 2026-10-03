"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sb, mensagemErro } from "@/lib/supabase";
import { useDados } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { useParam } from "@/lib/useParam";
import { Cabecalho, Conteudo, Avatar } from "@/components/Cabecalho";
import { Aviso, Botao, Carregando, Folha, Segmentado, Vazio } from "@/components/ui";
import { AlunoForm, ConviteAluno } from "@/components/AlunoForm";
import { PainelEvolucao } from "@/components/Evolucao";
import { AbaTreinos } from "@/components/ficha/AbaTreinos";
import { AbaAvaliacao } from "@/components/ficha/AbaAvaliacao";
import { AbaCheckins } from "@/components/ficha/AbaCheckins";
import { AbaFinanceiro } from "@/components/ficha/AbaFinanceiro";
import { COR_SITUACAO, planoDe, situacaoAluno } from "@/lib/cobranca";
import { OBJETIVOS } from "@/lib/evolucao";
import { hoje } from "@/lib/dates";
import { brl, ddmmaa } from "@/lib/format";
import { IconConversa, IconHalter, IconLapis } from "@/lib/icons";

type Aba = "evolucao" | "treinos" | "avaliacao" | "checkins" | "financeiro";

function idade(nasc: string | null) {
  if (!nasc) return null;
  const h = hoje();
  let i = Number(h.slice(0, 4)) - Number(nasc.slice(0, 4));
  if (h.slice(5) < nasc.slice(5)) i--;
  return i;
}

export default function FichaAluno() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { alunos, cobrancas, personal, planos, perfil, checkinsAbertos, recarregar } = useDados();
  const { avisar } = useUi();
  const pAba = useParam("aba");
  const [aba, setAba] = useState<Aba>("evolucao");
  const [editar, setEditar] = useState(false);
  const [convite, setConvite] = useState(false);
  const [mais, setMais] = useState(false);
  const [confirmaExcluir, setConfirmaExcluir] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => { if (pAba && ["evolucao", "treinos", "avaliacao", "checkins", "financeiro"].includes(pAba)) setAba(pAba as Aba); }, [pAba]);

  const aluno = alunos.find((a) => a.id === id);
  if (!aluno) {
    return (
      <>
        <Cabecalho titulo="Aluno" voltar={{ href: "/alunos", rotulo: "Voltar para alunos" }} />
        <Conteudo>{alunos.length ? <Vazio titulo="Aluno não encontrado" acao={<Link href="/alunos"><Botao>Ver alunos</Botao></Link>} /> : <Carregando />}</Conteudo>
      </>
    );
  }

  const sit = situacaoAluno(aluno, cobrancas, personal, hoje());
  const plano = planoDe(aluno, planos);
  const anos = idade(aluno.nascimento);
  const abertos = checkinsAbertos.filter((c) => c.aluno_id === aluno.id).length;
  const sub = [plano ? `${plano.nome} · ${brl(plano.valor)}/mês` : "Sem plano", `aluno desde ${ddmmaa(aluno.criado_em.slice(0, 10))}`, anos != null ? `${anos} anos` : null, `objetivo: ${OBJETIVOS[aluno.objetivo].toLowerCase()}`]
    .filter(Boolean).join(" · ");

  async function mudarStatus(status: "ativo" | "arquivado") {
    setOcupado(true);
    const { error } = await sb().from("alunos").update({ status }).eq("id", aluno!.id);
    setOcupado(false);
    if (error) return avisar(mensagemErro(error), "erro");
    await recarregar();
    setMais(false);
    avisar(status === "arquivado" ? "Aluno arquivado. O acesso ao app fica pausado." : "Aluno reativado.");
  }

  async function excluir() {
    setOcupado(true);
    try {
      const s = sb();
      for (const balde of ["fotos", "conversas"] as const) {
        const pasta = `${perfil!.id}/${aluno!.id}`;
        const { data } = await s.storage.from(balde).list(pasta, { limit: 1000 });
        if (data?.length) await s.storage.from(balde).remove(data.map((f) => `${pasta}/${f.name}`));
      }
      const { error } = await s.from("alunos").delete().eq("id", aluno!.id);
      if (error) throw error;
      await recarregar();
      avisar("Aluno e dados excluídos.");
      router.replace("/alunos");
    } catch (e) {
      avisar(mensagemErro(e), "erro");
      setOcupado(false);
    }
  }

  const ABAS: { valor: Aba; rotulo: string }[] = [
    { valor: "evolucao", rotulo: "Evolução" },
    { valor: "treinos", rotulo: "Treinos" },
    { valor: "avaliacao", rotulo: "Avaliação" },
    { valor: "checkins", rotulo: abertos ? `Check-ins (${abertos})` : "Check-ins" },
    { valor: "financeiro", rotulo: "Financeiro" },
  ];

  return (
    <>
      <Cabecalho titulo={aluno.nome} sub="Ficha do aluno" voltar={{ href: "/alunos", rotulo: "Voltar para alunos" }}
        acoes={<Botao variante="secundario" pequeno onClick={() => setMais(true)}>Opções</Botao>} />
      <Conteudo largo>
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar nome={aluno.nome} tamanho={56} />
            <div className="min-w-0 flex flex-col gap-1.5">
              <p className="text-sm text-texto2">{sub}</p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-bold" style={{ background: COR_SITUACAO[sit.tipo].fundo, color: COR_SITUACAO[sit.tipo].texto }}>{sit.texto}</span>
                {abertos ? <button type="button" onClick={() => setAba("checkins")} className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-bold bg-azul-cl text-azul-esc cursor-pointer">Check-in para responder</button> : null}
                {!aluno.user_id ? <button type="button" onClick={() => setConvite(true)} className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-bold bg-ambar-cl text-ambar-txt cursor-pointer">Sem acesso ao app · convidar</button> : null}
                {aluno.user_id && !aluno.consentimento_em ? <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-bold bg-linha2 text-texto2">Ainda não entrou no app</span> : null}
                {aluno.observacoes ? <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-bold bg-vermelho-cl text-vermelho max-w-[260px] truncate" title={aluno.observacoes}>Atenção: {aluno.observacoes}</span> : null}
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/conversas?aluno=${aluno.id}`}><Botao variante="secundario"><IconConversa size={18} /> Conversar</Botao></Link>
            <Link href={`/alunos/${aluno.id}/treino`}><Botao><IconHalter size={18} /> Montar treino</Botao></Link>
          </div>
        </div>

        <div className="overflow-x-auto -mx-1 px-1">
          <Segmentado rotulo="Seções da ficha" opcoes={ABAS} valor={aba} onChange={(v) => setAba(v)} />
        </div>

        {aluno.status === "arquivado" ? <Aviso>Aluno arquivado: não gera cobranças e não acessa o app. Reative em Opções.</Aviso> : null}

        {aba === "evolucao" ? <PainelEvolucao aluno={aluno} personalNome={perfil?.nome ?? ""} visao="personal" /> : null}
        {aba === "treinos" ? <AbaTreinos aluno={aluno} /> : null}
        {aba === "avaliacao" ? <AbaAvaliacao aluno={aluno} /> : null}
        {aba === "checkins" ? <AbaCheckins aluno={aluno} /> : null}
        {aba === "financeiro" ? <AbaFinanceiro aluno={aluno} /> : null}
      </Conteudo>

      <AlunoForm aberta={editar} aluno={aluno} onFechar={() => setEditar(false)} />
      <ConviteAluno aberta={convite} aluno={aluno} onFechar={() => setConvite(false)} />
      <Folha aberta={mais} titulo="Opções" onFechar={() => { setMais(false); setConfirmaExcluir(""); }}>
        <div className="flex flex-col gap-2">
          <Botao variante="secundario" onClick={() => { setMais(false); setEditar(true); }}><IconLapis size={16} /> Editar dados e plano</Botao>
          {aluno.email ? (
            <Botao variante="secundario" onClick={() => { setMais(false); setConvite(true); }}>{aluno.user_id ? "Gerar nova senha de acesso" : "Convidar para o app"}</Botao>
          ) : <Aviso>Cadastre o e-mail do aluno para gerar o acesso ao app.</Aviso>}
          {aluno.status === "ativo"
            ? <Botao variante="secundario" disabled={ocupado} onClick={() => mudarStatus("arquivado")}>Arquivar aluno</Botao>
            : <Botao variante="secundario" disabled={ocupado} onClick={() => mudarStatus("ativo")}>Reativar aluno</Botao>}
          <div className="mt-3 pt-3 border-t border-linha2 flex flex-col gap-2">
            <p className="text-xs text-mudo">Excluir apaga de vez o cadastro, fotos, avaliações, treinos, conversas e cobranças deste aluno. Use quando ele pedir a exclusão dos dados.</p>
            <input value={confirmaExcluir} onChange={(e) => setConfirmaExcluir(e.target.value)} placeholder="Digite EXCLUIR para confirmar"
              className="h-11 px-3 rounded-[10px] border border-linha text-base sm:text-sm" aria-label="Confirmação de exclusão" />
            <Botao variante="perigo" disabled={confirmaExcluir.trim().toUpperCase() !== "EXCLUIR" || ocupado} onClick={excluir}>Excluir aluno e todos os dados</Botao>
          </div>
        </div>
      </Folha>
    </>
  );
}
