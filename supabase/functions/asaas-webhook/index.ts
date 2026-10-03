// Avisos de pagamento do Asaas (verify_jwt desligado; a autenticação é o token do Asaas).
// Pagamento confirmado → cobrança paga (a taxa da forma de pagamento entra pelo gatilho do banco).
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN") ?? "";

const FORMA: Record<string, string> = { PIX: "pix", BOLETO: "boleto", CREDIT_CARD: "cartao", DEBIT_CARD: "cartao" };

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  if (!TOKEN || req.headers.get("asaas-access-token") !== TOKEN) return new Response("não autorizado", { status: 401 });
  let corpo: any = {};
  try { corpo = await req.json(); } catch { return new Response("ok"); }
  const evento = String(corpo.event ?? "");
  const pg = corpo.payment ?? {};
  if (!pg.id) return new Response("ok");

  const filtro = admin.from("cobrancas");
  const alvo = pg.externalReference ? { col: "id", val: pg.externalReference } : { col: "asaas_id", val: pg.id };

  if (evento === "PAYMENT_RECEIVED" || evento === "PAYMENT_CONFIRMED") {
    const pago = pg.clientPaymentDate || pg.paymentDate || pg.confirmedDate;
    await filtro.update({
      status: "paga",
      forma: FORMA[String(pg.billingType)] ?? "boleto",
      pago_em: pago ? new Date(`${pago}T12:00:00-03:00`).toISOString() : new Date().toISOString(),
      asaas_id: pg.id,
    }).eq(alvo.col, alvo.val).neq("status", "paga");
  } else if (evento === "PAYMENT_DELETED") {
    await filtro.update({ status: "cancelada" }).eq(alvo.col, alvo.val).neq("status", "paga");
  } else if (evento === "PAYMENT_REFUNDED") {
    await filtro.update({ status: "cancelada", taxa: null }).eq(alvo.col, alvo.val);
  } else if (evento === "PAYMENT_RESTORED") {
    await filtro.update({ status: "pendente" }).eq(alvo.col, alvo.val).eq("status", "cancelada");
  }
  return new Response("ok");
});
