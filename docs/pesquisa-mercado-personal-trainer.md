# Pesquisa de mercado: SaaS para personal trainers

*Feita em 02 e 03/10/2026. Base para a etapa de produto (skill app-da-dor-ao-ar).*

> **Leia antes de usar os números.** O proxy desta sessão bloqueou a abertura direta dos sites oficiais. Por isso os preços vêm dos **trechos das páginas oficiais que o buscador devolveu**, com a URL citada. A cota de buscas acabou antes de cobrir PagBank e Vindi. Onde as fontes divergem, isso está indicado. **Antes de fechar o preço do nosso produto, confira os preços dos 3 ou 4 concorrentes principais na página oficial.**

---

## 1. Resumo executivo

- **Fora do Brasil**, a líder é a **ABC Trainerize**: 400 mil+ profissionais, 1,6 mi+ clientes, nota 4,9 na App Store (68 mil avaliações). Atrás dela vêm **Everfit** (200 mil+ coaches), **My PT Hub** (200 mil+ usuários), **TrueCoach** (20 mil+ coaches) e **Kahunas** (14 mil coaches e 750 mil clientes). Todas cobram por **faixa de alunos ativos**. As líderes vendem pagamentos, nutrição e app com a marca do coach como add-ons à parte.
- **No Brasil**, a líder disparada é a **MFIT Personal**: diz que 200 a 450 mil personais já passaram pela plataforma e que tem 5 mi de alunos; Play 4,8 (22,8 mil avaliações) e App Store 4,9 (~146 mil). O ilimitado custa **R$ 39,90/mês**. Depois vêm **Tecnofit Personal** (grátis até 10 alunos) e **Nexur**, que é a mais completa no papel (cobrança, chat, dieta e app com a marca), mas tem pouca tração (nota 4,2 com 369 avaliações).
- **Nenhum player brasileiro entrega bem os quatro pilares que você pediu** (cobrança recorrente, chat, acompanhamento e treino):
  - a MFIT tem chat parcial, não tem dieta e cobra **2,59% no Pix**;
  - a Tecnofit não tem dieta nem app com a marca do personal;
  - a Nexur tem tudo, mas com pouca tração e avaliações fracas.
- **O "concorrente invisível"** é Hotmart ou Kiwify + WhatsApp + planilha ou PDF. É como boa parte dos personais vende consultoria online hoje, pagando **cerca de 10% por venda**.
- **A maior lacuna é a cobrança.** Quase nenhum app de treino tem **Pix Automático** nativo, e há queixas no Reclame Aqui da líder sobre dinheiro retido e aluno que cancela a recorrência sozinho. Por isso o personal acaba usando dois produtos, um para treino e outro para cobrança.
- **Infraestrutura recomendada para a v1:**
  - **Asaas**, com uma subconta por personal criada via API (CPF ou CNPJ) e KYC por link;
  - split com a comissão do SaaS;
  - Pix Automático via API, cartão recorrente e boleto;
  - régua de cobrança por WhatsApp;
  - Pix a R$ 1,99 fixo e sem mensalidade.

---

## 2. As referências com mais resultado

### 2.1 Internacionais

| Plataforma | Tração (fonte: o próprio fornecedor, salvo indicação) | Por que é referência |
|---|---|---|
| **ABC Trainerize** | 400 mil+ profissionais, 45 mil+ negócios, 1,6 mi+ clientes, 194 países; ARR de US$ 20 mi em 2022; App Store 4,9 (68 mil), Play 4,8 (13 mil). Comprada pela ABC Fitness (Thoma Bravo) em 2020 | Líder de mercado. App do cliente muito polido, chat completo (grupo, áudio, vídeo), wearables, IA para montar treino |
| **Everfit** | 200 mil+ coaches em 190+ países; ARR estimado de US$ 8,4 mi (2025); Capterra 4,8 (415) | Plano grátis até 5 clientes, automação forte (Autoflow), IA na nutrição (o MacroSnap calcula os macros a partir da foto do prato) |
| **My PT Hub** (UK) | 200 mil+ usuários; Capterra UK 4,6 (3.206) | Preço fixo com clientes ilimitados, agenda e aulas, modelo híbrido (presencial + online) |
| **TrueCoach** (Xplor) | 20 mil+ coaches (dado não oficial); Capterra 4,8 (837) | Simples e rápido para programar treino; app oficial da ISSA |
| **Kahunas** (UK) | 14 mil coaches e 750 mil clientes; Trustpilot 5,0 (433) | Construído em torno do **check-in**; onboarding e suporte excepcionais |
| **PT Distinction** (UK) | Capterra 4,9 (445) | "Tudo incluso" e app com a marca do coach já no plano de US$ 59,90 |
| **Harbiz** (Espanha) | Captou US$ 6,3 mi (Octopus Ventures, 2024) | Referência latina: agenda, cobrança recorrente e treino num produto só |

O setor está se consolidando:

| Ano | Comprador | Comprada |
|---|---|---|
| 2020 | ABC | Trainerize |
| 2020 | Xplor | TrueCoach |
| 2023 | Practice Better | That Clean Life |
| 2025 | Daxko | Exercise.com |
| 2026 | Garmin | TrainHeroic |

### 2.2 Brasileiras

| Plataforma | Tração | Pontos fortes | Pontos fracos |
|---|---|---|---|
| **MFIT Personal** (Itajaí-SC, 2018) | 200 a 450 mil personais "já passaram" (números inconsistentes entre fontes); 5 mi de alunos; Play 4,8 (22,8 mil); App Store BR 4,9 (~146 mil); Instagram com 163 mil | 1.800+ vídeos, MFIT IA, 11 protocolos de avaliação, Carteira MFIT (cobrança) | Pix a 2,59%; chat parcial; sem dieta; sem wearable; queixas de instabilidade e de valor retido (Reclame Aqui nota 7,6) |
| **Tecnofit Personal** | Play 4,5 (8,8 mil); a Tecnofit tem 16,5 mil clientes academia e captou R$ 13 mi; Reclame Aqui 8,0 | Grátis até 10 alunos; Pix e boleto a R$ 1,90 fixo; chat; bloqueio automático do inadimplente | Sem dieta, sem app com a marca do personal; suporte fraco |
| **Nexur** | Nexur Fit 4,2 (369); Nexur Trainer 3,4 | A mais completa: cobrança (Pix 0,99%), chat feito para "substituir o WhatsApp", dieta com IA, app com a marca | Tração e avaliações fracas |
| **PersonalGO** | 90 mil+ usuários | Marketplace (aluno encontra personal), body scan por IA, 3.800+ vídeos | Cobrança só como controle, sem processar pagamento |
| **Vedius** | 20 mil+ profissionais (inclui fisioterapeutas) | 12 mil+ vídeos, agenda que confirma pelo WhatsApp, prontuário | Sem cobrança integrada |
| **Treinus** (corrida) | 2 mil+ treinadores, 200 mil+ atletas | Referência em assessoria de corrida | Nicho; adesão de R$ 499,99 |

---

## 3. Preços

### 3.1 Brasil (R$/mês)

| Plataforma | Planos | Taxas de cobrança |
|---|---|---|
| **MFIT Personal** | Grátis (1 aluno) · R$ 10,90 (3) · **R$ 39,90 ilimitado** (anual ≈ R$ 33,91) · app com a marca à parte | Pix 2,59% · boleto R$ 3,90 · cartão 4,99% + R$ 1 |
| **Tecnofit Personal** | Grátis (10 alunos) · Performance ilimitado a partir de R$ 24,90 (no anual; o mensal não foi verificado) | Pix e boleto a R$ 1,90 fixo |
| **Nexur** | R$ 19,90 (9) · R$ 49,90 (25) · R$ 79,90 (50) · R$ 149,90 (100) · R$ 199,90 (150) · R$ 249,90 (250) · app próprio +R$ 789/ano | Pix 0,99% · cartão 4,9% · +R$ 0,70 por transação |
| **Mobitrainer** | R$ 69,90 (30) · R$ 139,90 (100) · R$ 219,90 (300) | parcial (site de vendas) |
| **PersonalGO** | Grátis (com anúncios para o aluno) · PRO R$ 79,90 (R$ 49,90 no anual) | sem processamento |
| **Vedius** | R$ 79,90 ilimitado (anual ≈ R$ 62,49) | sem processamento |
| **TreinoAI** | Grátis (2) · R$ 24,90 (5) … R$ 999,90 (250); o mais caro por aluno | não verificado |
| **MetaFit** | R$ 39 (10) · R$ 79 (50) · R$ 149 (studio) | não verificado |
| **Wiki4Fit** | R$ 19,90 (15) · ≈R$ 53,91 (50) · R$ 149 (100, com app próprio) | pagamento online |
| **Vibe Fit** | Grátis (3) · R$ 1,99/cliente (do 4º ao 10º) · R$ 0,99/cliente (11+) · +R$ 0,59 por dieta | não verificado |
| **Trainer Connect** | Grátis (3) · ≈R$ 99 (≈30 alunos) | Stripe (Pix e cartão) + taxa por venda |
| **Treinus** | R$ 110 (20 atletas) + R$ 4,20 por atleta adicional + adesão R$ 499,99 | boleto e cartão |
| **Mensio** (só cobrança) | a partir de R$ 49,90 | Pix Automático, sem taxa por cobrança |
| **Hotmart / Kiwify** | sem mensalidade | 9,9% + R$ 2,49 / 8,99% + R$ 2,49 |

Fontes principais: [MFIT](https://ajuda.mfitpersonal.com.br/ajuda/professor/assinaturas/quanto-custa-para-assinar-o-app-da-mfit/), [Carteira MFIT](https://blog.mfitpersonal.com.br/carteira-mfit/), [Tecnofit Personal](https://tecnofitpersonal.freshdesk.com/support/solutions/articles/67000738537-conheca-os-planos-do-tecnofit-personal), [taxa Tecnofit](https://tecnofitpersonal.freshdesk.com/support/solutions/articles/67000739168-tem-alguma-taxa-para-cobrar-pelo-app-), [Nexur planos](https://aplicativonexur.com.br/planos/), [Nexur taxas](https://aplicativonexur.com.br/manual-financeiro/), [Mobitrainer](https://mobitrainer.com.br/planos_e_precos), [PersonalGO](https://www.personalgo.com.br/para-personal-trainer/), [Vedius](https://vedius.com.br/precos/), [TreinoAI](https://www.treinoai.com.br/), [MetaFit](https://metafit.app/), [Wiki4Fit](https://wiki4fit.com/), [Vibe Fit](https://appvibefit.com/), [Treinus](https://www.treinus.com.br/investimento/), [Mensio](https://www.mensio.com.br/para/personal-trainer).

**Âncoras de preço no Brasil**

| Faixa | Preço |
|---|---|
| Entrada paga | R$ 10,90 a R$ 24,90 |
| **Ilimitado para personal solo** | **R$ 39,90 a R$ 79,90** |
| 50 alunos | ≈R$ 79 |
| 100 alunos | R$ 139,90 a R$ 149,90 |
| App com a marca do personal | ≈R$ 149/mês ou R$ 789/ano |

### 3.2 Internacional (US$/mês)

| Plataforma | Planos (número de clientes entre parênteses) | Add-ons e taxas |
|---|---|---|
| **Trainerize** | Grátis (1) · $9 (2) · Pro $25 (5) / $50 (15) / $79 (30) / $135 (50) / $225 (100) / $250 (200) · Studio $275–380 · anual −10% | Pagamentos $10 · nutrição $20–45 · vídeo $10 · Business $25 · app próprio $169 (pagamento único) · cartão ~3,15% + 30¢ |
| **Everfit** | Grátis (5) · Pro $19 (5) / $29 (10) / $49 (20) / $95 (50) / $140 (100) / $255 (250) · Studio $105–430 | Pagamentos $9 + 3,15% + $0,30 · automação $29 · plano alimentar $39 · conteúdo sob demanda $25 |
| **TrueCoach** | $29,98 (5) / $69,98 (20) / $164,98 (50) no mensal · $26,34 / $57,99 / $136,99 no anual | **5% por transação**; pagamentos só em EUA, UK, Canadá e Austrália |
| **PT Distinction** | $19,90 (3) / $59,90 (25) / $89,90 (50), com cobrança por cliente extra | Tudo incluso; app com a marca já no plano Pro |
| **My PT Hub** | $25 (3) / $59 (ilimitado) / $215, mas as fontes divergem ($40 / $105 / $329) | App próprio $145; white-label $225/mês |
| **Kahunas** | $35 (25) / $69 (50) / $99 (ilimitado + app próprio) · anual −25% | — |
| **Harbiz** | €19 (5) … €119 (50) / €199 (100) · app próprio ("My APP") €199 | Cobrança recorrente inclusa |
| **CoachRx** | $25 (5) / $67 (50) / $169 (150) / $249+ | Tudo incluso |
| **Hevy Coach** | $25 (10) … $700 (1.000) | Sem pagamentos, nutrição ou check-in |
| **HubFit** | $39 (50) / $69 (100) / $119+ / $469 (white-label) | — |
| **FitBudd** | $15 / $79 / $149 (app próprio) | **Comissão 0%** como argumento de venda |

Fontes principais: [Trainerize](https://www.trainerize.com/pricing/), [taxas Trainerize](https://help.trainerize.com/hc/en-us/articles/360023942192-About-Transactions), [Everfit](https://coachway.io/articles/everfit-pricing/), [TrueCoach](https://truecoach.co/pricing/), [taxa TrueCoach](https://help.truecoach.co/en/articles/3491685-understanding-processing-fees), [PT Distinction](https://coachway.io/articles/pt-distinction-pricing/), [My PT Hub](https://www.mypthub.net/pricing/), [Kahunas](https://coachway.io/articles/kahunas-pricing/), [Harbiz](https://www.harbiz.io/en/pricing), [CoachRx](https://www.capterra.com/p/253158/CoachRx/), [Hevy Coach](https://hevycoach.com/pricing/), [HubFit](https://hubfit.com/pricing), [FitBudd](https://www.fitbudd.com/insights/white-label-fitness-app-pricing-what-you-actually-pay).

**Custo real para 50 clientes com recursos equivalentes (US$/mês)**

| Plataforma | Custo | Composição |
|---|---|---|
| Trainerize | ≈190 | plano + nutrição + pagamentos |
| Everfit | ≈172 | plano + add-ons |
| TrueCoach | 165 | sem nutrição real |
| PT Distinction | 89,90 | tudo incluso |
| Kahunas | 69 | — |
| CoachRx | 67 | — |

A diferença está nos add-ons empilhados, que são a principal reclamação contra as líderes.

---

## 4. Cobertura dos pilares

Legenda: ✅ tem · ◐ parcial · ❌ não tem · ? não verificado

| Plataforma | Cobrança recorrente | Chat no app | Acompanhamento (check-in, fotos, avaliação) | Treino (biblioteca + app do aluno) | Nutrição | App com a marca |
|---|---|---|---|---|---|---|
| Trainerize | ✅ (add-on, Stripe) | ✅ grupo, áudio, vídeo | ✅ + wearables | ✅ 2.400 a 5.000+ vídeos | ✅ (add-on) | ✅ $169 |
| Everfit | ✅ (add-on) | ✅ (grupo só no Studio) | ✅ | ✅ + IA | ✅ (add-on, IA) | ◐ |
| TrueCoach | ◐ (5%, 4 países) | ✅ 1:1 | ✅ + wearables | ✅ 3.000+ vídeos | ❌ | ◐ |
| Kahunas | ? | ✅ | ✅ núcleo do produto | ✅ | ◐ | ✅ $99 |
| **MFIT Personal** | ✅ (Pix 2,59%) | ◐ feedback | ✅ (sem wearable) | ✅ 1.800+ vídeos, IA | ❌ | ✅ (pago) |
| **Tecnofit Personal** | ✅ (R$ 1,90) | ✅ | ✅ | ✅ 600+ exercícios | ❌ | ❌ |
| **Nexur** | ✅ (Pix 0,99%) | ✅ | ✅ | ✅ 900+, IA | ✅ IA | ✅ R$ 789/ano |
| PersonalGO | ◐ controle | ✅ | ✅ body scan | ✅ 3.800+ | ? | ❌ |
| Hotmart + WhatsApp | ✅ (~10%) | WhatsApp | ❌ | PDF ou planilha | ❌ | ❌ |

**O que todo concorrente já tem:**
- biblioteca de exercícios com vídeo;
- app do aluno com registro de carga;
- anamnese e avaliação física;
- plano grátis;
- montagem de treino com IA, que virou item comum em 2026.

**O que ainda diferencia:**
- cobrança integrada com bloqueio automático do inadimplente;
- Pix Automático;
- check-in estruturado;
- wearables;
- app com a marca do personal;
- automação pelo WhatsApp;
- módulo de nutrição para equipes com nutricionista.

---

## 5. Tamanho do mercado no Brasil

**Profissionais**
- O CONFEF fala em **500 mil+ profissionais ativos** ([CONFEF](https://www.confef.org.br/conteudo/656)).
- Blogs citam "≈100 mil atuando como personal". O dado **não foi verificado na fonte primária**.

**Quanto o personal cobra**

| Modalidade | Faixa |
|---|---|
| Consultoria online | R$ 100 a R$ 400 por aluno/mês (a MFIT diz que R$ 300 é a média nacional) |
| Presencial | R$ 600 a R$ 1.800/mês, no pacote de 3 vezes por semana |

**Conta ilustrativa**

| Item | Premissa | Resultado |
|---|---|---|
| Assinatura de software | 100 mil personais × R$ 40–80/mês | **R$ 48 a R$ 96 mi/ano** |
| Dinheiro que passa pela cobrança | 100 mil personais × 20 alunos × R$ 200 | **≈R$ 400 mi/mês** |

**O que isso significa para o modelo de negócio:** o software custa menos de 2% da receita do personal. O custo que ele sente de verdade é a **taxa sobre o recebimento**. Para nós, a cobrança é ao mesmo tempo o maior argumento de venda e a maior fonte de receita.

---

## 6. Lacunas que viram oportunidade

1. **Cobrança e inadimplência (a maior lacuna)**
   - Faltam: taxa baixa e fixa, Pix Automático nativo, régua de cobrança por WhatsApp (D-3, D0, D+3, D+7), bloqueio e desbloqueio automáticos do treino, recebimento sem retenção, contrato digital.
   - Hoje o personal paga 2,59% (MFIT) ou ~10% (Hotmart) e recebe reclamações de dinheiro retido.
2. **Chat ligado ao contexto do aluno**
   - Quem tenta *substituir* o WhatsApp enfrenta resistência (Nexur). Quem *integra* faz só notificação.
   - **Proposta:** chat dentro do app com o treino, o check-in e a cobrança daquele aluno ao lado, e notificações pelo WhatsApp para trazer o aluno de volta ao app.
3. **Check-in semanal estruturado**
   - O que entra: peso, sono, adesão, fotos e medidas, com alerta para o personal.
   - No Brasil quase ninguém faz isso direito. Lá fora é o produto inteiro da Kahunas.
4. **Tudo num lugar só para quem vende consultoria online**
   - Checkout, assinatura, entrega do treino, chat e check-in, por uma taxa muito menor que a da Hotmart.
5. **Estabilidade e suporte**
   - App que cai e treino que não salva são queixas na MFIT; falta de suporte é queixa na Tecnofit.
   - App do personal pensado para o celular, em que responder um check-in leva poucos toques. Isso também é uma lacuna lá fora.
6. **Preço simples, sem add-ons empilhados**, a principal reclamação contra Trainerize e Everfit.
7. **Wearables** (Apple Health e Health Connect). A falta de integração é queixa na MFIT.
8. **Nutrição pelo modelo multiprofissional**
   - Prescrever dieta é atribuição privativa do nutricionista (Lei 8.234/1991; **validar juridicamente**).
   - O caminho é permitir convidar um nutricionista para atender o mesmo aluno, como fazem Vibe Fit e MetaFit.
9. **Os estrangeiros não competem no Brasil**: cobram em dólar, com IOF e sem Pix.

---

## 7. Infraestrutura de cobrança

### 7.1 Gateways comparados

| Gateway | Pix Automático via API | Subconta por personal + split | Pix | Cartão à vista | Mensalidade | Veredito |
|---|---|---|---|---|---|---|
| **Asaas** | ✅ (modo SUBSCRIPTION desde mai/2026, sem custo extra) | ✅ via API, PF e PJ, KYC por link | R$ 1,99 (R$ 0,99 nos 3 primeiros meses) | 2,99% + R$ 0,49 | Não | **Recomendado** |
| Pagar.me | ? | ✅ (marketplace) | 1,19% | 4,39% + R$ 0,99 | Não | Plano B quando houver volume |
| Mercado Pago | ? | ◐ cada personal precisa de conta MP (OAuth) | 0,99% | 3,99% a 4,98% | Não | Assinatura via API sem split |
| Stripe BR | ✅ desde abr/2026 | ◐ Connect com restrições no Brasil | 1,19% | 3,99% + R$ 0,39, mais 0,7% do Billing | Não | Pix por convite |
| Iugu | ◐ sem sandbox | ✅ | 0,99% | 3,34% | R$ 649 (plano com split) | Caro para começar |
| Efí | ✅ R$ 3,50 por Pix | ◐ split só de Pix | 1,19% | ? | ? | Exige certificado mTLS |
| Abacate Pay | ✅ | ❌ | R$ 0,80 | 3,50% + R$ 0,60 | Não | Não tem split |
| Woovi | ✅ (com sandbox) | ◐ saldo virtual (risco regulatório) | ? | não oferece cartão | ? | Só Pix |

Fontes: [Asaas preços](https://www.asaas.com/precos-e-taxas), [Asaas Pix Automático](https://docs.asaas.com/docs/pix-automatico-implementacao), [Asaas subcontas](https://docs.asaas.com/docs/criacao-de-subcontas), [Asaas split](https://docs.asaas.com/docs/split-de-pagamentos), [Asaas régua](https://www.asaas.com/regua-de-cobranca), [Pagar.me](https://www.pagar.me/ofertas), [Stripe BR](https://stripe.com/br/pricing), [Stripe Pix recorrente](https://docs.stripe.com/billing/subscriptions/pix), [Iugu](https://www.iugu.com/planos), [Efí Pix Automático](https://sejaefi.com.br/efi-pay/pix-automatico).

### 7.2 Recomendação para a v1

**Alunos pagando ao personal**
- Asaas, com uma subconta por personal.
- O split leva a comissão do SaaS para a carteira (`walletId`) da conta principal.
- Pix Automático para personal com CNPJ.
- Para personal só com CPF: cartão recorrente ou Pix mensal com régua por WhatsApp. **Hipótese a confirmar:** o recebedor do Pix Automático provavelmente precisa ter CNPJ.

**SaaS cobrando o personal**
- Asaas, na conta principal do SaaS (que é PJ). Fica uma integração só e um único fluxo de webhooks.
- Manter uma camada `PaymentProvider` para poder trocar de gateway depois.

**Régua de cobrança do Asaas**
- e-mail + SMS: R$ 0,99 por cobrança;
- WhatsApp: R$ 0,55 por mensagem.

**Ressalvas a confirmar com o comercial do Asaas**
- taxa por subconta criada;
- se o Pix Automático funciona dentro de subcontas e com split;
- contrato de BaaS/white label adequado à Resolução Conjunta 16/2025 (prazo: 31/12/2026);
- cartão só cai em D+32;
- não há SDK Node oficial.

**Ponto regulatório**
- Com split na conta do personal, **o SaaS nunca fica com dinheiro de terceiros**.
- Isso mantém o SaaS fora do enquadramento de instituição de pagamento. Validar com advogado.

---

## 8. Hipóteses iniciais para o nosso produto (validar na skill)

- **Posicionamento:** "treino, acompanhamento, conversa e cobrança do aluno num app só, com Pix Automático e sem os 10% da Hotmart".
- **Escopo provável da v1:**
  - cadastro do aluno e anamnese;
  - montagem de treino com biblioteca;
  - app do aluno (PWA) com registro de carga;
  - check-in semanal;
  - chat ligado ao contexto do aluno;
  - cobrança recorrente com bloqueio automático;
  - painel financeiro de inadimplência.
- **Preço (hipótese):**
  - grátis até 3 alunos (padrão do mercado);
  - plano único **ilimitado entre R$ 49,90 e R$ 69,90/mês**, dentro da âncora de R$ 39,90 a 79,90;
  - receita adicional com taxa fixa baixa por cobrança paga, ainda bem abaixo dos 2,59% da MFIT e dos ~10% da Hotmart;
  - app com a marca do personal como plano superior (âncora de ≈R$ 149/mês).
- **Fora da v1:** módulo de nutrição (pela questão regulatória), wearables e marketplace. Entram como diferenciais na v2.

---

## 9. Limitações

- Preços coletados a partir dos trechos das páginas oficiais exibidos pelo buscador, porque o acesso direto foi bloqueado pelo proxy. **Confirmar os principais antes de definir nosso preço.**
- PagBank e Vindi ficaram sem verificação.
- Números de tração são, na maioria, declarados pelos próprios fornecedores. Os da MFIT são cumulativos e inconsistentes entre si.
- Não há dado nacional confiável sobre quantos personais atendem online, nem sobre a média de alunos por personal.
