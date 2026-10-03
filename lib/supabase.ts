import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Chave publicável: feita para ficar no navegador. A proteção dos dados é a RLS do banco.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sxuqwutpgzxqhqqhxise.supabase.co";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || "sb_publishable_tir6exJNBOc6LUmM6y_Thw_dtIYCNQa";

let client: SupabaseClient | null = null;

export function sb(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "clevel-personal-auth" },
    });
  }
  return client;
}

export class ErroFuncao extends Error {
  status: number;
  dados: any;
  constructor(msg: string, status: number, dados: any) {
    super(msg);
    this.status = status;
    this.dados = dados;
  }
}

// Chama uma Edge Function do Supabase mandando o login atual (quando houver).
export async function chamarFuncao<T = any>(nome: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", apikey: SUPABASE_KEY };
  const { data } = await sb().auth.getSession();
  if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  let r: Response;
  try {
    r = await fetch(`${SUPABASE_URL}/functions/v1/${nome}`, { method: "POST", headers, body: JSON.stringify(body) });
  } catch {
    throw new ErroFuncao("Sem conexão com o servidor. Confira a internet e tente de novo.", 0, null);
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroFuncao(j?.mensagem || j?.erro || "Não deu certo. Tente de novo.", r.status, j);
  return j as T;
}

/** Traduz erros comuns do banco para mensagens de quem usa o app. */
export function mensagemErro(e: any): string {
  const m = String(e?.message ?? e ?? "");
  if (/duplicate key|23505/i.test(m)) return "Já existe um cadastro com esses dados.";
  if (/violates foreign key|23503/i.test(m)) return "Esse item está ligado a outro cadastro e não pode ser usado aqui.";
  if (/row-level security|42501|permission denied/i.test(m)) return "Você não tem permissão para fazer isso.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Sem conexão. Confira a internet e tente de novo.";
  return m || "Não deu certo. Tente de novo.";
}
