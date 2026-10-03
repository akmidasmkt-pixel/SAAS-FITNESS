// Função "avisos" do C-Level Personal: notificações no celular (web push).
// verify_jwt desligado: é chamada pelo próprio banco (gatilhos e agendamento diário), que manda o
// token guardado em push_config. Ações do app: "chave" (chave pública do push) e "teste" (com login:
// manda um aviso de confirmação para quem acabou de ativar).
//
// Eventos (vindos do banco):
//   mensagem       → avisa quem recebeu a mensagem (aluno ou personal); check-in vira "novo check-in"
//   cobranca_paga  → avisa o personal (pagamento recebido) e o aluno (pagamento confirmado)
//   ficha          → avisa o aluno que o treino foi atualizado
//   diario         → lembrete de check-in no dia escolhido pelo personal e de mensalidade perto do vencimento
//
// As chaves do push são geradas aqui na primeira chamada e ficam só no banco.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-aviso-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });

interface Config { token: string; vapid_publica: string | null; vapid_privada: string | null }
let config: Config | null = null;

async function lerConfig(): Promise<Config> {
  if (config?.vapid_publica) return config;
  const { data } = await admin.from("push_config").select("token, vapid_publica, vapid_privada").eq("id", 1).single();
  let c = data as Config;
  if (!c.vapid_publica || !c.vapid_privada) {
    const k = webpush.generateVAPIDKeys();
    // só grava se ainda estiver vazio, para duas chamadas ao mesmo tempo não gerarem chaves diferentes
    await admin.from("push_config").update({ vapid_publica: k.publicKey, vapid_privada: k.privateKey }).eq("id", 1).is("vapid_publica", null);
    const { data: d2 } = await admin.from("push_config").select("token, vapid_publica, vapid_privada").eq("id", 1).single();
    c = d2 as Config;
  }
  webpush.setVapidDetails("https://personal.agenciaclevel.com", c.vapid_publica!, c.vapid_privada!);
  config = c;
  return c;
}

interface Aviso { titulo: string; texto: string; url: string; tag?: string }

async function enviar(userId: string | null | undefined, a: Aviso) {
  if (!userId) return 0;
  const { data: subs } = await admin.from("push_inscricoes").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  let ok = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: a.titulo, body: a.texto, url: a.url, tag: a.tag }),
        { TTL: 60 * 60 * 24, urgency: "normal" },
      );
      ok++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await admin.from("push_inscricoes").delete().eq("id", s.id);
    }
  }
  return ok;
}

const primeiro = (n: string | null | undefined) => (n ?? "").trim().split(/\s+/)[0] || "";
const brl = (v: number) => "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hojeSP = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const somaDias = (iso: string, n: number) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

async function nomeDe(id: string) {
  const { data } = await admin.from("perfis").select("nome").eq("id", id).maybeSingle();
  return data?.nome ?? "";
}

async function evento(tipo: string, id: string | null) {
  if (tipo === "mensagem" && id) {
    const { data: m } = await admin.from("mensagens").select("id, aluno_id, personal_id, autor_id, tipo, texto").eq("id", id).maybeSingle();
    if (!m) return 0;
    const { data: a } = await admin.from("alunos").select("id, nome, user_id").eq("id", m.aluno_id).maybeSingle();
    if (!a) return 0;
    const corpo = m.tipo === "foto" ? "📷 Foto" : m.tipo === "audio" ? "🎤 Áudio" : (m.texto || "").slice(0, 140);
    if (m.autor_id === m.personal_id) {
      return enviar(a.user_id, { titulo: await nomeDe(m.personal_id) || "Seu personal", texto: corpo, url: "/a/conversa", tag: "conversa" });
    }
    if (m.tipo === "checkin") {
      return enviar(m.personal_id, { titulo: `Novo check-in de ${primeiro(a.nome)}`, texto: (m.texto || "").split("\n")[0].slice(0, 140), url: `/alunos/${a.id}?aba=checkins`, tag: `checkin-${a.id}` });
    }
    return enviar(m.personal_id, { titulo: a.nome, texto: corpo, url: `/conversas?aluno=${a.id}`, tag: `conversa-${a.id}` });
  }

  if (tipo === "cobranca_paga" && id) {
    const { data: c } = await admin.from("cobrancas").select("id, aluno_id, personal_id, valor, taxa").eq("id", id).maybeSingle();
    if (!c) return 0;
    const { data: a } = await admin.from("alunos").select("nome, user_id").eq("id", c.aluno_id).maybeSingle();
    const liquido = Number(c.valor) - Number(c.taxa ?? 0);
    const n1 = await enviar(c.personal_id, { titulo: "Pagamento recebido", texto: `${a?.nome ?? "Aluno"} pagou ${brl(Number(c.valor))}. Você recebe ${brl(liquido)}.`, url: "/financeiro" });
    const n2 = await enviar(a?.user_id, { titulo: "Pagamento confirmado", texto: `Recebemos ${brl(Number(c.valor))}. Obrigado!`, url: "/a/pagamentos" });
    return n1 + n2;
  }

  if (tipo === "ficha" && id) {
    const { data: f } = await admin.from("fichas").select("nome, aluno_id, personal_id").eq("id", id).maybeSingle();
    if (!f) return 0;
    const { data: a } = await admin.from("alunos").select("user_id, status").eq("id", f.aluno_id).maybeSingle();
    if (!a || a.status !== "ativo") return 0;
    return enviar(a.user_id, { titulo: "Treino atualizado", texto: `${primeiro(await nomeDe(f.personal_id)) || "Seu personal"} atualizou o ${f.nome}.`, url: "/a/treino", tag: "treino" });
  }

  if (tipo === "diario") {
    const hj = hojeSP();
    const dow = new Date(hj + "T12:00:00Z").getUTCDay();
    const segunda = somaDias(hj, dow === 0 ? -6 : 1 - dow);
    let total = 0;

    // check-in da semana no dia escolhido por cada personal
    const { data: pers } = await admin.from("personais").select("id").eq("checkin_dia", dow);
    const ids = (pers ?? []).map((p) => p.id);
    if (ids.length) {
      const { data: alunos } = await admin.from("alunos").select("id, nome, user_id, personal_id").in("personal_id", ids).eq("status", "ativo").not("user_id", "is", null);
      const lista = alunos ?? [];
      if (lista.length) {
        const { data: feitos } = await admin.from("checkins").select("aluno_id").in("aluno_id", lista.map((a) => a.id)).gte("data", segunda);
        const ja = new Set((feitos ?? []).map((c) => c.aluno_id));
        for (const a of lista) {
          if (ja.has(a.id)) continue;
          total += await enviar(a.user_id, { titulo: `Hora do check-in, ${primeiro(a.nome)}!`, texto: "Peso, 3 fotos e como foi a semana. Leva uns 3 minutos.", url: "/a/checkin", tag: "checkin" });
        }
      }
    }

    // mensalidade: vence amanhã, vence hoje, venceu ontem
    const datas = [somaDias(hj, 1), hj, somaDias(hj, -1)];
    const { data: cobs } = await admin.from("cobrancas").select("aluno_id, valor, vencimento").eq("status", "pendente").in("vencimento", datas);
    if (cobs?.length) {
      const { data: alunos } = await admin.from("alunos").select("id, user_id").in("id", cobs.map((c) => c.aluno_id)).eq("status", "ativo");
      for (const c of cobs) {
        const a = (alunos ?? []).find((x) => x.id === c.aluno_id);
        if (!a?.user_id) continue;
        const quando = c.vencimento === hj ? "vence hoje" : c.vencimento > hj ? "vence amanhã" : `venceu ontem (${ddmm(c.vencimento)})`;
        total += await enviar(a.user_id, { titulo: "Mensalidade", texto: `Sua mensalidade de ${brl(Number(c.valor))} ${quando}. Toque para pagar.`, url: "/a/pagamentos", tag: "mensalidade" });
      }
    }
    return total;
  }
  return 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resposta({ erro: "metodo" }, 405);
  let corpo: any = {};
  try { corpo = await req.json(); } catch { return resposta({ erro: "pedido" }, 400); }

  try {
    const c = await lerConfig();
    if (corpo.acao === "chave") return resposta({ publica: c.vapid_publica });
    if (corpo.acao === "teste") {
      const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      const { data: u } = await admin.auth.getUser(jwt);
      if (!u?.user) return resposta({ erro: "nao_autorizado" }, 401);
      const n = await enviar(u.user.id, { titulo: "Avisos ativados", texto: "Pronto! Você vai receber os avisos do C-Level Personal neste aparelho.", url: "/", tag: "teste" });
      return resposta({ ok: true, enviados: n });
    }

    const token = req.headers.get("x-aviso-token") ?? "";
    if (!token || token !== c.token) return resposta({ erro: "nao_autorizado" }, 401);
    const enviados = await evento(String(corpo.tipo ?? ""), corpo.id ? String(corpo.id) : null);
    return resposta({ ok: true, enviados });
  } catch (e) {
    return resposta({ erro: "falha", mensagem: e instanceof Error ? e.message : String(e) }, 500);
  }
});
