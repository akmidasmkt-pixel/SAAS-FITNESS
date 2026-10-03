"use client";

import { useCallback, useEffect, useState } from "react";
import { sb, chamarFuncao, mensagemErro } from "@/lib/supabase";
import { useDados } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { Cabecalho, Conteudo } from "@/components/Cabecalho";
import { Aviso, Botao, Campo, Card, CardTopo, Entrada, Folha, Selecao } from "@/components/ui";
import { ddmmaa } from "@/lib/format";
import { IconCopiar } from "@/lib/icons";
import { InstalarApp } from "@/components/InstalarApp";
import { CartaoAvisos } from "@/components/AtivarAvisos";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function Ajustes() {
  const { perfil } = useDados();
  return (
    <>
      <Cabecalho titulo="Ajustes" sub="Conta, assinatura e regras" />
      <Conteudo>
        <div className="grid gap-4 lg:grid-cols-2 items-start">
          <div className="flex flex-col gap-4">
            <ContaRecebimento />
            <Regras />
          </div>
          <div className="flex flex-col gap-4">
            <Assinatura />
            {perfil?.papel === "admin" ? <Personais /> : null}
            <Perfil />
            <CartaoAvisos texto="Mensagens e check-ins dos alunos e pagamentos recebidos pelo app." />
            <InstalarApp />
          </div>
        </div>
      </Conteudo>
    </>
  );
}

function ContaRecebimento() {
  const { personal, perfil, email, recarregar } = useDados();
  const { avisar } = useUi();
  const [status, setStatus] = useState<{ configurado: boolean; ambiente: string } | null>(null);
  const [abrir, setAbrir] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [f, setF] = useState({ cpfCnpj: "", nascimento: "", telefone: "", cep: "", endereco: "", numero: "", complemento: "", bairro: "", renda: "" });
  const [erro, setErro] = useState("");

  useEffect(() => { chamarFuncao("cobranca", { acao: "status" }).then(setStatus).catch(() => setStatus({ configurado: false, ambiente: "" })); }, []);

  async function criar() {
    setErro("");
    const doc = f.cpfCnpj.replace(/\D/g, "");
    if (doc.length !== 11 && doc.length !== 14) return setErro("Informe um CPF (11 números) ou CNPJ (14 números).");
    if (doc.length === 11 && !f.nascimento) return setErro("Informe a data de nascimento.");
    if (!f.telefone || !f.cep || !f.endereco || !f.numero || !f.bairro) return setErro("Preencha telefone e endereço completo.");
    setOcupado(true);
    try {
      const r = await chamarFuncao<{ onboarding_url: string | null }>("cobranca", { acao: "criar_conta", nome: perfil?.nome, email, ...f, renda: Number(f.renda.replace(/\D/g, "")) || undefined });
      await recarregar();
      setAbrir(false);
      avisar("Conta aberta. Agora envie os documentos para liberar.");
      if (r.onboarding_url) window.open(r.onboarding_url, "_blank");
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  async function atualizar() {
    setOcupado(true);
    try {
      await chamarFuncao("cobranca", { acao: "atualizar_conta" });
      await recarregar();
      avisar("Status atualizado.");
    } catch (e) {
      avisar(mensagemErro(e), "erro");
    } finally {
      setOcupado(false);
    }
  }

  const st = personal?.asaas_status ?? "nao_iniciado";
  return (
    <Card>
      <CardTopo titulo="Conta de recebimento" sub="Para receber Pix, boleto e cartão pelo app, com baixa automática" />
      <div className="px-4 sm:px-5 pb-4 flex flex-col gap-3">
        {status && !status.configurado ? (
          <Aviso>
            Modo teste: a cobrança pelo app está sendo ativada. Enquanto isso, as mensalidades são geradas todo mês e você registra os pagamentos
            recebidos por fora em Financeiro, ou manda lembrete pelo WhatsApp com um toque.
          </Aviso>
        ) : null}
        {status?.configurado && status.ambiente === "sandbox" ? <Aviso>Ambiente de testes do Asaas: nenhum dinheiro de verdade circula.</Aviso> : null}
        {st === "nao_iniciado" ? (
          <>
            <p className="text-sm text-texto2">Abra uma conta de recebimento no Asaas (sem mensalidade). O dinheiro das mensalidades cai nela e você saca para o seu banco.</p>
            <Botao onClick={() => setAbrir(true)} disabled={!status?.configurado}>Abrir conta de recebimento</Botao>
          </>
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">{personal?.asaas_tipo === "juridica" ? "CNPJ" : "CPF"} final {personal?.asaas_doc_final}</span>
              <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-bold ${st === "aprovada" ? "bg-verde-cl text-verde" : st === "recusada" ? "bg-vermelho-cl text-vermelho" : "bg-ambar-cl text-ambar-txt"}`}>
                {st === "aprovada" ? "Aprovada" : st === "recusada" ? "Recusada" : "Aguardando documentos"}
              </span>
            </div>
            {st === "pendente" && personal?.asaas_onboarding_url ? (
              <a href={personal.asaas_onboarding_url} target="_blank" rel="noreferrer"><Botao className="w-full">Enviar documentos</Botao></a>
            ) : null}
            <Botao variante="secundario" onClick={atualizar} disabled={ocupado}>{ocupado ? "Atualizando…" : "Atualizar status"}</Botao>
            {personal?.asaas_criada_em ? <p className="text-xs text-mudo">Aberta em {ddmmaa(personal.asaas_criada_em.slice(0, 10))}.</p> : null}
          </div>
        )}
        <p className="text-xs text-mudo">Taxa por cobrança paga pelo app: Pix e boleto R$ 3,98 · cartão 4,49% + R$ 0,49. Pagamentos recebidos por fora não têm taxa.</p>
      </div>
      <Folha aberta={abrir} titulo="Abrir conta de recebimento" onFechar={() => setAbrir(false)} largura="max-w-xl"
        rodape={<><Botao variante="secundario" onClick={() => setAbrir(false)}>Cancelar</Botao><Botao onClick={criar} disabled={ocupado}>{ocupado ? "Abrindo…" : "Abrir conta"}</Botao></>}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-texto2">Use seus dados (ou da sua empresa). O Asaas pede esses dados por lei para abrir a conta.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo rotulo="CPF ou CNPJ"><Entrada inputMode="numeric" value={f.cpfCnpj} onChange={(e) => setF({ ...f, cpfCnpj: e.target.value })} /></Campo>
            <Campo rotulo="Nascimento (se CPF)"><Entrada type="date" value={f.nascimento} onChange={(e) => setF({ ...f, nascimento: e.target.value })} /></Campo>
            <Campo rotulo="Celular"><Entrada inputMode="tel" value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} /></Campo>
            <Campo rotulo="Renda mensal aproximada (R$)"><Entrada inputMode="numeric" value={f.renda} onChange={(e) => setF({ ...f, renda: e.target.value })} placeholder="5000" /></Campo>
            <Campo rotulo="CEP"><Entrada inputMode="numeric" value={f.cep} onChange={(e) => setF({ ...f, cep: e.target.value })} /></Campo>
            <Campo rotulo="Bairro"><Entrada value={f.bairro} onChange={(e) => setF({ ...f, bairro: e.target.value })} /></Campo>
          </div>
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <Campo rotulo="Endereço"><Entrada value={f.endereco} onChange={(e) => setF({ ...f, endereco: e.target.value })} /></Campo>
            <Campo rotulo="Número"><Entrada value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} /></Campo>
          </div>
          <Campo rotulo="Complemento"><Entrada value={f.complemento} onChange={(e) => setF({ ...f, complemento: e.target.value })} /></Campo>
          {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
        </div>
      </Folha>
    </Card>
  );
}

function Regras() {
  const { personal, recarregar } = useDados();
  const { avisar } = useUi();
  const [ativo, setAtivo] = useState(true);
  const [dias, setDias] = useState("5");
  const [checkin, setCheckin] = useState("6");
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    if (!personal) return;
    setAtivo(personal.bloqueio_ativo); setDias(String(personal.bloqueio_dias)); setCheckin(String(personal.checkin_dia));
  }, [personal]);
  async function salvar() {
    const d = Number(dias);
    if (!(d >= 1 && d <= 30)) return avisar("Os dias de tolerância vão de 1 a 30.", "erro");
    setSalvando(true);
    const { error } = await sb().from("personais").update({ bloqueio_ativo: ativo, bloqueio_dias: d, checkin_dia: Number(checkin) }).eq("id", personal!.id);
    setSalvando(false);
    if (error) return avisar(mensagemErro(error), "erro");
    await recarregar();
    avisar("Regras salvas.");
  }
  return (
    <Card>
      <CardTopo titulo="Regras" sub="Valem para todos os seus alunos" />
      <div className="px-4 sm:px-5 pb-4 flex flex-col gap-3.5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="mt-0.5 w-5 h-5 accent-[#2a78d6]" />
          <span className="flex flex-col">
            <span className="text-sm font-bold">Pausar o treino quando a mensalidade atrasar</span>
            <span className="text-xs text-mudo">O aluno continua vendo a evolução, a conversa e o pagamento. O treino volta na hora em que o pagamento é registrado.</span>
          </span>
        </label>
        {ativo ? (
          <Campo rotulo="Pausar depois de quantos dias de atraso">
            <Entrada type="number" min={1} max={30} inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value)} className="max-w-[140px]" />
          </Campo>
        ) : null}
        <Campo rotulo="Dia do check-in semanal" dica="Nesse dia o app do aluno pede peso, fotos, sono, energia e um recado.">
          <Selecao value={checkin} onChange={(e) => setCheckin(e.target.value)} className="max-w-[200px]">
            {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </Selecao>
        </Campo>
        <p className="text-xs text-mudo">
          Lembretes de pagamento: quando a cobrança é emitida pelo app, o Asaas avisa o aluno por e-mail e SMS antes e no dia do vencimento.
          Você também pode mandar lembrete pelo WhatsApp em Financeiro.
        </p>
        <div className="flex justify-end"><Botao onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar regras"}</Botao></div>
      </div>
    </Card>
  );
}

function Assinatura() {
  const { personal, alunos } = useDados();
  const ativos = alunos.filter((a) => a.status === "ativo").length;
  const nome = { gratis: "Grátis", mensal: "Ilimitado mensal", anual: "Ilimitado anual", beta: "Beta fechado" }[personal?.plano ?? "gratis"];
  return (
    <Card>
      <CardTopo titulo="Sua assinatura" sub={`${ativos} ${ativos === 1 ? "aluno ativo" : "alunos ativos"}`}
        direita={<span className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-bold bg-azul-cl text-azul-esc">{nome}</span>} />
      <div className="px-4 sm:px-5 pb-4 flex flex-col gap-3">
        {personal?.plano === "beta" ? (
          <Aviso tipo="ok">Você está no beta fechado: alunos ilimitados, sem custo, enquanto testamos juntos.</Aviso>
        ) : null}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { t: "Grátis", v: "R$ 0", s: "1 aluno" },
            { t: "Ilimitado", v: "R$ 59,90", s: "por mês" },
            { t: "Anual", v: "R$ 49,90", s: "por mês, no plano anual" },
          ].map((p) => (
            <div key={p.t} className="rounded-xl border border-linha p-3 flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-mudo uppercase">{p.t}</span>
              <span className="text-base font-extrabold">{p.v}</span>
              <span className="text-[11px] text-mudo leading-tight">{p.s}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-mudo">Os planos pagos começam ao fim do beta. Você será avisado antes de qualquer cobrança.</p>
      </div>
    </Card>
  );
}

interface Usuario { id: string; nome: string; papel: string; email: string | null; ultimo_acesso: string | null; alunos: number; trocar_senha: boolean }

function Personais() {
  const { avisar } = useUi();
  const [lista, setLista] = useState<Usuario[] | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [resultado, setResultado] = useState<{ email: string; senha: string } | null>(null);
  const [erro, setErro] = useState("");
  const carregar = useCallback(() => {
    chamarFuncao<{ usuarios: Usuario[] }>("acesso", { acao: "listar" }).then((r) => setLista(r.usuarios)).catch((e) => setErro(mensagemErro(e)));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function convidar() {
    setErro("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErro("Informe um e-mail válido.");
    setOcupado(true);
    try {
      const r = await chamarFuncao<{ email: string; senha_temporaria: string }>("acesso", { acao: "convidar", nome: nome.trim(), email: email.trim() });
      setResultado({ email: r.email, senha: r.senha_temporaria });
      setNome(""); setEmail("");
      carregar();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  async function resetar(u: Usuario) {
    if (!confirm(`Gerar uma nova senha temporária para ${u.nome}?`)) return;
    try {
      const r = await chamarFuncao<{ senha_temporaria: string }>("acesso", { acao: "resetar_senha", user_id: u.id });
      setResultado({ email: u.email ?? "", senha: r.senha_temporaria });
    } catch (e) {
      avisar(mensagemErro(e), "erro");
    }
  }

  const site = typeof window !== "undefined" ? window.location.origin : "";
  const mensagem = resultado ? `Seu acesso ao C-Level Personal (beta) está pronto.\n\nEntre em: ${site}/login\nE-mail: ${resultado.email}\nSenha temporária: ${resultado.senha}\n\nNo primeiro acesso você cria sua própria senha.` : "";

  return (
    <Card>
      <CardTopo titulo="Personais do beta" sub="Só você (administrador) vê esta parte" />
      <div className="px-4 sm:px-5 pb-4 flex flex-col gap-3">
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <Campo rotulo="Nome"><Entrada value={nome} onChange={(e) => setNome(e.target.value)} /></Campo>
          <Campo rotulo="E-mail"><Entrada type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Campo>
          <Botao onClick={convidar} disabled={ocupado}>{ocupado ? "Criando…" : "Convidar"}</Botao>
        </div>
        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
        {lista ? (
          <ul className="flex flex-col divide-y divide-linha2">
            {lista.map((u) => (
              <li key={u.id} className="py-2.5 flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-bold truncate">{u.nome}{u.papel === "admin" ? " · você" : ""}</span>
                  <span className="block text-xs text-mudo truncate">{u.alunos} {u.alunos === 1 ? "aluno" : "alunos"} · {u.ultimo_acesso ? `último acesso ${ddmmaa(u.ultimo_acesso.slice(0, 10))}` : "ainda não entrou"}</span>
                </span>
                {u.papel !== "admin" ? <Botao pequeno variante="fantasma" onClick={() => resetar(u)}>Nova senha</Botao> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <Folha aberta={!!resultado} titulo="Acesso pronto" onFechar={() => setResultado(null)} rodape={<Botao onClick={() => setResultado(null)}>Concluir</Botao>}>
        <div className="flex flex-col gap-3">
          <Aviso tipo="ok">Envie esta mensagem para o personal. A senha temporária só aparece agora.</Aviso>
          <pre className="whitespace-pre-wrap text-sm bg-fundo border border-linha rounded-xl p-3.5 font-sans leading-relaxed select-all">{mensagem}</pre>
          <Botao variante="secundario" onClick={() => navigator.clipboard.writeText(mensagem).then(() => avisar("Mensagem copiada."))}><IconCopiar size={16} /> Copiar mensagem</Botao>
        </div>
      </Folha>
    </Card>
  );
}

function Perfil() {
  const { perfil, email, recarregar } = useDados();
  const { avisar } = useUi();
  const [nome, setNome] = useState(perfil?.nome ?? "");
  const [senha, setSenha] = useState("");
  const [ocupado, setOcupado] = useState(false);
  async function salvarNome() {
    if (!nome.trim()) return;
    setOcupado(true);
    const { error } = await sb().from("perfis").update({ nome: nome.trim() }).eq("id", perfil!.id);
    setOcupado(false);
    if (error) return avisar(mensagemErro(error), "erro");
    await recarregar();
    avisar("Nome salvo.");
  }
  async function trocarSenha() {
    if (senha.length < 8) return avisar("A senha precisa ter pelo menos 8 caracteres.", "erro");
    setOcupado(true);
    const { error } = await sb().auth.updateUser({ password: senha });
    setOcupado(false);
    if (error) return avisar("Não foi possível trocar a senha: " + error.message, "erro");
    setSenha("");
    avisar("Senha trocada.");
  }
  return (
    <Card>
      <CardTopo titulo="Seu perfil" sub={email} />
      <div className="px-4 sm:px-5 pb-4 flex flex-col gap-3">
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <Campo rotulo="Seu nome (os alunos veem)"><Entrada value={nome} onChange={(e) => setNome(e.target.value)} /></Campo>
          <Botao variante="secundario" onClick={salvarNome} disabled={ocupado || nome.trim() === perfil?.nome}>Salvar</Botao>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <Campo rotulo="Nova senha"><Entrada type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} /></Campo>
          <Botao variante="secundario" onClick={trocarSenha} disabled={ocupado || !senha}>Trocar</Botao>
        </div>
      </div>
    </Card>
  );
}
