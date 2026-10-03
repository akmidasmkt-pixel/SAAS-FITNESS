import { chromium } from 'playwright';
import * as D from './mock.mjs';
const BASE = 'http://localhost:3100';
const SUPA = 'https://oboaxkuznsjhlyravbhl.supabase.co';
const OUT = process.argv[2];
const tabelas = { perfis: [D.perfil], contas_bancarias: D.bancos, categorias: D.categorias, clientes: D.clientes, contas_fixas: D.fixas, lancamentos: D.lancamentos, orcamentos: D.orcamentos, metas: D.metas, eventos: D.eventos, agenda_links: [D.link] };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600 * 24 * 365;
const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: D.USER.id, exp, role: 'authenticated', aud: 'authenticated', email: D.USER.email })}.sig`;
const sessao = { access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'r', user: { ...D.USER, app_metadata: {}, user_metadata: {}, created_at: '2026-09-01T00:00:00Z' } };
const erros = [];
async function preparar(page) {
  await page.clock.setFixedTime(new Date('2026-09-23T15:00:00-03:00'));
  await page.addInitScript((s) => { localStorage.setItem('clevel-financas-auth', JSON.stringify(s)); if (!localStorage.getItem('clevel-escopo')) localStorage.setItem('clevel-escopo', 'tudo'); }, sessao);
  page.on('pageerror', (e) => erros.push(page.url() + ' :: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') erros.push(page.url() + ' :: console ' + m.text()); });
  await page.route(SUPA + '/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.pathname.startsWith('/auth/v1/user')) return route.fulfill({ json: sessao.user });
    if (url.pathname.startsWith('/rest/v1/rpc/')) return route.fulfill({ json: 0 });
    const m = url.pathname.match(/^\/rest\/v1\/(\w+)/);
    if (m) {
      const rows = tabelas[m[1]] ?? [];
      const single = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
      if (req.method() !== 'GET') return route.fulfill({ status: 201, json: single ? rows[0] ?? {} : [] });
      return route.fulfill({ json: single ? rows[0] ?? null : rows, headers: { 'content-range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` } });
    }
    if (url.pathname.startsWith('/functions/v1/acesso')) return route.fulfill({ json: { usuarios: [{ id: D.USER.id, nome: 'Ramon Garcia', papel: 'admin', email: D.USER.email, trocar_senha: false, ultimo_acesso: '2026-09-23T12:00:00Z' }], precisa_primeiro_acesso: false } });
    return route.fulfill({ status: 404, json: {} });
  });
}
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const telas = (process.argv[3] || '/').split(',');
const modo = process.argv[4] || 'desktop';
const [w, h] = modo === 'mobile' ? [390, 844] : [1280, 900];
for (const t of telas) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: modo === 'mobile' });
  const page = await ctx.newPage();
  await preparar(page);
  const [rota, escopo] = t.split('@');
  if (escopo) await page.addInitScript((e) => localStorage.setItem('clevel-escopo', e), escopo);
  await page.goto(BASE + rota, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const nome = (rota === '/' ? 'dashboard' : rota.slice(1)) + (escopo ? '-' + escopo : '') + '-' + modo;
  await page.screenshot({ path: `${OUT}/${nome}.png`, fullPage: true });
  await ctx.close();
}
await b.close();
console.log('erros:', erros.length ? erros.join('\n') : 'nenhum');
