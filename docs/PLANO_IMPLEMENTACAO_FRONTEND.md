# Plano de Implementação — PiquetePro24 Frontend (PWA)

Baseado no [TRD v1.1](./TRD_v1.1_Marketplace_Servicos_Locais_PWA.md), incluindo o Adendo v1.2. Este repositório cobre a PWA (React + Vite + Tailwind CSS + Framer Motion), alojada na Vercel, consumindo a API do repositório [PiquetePro24_Backend](https://github.com/Nexel002/PiquePro24_Backend). O plano está dividido em 7 fases sequenciais, espelhando as fases do backend para permitir avanço paralelo e integração contínua entre os dois repositórios.

---

## Fase 0 — Fundação do Projeto & Setup da PWA

**Objetivo:** Preparar o esqueleto da aplicação React, ferramentas de build e configuração PWA base, sem ainda implementar telas de negócio.

**Escopo:**
- Inicializar projeto com Vite (`react-ts` ou `react`, conforme decisão de tipagem) + Tailwind CSS + Framer Motion.
- Configurar `vite-plugin-pwa` com manifest (nome, ícones, cores, `display: standalone`) e estratégias de cache base (Secção 6 do TRD): Stale-While-Revalidate para o shell, Network-First para chamadas à API.
- Estrutura de pastas (`src/pages`, `src/components`, `src/hooks`, `src/services`, `src/lib`, `src/store`).
- Configurar cliente HTTP para a API (ex. `axios`/`fetch` wrapper) apontando para variável de ambiente (`VITE_API_URL`).
- Configurar cliente Supabase Auth no frontend (`@supabase/supabase-js`) para login/registo.
- Configurar deploy no Vercel (preview deployments por PR + produção a partir de `main`).
- Linting/formatação (ESLint + Prettier) e scripts (`dev`, `build`, `preview`).

**Critérios de Entrega:**
- [ ] `npm run dev` inicia a aplicação localmente sem erros.
- [ ] PWA instalável (manifest válido, ícones presentes) — validado via Lighthouse PWA audit.
- [ ] Deploy "hello world" bem-sucedido na Vercel, com preview automático em PRs.
- [ ] Variáveis de ambiente documentadas em `.env.example`, segredos fora do controlo de versão.
- [ ] CI executa lint/build em cada push/PR.

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
- Estado global de autenticação (Context API, Zustand ou equivalente).

**Critérios de Entrega:**
- [ ] Fluxo de registo → login → sessão persistida entre reloads funciona de ponta a ponta contra o backend real (ambiente de staging).
- [ ] Captura de GPS funciona em dispositivo/browser com permissão concedida; fallback hierárquico funciona quando negada ou indisponível.
- [ ] Rotas protegidas bloqueiam acesso não autenticado e redirecionam corretamente por `role`.
- [ ] Testes de componente cobrem os formulários de registo/perfil (casos de validação de campos obrigatórios).

---

## Fase 2 — Descoberta: Busca de Profissionais por Proximidade

**Objetivo:** Implementar a experiência principal do `CLIENT`: encontrar profissionais próximos, consumindo `GET /professionals/nearby` (Fase 3 do backend).

**Escopo:**
- Tela de listagem de profissionais com resultados ordenados por distância (`distance_m` retornado pela API — Adendo v1.2), exibindo nome, bairro e distância formatada (ex. "1.2 km").
- Scroll infinito ou paginação (consumindo `LIMIT`/`OFFSET` da API).
- Filtro por raio de busca (slider ou seleção pré-definida: 1km/5km/10km/50km).
- Estado de carregamento, vazio ("nenhum profissional encontrado nesta área") e erro (falha de rede/permissão de localização).
- Cache local (React Query/SWR ou equivalente) para evitar refetch desnecessário ao navegar entre telas.

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
- Ação de marcar pedido como concluído (`PROFESSIONAL` ou `CLIENT`, conforme regra de negócio a confirmar).
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
