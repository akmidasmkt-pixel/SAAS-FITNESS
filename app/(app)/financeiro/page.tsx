"use client";

import { useEffect, useMemo, useState } from "react";
import { sb, mensagemErro } from "@/lib/supabase";
import { useDados } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { useParam } from "@/lib/useParam";
import type { Cobranca, Plano } from "@/lib/types";
import { Cabecalho, Conteudo, Avatar } from "@/components/Cabecalho";
import { AreaTexto, Aviso, Bloco, Botao, Campo, Card, CardTopo, Entrada, Filtros, Folha, Segmentado, SeletorMes, Vazio } from "@/components/ui";
import { CobrancaFolha, NovaCobranca, SeloCobranca } from "@/components/Cobrancas";
import { situacao } from "@/lib/cobranca";
import { hoje, mesAtual, nomeMes, rotuloMes, somaMeses } from "@/lib/dates";
import { brl, brl0, ddmm, parseValor, valorCampo } from "@/lib/format";
import { IconMais } from "@/lib/icons";

type Aba = "cobrancas" | "planos" | "extrato";
type Filtro = "todas" | "abertas" | "atrasadas" | "pagas";

export default function Financeiro() {
  const { cobrancas, alunos } = useDados();
  const pAba = useParam("aba");
  const [aba, setAba] = useState<Aba>("cobrancas");
  const [mes, setMes] = useState(mesAtual());
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [sel, setSel] = useState<Cobranca | null>(null);
  const [nova, setNova] = useState(false);
  const hj = hoje();
  useEffect(() => { if (pAba === "planos" || pAba === "extrato") setAba(pAba); }, [pAba]);

  const doMes = cobrancas.filter((c) => c.status !== "cancelada" && c.vencimento.slice(0, 7) === mes);
  const recebidoBruto = doMes.filter((c) => c.status === "paga").reduce((s, c) => s + c.valor, 0);
  const taxas = doMes.filter((c) => c.status === "paga").reduce((s, c) => s + (c.taxa ?? 0), 0);
  const aReceber = doMes.filter((c) => c.status === "pendente").reduce((s, c) => s + c.valor, 0);
  const atrasadasTodas = cobrancas.filter((c) => c.status === "pendente" && c.vencimento < hj);
  const nome = (id: string) => alunos.find((a) => a.id === id)?.nome ?? "Aluno";

  const lista = (filtro === "atrasadas" ? atrasadasTodas : cobrancas.filter((c) => c.vencimento.slice(0, 7) === mes))
    .filter((c) => filtro === "todas" || (filtro === "abertas" ? c.status === "pendente" : filtro === "pagas" ? c.status === "paga" : true))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento) || nome(a.aluno_id).localeCompare(nome(b.aluno_id)));

  return (
    <>
      <Cabecalho titulo="Financeiro" sub="Mensalidades, planos e o que você recebeu"
        acoes={<Botao onClick={() => setNova(true)} aria-label="Cobrança avulsa"><IconMais size={18} /> <span className="hidden sm:inline">Cobrança avulsa</span></Botao>} />
      <Conteudo>
        <Segmentado rotulo="Seções" opcoes={[{ valor: "cobrancas", rotulo: "Cobranças" }, { valor: "planos", rotulo: "Planos" }, { valor: "extrato", rotulo: "Extrato" }]} valor={aba} onChange={(v) => setAba(v as Aba)} />
        {aba === "cobrancas" ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SeletorMes ym={mes} onChange={setMes} />
              <Filtros opcoes={[
                { valor: "todas" as Filtro, rotulo: "Todas" },
                { valor: "abertas" as Filtro, rotulo: "Em aberto" },
                { valor: "atrasadas" as Filtro, rotulo: "Atrasadas (todas)", qtd: atrasadasTodas.length },
                { valor: "pagas" as Filtro, rotulo: "Pagas" },
              ]} valor={filtro} onChange={(v) => setFiltro(v)} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Bloco rotulo={`Recebido em ${nomeMes(mes)}`} valor={brl0(recebidoBruto - taxas)} sub="líquido, já sem as taxas" corSub="#006300" />
              <Bloco rotulo="A receber" valor={brl0(aReceber)} sub={`${doMes.filter((c) => c.status === "pendente").length} cobranças`} />
              <Bloco rotulo="Em atraso" valor={brl0(atrasadasTodas.reduce((s, c) => s + c.valor, 0))} sub={`${atrasadasTodas.length} cobranças`} corSub={atrasadasTodas.length ? "#8a5a00" : "#52514e"} />
              <Bloco rotulo="Taxas no mês" valor={brl(taxas)} sub="Pix/boleto R$ 3,98 · cartão 4,49% + R$ 0,49" />
            </div>
            <Card>
              {!lista.length ? (
                <Vazio titulo="Nenhuma cobrança aqui" texto="As mensalidades são criadas sozinhas no início de cada mês para os alunos com plano." />
              ) : (
                <ul className="divide-y divide-linha2">
                  {lista.map((c) => {
                    const s = situacao(c, hj);
                    return (
                      <li key={c.id}>
                        <button type="button" onClick={() => setSel(c)} className="w-full text-left flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-fundo cursor-pointer">
                          <Avatar nome={nome(c.aluno_id)} tamanho={36} />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-bold truncate">{nome(c.aluno_id)}</span>
                            <span className="block text-xs text-mudo truncate">{c.descricao || "Mensalidade"} · vence {ddmm(c.vencimento)}{c.status === "paga" && c.taxa ? ` · taxa ${brl(c.taxa)}` : ""}</span>
                          </span>
                          <span className={`text-sm font-extrabold tabular-nums ${s.tipo === "cancelada" ? "line-through text-mudo" : ""}`}>{brl(c.valor)}</span>
                          <span className="hidden sm:inline"><SeloCobranca c={c} /></span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </>
        ) : null}
        {aba === "planos" ? <Planos /> : null}
        {aba === "extrato" ? <Extrato /> : null}
      </Conteudo>
      <CobrancaFolha cobranca={sel} onFechar={() => setSel(null)} />
      <NovaCobranca aberta={nova} onFechar={() => setNova(false)} />
    </>
  );
}

function Planos() {
  const { planos, alunos } = useDados();
  const [editando, setEditando] = useState<Plano | "novo" | null>(null);
  return (
    <>
      <Card>
        <CardTopo titulo="Seus planos" sub="O valor e o nome que o aluno vê" direita={<Botao pequeno onClick={() => setEditando("novo")}><IconMais size={16} /> Novo plano</Botao>} />
        {!planos.length ? (
          <Vazio titulo="Nenhum plano ainda" texto="Crie, por exemplo, “Consultoria online · R$ 189/mês” e “Presencial 2x · R$ 450/mês”." acao={<Botao onClick={() => setEditando("novo")}>Criar plano</Botao>} />
        ) : (
          <ul className="divide-y divide-linha2">
            {planos.map((p) => {
              const n = alunos.filter((a) => a.plano_id === p.id && a.status === "ativo").length;
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => setEditando(p)} className={`w-full text-left flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-fundo cursor-pointer ${p.ativo ? "" : "opacity-60"}`}>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-bold truncate">{p.nome}{p.ativo ? "" : " · inativo"}</span>
                      <span className="block text-xs text-mudo truncate">{n} {n === 1 ? "aluno" : "alunos"}{p.descricao ? ` · ${p.descricao}` : ""}</span>
                    </span>
                    <span className="text-[15px] font-extrabold tabular-nums">{brl(p.valor)}<span className="text-xs font-semibold text-mudo">/mês</span></span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <PlanoFolha alvo={editando} onFechar={() => setEditando(null)} />
    </>
  );
}

function PlanoFolha({ alvo, onFechar }: { alvo: Plano | "novo" | null; onFechar: () => void }) {
  const { recarregar } = useDados();
  const { avisar } = useUi();
  const atual = alvo && alvo !== "novo" ? alvo : null;
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    if (!alvo) return;
    setNome(atual?.nome ?? ""); setValor(atual ? valorCampo(atual.valor) : ""); setDescricao(atual?.descricao ?? ""); setAtivo(atual?.ativo ?? true); setErro("");
  }, [alvo, atual]);

  async function salvar() {
    const v = parseValor(valor);
    if (!nome.trim()) return setErro("Dê um nome ao plano.");
    if (!(v > 0)) return setErro("Informe o valor mensal.");
    setSalvando(true);
    const linha = { nome: nome.trim(), valor: v, descricao: descricao.trim(), ativo };
    const { error } = atual ? await sb().from("planos").update(linha).eq("id", atual.id) : await sb().from("planos").insert(linha);
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    await recarregar();
    avisar(atual ? "Plano salvo. As próximas mensalidades usam o novo valor." : "Plano criado.");
    onFechar();
  }
  const liquido = parseValor(valor) > 0 ? parseValor(valor) - 3.98 : null;
  return (
    <Folha aberta={!!alvo} titulo={atual ? "Editar plano" : "Novo plano"} onFechar={onFechar}
      rodape={<><Botao variante="secundario" onClick={onFechar}>Cancelar</Botao><Botao onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</Botao></>}>
      <div className="flex flex-col gap-3">
        <Campo rotulo="Nome do plano"><Entrada value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Consultoria online" /></Campo>
        <Campo rotulo="Valor por mês (R$)" dica={liquido != null ? `Você recebe ${brl(liquido)} por mensalidade paga por Pix ou boleto pelo app (taxa fixa de R$ 3,98).` : undefined}>
          <Entrada inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="189,00" />
        </Campo>
        <Campo rotulo="O que inclui (opcional)"><AreaTexto value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: treino montado, check-in semanal e conversa direta" /></Campo>
        {atual ? (
          <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="w-5 h-5 accent-[#2a78d6]" /> Plano ativo (aparece para novos alunos)
          </label>
        ) : null}
        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
      </div>
    </Folha>
  );
}

function Extrato() {
  const { cobrancas } = useDados();
  const meses = useMemo(() => {
    const r: { ym: string; bruto: number; taxas: number; n: number }[] = [];
    for (let k = 0; k < 12; k++) {
      const ym = somaMeses(mesAtual(), -k);
      const pagas = cobrancas.filter((c) => c.status === "paga" && (c.pago_em ?? c.vencimento).slice(0, 7) === ym);
      r.push({ ym, bruto: pagas.reduce((s, c) => s + c.valor, 0), taxas: pagas.reduce((s, c) => s + (c.taxa ?? 0), 0), n: pagas.length });
    }
    return r;
  }, [cobrancas]);
  const max = Math.max(1, ...meses.map((m) => m.bruto - m.taxas));
  return (
    <Card>
      <CardTopo titulo="Recebido por mês" sub="Pela data do pagamento · líquido, já sem as taxas" />
      <ul className="px-4 sm:px-5 pb-4 flex flex-col gap-3">
        {meses.map((m) => (
          <li key={m.ym} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold">{rotuloMes(m.ym)}</span>
              <span className="font-extrabold tabular-nums">{brl(m.bruto - m.taxas)}</span>
            </div>
            <div className="h-2 rounded-full bg-linha2 overflow-hidden"><div className="h-2 rounded-full bg-verde-dot" style={{ width: `${((m.bruto - m.taxas) / max) * 100}%` }} /></div>
            <span className="text-xs text-mudo">{m.n} {m.n === 1 ? "pagamento" : "pagamentos"} · bruto {brl(m.bruto)} · taxas {brl(m.taxas)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
