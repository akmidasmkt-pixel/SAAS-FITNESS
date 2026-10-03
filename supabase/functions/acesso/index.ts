// Função "acesso" do C-Level Personal (verify_jwt desligado: o primeiro acesso acontece sem login;
// as ações protegidas validam o login por dentro).
//
// Ações:
//   status            → se ainda falta o primeiro acesso do administrador
//   primeiro_acesso   → cria o administrador com o código de uso único
//   convidar          → (admin) cria o acesso de um personal com senha temporária
//   convidar_aluno    → (personal) cria ou renova o acesso de um aluno dele
//   resetar_senha     → (admin para personais; personal para os próprios alunos) gera nova senha temporária
//   listar            → (admin) quem tem acesso como personal
//
// Antes de cada auth.admin.createUser o e-mail é liberado em convites_pendentes (o banco só aceita
// criar conta para e-mail liberado há menos de 15 minutos) e a liberação é limpa se der erro.
import { createClient } from "npm:@supabase/supabase-js@2";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

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

async function sha256(texto: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function senhaTemporaria() {
  const v = new Uint32Array(8);
  crypto.getRandomValues(v);
  const c = [...v].map((n) => ALFABETO[n % ALFABETO.length]).join("");
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

type Quem = { id: string; email: string; papel: string; nome: string };
async function quemChama(req: Request): Promise<Quem | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: perfil } = await admin.from("perfis").select("papel, nome").eq("id", data.user.id).maybeSingle();
  if (!perfil) return null;
  return { id: data.user.id, email: data.user.email ?? "", papel: perfil.papel, nome: perfil.nome };
}

async function liberar(email: string) {
  await admin.from("convites_pendentes").upsert({ email, criado_em: new Date().toISOString() });
}
async function limpar(email: string) {
  await admin.from("convites_pendentes").delete().eq("email", email);
}

async function criarUsuario(email: string, senha: string, nome: string) {
  await liberar(email);
  const { data, error } = await admin.auth.admin.createUser({
    email, password: senha, email_confirm: true, user_metadata: { nome },
  });
  if (error || !data.user) {
    await limpar(email);
    const ja = /already|registered|exists/i.test(error?.message ?? "");
    return { erro: ja ? "Esse e-mail já tem uma conta no app. Use outro e-mail." : `Não foi possível criar o acesso: ${error?.message ?? "erro"}`, status: ja ? 409 : 400 };
  }
  return { id: data.user.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return erro("Método não permitido.", 405);

  let corpo: any = {};
  try { corpo = await req.json(); } catch { return erro("Pedido inválido."); }
  const acao = String(corpo.acao ?? "");

  try {
    if (acao === "status") {
      const { data } = await admin.from("app_setup").select("usado_em").eq("id", 1).maybeSingle();
      return resposta({ precisa_primeiro_acesso: !!data && !data.usado_em });
    }

    if (acao === "primeiro_acesso") {
      const codigo = String(corpo.codigo ?? "").trim().toUpperCase();
      const nome = String(corpo.nome ?? "").trim().slice(0, 120);
      const email = String(corpo.email ?? "").trim().toLowerCase();
      const senha = String(corpo.senha ?? "");
      if (!codigo || !nome || !emailValido(email)) return erro("Preencha código, nome e um e-mail válido.");
      if (senha.length < 8) return erro("A senha precisa ter pelo menos 8 caracteres.");

      const { data: setup } = await admin.from("app_setup").select("codigo_hash, usado_em").eq("id", 1).maybeSingle();
      if (!setup || setup.usado_em) return erro("O primeiro acesso já foi feito. Entre com seu e-mail e senha.", 403);
      if ((await sha256(codigo)) !== setup.codigo_hash) return erro("Código de acesso incorreto.", 403);

      // Marca como usado antes de criar a conta, para o código não valer duas vezes ao mesmo tempo.
      const { data: marcado } = await admin.from("app_setup").update({ usado_em: new Date().toISOString() })
        .eq("id", 1).is("usado_em", null).select("id");
      if (!marcado?.length) return erro("O primeiro acesso já foi feito.", 403);

      const r = await criarUsuario(email, senha, nome);
      if ("erro" in r) {
        await admin.from("app_setup").update({ usado_em: null }).eq("id", 1);
        return erro(r.erro!, r.status);
      }
      await admin.from("perfis").update({ papel: "admin", nome }).eq("id", r.id);
      await admin.from("personais").insert({ id: r.id, plano: "beta" });
      return resposta({ ok: true });
    }

    const quem = await quemChama(req);
    if (!quem) return erro("Entre no app para continuar.", 401);
    const ehAdmin = quem.papel === "admin";
    const ehPersonal = ehAdmin || quem.papel === "personal";

    if (acao === "convidar") {
      if (!ehAdmin) return erro("Só o administrador convida personais.", 403);
      const nome = String(corpo.nome ?? "").trim().slice(0, 120);
      const email = String(corpo.email ?? "").trim().toLowerCase();
      if (!emailValido(email)) return erro("Informe um e-mail válido.");
      const senha = senhaTemporaria();
      const r = await criarUsuario(email, senha, nome || email.split("@")[0]);
      if ("erro" in r) return erro(r.erro!, r.status);
      await admin.from("perfis").update({ papel: "personal", trocar_senha: true, ...(nome ? { nome } : {}) }).eq("id", r.id);
      const { error } = await admin.from("personais").insert({ id: r.id, plano: "beta" });
      if (error) return erro("Acesso criado, mas a conta de personal não foi preparada: " + error.message, 500);
      return resposta({ email, senha_temporaria: senha });
    }

    if (acao === "convidar_aluno") {
      if (!ehPersonal) return erro("Só o personal convida os próprios alunos.", 403);
      const alunoId = String(corpo.aluno_id ?? "");
      const { data: aluno } = await admin.from("alunos").select("id, nome, email, user_id, status, personal_id")
        .eq("id", alunoId).eq("personal_id", quem.id).maybeSingle();
      if (!aluno) return erro("Aluno não encontrado.", 404);
      if (aluno.status !== "ativo") return erro("Esse aluno está arquivado. Reative antes de convidar.");
      if (!aluno.email) return erro("Cadastre o e-mail do aluno antes de gerar o convite.");
      const senha = senhaTemporaria();
      if (aluno.user_id) {
        const { error } = await admin.auth.admin.updateUserById(aluno.user_id, { password: senha });
        if (error) return erro("Não foi possível gerar a nova senha: " + error.message, 400);
        await admin.from("perfis").update({ trocar_senha: true }).eq("id", aluno.user_id);
      } else {
        const r = await criarUsuario(aluno.email, senha, aluno.nome);
        if ("erro" in r) return erro(r.erro!, r.status);
        await admin.from("perfis").update({ papel: "aluno", trocar_senha: true, nome: aluno.nome }).eq("id", r.id);
        const { error } = await admin.from("alunos").update({ user_id: r.id }).eq("id", aluno.id);
        if (error) return erro("Acesso criado, mas não foi ligado ao aluno: " + error.message, 500);
      }
      await admin.from("alunos").update({ convidado_em: new Date().toISOString() }).eq("id", aluno.id);
      return resposta({ email: aluno.email, senha_temporaria: senha, nome: aluno.nome });
    }

    if (acao === "resetar_senha") {
      const alvo = String(corpo.user_id ?? "");
      const { data: perfilAlvo } = await admin.from("perfis").select("papel").eq("id", alvo).maybeSingle();
      if (!perfilAlvo) return erro("Usuário não encontrado.", 404);
      let pode = false;
      if (ehAdmin && perfilAlvo.papel === "personal") pode = true;
      if (!pode && ehPersonal && perfilAlvo.papel === "aluno") {
        const { data: a } = await admin.from("alunos").select("id").eq("user_id", alvo).eq("personal_id", quem.id).maybeSingle();
        pode = !!a;
      }
      if (!pode) return erro("Você não pode redefinir a senha dessa pessoa.", 403);
      const senha = senhaTemporaria();
      const { error } = await admin.auth.admin.updateUserById(alvo, { password: senha });
      if (error) return erro("Não foi possível gerar a nova senha: " + error.message, 400);
      await admin.from("perfis").update({ trocar_senha: true }).eq("id", alvo);
      return resposta({ senha_temporaria: senha });
    }

    if (acao === "listar") {
      if (!ehAdmin) return erro("Só o administrador vê essa lista.", 403);
      const { data: perfis } = await admin.from("perfis").select("id, nome, papel, trocar_senha, criado_em")
        .in("papel", ["admin", "personal"]).order("criado_em");
      const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const { data: alunos } = await admin.from("alunos").select("personal_id").eq("status", "ativo");
      const contagem: Record<string, number> = {};
      for (const a of alunos ?? []) contagem[a.personal_id] = (contagem[a.personal_id] ?? 0) + 1;
      const usuarios = (perfis ?? []).map((p) => {
        const u = lista?.users.find((x) => x.id === p.id);
        return { ...p, email: u?.email ?? null, ultimo_acesso: u?.last_sign_in_at ?? null, alunos: contagem[p.id] ?? 0 };
      });
      return resposta({ usuarios });
    }

    return erro("Ação desconhecida.");
  } catch (e) {
    return erro("Erro inesperado: " + (e instanceof Error ? e.message : String(e)), 500);
  }
});
