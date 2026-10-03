// Função "cobranca" do C-Level Personal: integração com o Asaas (verify_jwt ligado).
//
// Segredos (cadastrados no painel do Supabase, nunca no código):
//   ASAAS_API_KEY        chave da conta principal (empresarial) da agência
//   ASAAS_AMBIENTE       "sandbox" (padrão) ou "producao"
//   ASAAS_WALLET_ID      carteira da agência, que recebe a parte dela em cada cobrança (split)
//   ASAAS_WEBHOOK_TOKEN  token que o Asaas manda nos avisos de pagamento
//   ASAAS_TARIFA_PIX, ASAAS_TARIFA_PIX_PROMO, ASAAS_TARIFA_CARTAO_PCT  (opcionais; tarifas atuais do Asaas)
//
// Regra de taxa: o personal paga sempre R$ 3,98 por Pix/boleto e 4,49% + R$ 0,49 no cartão.
// A parte da agência é o total fixo menos a tarifa que o Asaas cobra da subconta naquela cobrança.
//
// Ações: status · criar_conta · atualizar_conta · emitir
import { createClient } from "npm:@supabase/supabase-js@2";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const CHAVE = Deno.env.get("ASAAS_API_KEY") ?? "";
const AMBIENTE = (Deno.env.get("ASAAS_AMBIENTE") ?? "sandbox") === "producao" ? "producao" : "sandbox";
const BASE = AMBIENTE === "producao" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
const CARTEIRA = Deno.env.get("ASAAS_WALLET_ID") ?? "";
const WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN") ?? "";
const TARIFA_PIX = Number(Deno.env.get("ASAAS_TARIFA_PIX") ?? "1.99");
const TARIFA_PIX_PROMO = Number(Deno.env.get("ASAAS_TARIFA_PIX_PROMO") ?? "0.99");
const TARIFA_CARTAO_PCT = Number(Deno.env.get("ASAAS_TARIFA_CARTAO_PCT") ?? "2.99");
const TOTAL_PIX = 3.98;
const TOTAL_CARTAO_PCT = 4.49;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
function erro(mensagem: string, status = 400, codigo = "erro") {
  return resposta({ erro: codigo, mensagem }, status);
}

const configurado = () => !!(CHAVE && CARTEIRA && WEBHOOK_TOKEN);

async function asaas(caminho: string, chave: string, metodo = "GET", corpo?: unknown) {
  const r = await fetch(BASE + caminho, {
    method: metodo,
    headers: { "Content-Type": "application/json", "User-Agent": "c-level-personal", access_token: chave },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (j?.errors ?? []).map((e: any) => e.description).filter(Boolean).join(" ") || `Asaas respondeu ${r.status}.`;
    throw new Error(msg);
  }
  return j;
}

const so = (s: unknown) => String(s ?? "").replace(/\D/g, "");
const hojeSP = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return erro("Método não permitido.", 405);
  let corpo: any = {};
  try { corpo = await req.json(); } catch { return erro("Pedido inválido."); }
  const acao = String(corpo.acao ?? "");

  if (acao === "status") return resposta({ configurado: configurado(), ambiente: AMBIENTE });
  if (!configurado()) {
    return erro("A cobrança pelo Asaas ainda está sendo ativada. Por enquanto, registre os pagamentos à mão.", 503, "config");
  }

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return erro("Entre no app para continuar.", 401);
  const { data: perfil } = await admin.from("perfis").select("papel, nome").eq("id", u.user.id).maybeSingle();
  if (!perfil || !["admin", "personal"].includes(perfil.papel)) return erro("Só o personal usa a cobrança.", 403);
  const personalId = u.user.id;

  try {
    if (acao === "criar_conta") {
      const { data: p } = await admin.from("personais").select("asaas_conta_id").eq("id", personalId).maybeSingle();
      if (p?.asaas_conta_id) return erro("Sua conta de recebimento já foi aberta.");
      const doc = so(corpo.cpfCnpj);
      const juridica = doc.length === 14;
      if (doc.length !== 11 && doc.length !== 14) return erro("Informe um CPF ou CNPJ válido.");
      const conta = await asaas("/accounts", CHAVE, "POST", {
        name: String(corpo.nome ?? perfil.nome).slice(0, 120),
        email: String(corpo.email ?? u.user.email),
        cpfCnpj: doc,
        birthDate: juridica ? undefined : corpo.nascimento,
        companyType: juridica ? (corpo.tipoEmpresa || "MEI") : undefined,
        mobilePhone: so(corpo.telefone),
        incomeValue: Number(corpo.renda) || 5000,
        address: corpo.endereco,
        addressNumber: corpo.numero,
        complement: corpo.complemento || undefined,
        province: corpo.bairro,
        postalCode: so(corpo.cep),
        webhooks: [{
          name: "C-Level Personal",
          url: `${URL_SB}/functions/v1/asaas-webhook`,
          email: String(u.user.email),
          sendType: "SEQUENTIALLY",
          interrupted: false,
          enabled: true,
          apiVersion: 3,
          authToken: WEBHOOK_TOKEN,
          events: ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_DELETED", "PAYMENT_REFUNDED", "PAYMENT_RESTORED"],
        }],
      });
      await admin.from("asaas_chaves").upsert({ personal_id: personalId, api_key: conta.apiKey });
      let onboarding: string | null = null;
      try {
        const docs = await asaas("/myAccount/documents", conta.apiKey);
        onboarding = (docs?.data ?? []).map((d: any) => d.onboardingUrl).find(Boolean) ?? null;
      } catch { /* o link aparece em "Atualizar status" */ }
      await admin.from("personais").update({
        asaas_conta_id: conta.id, asaas_wallet_id: conta.walletId, asaas_status: "pendente",
        asaas_tipo: juridica ? "juridica" : "fisica", asaas_doc_final: doc.slice(-4),
        asaas_criada_em: new Date().toISOString(), asaas_onboarding_url: onboarding,
      }).eq("id", personalId);
      return resposta({ status: "pendente", onboarding_url: onboarding });
    }

    const { data: chave } = await admin.from("asaas_chaves").select("api_key").eq("personal_id", personalId).maybeSingle();
    if (!chave) return erro("Abra sua conta de recebimento em Ajustes antes de cobrar pelo app.");

    if (acao === "atualizar_conta") {
      const st = await asaas("/myAccount/status", chave.api_key);
      const geral = String(st?.general ?? "").toUpperCase();
      const status = geral === "APPROVED" ? "aprovada" : geral === "REJECTED" ? "recusada" : "pendente";
      let onboarding: string | null = null;
      if (status === "pendente") {
        try {
          const docs = await asaas("/myAccount/documents", chave.api_key);
          onboarding = (docs?.data ?? []).map((d: any) => d.onboardingUrl).find(Boolean) ?? null;
        } catch { /* sem link agora */ }
      }
      await admin.from("personais").update({ asaas_status: status, asaas_onboarding_url: onboarding }).eq("id", personalId);
      return resposta({ status, onboarding_url: onboarding });
    }

    if (acao === "emitir") {
      const { data: c } = await admin.from("cobrancas")
        .select("id, aluno_id, valor, vencimento, descricao, status, forma, asaas_id, link_pagamento, pix_copia_cola")
        .eq("id", String(corpo.cobranca_id ?? "")).eq("personal_id", personalId).maybeSingle();
      if (!c) return erro("Cobrança não encontrada.", 404);
      if (c.status !== "pendente") return erro("Essa cobrança não está em aberto.");
      if (c.asaas_id) return resposta({ link_pagamento: c.link_pagamento, pix_copia_cola: c.pix_copia_cola });
      const { data: a } = await admin.from("alunos").select("id, nome, email, cpf, whatsapp")
        .eq("id", c.aluno_id).eq("personal_id", personalId).maybeSingle();
      if (!a) return erro("Aluno não encontrado.", 404);
      if (!a.cpf) return erro("Cadastre o CPF do aluno para cobrar pelo app.");
      const { data: p } = await admin.from("personais").select("asaas_criada_em").eq("id", personalId).maybeSingle();

      const busca = await asaas(`/customers?externalReference=${a.id}`, chave.api_key);
      let clienteId = busca?.data?.[0]?.id;
      if (!clienteId) {
        const novo = await asaas("/customers", chave.api_key, "POST", {
          name: a.nome, cpfCnpj: a.cpf, email: a.email || undefined, mobilePhone: so(a.whatsapp) || undefined, externalReference: a.id,
        });
        clienteId = novo.id;
      }

      const cartao = c.forma === "cartao";
      const promo = p?.asaas_criada_em && Date.now() - new Date(p.asaas_criada_em).getTime() < 90 * 86400000;
      const tarifa = promo ? TARIFA_PIX_PROMO : TARIFA_PIX;
      const split = cartao
        ? [{ walletId: CARTEIRA, percentualValue: Math.round((TOTAL_CARTAO_PCT - TARIFA_CARTAO_PCT) * 100) / 100 }]
        : [{ walletId: CARTEIRA, fixedValue: Math.round((TOTAL_PIX - tarifa) * 100) / 100 }];
      const hj = hojeSP();
      const pagamento = await asaas("/payments", chave.api_key, "POST", {
        customer: clienteId,
        billingType: cartao ? "CREDIT_CARD" : "BOLETO",
        value: Number(c.valor),
        dueDate: c.vencimento < hj ? hj : c.vencimento,
        description: c.descricao || "Mensalidade",
        externalReference: c.id,
        split,
      });
      let pix: string | null = null;
      if (!cartao) {
        try { pix = (await asaas(`/payments/${pagamento.id}/pixQrCode`, chave.api_key))?.payload ?? null; } catch { /* boleto sem Pix */ }
      }
      await admin.from("cobrancas").update({
        asaas_id: pagamento.id, link_pagamento: pagamento.invoiceUrl ?? null, pix_copia_cola: pix,
        forma: cartao ? "cartao" : (c.forma === "pix_automatico" ? "pix_automatico" : "boleto"),
      }).eq("id", c.id);
      return resposta({ link_pagamento: pagamento.invoiceUrl ?? null, pix_copia_cola: pix });
    }

    return erro("Ação desconhecida.");
  } catch (e) {
    return erro(e instanceof Error ? e.message : String(e), 502);
  }
});
