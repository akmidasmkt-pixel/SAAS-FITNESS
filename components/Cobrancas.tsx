"use client";

import { useEffect, useState } from "react";
import { sb, chamarFuncao, mensagemErro, ErroFuncao } from "@/lib/supabase";
import { useDados } from "@/lib/store";
import { useUi } from "@/lib/ui";
import type { Aluno, Cobranca, FormaCobranca } from "@/lib/types";
import { FORMAS_COBRANCA, lembreteCobranca, linkWhats, situacao, taxaDe } from "@/lib/cobranca";
import { brl, ddmm, ddmmaa, parseValor, valorCampo } from "@/lib/format";
import { hoje, instante } from "@/lib/dates";
import { Aviso, Botao, Campo, Entrada, Folha, Selecao } from "./ui";
import { IconCopiar, IconWhats } from "@/lib/icons";

export function SeloCobranca({ c }: { c: Cobranca }) {
  const s = situacao(c, hoje());
  const m = {
    paga: ["#e6f4ea", "#006300", c.forma === "fora_do_app" ? "Paga fora do app" : "Paga"],
    cancelada: ["#f0efec", "#75746f", "Cancelada"],
    a_vencer: ["#f0efec", "#52514e", `Vence ${ddmm(c.vencimento)}`],
    vence_hoje: ["#e3edfa", "#184f95", "Vence hoje"],
    atrasada: ["#fbf1d6", "#8a5a00", `${s.dias} ${s.dias === 1 ? "dia" : "dias"} de atraso`],
  }[s.tipo];
  return <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-bold whitespace-nowrap" style={{ background: m[0], color: m[1] }}>{m[2]}</span>;
}

/** Ações de uma cobrança: registrar pagamento, cobrar pelo app, lembrete, editar, cancelar. */
export function CobrancaFolha({ cobranca, onFechar }: { cobranca: Cobranca | null; onFechar: () => void }) {
  const { alunos, perfil, recarregar } = useDados();
  const { avisar } = useUi();
  const [modo, setModo] = useState<"menu" | "pagar" | "editar">("menu");
  const [dataPg, setDataPg] = useState(hoje());
  const [valor, setValor] = useState("");
  const [venc, setVenc] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [emitida, setEmitida] = useState<{ link_pagamento: string | null; pix_copia_cola: string | null } | null>(null);

  useEffect(() => {
    if (!cobranca) return;
    setModo("menu"); setErro(""); setDataPg(hoje()); setEmitida(null);
    setValor(valorCampo(cobranca.valor)); setVenc(cobranca.vencimento); setDescricao(cobranca.descricao);
    if (cobranca.link_pagamento || cobranca.pix_copia_cola) setEmitida({ link_pagamento: cobranca.link_pagamento, pix_copia_cola: cobranca.pix_copia_cola });
  }, [cobranca]);

  if (!cobranca) return null;
  const c = cobranca;
  const aluno = alunos.find((a) => a.id === c.aluno_id) as Aluno | undefined;

  async function atualizar(campos: Partial<Cobranca>, msg: string) {
    setOcupado(true); setErro("");
    const { error } = await sb().from("cobrancas").update(campos).eq("id", c.id);
    setOcupado(false);
    if (error) return setErro(mensagemErro(error));
    await recarregar();
    avisar(msg);
    onFechar();
  }

  async function emitir() {
    setOcupado(true); setErro("");
    try {
      const r = await chamarFuncao<{ link_pagamento: string | null; pix_copia_cola: string | null }>("cobranca", { acao: "emitir", cobranca_id: c.id });
      setEmitida(r);
      recarregar();
    } catch (e) {
      setErro(e instanceof ErroFuncao && e.dados?.erro === "config"
        ? "A cobrança pelo app ainda está sendo ativada (modo teste). Por enquanto, combine o pagamento com o aluno e registre aqui quando receber."
        : mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  async function copiar(t: string) {
    try { await navigator.clipboard.writeText(t); avisar("Copiado."); } catch { avisar("Não foi possível copiar.", "erro"); }
  }

  const pendente = c.status === "pendente";
  const titulo = `${aluno?.nome.split(" ")[0] ?? "Aluno"} · ${brl(c.valor)}`;

  if (modo === "pagar") {
    return (
      <Folha aberta titulo="Registrar pagamento" onFechar={onFechar}
        rodape={<><Botao variante="secundario" onClick={() => setModo("menu")}>Voltar</Botao><Botao disabled={ocupado} onClick={() => atualizar({ status: "paga", pago_em: instante(dataPg, "12:00") }, "Pagamento registrado.")}>Confirmar</Botao></>}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-texto2">{aluno?.nome} pagou {brl(c.valor)} fora do app (dinheiro, Pix direto, transferência). Não há taxa nesse caso.</p>
          <Campo rotulo="Data do pagamento"><Entrada type="date" value={dataPg} max={hoje()} onChange={(e) => setDataPg(e.target.value)} /></Campo>
          {c.asaas_id ? <Aviso>Essa cobrança também foi emitida pelo app. Se o aluno já pagou por fora, cancele o boleto no Asaas para ele não pagar duas vezes.</Aviso> : null}
          {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
        </div>
      </Folha>
    );
  }

  if (modo === "editar") {
    return (
      <Folha aberta titulo="Editar cobrança" onFechar={onFechar}
        rodape={<><Botao variante="secundario" onClick={() => setModo("menu")}>Voltar</Botao><Botao disabled={ocupado} onClick={() => {
          const v = parseValor(valor);
          if (!(v > 0)) return setErro("Informe um valor válido.");
          if (!venc) return setErro("Informe o vencimento.");
          atualizar({ valor: v, vencimento: venc, descricao: descricao.trim() }, "Cobrança atualizada.");
        }}>Salvar</Botao></>}>
        <div className="flex flex-col gap-3">
          <Campo rotulo="Descrição"><Entrada value={descricao} onChange={(e) => setDescricao(e.target.value)} /></Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Valor (R$)"><Entrada inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></Campo>
            <Campo rotulo="Vencimento"><Entrada type="date" value={venc} onChange={(e) => setVenc(e.target.value)} /></Campo>
          </div>
          {c.asaas_id ? <Aviso>Essa cobrança já foi emitida pelo app. Mudanças aqui não alteram o boleto ou o link já enviado.</Aviso> : null}
          {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
        </div>
      </Folha>
    );
  }

  const textoLembrete = aluno ? lembreteCobranca(aluno, c, perfil?.nome ?? "", emitida?.link_pagamento ?? c.link_pagamento) : "";

  return (
    <Folha aberta titulo={titulo} onFechar={onFechar}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{c.descricao || "Mensalidade"}</p>
            <p className="text-xs text-mudo">Vencimento {ddmmaa(c.vencimento)}{c.forma ? ` · ${FORMAS_COBRANCA[c.forma]}` : ""}</p>
          </div>
          <SeloCobranca c={c} />
        </div>
        {c.status === "paga" ? (
          <div className="rounded-xl bg-fundo border border-linha p-3.5 text-sm flex flex-col gap-1">
            <span>Pago em {c.pago_em ? ddmmaa(c.pago_em.slice(0, 10)) : "—"}</span>
            <span className="text-texto2">Taxa: {brl(c.taxa ?? 0)} · você recebe <b className="text-tinta">{brl(c.valor - (c.taxa ?? 0))}</b></span>
          </div>
        ) : null}
        {emitida && pendente ? (
          <div className="rounded-xl bg-azul-bg border border-azul-borda p-3.5 flex flex-col gap-2.5">
            <span className="text-xs font-extrabold text-azul-esc uppercase tracking-[0.05em]">Cobrança emitida pelo app</span>
            {emitida.pix_copia_cola ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 truncate text-xs bg-white rounded-lg px-2.5 py-2 border border-linha">{emitida.pix_copia_cola}</code>
                <Botao pequeno variante="secundario" onClick={() => copiar(emitida.pix_copia_cola!)}><IconCopiar size={14} /> Pix</Botao>
              </div>
            ) : null}
            {emitida.link_pagamento ? (
              <div className="flex items-center gap-2">
                <a href={emitida.link_pagamento} target="_blank" rel="noreferrer" className="flex-1 min-w-0 truncate text-xs font-bold text-azul-esc underline">{emitida.link_pagamento}</a>
                <Botao pequeno variante="secundario" onClick={() => copiar(emitida.link_pagamento!)}><IconCopiar size={14} /> Link</Botao>
              </div>
            ) : null}
            <p className="text-xs text-azul-esc">O aluno também vê o pagamento no app. Quando cair, a baixa é automática.</p>
          </div>
        ) : null}
        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
        <div className="flex flex-col gap-2">
          {pendente ? (
            <>
              {!emitida && c.forma !== "fora_do_app" ? (
                <Botao onClick={emitir} disabled={ocupado}>{ocupado ? "Emitindo…" : "Cobrar pelo app (Pix, boleto ou cartão)"}</Botao>
              ) : null}
              <Botao variante="secundario" onClick={() => setModo("pagar")}>Registrar pagamento recebido por fora</Botao>
              {aluno?.whatsapp ? (
                <a href={linkWhats(aluno.whatsapp, textoLembrete)} target="_blank" rel="noreferrer" className="block">
                  <Botao variante="secundario" className="w-full"><IconWhats size={16} /> Enviar lembrete no WhatsApp</Botao>
                </a>
              ) : null}
              <div className="flex gap-2">
                <Botao variante="fantasma" className="flex-1" onClick={() => setModo("editar")}>Editar</Botao>
                <Botao variante="perigo" className="flex-1" disabled={ocupado} onClick={() => atualizar({ status: "cancelada" }, "Cobrança cancelada.")}>Cancelar cobrança</Botao>
              </div>
              {c.forma !== "fora_do_app" ? (
                <p className="text-xs text-mudo">Taxa se pago pelo app: {brl(taxaDe(c.forma === "cartao" ? "cartao" : "boleto", c.valor))} ({c.forma === "cartao" ? "4,49% + R$ 0,49" : "Pix ou boleto"}).</p>
              ) : null}
            </>
          ) : c.status === "paga" && !c.asaas_id ? (
            <Botao variante="fantasma" disabled={ocupado} onClick={() => atualizar({ status: "pendente" }, "Pagamento desfeito.")}>Desfazer pagamento</Botao>
          ) : c.status === "cancelada" ? (
            <Botao variante="secundario" disabled={ocupado} onClick={() => atualizar({ status: "pendente" }, "Cobrança reaberta.")}>Reabrir cobrança</Botao>
          ) : null}
        </div>
      </div>
    </Folha>
  );
}

/** Cobrança avulsa (avaliação, pacote, aula extra). */
export function NovaCobranca({ aberta, alunoId, onFechar }: { aberta: boolean; alunoId?: string; onFechar: () => void }) {
  const { alunos, recarregar } = useDados();
  const { avisar } = useUi();
  const [f, setF] = useState({ aluno_id: "", descricao: "", valor: "", vencimento: hoje(), forma: "boleto" as FormaCobranca });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { if (aberta) { setErro(""); setF({ aluno_id: alunoId ?? "", descricao: "", valor: "", vencimento: hoje(), forma: "boleto" }); } }, [aberta, alunoId]);

  async function salvar() {
    const v = parseValor(f.valor);
    if (!f.aluno_id) return setErro("Escolha o aluno.");
    if (!(v > 0)) return setErro("Informe um valor válido.");
    setSalvando(true);
    const { error } = await sb().from("cobrancas").insert({ aluno_id: f.aluno_id, descricao: f.descricao.trim() || "Cobrança avulsa", valor: v, vencimento: f.vencimento, forma: f.forma });
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    await recarregar();
    avisar("Cobrança criada.");
    onFechar();
  }

  return (
    <Folha aberta={aberta} titulo="Nova cobrança avulsa" onFechar={onFechar}
      rodape={<><Botao variante="secundario" onClick={onFechar}>Cancelar</Botao><Botao onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Criar cobrança"}</Botao></>}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-texto2">As mensalidades dos planos são criadas sozinhas todo mês. Use isto para avaliação, pacote ou aula extra.</p>
        {!alunoId ? (
          <Campo rotulo="Aluno">
            <Selecao value={f.aluno_id} onChange={(e) => setF({ ...f, aluno_id: e.target.value })}>
              <option value="">Escolha…</option>
              {alunos.filter((a) => a.status === "ativo").map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </Selecao>
          </Campo>
        ) : null}
        <Campo rotulo="Descrição"><Entrada value={f.descricao} placeholder="Ex.: Avaliação física" onChange={(e) => setF({ ...f, descricao: e.target.value })} /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Valor (R$)"><Entrada inputMode="decimal" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} /></Campo>
          <Campo rotulo="Vencimento"><Entrada type="date" value={f.vencimento} onChange={(e) => setF({ ...f, vencimento: e.target.value })} /></Campo>
        </div>
        <Campo rotulo="Forma">
          <Selecao value={f.forma} onChange={(e) => setF({ ...f, forma: e.target.value as FormaCobranca })}>
            <option value="boleto">Pix ou boleto pelo app</option>
            <option value="cartao">Cartão pelo app</option>
            <option value="fora_do_app">Recebo fora do app</option>
          </Selecao>
        </Campo>
        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
      </div>
    </Folha>
  );
}
