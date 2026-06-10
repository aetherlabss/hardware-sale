# Admin God-Level + Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Eliminar bugs/vulnerabilidades críticas (pagamentos, totais, PII) e
construir 5 features god-level de admin com UX/mobile/a11y de topo.

**Architecture:** Servidor é fonte de verdade para dinheiro/recompensas via
`firebase-admin` (service account). Admin monólito decomposto incrementalmente em
`src/pages/admin/*` + `src/hooks/admin/*`. Rotas: `/console` canónico, `/admin`→home.

**Tech Stack:** React 19, Vite 6, TS, Tailwind 4, Firebase (Auth/Firestore),
firebase-admin (serverless), Vercel. Testes pontuais: vitest (lógica pura).

**Verificação real deste projeto:** `npm run lint` (= `tsc --noEmit`) e `npm run build`.
Sem framework de testes pré-existente; vitest adicionado só para lógica de dinheiro.

---

## File map (criar / modificar)

**Fase 1 — fixes:**
- Create `api/_firebaseAdmin.ts` — init partilhado do Admin SDK (service account).
- Create `api/_orderMath.ts` — funções puras: `computeOrderTotal`, `validateCouponServer` (testável).
- Create `api/_orderMath.test.ts` — vitest para `_orderMath`.
- Create `api/create-order.ts` — criação autoritativa de encomenda (server total).
- Modify `api/payment-callback.ts` — usar Admin SDK + idempotência transacional + decremento de stock.
- Modify `api/mpesa-push.ts`, `api/emola-push.ts` — ler total/telefone do doc (Admin), ignorar amount do cliente.
- Modify `firestore.rules` — restringir `client_profiles.read`, bloquear `xp` livre, `analytics_events` exigir auth.
- Modify `src/pages/AdminDashboard.tsx` — `isAdminUser` nas deps dos efeitos (race do 1º login).
- Modify `src/pages/Checkout.tsx` — chamar `create-order`, parar de confiar no total local.
- Modify `src/App.tsx` — `/console` único; `/admin` + catch-all → home.
- Modify `.env.example` — documentar `FIREBASE_SERVICE_ACCOUNT`, `PAYMENT_CALLBACK_SECRET`.
- Modify `package.json` — `firebase-admin` p/ dependencies; add `vitest`, script `test`.

**Fase 2 — features (cada uma: page + hook):**
- `src/hooks/admin/useOrders.ts` + Pipeline em `src/pages/admin/OrdersPipeline.tsx`
- `src/hooks/admin/useBI.ts` + `src/pages/admin/BIDashboard.tsx`
- `src/hooks/admin/useInventory.ts` + `src/pages/admin/Inventory.tsx`
- `src/hooks/admin/useAudit.ts` + `src/pages/admin/AuditSecurity.tsx`
- `src/hooks/admin/useCRM.ts` + `src/pages/admin/CRM.tsx`
- Modify `AdminDashboard.tsx` — montar as novas tabs (shell).

**Fase 3 — polish:**
- `src/components/admin/*` (AdminShell, Toast, ConfirmDialog, EmptyState, Skeleton).
- Refactor incremental do shell; mobile drawer acessível.

---

## FASE 1 — Fixes críticos

### Task 1: Dependências e ferramentas
**Files:** Modify `package.json`

- [ ] Mover `firebase-admin` de devDependencies → dependencies (runtime serverless na Vercel).
- [ ] Adicionar `vitest` a devDependencies e script `"test": "vitest run"`.
- [ ] Run: `npm install` → sucesso.
- [ ] Commit: `chore: firebase-admin runtime dep + vitest`.

### Task 2: Admin SDK init partilhado
**Files:** Create `api/_firebaseAdmin.ts`

- [ ] Implementar init idempotente lendo `FIREBASE_SERVICE_ACCOUNT` (JSON base64) ou
      `GOOGLE_APPLICATION_CREDENTIALS`; exportar `adminDb()` (Firestore) e `FieldValue`.
- [ ] Lançar erro claro se nenhuma credencial presente.
- [ ] Run: `npm run lint` → sem erros.
- [ ] Commit: `feat(api): shared firebase-admin init`.

### Task 3: Lógica pura de totais + cupão (TDD)
**Files:** Create `api/_orderMath.ts`, `api/_orderMath.test.ts`

- [ ] **Test first:** `computeOrderTotal({items, products, coupon, shipping})` →
      subtotal = Σ price*qty (usa preço REAL do produto, ignora preço do cliente);
      aplica desconto de produto e de cupão; soma envio; total ≥ 0.
- [ ] **Test:** `validateCouponServer(coupon, {now, userKey, subtotal})` cobre
      inactivo/expirado/maxUses/maxPerUser/minOrder.
- [ ] Run: `npx vitest run api/_orderMath.test.ts` → FAIL (não implementado).
- [ ] Implementar `_orderMath.ts` minimal para passar.
- [ ] Run: `npx vitest run api/_orderMath.test.ts` → PASS.
- [ ] Commit: `feat(api): server-authoritative order math (tested)`.

### Task 4: Endpoint create-order
**Files:** Create `api/create-order.ts`

- [ ] Gate browser (origin + rate-limit). Validar body shape.
- [ ] Ler produtos por id (Admin), revalidar stock (se `stockQty` definido), revalidar
      cupão server-side, computar total com `_orderMath`, gravar checkout (`status: pendente`,
      `paymentStatus: pending`, items snapshot, sessionId, userId, total server-side, createdAt).
- [ ] Devolver `{ orderId, total, breakdown }`.
- [ ] Run: `npm run lint` → ok.
- [ ] Commit: `feat(api): authoritative create-order endpoint`.

### Task 5: Payment callback com Admin SDK + idempotência + stock
**Files:** Modify `api/payment-callback.ts`

- [ ] Substituir REST por Admin SDK. Transação: ler checkout; se sucesso e `!rewardedAt`,
      aplicar incrementos no perfil (xp/totalSpent/purchaseCount), set `rewardedAt`,
      atualizar `status/paymentStatus/transactionId`, decrementar `stockQty` e `soldCount`
      dos itens — tudo atómico.
- [ ] Corrigir parse e remover comentário "rules are open".
- [ ] Run: `npm run lint` → ok.
- [ ] Commit: `fix(api): payment callback via admin SDK, idempotent rewards + stock`.

### Task 6: Push endpoints usam total do servidor
**Files:** Modify `api/mpesa-push.ts`, `api/emola-push.ts`

- [ ] Aceitar `{ orderId, phone }`; ler `total` do checkout via Admin; usar esse valor
      como amount. Ignorar `amount` do cliente. Manter validações de phone/orderId.
- [ ] Run: `npm run lint` → ok.
- [ ] Commit: `fix(api): charge server-side order total, not client amount`.

### Task 7: Firestore rules hardening
**Files:** Modify `firestore.rules`

- [ ] `client_profiles.read`: próprio (por sessionId via auth) + admin; não público.
- [ ] Bloquear escrita livre de `xp`/níveis pelo cliente (check-in passa a server ou rule capada).
- [ ] `analytics_events.create`: exigir `request.auth != null` + shape.
- [ ] Manter deny-all final. Documentar no spec que deploy é manual (sem CLI local).
- [ ] Run: revisão manual cuidada (sem emulador local).
- [ ] Commit: `security: tighten client_profiles read/xp and analytics rules`.

### Task 8: Bug do dashboard vazio + checkout client
**Files:** Modify `src/pages/AdminDashboard.tsx`, `src/pages/Checkout.tsx`

- [ ] Adicionar `isAdminUser` às deps dos `useEffect` de dados/settings.
- [ ] Checkout: criar encomenda via `create-order`; usar `orderId`/`total` retornados;
      remover confiança no total local para o pagamento.
- [ ] Run: `npm run lint` + `npm run build` → ok.
- [ ] Commit: `fix: admin data race on first login; checkout uses server order`.

### Task 9: Rotas admin camufladas
**Files:** Modify `src/App.tsx`

- [ ] `/console` única rota de admin; `/admin` e catch-all `*` → `<Navigate to="/" />`.
- [ ] Run: `npm run build` → ok.
- [ ] Commit: `security: camouflage admin route (/console only)`.

---

## FASE 2 — 5 Features god-level

Cada feature segue o mesmo ritmo: hook de dados → componente da page → montar tab no
shell → `npm run build` → commit. Responsiva e acessível desde o início.

### Task 10: Pipeline de Encomendas (Kanban)
- [ ] `useOrders.ts`: subscrever checkouts, agrupar por `status`, ação `setStatus`
      (escreve `status` + append `statusHistory` + audit `order.status`).
- [ ] `OrdersPipeline.tsx`: colunas Pendente→Pago→A preparar→Enviado→Entregue(+Cancelado);
      drag desktop, dropdown mobile; cartão com cliente/total/itens; botão WhatsApp `wa.me`.
- [ ] Filtros por estado/período + pesquisa.
- [ ] Montar tab; `npm run build`; commit.

### Task 11: Dashboard BI ao vivo
- [ ] `useBI.ts`: derivar de checkouts+analytics: receita hoje/7d/30d, nº encomendas,
      AOV, conversão (view→checkout→pago), receita pendente, top produtos, série temporal.
- [ ] `BIDashboard.tsx`: cards KPI, gráfico de receita (SVG/canvas leve), top produtos,
      alertas (stock baixo, pendentes >24h, cupões a expirar), resumo IA via `ai-proxy`.
- [ ] Substituir dados mock; memoizar. Montar tab; build; commit.

### Task 12: Inventário & Stock
- [ ] Modelo: `stockQty?`, `soldCount?` no produto (UI define; ausente = legacy/ilimitado).
- [ ] `useInventory.ts`: lista com stock, valor de inventário, dead-stock (sem vendas N dias).
- [ ] `Inventory.tsx`: filtros, badges baixo/esgotado, edição em massa (preço/stock/status,
      com ConfirmDialog + audit `inventory.bulk`), export CSV.
- [ ] Montar tab; build; commit.

### Task 13: Centro de Auditoria & Segurança
- [ ] Eventos `admin.login`/`admin.logout` no `src/lib/audit.ts` + nos handlers de login/logout.
- [ ] `useAudit.ts`: subscrever `admin_audit`, filtros por ação/admin/data.
- [ ] `AuditSecurity.tsx`: tabela filtrável + detalhe; painel "Saúde de Segurança"
      (callback secret? upstash? service account? rules trancadas?) com estado real onde detetável.
- [ ] Montar tab; build; commit.

### Task 14: CRM 360
- [ ] `useCRM.ts`: agregar `client_profiles` + checkouts → LTV, nº compras, nível, última
      atividade; segmentos VIP/Em-risco/Novo/Afiliado. (Leitura PII só admin — via Fase 1.)
- [ ] `CRM.tsx`: lista/segmentos, perfil 360 por cliente, botão WhatsApp, gerar cupão
      dirigido (audit `coupon.target`), insight IA do segmento.
- [ ] Montar tab; build; commit.

---

## FASE 3 — Polish UX / mobile / a11y

### Task 15: Componentes base do admin
- [ ] `Toast` (`role=status`/`aria-live`), `ConfirmDialog` (modal acessível, substitui
      `window.confirm`), `EmptyState`, `Skeleton`. Aplicar nos fluxos novos.
- [ ] build; commit.

### Task 16: Shell mobile acessível + estados
- [ ] Drawer da sidebar com focus-trap/ESC/aria; sem overflow horizontal em nenhuma tab;
      foco visível; labels em inputs; targets ≥44px; loading/erro/vazio consistentes.
- [ ] build; commit.

### Task 17: Imagens base64 → Firebase Storage (se não feito antes)
- [ ] Upload de imagem de produto para Storage; guardar URL em vez de base64
      (evita limite de 1MB/doc). Manter retro-compat com base64 existente.
- [ ] build; commit.

### Task 18: Verificação final
- [ ] `npm run lint` limpo, `npm run build` ok.
- [ ] Walkthrough manual: login admin, dados carregam; CRUD produto; checkout com total
      server-side; cada tab nova em mobile/desktop.
- [ ] Atualizar `DOCUMENTACAO.md` + `.env.example`. Commit final.

---

## Passos manuais do Gabriel (fora do código)
1. Firebase Console → Service accounts → gerar private key → pôr na Vercel como
   `FIREBASE_SERVICE_ACCOUNT` (JSON em base64).
2. Deploy das `firestore.rules` (firebase CLI — não está instalado localmente; posso
   instalar `firebase-tools` se quiseres).
3. Confirmar `PAYMENT_CALLBACK_SECRET` e (opcional) Upstash na Vercel.
