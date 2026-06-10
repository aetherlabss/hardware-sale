# Hardware Sale — Admin God-Level + Hardening (Design)

**Data:** 2026-06-11
**Autor:** Claude (Opus 4.8) + Gabriel
**Estado:** Em revisão

## 1. Objetivo

Levar a Hardware Sale a "god-level": eliminar bugs e vulnerabilidades reais
(começando pelo que está a partir pagamentos em produção), reforçar a lógica de
negócio (totais à prova de manipulação, recompensas, cupões), e construir 5
features de admin de alto impacto com UX/mobile/acessibilidade de topo.

Sequência aprovada: **Fase 1 (fixes críticos) → Fase 2 (5 features) → Fase 3 (polish)**.
Cada fase tem de ser verificável de forma independente (`tsc --noEmit`, `vite build`,
e verificação manual onde aplicável).

## 2. Contexto técnico

- React 19 + Vite 6 + TypeScript + Tailwind 4, deploy na Vercel.
- Firebase: Auth (anónimo p/ clientes, email+claim `admin:true` p/ admins),
  Firestore (rules trancadas em `firestore.rules`).
- Endpoints serverless em `api/*.ts` (MPesa/eMola push, payment-callback,
  ai-proxy, generate-media, geocode/places). Gate de origem + rate-limit em
  `api/_security.ts`.
- Admin numa SPA gigante: `src/pages/AdminDashboard.tsx` (~2875 linhas, 13 tabs).
- Sem framework de testes instalado. Verificação = typecheck + build + manual.

## 3. Princípios de arquitetura

1. **Servidor é a fonte de verdade para dinheiro e recompensas.** Cliente nunca
   decide quanto paga nem quanto XP/saldo ganha. Recalcular no backend.
2. **`firebase-admin` com service account** para todas as escritas privilegiadas
   server-side (callback de pagamento, criação autoritativa de encomenda). Mover
   `firebase-admin` para `dependencies` (runtime na Vercel).
3. **Decompor o monólito do admin.** Extrair cada tab/feature para
   `src/pages/admin/<Feature>.tsx` + hooks em `src/hooks/admin/`. O
   `AdminDashboard.tsx` passa a shell (auth, layout, routing de tabs). Isto torna
   o código revisável e cada unidade testável/legível isoladamente.
4. **Mobile-first e acessível** em tudo o que for novo ou tocado: targets ≥44px,
   foco visível, labels/aria, sem overflow horizontal, estados loading/erro/vazio.

## 4. Fase 1 — Fixes críticos (segurança, dinheiro, bugs)

### 4.1 Pagamentos partidos (CRÍTICO)
- **Problema:** `api/payment-callback.ts` escreve via REST API só com a chave
  pública → não autenticado → negado pelas rules (`checkouts.update` exige
  `isAdmin()`; `client_profiles` bloqueia `totalSpent`). Encomendas nunca passam
  a "pago"; recompensas nunca aplicadas.
- **Fix:** Reescrever o callback (e a recompensa) com `firebase-admin` +
  service account (env `FIREBASE_SERVICE_ACCOUNT` em JSON base64 ou
  `GOOGLE_APPLICATION_CREDENTIALS`). Admin SDK ignora rules → escritas voltam a
  funcionar. Atualizar comentário "rules are open" (falso).
- **Idempotência:** marcar `rewardedAt` na MESMA transação/escrita condicional
  que aplica a recompensa (evitar duplo-reward em callbacks concorrentes).
  Usar uma transação do Admin SDK: ler checkout → se `!rewardedAt` então
  aplicar incrementos no perfil + set `rewardedAt` atomicamente.
- **Fix menor:** parse de `total` no Firestore REST (precedência `??` vs `?:`).

### 4.2 Total da encomenda à prova de manipulação (CRÍTICO — financeiro)
- **Problema:** cliente escreve `total` no checkout e envia `amount` ao gateway;
  rules só validam `total >= 0`. Dá para pagar 1 MT por um build caro.
- **Fix:** Novo endpoint `api/create-order.ts` (server-authoritative):
  recebe `{ items: [{id, qty}], couponCode?, shipping?, customer }`, lê os
  preços REAIS dos produtos via Admin SDK, revalida o cupão (server-side),
  recalcula `subtotal/desconto/envio/total`, grava o checkout (com Admin SDK,
  estado inicial `pendente`) e devolve `{ orderId, total }`. Os endpoints
  `mpesa-push`/`emola-push` passam a aceitar `orderId` e a usar o `total`
  gravado no doc (lido server-side), **ignorando** qualquer `amount` do cliente.
- **Rules:** `checkouts.create` deixa de ser feito pelo cliente (passa a
  Admin SDK), ou mantém-se mas o total deixa de ser confiável (o gateway usa o
  valor server-side de qualquer forma). Decisão: cliente continua a poder criar
  o doc para histórico imediato, mas **o valor cobrado vem sempre do servidor**.

### 4.3 Dashboard vazio no 1º login (bug de lógica)
- **Problema:** listener em `AdminDashboard.tsx:472` depende de `[user]` mas faz
  early-return enquanto `isAdminUser` é `false` (claim chega assíncrono) e nunca
  re-corre.
- **Fix:** adicionar `isAdminUser` às deps do `useEffect` (e do efeito de
  settings). Confirmar cleanup correto dos `onSnapshot`.

### 4.4 PII + XP (segurança)
- **`client_profiles` `read: if true`:** restringir. Leitura do próprio perfil
  por `sessionId`; agregados de afiliado movidos para cálculo server-side
  (ou expor só campos não-sensíveis). Admin lê tudo.
- **`xp` falsificável:** remover escrita livre de `xp` pelo cliente. Check-in
  diário passa a endpoint server-side com cap real (ou rule que só permite
  incremento dentro do cap). Recompensas de compra já vão pelo callback.

### 4.5 Abuso de cupões
- Validação + aplicação de cupão **server-side** dentro do `create-order`
  (decrementa/consome atomicamente, valida `maxUses`/`maxPerUser`/janela/min).
- Identificar utilizador por algo mais estável que localStorage (UID anónimo do
  Firebase Auth, que persiste melhor) para `maxPerUser`.
- `coupons.get: if true` → manter para lookup por código exato, mas não expor
  `usedBy` ao cliente (a validação real é server-side).

### 4.6 Menores
- Imagens base64 no Firestore aproximam-se do limite de 1MB/doc → migrar upload
  de imagens de produto para Firebase Storage (URL em vez de base64). (Se for
  grande demais p/ Fase 1, fica em Fase 3, mas o risco fica documentado.)
- Studio: fallback silencioso p/ imagem/vídeo falsos em erro → mostrar erro real.
- `analytics_events.create` sem auth → exigir `request.auth != null` (UID anónimo
  já existe sempre) e validar shape.

## 5. Fase 2 — 5 features god-level

Cada feature: ecrã próprio em `src/pages/admin/`, hook de dados em
`src/hooks/admin/`, responsivo e acessível.

### 5.1 Pipeline de Encomendas (Kanban)
- Colunas: Pendente → Pago → A preparar → Enviado → Entregue (+ Cancelado).
- Arrastar para mudar estado (desktop) / dropdown de estado (mobile).
- Cada cartão: cliente, total, método pagto, itens, data.
- Gravar `statusHistory: [{status, at, by}]` no checkout (auditável).
- Ação "Avisar cliente" via link `wa.me` pré-preenchido com estado/encomenda.
- Filtros por estado/período; pesquisa por nome/telefone/orderId.
- Marca automática de "Pago" quando o callback confirma (integra com 4.1).

### 5.2 Dashboard BI ao vivo (melhorado)
- KPIs REAIS calculados a partir de `checkouts` + `analytics_events`:
  receita hoje / 7d / 30d, nº de encomendas, ticket médio (AOV), taxa de
  conversão (eventos view→checkout→pago), receita pendente.
- Gráfico de receita (série temporal) e top produtos por receita/unidades.
- Alertas: stock baixo/esgotado (liga ao Inventário), encomendas pendentes há
  >24h, cupões a expirar.
- "Resumo executivo" gerado por IA (via `ai-proxy`) a partir dos KPIs reais.
- Substitui dados mock atuais por cálculo real; memoização p/ performance.

### 5.3 Inventário & Stock Intelligence
- Adicionar `stockQty` (número) ao modelo de produto (migração suave: ausente =
  ilimitado/legacy; UI permite definir).
- Vista de inventário: filtro por categoria, ordenar por stock, badges
  baixo/esgotado, valor total de inventário.
- Edição em massa (preço %/fixo, stock, status) com confirmação + audit log.
- Deteção de dead-stock (sem vendas em N dias via analytics/checkouts).
- Export CSV (e import opcional). Decremento de stock no `create-order` quando
  a encomenda é paga (server-side, atómico).

### 5.4 Centro de Auditoria & Segurança
- Visualizador de `admin_audit` (já é escrito por `src/lib/audit.ts`, sem ecrã):
  tabela filtrável por ação/admin/data, detalhe expandível do `data`.
- Painel "Saúde de Segurança": checklist do estado real (callback secret
  configurado? Upstash ativo? service account presente? rules trancadas?).
- Monitorização de logins admin (registar `admin.login`/`admin.logout` no audit)
  e destaque de atividade fora do normal.
- (Sem gestão de papéis complexa nesta fase — só leitura/observabilidade +
  os eventos de login.)

### 5.5 CRM 360 do Cliente
- Vista por cliente (a partir de `client_profiles` + `checkouts` agregados):
  LTV (totalSpent), nº compras, XP/nível, última atividade, cupões usados.
- Segmentação: VIP (LTV alto), Em-risco (sem compra há N dias), Novo, Afiliado.
- Targeting: botão WhatsApp por cliente; gerar cupão dirigido a um segmento.
- Insight por IA do segmento (via `ai-proxy`).
- Respeita 4.4: leitura de PII só para admin (via Admin SDK ou rule de admin).

## 6. Fase 3 — Polish UX / mobile / acessibilidade

- Refactor do `AdminDashboard.tsx` para shell + componentes por tab (reduz risco
  e melhora manutenção; feito incrementalmente à medida que cada feature entra).
- Sidebar/topbar mobile: drawer acessível (focus trap, ESC, aria), sem scroll
  horizontal em nenhuma tab.
- Estados consistentes: loading (skeletons), erro (com retry), vazio (com CTA).
- Toasts de feedback acessíveis (`role="status"`/`aria-live`).
- Foco visível, labels em todos os inputs, contraste AA, targets ≥44px.
- Confirmações destrutivas com modal acessível (substituir `window.confirm`).

## 7. Modelo de dados (adições)

- `checkouts`: `statusHistory[]`, `rewardedAt` (já existe), `status` enum
  consistente (`pendente|pago|a_preparar|enviado|entregue|cancelado`).
- `products`: `stockQty?` (number), `soldCount?` (number, incrementado server-side).
- `admin_audit`: adicionar ações `admin.login`, `admin.logout`, `order.status`,
  `inventory.bulk`, `coupon.target`.
- Novos índices Firestore conforme necessário (queries de pipeline/CRM).

## 8. Segurança — alterações a `firestore.rules`

- `client_profiles`: `read` restrito (próprio + admin); `xp`/níveis não
  livremente escritos pelo cliente.
- `checkouts`: total cobrado não confia no cliente (servidor manda).
- `analytics_events`: exigir `request.auth != null`.
- Manter deny-all no fim. Validar cada alteração com o emulador/rules test se
  disponível, senão revisão manual cuidada (as rules são a última linha de defesa).

## 9. Verificação

- `npm run lint` (`tsc --noEmit`) sem erros novos.
- `npm run build` (vite) com sucesso.
- Manual: login admin, ver dados a carregar; criar/editar/apagar produto;
  fluxo de checkout com total recalculado; simular callback (script) e confirmar
  encomenda→pago + recompensa aplicada uma única vez; cada feature nova nos
  breakpoints mobile/desktop.
- Endpoints: testar `create-order` e callback com payloads de exemplo.

## 10. Riscos / fora de âmbito

- **Service account:** requer `FIREBASE_SERVICE_ACCOUNT` na Vercel; sem isto o
  callback continua partido. Documentar no `.env.example`.
- Migração de imagens base64→Storage pode ficar para Fase 3 se pesar demais.
- Sem alteração ao fluxo real dos gateways (MPesa/eMola) além do `amount`
  server-side — não temos credenciais reais para testar ponta-a-ponta aqui.
- Refactor total do monólito é incremental, não um big-bang (reduz risco).
