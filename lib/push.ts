"use client";

import { sb, chamarFuncao } from "./supabase";

export type EstadoAvisos = "ativo" | "inativo" | "negado" | "sem_suporte" | "instalar_iphone";

const ehIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalado = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;

export function registrarServico() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

export async function estadoAvisos(): Promise<EstadoAvisos> {
  if (typeof window === "undefined") return "sem_suporte";
  if (ehIphone() && !instalado()) return "instalar_iphone";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "sem_suporte";
  if (Notification.permission === "denied") return "negado";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "ativo" : "inativo";
}

function chaveParaBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Pede permissão, inscreve o aparelho e guarda a inscrição. */
export async function ativarAvisos(): Promise<EstadoAvisos> {
  const atual = await estadoAvisos();
  if (atual === "sem_suporte" || atual === "instalar_iphone" || atual === "negado") return atual;
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return permissao === "denied" ? "negado" : "inativo";
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const { publica } = await chamarFuncao<{ publica: string }>("avisos", { acao: "chave" });
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(publica) });
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await sb().from("push_inscricoes").upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: "endpoint" });
  if (error) {
    // o aparelho estava ligado a outra conta: recomeça a inscrição com esta
    await sub.unsubscribe();
    const nova = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(publica) });
    const k = nova.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    const r = await sb().from("push_inscricoes").insert({ endpoint: k.endpoint, p256dh: k.keys.p256dh, auth: k.keys.auth });
    if (r.error) throw r.error;
  }
  chamarFuncao("avisos", { acao: "teste" }).catch(() => {});
  return "ativo";
}

/** Sai da conta e desliga os avisos deste aparelho, para não chegarem a quem usar depois. */
export async function sairDoApp() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await sb().from("push_inscricoes").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
  } catch { /* segue para sair mesmo assim */ }
  await sb().auth.signOut();
}
