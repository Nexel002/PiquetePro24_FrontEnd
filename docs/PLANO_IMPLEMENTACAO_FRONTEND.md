# Plano de Implementação — PiquetePro24 Frontend (PWA)

Baseado no [TRD v1.1](./TRD_v1.1_Marketplace_Servicos_Locais_PWA.md), incluindo o Adendo v1.2. Este repositório cobre a PWA (React + Vite + Tailwind CSS + Framer Motion), alojada na Vercel, consumindo a API do repositório [PiquetePro24_Backend](https://github.com/Nexel002/PiquePro24_Backend). O plano está dividido em 7 fases sequenciais, espelhando as fases do backend para permitir avanço paralelo e integração contínua entre os dois repositórios.

---

## Fase 0 — Fundação do Projeto & Setup da PWA

**Objetivo:** Preparar o esqueleto da aplicação React, ferramentas de build e configuração PWA base, sem ainda implementar telas de negócio.

**Escopo:**
- Inicializar projeto com Vite (template `react-ts`) + Tailwind CSS + Framer Motion. Decisões de stack fixadas no [CLAUDE.md](../CLAUDE.md), Secção 1.
- Configurar `vite-plugin-pwa` com manifest (nome, ícones, cores, `display: standalone`) e estratégias de cache base (Secção 6 do TRD): Stale-While-Revalidate para o shell, Network-First para chamadas à API.
- Estrutura de pastas (`src/pages`, `src/components`, `src/hooks`, `src/services`, `src/lib`, `src/store`).
- Configurar cliente HTTP (axios) apontando para `VITE_API_URL`, com interceptor que injeta o JWT e desempacota o envelope `{ success, data, error }` da API.
- Configurar cliente Supabase Auth no frontend (`@supabase/supabase-js`) para login/registo.
- Configurar deploy no Vercel (preview deployments por PR + produção a partir de `main`).
- Linting/formatação (ESLint + Prettier) e scripts (`dev`, `build`, `preview`).

**Critérios de Entrega:**
- [x] `npm run dev` inicia a aplicação localmente sem erros.
- [ ] PWA instalável (manifest válido, ícones presentes) — validado via Lighthouse PWA audit. **Pendente:** manifest usa `favicon.svg` (placeholder do template Vite) como ícone único; faltam PNGs 192x192/512x512 (e maskable) antes de correr o audit — ver TODO em `vite.config.ts`.
- [ ] Deploy "hello world" bem-sucedido na Vercel, com preview automático em PRs. **Em curso:** projeto Vercel já criado; primeira tentativa falhou por o repositório ainda não ter `package.json` (framework não detectado). Deve resolver-se automaticamente no próximo deploy, agora que o esqueleto Vite existe — confirmar após merge desta branch.
- [x] Variáveis de ambiente documentadas em `.env.example`, segredos reais fora do controlo de versão (`.gitignore` cobre `.env`/`.env.local`/`.env.*.local`).
- [x] CI executa lint/build em cada push/PR (`.github/workflows/ci.yml`, mesmo padrão do backend).

---

## Fase 1 — Autenticação & Perfil do Utilizador

**Objetivo:** Implementar o fluxo de registo/login e a tela de gestão de perfil, incluindo captura de localização (GPS e fallback hierárquico), consumindo a API da Fase 2 do backend.

**Escopo:**
- Telas de registo e login (Supabase Auth), com seleção de `role` inicial (`CLIENT` ou `PROFISSIONAL`) conforme fluxo de produto.
- Tela/formulário de perfil com:
  - Botão "Usar minha localização" que invoca `navigator.geolocation.getCurrentPosition` (Secção 2A do TRD), com tratamento de permissão negada/indisponível.
  - Fallback manual: dropdowns encadeados Província → Distrito/Município → Bairro.
- Gestão de sessão (guardar/renovar JWT do Supabase, logout).
- Rotas protegidas no router (redireciona para login se não autenticado; redireciona por `role` quando aplicável).
- Estado global de autenticação via Context API (sessão e `role`). Dados vindos da API ficam no TanStack Query, não em Context.

**Implementado em `feat/fase-1-auth-perfil`:** `pages/Login.tsx` (email ou telefone, sign-in/sign-up), `pages/Profile.tsx` (GPS via `hooks/useGeolocation.ts` + fallback hierárquico com lista fixa de províncias em `lib/provinces.ts`), `components/ProtectedRoute.tsx`, `services/profile.ts` + `hooks/useProfile.ts` (TanStack Query) a consumir `GET /profile`/`PATCH /profile/location` da Fase 2 do backend, logout em `store/AuthContext.tsx`.

**Decisão por resolver (não implementada nesta fase):** seleção de `role` (`CLIENT`/`PROFESSIONAL`) no registo. O backend cria sempre `role = 'CLIENT'` por default na trigger de signup (Fase 2) e não expõe ainda um endpoint para um profissional se declarar como tal — decidir se isso é um campo no formulário de registo (gravado em `raw_user_meta_data` e lido pela trigger) ou um passo de onboarding separado (mais alinhado com a Fase 4, que já vai exigir KYC de qualquer forma) antes de implementar.

**Bug encontrado e corrigido (teste manual do utilizador após o merge inicial):** o signup por **email** falhava com `500` — `users_profile.phone` é `NOT NULL` (Fase 1 do backend) mas o formulário só pedia telefone no canal "Telefone"; no canal "Email", `raw_user_meta_data.phone` ia `undefined`, a trigger de signup do backend tentava inserir `phone = null` e o insert violava a constraint, revertendo a transação inteira (o Postgres Auth Log/500 não deixa claro à primeira vista que a causa raiz é uma constraint de `users_profile`, não do próprio `auth.users`). Corrigido adicionando um campo "Telefone" obrigatório ao formulário de registo por email — `phone` passa a ser sempre enviado no metadata do signup, seja qual for o canal de login escolhido. Validado com um novo signup real (email + telefone) contra o Supabase real: `200 OK`, `users_profile` criado com `phone` preenchido.

**Critérios de Entrega:**
- [x] Fluxo de registo → login funciona de ponta a ponta contra o backend real: signup real via Supabase Auth → trigger cria `users_profile` → login → `GET /profile` no frontend mostra os dados reais. **Nota:** "sessão persistida entre reloads" não testado nesta validação (cobre login→perfil numa única navegação; a persistência via `supabase.auth.getSession()`/`onAuthStateChange` já existia da Fase 0, mas sem teste dedicado a reload de página).
- [x] Fallback hierárquico testado contra o backend real (grava `province`/`district`/`neighborhood`, limpa `location`). Captura de GPS testada apenas no caminho de erro (permissão indisponível em ambiente headless) — **não testado em dispositivo real com permissão concedida**.
- [x] Rotas protegidas (`ProtectedRoute`) bloqueiam acesso não autenticado e redirecionam para `/entrar`, validado com Playwright. **Redirecionamento por `role` ainda não existe** — depende da decisão de seleção de `role` acima.
- [ ] Testes de componente automatizados (Vitest/Testing Library) ainda não configurados neste repositório — validação desta fase foi manual (Playwright ad-hoc), não uma suíte que corra em CI.

---

## Fase 2 — Descoberta: Busca de Profissionais por Proximidade

**Objetivo:** Implementar a experiência principal do `CLIENT`: encontrar profissionais próximos, consumindo `GET /professionals/nearby` (Fase 3 do backend).

**Escopo:**
- Tela de listagem de profissionais com resultados ordenados por distância (`distance_m` retornado pela API — Adendo v1.2), exibindo nome, bairro e distância formatada (ex. "1.2 km").
- Scroll infinito ou paginação (consumindo `LIMIT`/`OFFSET` da API).
- Filtro por raio de busca (slider ou seleção pré-definida: 1km/5km/10km/50km).
- Estado de carregamento, vazio ("nenhum profissional encontrado nesta área") e erro (falha de rede/permissão de localização).
- Cache e scroll infinito via TanStack Query (`useInfiniteQuery`), evitando refetch desnecessário ao navegar entre telas.

**Critérios de Entrega:**
- [ ] Listagem exibe profissionais reais do backend de staging, ordenados corretamente por proximidade.
- [ ] Alterar o raio de busca atualiza os resultados sem recarregar a página inteira.
- [ ] Estados de vazio/erro têm feedback visual claro (não tela em branco).
- [ ] Testado em condição de rede lenta/3G simulada (Network-First não bloqueia a UI indefinidamente).

---

## Fase 3 — Pedidos de Serviço: Criação, Acompanhamento & Ciclo de Vida

**Objetivo:** Implementar a criação de `service_requests` pelo `CLIENT` e as telas de gestão do ciclo de vida do pedido (`OPEN` → `ASSIGNED` → `COMPLETED`/`CANCELLED`) para ambos os perfis, consumindo a Fase 3 (Adendo v1.2) do backend.

**Escopo:**
- Formulário de criação de pedido (título, descrição, localização — GPS ou hierarquia).
- Tela do `CLIENT`: lista dos seus pedidos com estado atual e ação de cancelar (quando aplicável).
- Tela do `PROFESSIONAL`: lista de pedidos `OPEN` próximos (reutilizando componente de proximidade da Fase 2) com ação "Aceitar pedido".
- Tratamento explícito de conflito de atribuição: se dois profissionais tentarem aceitar o mesmo pedido, o segundo deve receber feedback claro (ex. "Este pedido já foi atribuído") em vez de erro genérico — reflete o teste de concorrência da Fase 3 do backend.
- Ação de marcar pedido como concluído, **visível apenas para o `CLIENT`** (decidido: quem recebeu o serviço confirma que foi prestado). Na vista do `PROFESSIONAL`, um pedido `ASSIGNED` mostra que aguarda confirmação do cliente — não um botão de concluir desativado.
- Ação de cancelar. **⚠️ Permissões por definir:** quem pode cancelar um pedido já `ASSIGNED` (cliente, profissional, ambos?). Resolver antes de implementar esta parte.
- Notificações in-app (toast) para mudanças de estado.

**Critérios de Entrega:**
- [ ] Criação de pedido persiste corretamente e aparece na listagem do cliente com estado `OPEN`.
- [ ] Aceitar um pedido já atribuído por outro profissional exibe mensagem de conflito específica, não um erro técnico cru.
- [ ] Transições de estado refletem-se na UI em tempo real ou após refresh (dependendo da estratégia de sincronização escolhida).
- [ ] Testes E2E (ex. Playwright/Cypress) cobrem o fluxo: criar pedido → profissional aceita → conclusão.

---

## Fase 4 — Onboarding de Profissional: KYC & Subscrição

**Objetivo:** Implementar o fluxo de verificação de identidade e ativação de subscrição para o perfil `PROFESSIONAL`, consumindo as Fases 4 e 5 do backend.

**Escopo:**
- Formulário de submissão KYC (BI, NUIT) com upload de documento (Supabase Storage via backend), incluindo validação de formato/tamanho de ficheiro.
- Tela de estado do KYC (`PENDING`/`APPROVED`/`REJECTED`), exibindo `review_notes` quando rejeitado (Adendo v1.2).
- Fluxo de subscrição: seleção de gateway mock (Vodacom/Movitel), input de contacto, chamada a `POST /subscriptions`.
- Tela de estado da subscrição (`INACTIVE`/`ACTIVE`/`EXPIRED`) com data de expiração visível.
- Bloqueio de funcionalidades dependentes (ex. aceitar pedidos) enquanto KYC não está `APPROVED` ou subscrição não está `ACTIVE`, com mensagens explicativas do que falta.

**Critérios de Entrega:**
- [ ] Upload de documento KYC funciona e o estado atualiza corretamente após revisão (simulada em staging).
- [ ] Profissional com KYC pendente/rejeitado ou subscrição inativa não consegue aceder às ações de aceitar pedidos — com explicação clara na UI, não apenas botão desabilitado sem contexto.
- [ ] Fluxo de subscrição mock completo testado: seleção → pendente → ativo (após webhook simulado no backend).
- [ ] Testes cobrem os três estados de KYC e os três estados de subscrição na UI.

---

## Fase 5 — Experiência Offline & Resiliência de Rede

**Objetivo:** Consolidar o comportamento da PWA em condições de rede instável, típicas do contexto de uso em Moçambique (Secção 6 do TRD).

**Escopo:**
- Armazenamento de última localização conhecida em `localStorage`/IndexedDB, usada como fallback quando `navigator.geolocation` falha ou demora.
- Indicador visual de estado de conectividade (online/offline) na interface.
- Fila local (IndexedDB) para ações críticas tentadas offline (ex. criação de pedido), com sincronização e reconciliação quando a conexão volta — incluindo tratamento de idempotência (evitar duplicar o pedido se o retry coincidir com sucesso anterior).
- Testes com throttling de rede (DevTools) e modo avião.

**Critérios de Entrega:**
- [ ] Última localização conhecida é reutilizada corretamente quando GPS falha.
- [ ] Criar um pedido em modo offline não perde os dados — é enfileirado e sincronizado ao reconectar, sem duplicação.
- [ ] Indicador de conectividade reflete o estado real da rede.
- [ ] Lighthouse PWA audit mantém pontuação alta (>90) após as mudanças desta fase.

---

## Fase 6 — Acessibilidade, Performance & Polimento de UI

**Objetivo:** Elevar a qualidade de produção da interface antes da integração final: acessibilidade, performance percebida e consistência visual.

**Escopo:**
- Auditoria de acessibilidade (contraste, labels de formulário, navegação por teclado) — WCAG AA como referência mínima.
- Otimização de bundle (code-splitting por rota, lazy loading de componentes pesados).
- Animações de transição de tela e feedback de interação via Framer Motion, sem comprometer performance em dispositivos de gama baixa (alvo real do mercado moçambicano).
- Skeleton loaders / estados de carregamento consistentes em todas as telas com dados assíncronos.
- Revisão de responsividade (mobile-first, já que a PWA é o canal principal em dispositivos móveis).

**Critérios de Entrega:**
- [ ] Lighthouse Accessibility score > 90.
- [ ] Lighthouse Performance score > 80 em simulação de rede 4G/dispositivo médio.
- [ ] Nenhuma tela crítica (login, busca, criação de pedido) sem estado de carregamento/erro tratado.
- [ ] Revisão manual em pelo menos 3 tamanhos de viewport (mobile pequeno, mobile grande, desktop).

---

## Fase 7 — Integração Final, Staging & Deploy de Produção

**Objetivo:** Validar a integração completa com o backend em staging, executar testes de jornada completa e preparar o deploy de produção, em coordenação com a Fase 7 do backend.

**Escopo:**
- Apontar ambiente de staging do frontend (Vercel preview/staging branch) para o ambiente de staging do backend (Fly.io + Supabase).
- Teste E2E de jornada completa (mesma jornada validada no backend): registo → localização → KYC → subscrição → busca → pedido → atribuição → conclusão, agora do ponto de vista da UI.
- Configuração de variáveis de ambiente de produção (`VITE_API_URL` de produção, chaves públicas Supabase).
- Validação de CORS e autenticação end-to-end contra o backend de produção.
- Runbook de deploy/rollback no Vercel (promoção de preview para produção, reversão de deploy).
- Smoke tests pós-deploy em produção.

**Critérios de Entrega:**
- [ ] Teste E2E de jornada completa passa consistentemente contra o ambiente de staging integrado (frontend + backend).
- [ ] Deploy de produção na Vercel validado com smoke tests (login, busca, criação de pedido funcionam em produção).
- [ ] Nenhum erro de CORS ou autenticação em produção.
- [ ] Runbook de deploy/rollback documentado e testado pelo menos uma vez.

---

## Resumo de Dependências entre Fases

```
Fase 0 (Fundação PWA)
   └─> Fase 1 (Auth & Perfil)
          └─> Fase 2 (Busca por Proximidade)
                 └─> Fase 3 (Ciclo de Vida do Pedido)
                        └─> Fase 4 (KYC & Subscrição)
                               └─> Fase 5 (Offline & Resiliência)
                                      └─> Fase 6 (Acessibilidade & Performance)
                                             └─> Fase 7 (Integração Final & Deploy)
```

**Alinhamento com o Backend:** cada fase deste plano depende do endpoint correspondente já estar disponível (ainda que em staging) no repositório [PiquetePro24_Backend](https://github.com/Nexel002/PiquePro24_Backend) — Fase 1 ↔ Backend Fase 2, Fase 2/3 ↔ Backend Fase 3, Fase 4 ↔ Backend Fases 4-5, Fase 7 ↔ Backend Fase 7. A documentação OpenAPI publicada desde cedo pelo backend (ver Adendo v1.2 no plano do backend) é o contrato de referência para desbloquear o desenvolvimento do frontend antes de cada endpoint estar 100% pronto (mock local contra o schema documentado).
