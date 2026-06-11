# CLAUDE.md — Hardware Sale

Loja de hardware / PC building em Moçambique (preços em MZN/MT, contacto WhatsApp
+258 86 202 6545). SPA React no Vercel + Firebase como backend, com funções
serverless para tudo o que precisa de privilégio ou de segredos.

> Idioma do produto e da comunicação com o utilizador: **Português (pt-PT/MZ)**.
> Comentários de código e identificadores: inglês.

---

## Stack

- **Frontend:** React 19, Vite 6, TypeScript ~5.8 (strict), Tailwind 4 (`@tailwindcss/vite`).
- **Routing:** react-router-dom 7. Páginas carregadas via `lazy()` + `Suspense`.
- **Estado:** Zustand (`src/store/`). Sem Redux.
- **Animação/3D:** GSAP + `@gsap/react`, Three.js (`@react-three/fiber`, `drei`,
  `postprocessing`), `@google/model-viewer` (GLB de produtos), Lenis (smooth scroll),
  `motion`.
- **Backend:** Firebase — Auth, Firestore, Storage. Cliente SDK no browser
  (`firebase`), Admin SDK (`firebase-admin`) só nas funções serverless.
- **Serverless:** funções em `api/*.ts`, deployadas pelo Vercel (Node 24, ESM nativo).
- **IA:** Vertex AI via `@google/genai`, sempre por trás de `api/ai-proxy.ts`
  (a chave nunca vai ao browser).
- **Testes:** Vitest (lógica pura). Lint = `tsc --noEmit`.

### Comandos
```bash
npm run dev      # vite na :3000
npm run build    # vite build
npm run lint     # tsc --noEmit  (gate de tipos)
npm run test     # vitest run
```
Antes de dar trabalho por concluído: `npm run lint`, `npm run test`, `npm run build`
devem passar os três.

---

## Estrutura

```
api/                    Funções serverless (Vercel)
  _firebaseAdmin.ts     Init Admin SDK: adminDb(), adminAuth(), requireAdmin(req), FieldValue, Timestamp
  _orderMath.ts(+.test) Matemática de encomendas pura e testada (preço, subtotal, cupão, envio, total)
  _security.ts          Helpers de segurança partilhados
  create-order.ts       Criação de encomenda SERVER-AUTHORITATIVE (recalcula tudo numa transação)
  payment-callback.ts   Liquidação de pagamento (idempotente, dá XP/stock)
  mpesa-push.ts         Push de pagamento MPesa/Vodacom (lê total do servidor)
  emola-push.ts         Push de pagamento e-Mola (lê total do servidor)
  ai-proxy.ts           Proxy Vertex AI (contents com role:'user')
  geocode.ts places.ts  Google Maps geocoding/places
  generate-media.ts     MOCK — devolve fotos de stock (Imagen/Veo real por fazer)
  affiliate-stats.ts    Agregados de referência (sem PII)
  security-health.ts    Estado de config do backend (token-gated)
src/
  pages/                Home, Products, Builder, Checkout, Upgrade, BuildOfTheMonth, ClientHub
  pages/AdminDashboard  Shell do painel admin (rota /console)
  pages/admin/          As 5 features: OrdersPipeline, BIDashboard, Inventory, AuditSecurity, CRM
  components/           Layout, AmaniChat, SmartBuilder, CheckoutModal, Hero3D, BentoGrid, ui/
  hooks/                useClientProfile, useCoupons, usePCBuilder
  lib/                  firebase, ai, analytics, aiTracking, audit, adminFormat, assets, utils
  store/                useStore (produtos), useCart
firestore.rules / storage.rules / firebase.json   Config e regras Firebase
firebase-applet-config.json                        Config do cliente Firebase (importado em lib/firebase.ts)
scripts/grant-admin.mjs                            Concede claim admin:true a uma conta
```

---

## Decisões de arquitetura (porquê, não só o quê)

1. **O servidor é a fonte da verdade do dinheiro.** O cliente NUNCA decide o total.
   `Checkout.tsx` chama `POST /api/create-order` que lê os preços reais dos produtos,
   revalida o cupão e recalcula envio/total numa transação Firestore. Os gateways
   (`mpesa-push`/`emola-push`) leem o `total` do doc `checkouts`, ignoram qualquer
   `amount` vindo do cliente. Toda a aritmética vive em `_orderMath.ts` e é testada.

2. **Admin SDK contorna as regras; o browser não.** Escritas privilegiadas
   (liquidar pagamento, dar XP, decrementar stock) só acontecem em funções
   serverless via `firebase-admin` com service account. As `firestore.rules` estão
   trancadas: `client_profiles` não é listável pelo público, campos financeiros e XP
   não são escrevíveis pelo cliente.

3. **Pagamentos são idempotentes.** `payment-callback` usa um campo `rewardedAt` para
   nunca aplicar recompensas duas vezes. Transações = todas as leituras antes de
   todas as escritas (regra do Firestore). Stock só decrementa se `stockQty` for
   numérico (produtos "tracked").

4. **Admin camuflado + defesa em profundidade.** O painel vive só em `/console`
   (não em `/admin`). Qualquer rota desconhecida → redirect para `/`. Isto é
   camuflagem; o cadeado real é **Firebase Auth + custom claim `admin:true`**.
   `AdminDashboard` faz early-return se `!isAdminUser` e mostra ecrã de "sem
   permissões" a contas autenticadas sem claim.

5. **Segredos só no servidor.** Chaves de IA/Maps/service account são env vars na
   Vercel, nunca no bundle. O browser fala com `api/*`, não com Vertex/Maps direto.
   CSP apertada em `vercel.json` (`script-src 'self'`, `object-src 'none'`, etc.).

6. **ESM nativo nas funções.** `package.json` tem `"type": "module"` e o runtime é
   Node 24 → **imports relativos nas funções `api/*` PRECISAM da extensão `.js`**
   (`import { x } from './_orderMath.js'`). Sem isto: `FUNCTION_INVOCATION_FAILED`
   em runtime (o `tsc`/build não apanha). Os testes `.test.ts` importam sem `.js`.

7. **Vertex via chave Express ("AQ.A…").** `ai-proxy` usa modo `vertexai`
   (project + location), envia `contents: [{ role: 'user', parts }]` — sem o `role`
   o Vertex dá 400. Modelo default `gemini-3.1-pro-preview`.

---

## Modelo de dados (Firestore)

- `products` — catálogo. `stockQty` numérico → produto "tracked" (stock gerido).
- `checkouts` — encomendas. `status` (`pendente`→`pago`…), `total` autoritativo do
  servidor, `rewardedAt` (idempotência).
- `client_profiles` — perfil/gamificação do cliente (xp, totalSpent, purchaseCount).
  Leitura pública bloqueada; escrita de campos financeiros/XP só via Admin SDK.
- `coupons` — cupões (consumo race-safe na transação de create-order).
- `analytics_events` — eventos de analytics (exige auth).
- `admin_audit` — trilho de auditoria (ver `lib/audit.ts` para as ações tipadas).
- `admin_settings` (doc) — definições do painel.

Auth: clientes entram **anónimos**; admins por **email + claim `admin:true`**.

---

## Convenções de código

- TypeScript strict. Evitar `any` novo; preferir tipos explícitos.
- Componentes em PascalCase, exportados nomeados (ex.: `export function Home()`).
  Páginas são lazy-loaded em `App.tsx`.
- Helpers de formatação admin em `lib/adminFormat.ts` (`formatMT`, `timeAgo`,
  `whatsappLink`, etc.) — reutilizar, não reescrever.
- Toda a lógica de dinheiro nova → `_orderMath.ts` + teste em `_orderMath.test.ts`.
- Uploads de imagem → `uploadImageWithFallback(dataUrl, folder)` em `lib/firebase.ts`
  (Storage com fallback base64).
- Ações admin sensíveis → registar via `lib/audit.ts`.
- Tema visual: cyberpunk/neon (`brand-neon` verde, `brand-magenta`), fundo escuro.

---

## Estado atual (2026-06-11)

**Em produção e verificado:**
- ✅ Fixes críticos de segurança/pagamentos/lógica (totais autoritativos,
  pagamentos idempotentes, regras Firestore + Storage deployadas).
- ✅ Bug ESM `.js` corrigido — todas as funções `api/*` vivas.
- ✅ IA a funcionar (AmaniChat, autocomplete, insights BI/CRM) via `ai-proxy`.
- ✅ Google Maps (geocode/places) a funcionar.
- ✅ 5 features admin: OrdersPipeline · BIDashboard · Inventory · AuditSecurity · CRM.
- ✅ Login admin destrancado; claims concedidos às 3 contas oficiais.
- ✅ Número real da loja em todo o lado. BOM com upload direto de foto.
- ✅ Env vars na Vercel: FIREBASE_SERVICE_ACCOUNT, VERTEX_API_KEY,
  VERTEX_PROJECT_ID, VERTEX_LOCATION, GOOGLE_MAPS_API_KEY.

**Pendente (lado do utilizador / futuro):**
- ⏳ **Pagamentos:** à espera da parceria Vodacom/e-Mola. Depois: registar o
  callback URL nos portais (+ opcional `PAYMENT_CALLBACK_SECRET`, tem de bater
  com `?secret=` configurado no portal).
- ⏳ `api/generate-media.ts` ainda é MOCK — geração real Imagen/Veo por fazer.
- ⏳ Wiring opcional do contacto da loja a `admin_settings` (agora hardcoded).

---

## Notas operacionais

- **Deploy de regras Firebase** (não exige login interativo):
  ```bash
  GOOGLE_APPLICATION_CREDENTIALS=$PWD/serviceAccount.json \
    firebase deploy --only firestore:rules,storage --project hardware-sale --non-interactive
  ```
  (`serviceAccount.json` é gitignored — nunca commitar.)
- **Conceder admin:** `scripts/grant-admin.mjs` com `GOOGLE_APPLICATION_CREDENTIALS`.
  Só conceder a emails que o utilizador especifique explicitamente.
- **Segredos:** nunca imprimir/listar valores de env vars de produção; passar
  segredos por ficheiro/stdin, nunca em texto na conversa.
- Documentação extra do projeto em `DOCUMENTACAO.md`.
