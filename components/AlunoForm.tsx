"use client";

import { useEffect, useState } from "react";
import { sb, chamarFuncao, mensagemErro } from "@/lib/supabase";
import { useDados } from "@/lib/store";
import { useUi } from "@/lib/ui";
import type { Aluno, FormaPagamento, Objetivo } from "@/lib/types";
import { OBJETIVOS } from "@/lib/evolucao";
import { FORMAS_ALUNO, linkWhats } from "@/lib/cobranca";
import { brl } from "@/lib/format";
import { Aviso, AreaTexto, Botao, Campo, Entrada, Folha, Selecao } from "./ui";
import { IconCopiar, IconWhats } from "@/lib/icons";

const soDigitos = (s: string) => s.replace(/\D/g, "");

export function AlunoForm({ aberta, aluno, onFechar, onSalvo }: { aberta: boolean; aluno?: Aluno | null; onFechar: () => void; onSalvo?: (a: Aluno) => void }) {
  const { planos, recarregar, personal, alunos } = useDados();
  const { avisar } = useUi();
  const [f, setF] = useState({
    nome: "", email: "", whatsapp: "", cpf: "", nascimento: "", objetivo: "emagrecer" as Objetivo, plano_id: "", dia_vencimento: "10",
    forma_pagamento: "pix_boleto" as FormaPagamento, observacoes: "",
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [convite, setConvite] = useState<{ aluno: Aluno } | null>(null);

  useEffect(() => {
    if (!aberta) return;
    setErro("");
    setF({
      nome: aluno?.nome ?? "", email: aluno?.email ?? "", whatsapp: aluno?.whatsapp ?? "", cpf: aluno?.cpf ?? "", nascimento: aluno?.nascimento ?? "",
      objetivo: aluno?.objetivo ?? "emagrecer", plano_id: aluno?.plano_id ?? planos.find((p) => p.ativo)?.id ?? "",
      dia_vencimento: String(aluno?.dia_vencimento ?? 10), forma_pagamento: aluno?.forma_pagamento ?? "pix_boleto", observacoes: aluno?.observacoes ?? "",
    });
  }, [aberta, aluno, planos]);

  const ativos = alunos.filter((a) => a.status === "ativo").length;
  const limite = personal?.plano === "gratis" && !aluno && ativos >= 1;
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function salvar() {
    setErro("");
    const nome = f.nome.trim();
    const email = f.email.trim().toLowerCase();
    const cpf = soDigitos(f.cpf);
    if (!nome) return setErro("Informe o nome do aluno.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErro("Confira o e-mail.");
    if (cpf && cpf.length !== 11) return setErro("O CPF precisa ter 11 números.");
    const dia = Number(f.dia_vencimento);
    if (!(dia >= 1 && dia <= 28)) return setErro("O vencimento vai do dia 1 ao 28.");
    const linha = {
      nome, email: email || null, whatsapp: f.whatsapp.trim(), cpf: cpf || null, nascimento: f.nascimento || null, objetivo: f.objetivo,
      plano_id: f.plano_id || null, dia_vencimento: dia, forma_pagamento: f.forma_pagamento, observacoes: f.observacoes.trim(),
    };
    setSalvando(true);
    try {
      const q = aluno
        ? sb().from("alunos").update(linha).eq("id", aluno.id).select().single()
        : sb().from("alunos").insert(linha).select().single();
      const { data, error } = await q;
      if (error) throw error;
      await recarregar();
      const salvo = data as Aluno;
      onSalvo?.(salvo);
      if (!aluno && salvo.email) setConvite({ aluno: salvo });
      else { avisar(aluno ? "Dados do aluno salvos." : "Aluno cadastrado."); onFechar(); }
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }

  if (convite) {
    return <ConviteAluno aberta aluno={convite.aluno} onFechar={() => { setConvite(null); onFechar(); }} />;
  }

  return (
    <Folha aberta={aberta} titulo={aluno ? "Editar aluno" : "Novo aluno"} onFechar={onFechar}
      rodape={<><Botao variante="secundario" onClick={onFechar}>Cancelar</Botao><Botao onClick={salvar} disabled={salvando || limite}>{salvando ? "Salvando…" : aluno ? "Salvar" : "Cadastrar"}</Botao></>}>
      <div className="flex flex-col gap-3.5">
        {limite ? <Aviso tipo="erro">O plano grátis permite 1 aluno ativo. Assine o Ilimitado em Ajustes para cadastrar mais.</Aviso> : null}
        <Campo rotulo="Nome completo"><Entrada value={f.nome} onChange={set("nome")} autoComplete="off" /></Campo>
        <div className="grid sm:grid-cols-2 gap-3.5">
          <Campo rotulo="E-mail" dica="É com ele que o aluno entra no app."><Entrada type="email" inputMode="email" value={f.email} onChange={set("email")} autoComplete="off" /></Campo>
          <Campo rotulo="WhatsApp"><Entrada inputMode="tel" placeholder="(11) 99999-9999" value={f.whatsapp} onChange={set("whatsapp")} /></Campo>
          <Campo rotulo="CPF" dica="Necessário para cobrar pelo app."><Entrada inputMode="numeric" value={f.cpf} onChange={set("cpf")} /></Campo>
          <Campo rotulo="Nascimento"><Entrada type="date" value={f.nascimento} onChange={set("nascimento")} /></Campo>
        </div>
        <Campo rotulo="Objetivo" dica="Define como a evolução aparece: para emagrecer, o progresso sobe quando o peso desce.">
          <Selecao value={f.objetivo} onChange={set("objetivo")}>
            {Object.entries(OBJETIVOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </Selecao>
        </Campo>
        <div className="grid sm:grid-cols-2 gap-3.5">
          <Campo rotulo="Plano" dica={planos.length ? undefined : "Crie seus planos em Financeiro."}>
            <Selecao value={f.plano_id} onChange={set("plano_id")}>
              <option value="">Sem plano (não gera cobrança)</option>
              {planos.filter((p) => p.ativo || p.id === f.plano_id).map((p) => <option key={p.id} value={p.id}>{p.nome} · {brl(p.valor)}</option>)}
            </Selecao>
          </Campo>
          <Campo rotulo="Vence todo dia"><Entrada type="number" min={1} max={28} inputMode="numeric" value={f.dia_vencimento} onChange={set("dia_vencimento")} /></Campo>
        </div>
        <Campo rotulo="Como o aluno paga">
          <Selecao value={f.forma_pagamento} onChange={set("forma_pagamento")}>
            {Object.entries(FORMAS_ALUNO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </Selecao>
        </Campo>
        <Campo rotulo="Observações"><AreaTexto value={f.observacoes} onChange={set("observacoes")} placeholder="Lesões, preferências, horários…" /></Campo>
        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
      </div>
    </Folha>
  );
}

/** Gera o acesso do aluno e mostra a mensagem pronta para enviar. */
export function ConviteAluno({ aberta, aluno, onFechar }: { aberta: boolean; aluno: Aluno; onFechar: () => void }) {
  const { recarregar, perfil } = useDados();
  const { avisar } = useUi();
  const [estado, setEstado] = useState<"pergunta" | "gerando" | "pronto">("pergunta");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => { if (aberta) { setEstado("pergunta"); setSenha(""); setErro(""); } }, [aberta]);

  async function gerar() {
    setEstado("gerando");
    setErro("");
    try {
      const r = await chamarFuncao<{ senha_temporaria: string }>("acesso", { acao: "convidar_aluno", aluno_id: aluno.id });
      setSenha(r.senha_temporaria);
      setEstado("pronto");
      recarregar();
    } catch (e) {
      setErro(mensagemErro(e));
      setEstado("pergunta");
    }
  }

  const site = typeof window !== "undefined" ? window.location.origin : "";
  const mensagem = `Oi, ${aluno.nome.split(" ")[0]}! Seu acesso ao app de treinos com ${perfil?.nome?.split(" ")[0] ?? "seu personal"} está pronto.\n\n` +
    `Entre em: ${site}/login\nE-mail: ${aluno.email}\nSenha temporária: ${senha}\n\nNo primeiro acesso você cria sua própria senha. Dica: adicione o app à tela inicial do celular.`;

  async function copiar() {
    try { await navigator.clipboard.writeText(mensagem); avisar("Mensagem copiada."); } catch { avisar("Não foi possível copiar. Selecione o texto e copie.", "erro"); }
  }

  return (
    <Folha aberta={aberta} titulo={estado === "pronto" ? "Acesso criado" : "Convidar para o app"} onFechar={onFechar}
      rodape={estado === "pronto"
        ? <Botao onClick={onFechar}>Concluir</Botao>
        : <><Botao variante="secundario" onClick={onFechar}>Agora não</Botao><Botao onClick={gerar} disabled={estado === "gerando"}>{estado === "gerando" ? "Gerando…" : aluno.user_id ? "Gerar nova senha" : "Gerar acesso"}</Botao></>}>
      {estado === "pronto" ? (
        <div className="flex flex-col gap-3">
          <Aviso tipo="ok">Envie a mensagem abaixo para {aluno.nome.split(" ")[0]}. A senha temporária só aparece agora.</Aviso>
          <pre className="whitespace-pre-wrap text-sm bg-fundo border border-linha rounded-xl p-3.5 font-sans leading-relaxed select-all">{mensagem}</pre>
          <div className="flex flex-wrap gap-2">
            <Botao variante="secundario" onClick={copiar}><IconCopiar size={16} /> Copiar mensagem</Botao>
            {aluno.whatsapp ? (
              <a href={linkWhats(aluno.whatsapp, mensagem)} target="_blank" rel="noreferrer">
                <Botao variante="secundario"><IconWhats size={16} /> Enviar no WhatsApp</Botao>
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 text-sm text-texto2 leading-relaxed">
          <p>
            {aluno.user_id
              ? `${aluno.nome.split(" ")[0]} já tem acesso. Se esqueceu a senha, gere uma nova senha temporária.`
              : `Vamos criar o acesso de ${aluno.nome.split(" ")[0]} com o e-mail ${aluno.email}. Você recebe uma senha temporária para enviar por WhatsApp.`}
          </p>
          <p>No primeiro acesso, o aluno cria a própria senha e aceita os termos de privacidade e do plano.</p>
          {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
        </div>
      )}
    </Folha>
  );
}
