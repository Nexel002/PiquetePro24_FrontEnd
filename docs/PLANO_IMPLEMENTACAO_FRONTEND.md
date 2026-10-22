# Plano de Implementação — PiquetePro24 Frontend (PWA)

Baseado no [TRD v1.1](./TRD_v1.1_Marketplace_Servicos_Locais_PWA.md), incluindo o Adendo v1.2. Este repositório cobre a PWA (React + Vite + Tailwind CSS + Framer Motion), alojada na Vercel, consumindo a API do repositório [PiquetePro24_Backend](https://github.com/Nexel002/PiquePro24_Backend). O plano começou com 7 fases sequenciais, espelhando as fases do backend para permitir avanço paralelo e integração contínua entre os dois repositórios; tem hoje 37 (da Fase 8 em diante, acrescentadas por adendos do TRD).

> **Estado em 21/10/2026 (TRD Adendos v1.67 e v1.68).** As Fases 0 a 42 estão em `main` e em produção (`https://piquete-pro24-front-end-beta.vercel.app`, versão 0.3.0; as Fases 38 a 42 entraram pelo merge `4b2cbb7`). **A Fase 43** (E2E do CI de volta ao verde e barra «Pedir a 3» no telemóvel, versão 0.3.1) está em `fix/e2e-ecras-de-perfil`, por fazer merge. **A Fase 44** (política de privacidade e base de SEO para o domínio `www.piquetepro24.co.mz`, versão 0.4.0) está em `feat/privacidade-e-seo-base`, por fazer merge; a publicação no domínio tem secção própria no fim (TRD Adendos v1.69 e v1.70). O que falta nas Fases 0 a 42 já não é código:
> 1. **Validar no browser e no telemóvel** os critérios por marcar das Fases 11 a 37 (quase todos são isso). Nesta máquina os E2E correm com o Edge instalado (`E2E_BROWSER=msedge npx playwright test`); no CI usam o Chromium do Playwright.
> 2. **Fase 7:** depende de um staging que não existe (backend, Fase 7).
> 3. As **empresas e equipas** (Fases 23 a 26) dependem de 4 migrations do backend sem registo de aplicação (`Doc's/ESQUEMA_BASE_DADOS.md`, no backend).
> 4. **Backlog** no fim deste plano: correcções e propostas da análise de 21/10/2026, por aprovar. As ideias N1 a N7 têm plano detalhado na secção «Propostas N1 a N7», a seguir ao backlog (TRD Adendo v1.66).

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
- [ ] PWA instalável (manifest válido, ícones presentes) — validado via Lighthouse PWA audit. **Pendente só o audit:** manifest único em `vite.config.ts` (o `vite-plugin-pwa` injecta o `<link>`) com ícones quadrados `pwa-192x192.png`, `pwa-512x512.png` e `pwa-maskable-512x512.png`, mais `apple-touch-icon.png` (180, fundo opaco) — gerados a partir do escudo do logótipo, porque o `pwa-icon.png` é horizontal (1024x343) e não serve de ícone. Falta correr o Lighthouse sobre `npm run build && npm run preview` e marcar aqui.
- [x] Deploy "hello world" bem-sucedido na Vercel. A primeira tentativa falhou por o repositório ainda não ter `package.json` (framework não detectado); resolvido com o esqueleto Vite. **Confirmado em 29/09/2026:** `https://piquete-pro24-front-end.vercel.app` serve a app a partir de `main` (`/`, `/entrar` e `/profissionais` respondem 200, `manifest.webmanifest` ligado, headers do `vercel.json` aplicados — incluindo a CSP), e é o domínio que o backend tem em `CORS_ORIGIN` (TRD Adendo v1.3, item E).
- [ ] Preview automático em PRs na Vercel. **Não verificado:** sem acesso ao painel da Vercel nem ao `gh` nesta máquina; confirmar no separador "Deployments" do projeto ao abrir o próximo PR.
- [x] Variáveis de ambiente documentadas em `.env.example`, segredos reais fora do controlo de versão (`.gitignore` cobre `.env`/`.env.local`/`.env.*.local`).
- [x] CI executa lint/build em cada push/PR (`.github/workflows/ci.yml`, mesmo padrão do backend).

---

## Fase 1 — Autenticação & Perfil do Utilizador

**Objetivo:** Implementar o fluxo de registo/login e a tela de gestão de perfil, incluindo captura de localização (GPS e fallback hierárquico), consumindo a API da Fase 2 do backend.

> **Nota:** login com Google, onboarding obrigatório de telefone/localização, foto de perfil, apagar conta, escolha de role e distinção Singular/Empresa não estavam no escopo original desta fase nem no corpo do TRD — foram adicionados durante a implementação (pedido explícito do utilizador) e registados formalmente como requisito no [TRD Adendo v1.4](./TRD_v1.1_Marketplace_Servicos_Locais_PWA.md#adendo-v14).

**Escopo:**
- Telas de registo e login (Supabase Auth, email/telefone/Google), com seleção de `role` inicial (`CLIENT` ou `PROFISSIONAL`) conforme fluxo de produto.
- Onboarding obrigatório pós-signup: telefone (só para quem entra via Google) e localização (todos os canais) — ver decisão detalhada abaixo.
- Tela/formulário de perfil com:
  - Botão "Usar minha localização" que invoca `navigator.geolocation.getCurrentPosition` (Secção 2A do TRD), com tratamento de permissão negada/indisponível.
  - Fallback manual: dropdowns encadeados Província → Distrito/Município → Bairro.
- Gestão de sessão (guardar/renovar JWT do Supabase, logout).
- Rotas protegidas no router (redireciona para login se não autenticado; redireciona por `role` quando aplicável).
- Estado global de autenticação via Context API (sessão e `role`). Dados vindos da API ficam no TanStack Query, não em Context.

**Implementado em `feat/fase-1-auth-perfil`:** `pages/Login.tsx` (email ou telefone, sign-in/sign-up), `pages/Profile.tsx` (GPS via `hooks/useGeolocation.ts` + fallback hierárquico com lista fixa de províncias em `lib/provinces.ts`), `components/ProtectedRoute.tsx`, `services/profile.ts` + `hooks/useProfile.ts` (TanStack Query) a consumir `GET /profile`/`PATCH /profile/location` da Fase 2 do backend, logout em `store/AuthContext.tsx`.

**Decisão resolvida (TRD Adendo v1.4, item E — pedido explícito do utilizador ao notar a lacuna):** `Login.tsx` ganha um `fieldset` "Como vais usar o PiquetePro24?" ("Sou cliente" / "Sou profissional"), visível só em modo `sign-up`, antes de qualquer canal (Google, email, telefone) — não uma tela de onboarding à parte. Para email/telefone, `intendedRole` vai em `raw_user_meta_data.role` no próprio `signUp()`. Para Google, `signInWithOAuth` não aceita metadata customizado: a escolha é guardada em `sessionStorage` (`INTENDED_ROLE_STORAGE_KEY`, exportado de `Login.tsx`) antes do redirect, e `AuthCallback.tsx` lê-a depois (assim que a sessão fica disponível) para chamar `useBecomeProfessional()` (`POST /profile/become-professional`) se necessário — só nesse caso, nunca em modo `sign-in` (entrar numa conta Google já existente não deve poder mudar o `role`). Sem UI própria fora deste fluxo específico.

Fora de escopo desta correção: nenhum campo adicional de perfil profissional (categoria de serviço, KYC) — só o `role` fica correto desde o signup, os dados de KYC continuam a ser Fase 4.

Validado de ponta a ponta contra o Supabase e o backend reais: seletor visível só em `sign-up`; signup por email com "Profissional" grava `role: PROFESSIONAL`; "Cliente" (default) continua a funcionar sem regressão. O `sessionStorage` é escrito corretamente antes do redirect (confirmado via `console.log` de depuração temporário, removido depois — inspecioná-lo via Playwright depois do redirect real não é viável, porque o browser já navegou para a origem do Supabase quando o teste tenta ler o valor). O endpoint `become-professional` em si foi validado diretamente pelo backend (idempotência incluída); o round-trip completo pelo ecrã de consentimento do Google não foi automatizado nesta sessão.

**Bug encontrado e corrigido (teste manual do utilizador após o merge inicial):** o signup por **email** falhava com `500` — `users_profile.phone` é `NOT NULL` (Fase 1 do backend) mas o formulário só pedia telefone no canal "Telefone"; no canal "Email", `raw_user_meta_data.phone` ia `undefined`, a trigger de signup do backend tentava inserir `phone = null` e o insert violava a constraint, revertendo a transação inteira (o Postgres Auth Log/500 não deixa claro à primeira vista que a causa raiz é uma constraint de `users_profile`, não do próprio `auth.users`). Corrigido adicionando um campo "Telefone" obrigatório ao formulário de registo por email — `phone` passa a ser sempre enviado no metadata do signup, seja qual for o canal de login escolhido. Validado com um novo signup real (email + telefone) contra o Supabase real: `200 OK`, `users_profile` criado com `phone` preenchido.

**Feedback de sucesso/erro no login (segundo bug de UX, mesma sessão de testes):** após um signup bem-sucedido que fica a aguardar confirmação (`data.session === null`), a tela não dava nenhum sinal — parecia "não ter reagido" ao clique, levando a clicar outra vez e a bater no rate limit de segurança do Supabase (`429`, "For security purposes..."). Corrigido: `Login.tsx` agora mostra uma mensagem de sucesso explícita ("Conta criada. Verifica o teu email/telefone para confirmar antes de entrares.") quando não há sessão imediata, e traduz os erros mais comuns do Supabase Auth (rate limit, `email rate limit exceeded`, conta já existente, credenciais inválidas, email/telefone não confirmado) em vez de mostrar a mensagem técnica cru (CLAUDE.md Secção 3).

**Limitação de ambiente conhecida, adiada deliberadamente:** o projeto Supabase usa o serviço de email de teste por default (sem SMTP próprio configurado), que tem um limite de envio muito baixo — foi esgotado durante os testes desta fase (`email rate limit exceeded`). Consequência prática: contas novas em desenvolvimento podem não receber o email de confirmação e ficar bloqueadas até o limite libertar (ou até confirmação manual via Admin API/`service_role`, usada para desbloquear a conta de teste desta validação). **Configurar SMTP próprio (Resend, SendGrid, etc.) em Project Settings → Authentication → SMTP Settings é decisão explicitamente adiada** — sem isso, também não há como enviar um email de boas-vindas personalizado (o Supabase só envia o email de confirmação/recuperação padrão, sem branding). Resolver antes de expor o registo a utilizadores reais fora desta equipa.

**Nome de lugar em vez de coordenadas (feedback do utilizador ao testar a tela de perfil):** a captura de GPS mostrava latitude/longitude brutos ("-25.9655, 32.5832"), pouco legível. Adiciona `services/geocoding.ts` + `hooks/useReverseGeocode.ts` (TanStack Query, `staleTime: Infinity` — o nome de um lugar não muda) a consumir o novo `GET /geocode/reverse` do backend, tanto na "Localização encontrada" (GPS antes de confirmar) como na "Localização atual" (GPS já gravado, via `latitude`/`longitude` que `GET /profile` agora também devolve). Cai de volta para as coordenadas cruas se a geocodificação falhar (nunca bloqueia o fluxo de confirmar localização). O backend passou por duas iterações falhadas antes de acertar (Geocoding API com `results[0]`, depois Places API/Nearby Search — ambas devolviam Plus Codes ou POIs irrelevantes); a versão final seleciona o resultado da Geocoding API por `types` (`route` → bairro → cidade). Ver decisão detalhada no plano do backend.

**Secção "Os meus dados" editável (feedback do utilizador — a tela de perfil só mostrava a localização, nenhum dado do próprio utilizador):** adiciona uma secção com nome, telefone, tipo de conta (`role`, traduzido — nunca o valor cru `CLIENT`) e data de registo, com toggle "Editar" que troca para um formulário (nome + telefone) a consumir o novo `PATCH /profile` do backend. O indicativo `+258` aparece fixo e não editável ao lado do campo de telefone (`lib/phone.ts`, partilhado com o onboarding — ver abaixo) — o utilizador só edita os dígitos locais, nunca reescreve o indicativo do país. Erros do backend (ex. `409` "telefone já associado a outra conta") chegam já traduzidos pelo interceptor de `lib/api.ts`, sem tratamento especial no componente. Validado de ponta a ponta contra o Supabase real: edição bem-sucedida e o caso de conflito de telefone duplicado (mensagem clara, formulário permanece aberto para correção).

**Login com Google + onboarding obrigatório de telefone e localização (pedido explícito do utilizador):** `Login.tsx` ganha um botão "Continuar com Google" (`supabase.auth.signInWithOAuth`) e uma rota `/auth/callback` (`pages/AuthCallback.tsx`) que espera a sessão ficar disponível (o supabase-js processa o `code` da URL automaticamente, PKCE + `detectSessionInUrl` por default) e segue para `/perfil`.

Como o Google nunca partilha telefone via OAuth, o backend passou `users_profile.phone` a nullable (ver plano do backend) — um perfil com `phone` nulo está com "onboarding incompleto". `getOnboardingStep()` (`services/profile.ts`) deriva o passo em falta a partir do próprio estado dos campos, sem coluna dedicada: `phone` nulo → passo `'phone'`; sem `province` nem `latitude` → passo `'location'`; caso contrário → `'complete'`. Só quem se regista via Google passa pelo passo de telefone — email/telefone já pedem o número no signup (`Login.tsx`); localização é obrigatória para todos os canais, porque nenhum a pede no signup.

`components/OnboardingGate.tsx` envolve `/perfil` (dentro de `ProtectedRoute`, que garante sessão) e redireciona para `/completar-perfil/telefone` ou `/completar-perfil/localizacao` conforme o passo em falta — sem opção de "saltar" em nenhuma das duas telas (`pages/onboarding/CompletePhone.tsx`, `pages/onboarding/CompleteLocation.tsx`). As duas telas de onboarding ficam dentro de `ProtectedRoute` mas fora de `OnboardingGate` (senão criariam um ciclo de redirect entre si). O formulário de localização foi extraído para `components/LocationForm.tsx`, partilhado entre `Profile.tsx` (edição opcional) e `CompleteLocation.tsx` (obrigatório, mesmo componente, sem botão de saltar à volta).

Validado de ponta a ponta com um utilizador simulando o shape de signup Google (metadata `name` em vez de `full_name`, sem `phone`): login → forçado a `/completar-perfil/telefone` (acesso direto a `/perfil` é bloqueado e devolvido a este passo) → preenche telefone → avança automaticamente para `/completar-perfil/localizacao` → preenche província → avança automaticamente para `/perfil`, já com todos os dados visíveis.

**Descoberta durante esta mudança, corrigida à parte:** `tsconfig.app.json` nunca tinha `strict: true` ativado, apesar do CLAUDE.md exigir isso explicitamente desde a Fase 0 — foi por isso que `UserProfile.phone` (agora `string | null`) não acusava erro de tipo onde devia (`Profile.tsx` passava-o diretamente a uma função que esperava `string`). Ativado agora; só essa uma correção foi necessária no código existente.

**Foto de perfil opcional (pedido explícito do utilizador):** `lib/imageConversion.ts` expõe `convertToWebp()`, reutilizável — desenhada explicitamente para servir também o upload futuro de fotos de trabalhos dos profissionais (fora do escopo desta fase), não só o avatar. Usa a Canvas API do browser (sem dependência nova): decodifica a imagem, redimensiona mantendo proporção (`maxDimension` por default 1280px, evita uploads gigantes vindos diretamente da câmara de um telemóvel) e reencoda como WebP (`quality` por default 0.85). Ignora GIFs (perderia a animação) e SVGs (já pequenos/vetoriais); nunca lança — devolve o ficheiro original sem alteração se a conversão falhar por qualquer motivo (browser sem suporte a `canvas.toBlob` com WebP, decodificação falhada), para nunca bloquear um upload por causa disso.

`services/avatar.ts` (`uploadAvatar`) valida tipo/tamanho (máx. 5MB), converte para WebP, e faz upload **diretamente ao Supabase Storage** (não ao backend — mesma decisão de arquitetura do resto do projeto: `anon` key + RLS, ver plano do backend) para o path `<user_id>/avatar-<timestamp>.webp`, respeitando a política RLS que exige que o primeiro segmento do path seja o próprio `auth.uid()`. `useUploadAvatar()` (`hooks/useProfile.ts`) encadeia o upload com `PATCH /profile` numa mutation só, para o componente gerir um único estado de loading/erro.

UI: no cabeçalho do perfil e na secção "Os meus dados" (modo edição), mostra a foto ou um placeholder com a inicial do nome. O controlo de upload (`<input type="file" accept="image/*" capture="user">`) fica escondido atrás de um botão "Alterar foto" — `capture="user"` abre a câmara frontal em dispositivos móveis que a suportam, e cai para a seleção normal de ficheiro em desktop, cobrindo os dois pedidos (upload e tirar foto) com um único input. Botão "Remover" (só visível quando já existe foto) grava `avatar_url: null`. Validado de ponta a ponta contra o Supabase real: upload de uma imagem de teste, confirmação de que o ficheiro gravado no Storage tem `mimetype: image/webp` (não só a extensão do nome), exibição imediata na UI, e remoção.

**Apagar conta (pedido explícito do utilizador, "deve apagar a 100%"):** secção "Zona de perigo" no fundo de `Profile.tsx`, com confirmação em duas etapas — clicar "Apagar conta" mostra um aviso explícito de irreversibilidade e só um segundo clique ("Sim, apagar a minha conta") executa. `useDeleteAccount()` (`hooks/useProfile.ts`) chama `DELETE /profile` do backend (que apaga `auth.users`, `users_profile` e tudo em cascata — ver plano do backend) e, em caso de sucesso, faz `supabase.auth.signOut()` (a sessão local no browser ainda "parece" válida até expirar, mesmo depois de o utilizador deixar de existir no Supabase) e `queryClient.clear()` (evita dados do utilizador apagado sobreviverem na cache do TanStack Query), redirecionando para `/`. **Não testado de ponta a ponta**: depende da migration de FKs `ON DELETE` do backend, ainda não aplicada no Supabase real.

**Distinção Singular/Empresa dentro do perfil Profissional (TRD Adendo v1.4, item F — ideia surgida depois do item E já validado, com a ressalva do utilizador de que a lógica de onboarding para empresa "deve ser mais complexa", mas confirmado que, por agora, só a decisão e o campo entram):** `Login.tsx` ganha um segundo `fieldset` — "És profissional singular ou empresa?" — visível só quando `mode === 'sign-up'` **e** `intendedRole === 'PROFESSIONAL'`, logo a seguir ao seletor Cliente/Profissional (item E), antes de qualquer canal. Mesmo tratamento por canal do item E:

- **Email/telefone:** `intendedProfessionalType` vai em `raw_user_meta_data.professional_type` no `signUp()`, só quando `intendedRole === 'PROFESSIONAL'` (nunca enviado para `CLIENT` — não faz sentido para esse role).
- **Google:** a escolha é guardada em `sessionStorage` (`INTENDED_PROFESSIONAL_TYPE_STORAGE_KEY`, exportado de `Login.tsx`, par de `INTENDED_ROLE_STORAGE_KEY`) antes do redirect, e limpa em qualquer `sign-in` ou quando `intendedRole` volta a `CLIENT`. `AuthCallback.tsx` lê-a junto com `INTENDED_ROLE_STORAGE_KEY` e passa-a a `useBecomeProfessional()`, que agora aceita `professionalType` como argumento obrigatório — `POST /profile/become-professional` passou a exigir `professional_type` no corpo (backend responde `400` sem ele). Fallback para `'SINGULAR'` se a chave se perder por algum motivo (nunca deve acontecer na prática, já que `Login.tsx` grava sempre as duas chaves juntas).

`Profile.tsx` mostra "Tipo de profissional" (Singular/Empresa) na secção "Os meus dados", só quando `role === 'PROFESSIONAL'` e `professional_type` está preenchido — mesmo padrão de tradução de enum já usado para `role` (`PROFESSIONAL_TYPE_LABELS`).

Fora de escopo (mesma decisão do item E, confirmada explicitamente com o utilizador): nenhum formulário ou passo de onboarding diferenciado por tipo (BI+NUIT para singular vs. NUIT+alvará+representante legal para empresa) — fica para quando a Fase 4 (KYC) for desenhada a sério.

**Não testado de ponta a ponta contra o Supabase real**: depende da migration `20260916155516_tipo_profissional_singular_empresa.sql` do backend, ainda não aplicada no momento em que esta secção foi escrita. Type-check estrito (`tsconfig.app.json`), lint e build de produção confirmados limpos.

**Geocodificação reversa também preenche `province`/`district`/`neighborhood` (TRD Adendo v1.4, item G — identificado pelo próprio utilizador ao inspecionar a tabela `users_profile` no Supabase e ver esses três campos sempre `NULL` para perfis com localização por GPS):** `services/geocoding.ts` (`reverseGeocode`) passa a devolver `{ placeName, province, district, neighborhood }` em vez de só a string do nome do lugar, espelhando os campos novos que `GET /geocode/reverse` do backend agora expõe (extraídos dos `address_components` do Google — ver plano do backend). `LocationForm.tsx`, no handler `handleConfirmGps`, passa a enviar `province`/`district`/`neighborhood` (já disponíveis em `pendingPlace.data`, a mesma chamada que a tela já fazia para mostrar "Localização encontrada" antes de confirmar) junto com `latitude`/`longitude` no `PATCH /profile/location` — sem pedido de rede extra, sem novo passo para o utilizador. Se a geocodificação ainda não respondeu ou falhou nesse instante, os três campos seguem `undefined` e o backend grava `null`, sem bloquear a confirmação do GPS.

Continua a ser só uma cache legível ao lado das coordenadas (mostrada em `currentLocationLabel` como "Baixa, Maputo" em vez de coordenadas cruas) — nunca substitui `latitude`/`longitude` como fonte para qualquer busca por proximidade da Fase 2.

**Validado:** type-check estrito (`tsc -b`), lint e build de produção limpos. Sem suite de testes automatizados configurada neste repositório (mesma limitação já registada nos critérios de entrega desta fase) — validação funcional feita manualmente.

**Critérios de Entrega:**
- [x] Fluxo de registo → login funciona de ponta a ponta contra o backend real: signup real via Supabase Auth → trigger cria `users_profile` → login → `GET /profile` no frontend mostra os dados reais. **Nota:** "sessão persistida entre reloads" não testado nesta validação (cobre login→perfil numa única navegação; a persistência via `supabase.auth.getSession()`/`onAuthStateChange` já existia da Fase 0, mas sem teste dedicado a reload de página).
- [x] Fallback hierárquico testado contra o backend real (grava `province`/`district`/`neighborhood`, limpa `location`). Captura de GPS testada apenas no caminho de erro (permissão indisponível em ambiente headless) — **não testado em dispositivo real com permissão concedida**.
- [x] Rotas protegidas (`ProtectedRoute`) bloqueiam acesso não autenticado e redirecionam para `/entrar`, validado com Playwright. **Redirecionamento por `role` ainda não existe** — depende da decisão de seleção de `role` acima.
- [x] Testes de componente automatizados (Vitest/Testing Library) para os ecrãs desta fase. **Runner já configurado** (TRD Adendo v1.14, `npm test` no CI), mas só cobre por agora os ecrãs de KYC e subscrição da Fase 4 — login, onboarding e perfil desta fase continuam validados só manualmente (Playwright ad-hoc). **Feito (12/10/2026, Adendo v1.31, item A):** `Login` (já tinha), `OnboardingGate`, `CompletePhone` e `Profile` passam a ter teste. `CompleteLocation` só compõe `LocationForm` e não tem teste próprio.
- [x] **(TRD Adendo v1.4, item A)** Login/registo via Google OAuth (`signInWithOAuth` + `/auth/callback`). Fluxo completo confirmado manualmente pelo utilizador: chega ao ecrã de consentimento do Google e autentica com sucesso. **Pendência conhecida (não bloqueante):** o ecrã do Google mostra o domínio técnico do projeto Supabase em vez de "PiquetePro24" — requer *brand verification* formal no Google Cloud Console, fora do controlo do código (ver nota no plano do backend).
- [x] **(TRD Adendo v1.4, item B)** Onboarding obrigatório de telefone (só quem entra via Google) e localização (todos os canais), via `OnboardingGate` + `pages/onboarding/`. Validado de ponta a ponta: acesso direto a `/perfil` sem completar os passos é bloqueado e devolvido ao passo em falta; sequência telefone → localização → perfil confirmada.
- [x] **(TRD Adendo v1.4, item C)** Foto de perfil opcional, com conversão para WebP reutilizável (`lib/imageConversion.ts`) e upload direto ao Storage. Validado de ponta a ponta: upload, `mimetype: image/webp` confirmado no ficheiro gravado, exibição na UI, remoção.
- [x] **(TRD Adendo v1.4, item D)** Apagar conta: secção "Zona de perigo" em `Profile.tsx`, confirmação em duas etapas, `useDeleteAccount()` chama `DELETE /profile` e depois `supabase.auth.signOut()` + `queryClient.clear()`, redireciona para `/`. `DELETE /profile` validado de ponta a ponta contra o Supabase real pelo backend (cliente com dados relacionados apagados em cascata; profissional atribuído a pedido de outro cliente não apaga o pedido — repõe `OPEN`), incluindo a correção de uma FK em falta descoberta nesse teste (ver plano do backend). O fluxo UI→`signOut`→redirect não foi exercitado via Playwright nesta sessão (a chamada de rede já está coberta pela validação do backend).
- [x] **(TRD Adendo v1.4, item E)** Escolha de `role` (Cliente/Profissional) logo no ecrã de registo — `fieldset` visível só em `sign-up`, antes de Google/email/telefone. Email/telefone envia `role` em `raw_user_meta_data`; Google guarda a escolha em `sessionStorage` antes do redirect e `AuthCallback.tsx` aplica-a depois via `POST /profile/become-professional`. Validado de ponta a ponta contra o Supabase e o backend reais: seletor correto (ausente em `sign-in`, presente em `sign-up`), signup por email grava o `role` escolhido (`PROFESSIONAL` e `CLIENT` default, sem regressão). O round-trip completo pelo Google (sessionStorage → redirect real → callback → `become-professional`) não foi automatizado — validado por partes (escrita em sessionStorage confirmada antes do redirect; endpoint testado diretamente contra o backend, incluindo idempotência).
- [x] **(TRD Adendo v1.4, item F)** Distinção Singular/Empresa — implementação: segundo `fieldset` em `Login.tsx`, visível só quando `intendedRole === 'PROFESSIONAL'` em `sign-up`. Email/telefone envia `professional_type` em `raw_user_meta_data`; Google guarda em `sessionStorage` (`INTENDED_PROFESSIONAL_TYPE_STORAGE_KEY`) e `AuthCallback.tsx` passa-o a `useBecomeProfessional()`, agora com `professionalType` obrigatório. `Profile.tsx` mostra "Tipo de profissional" quando aplicável. Type-check estrito, lint e build limpos.
- [x] **(TRD Adendo v1.4, item F)** Validação de ponta a ponta contra o Supabase real, feita pelo backend após a migration ser aplicada (ver critério correspondente no plano do backend): `professional_type` gravado corretamente para `SINGULAR`/`COMPANY` via signup, nunca preenchido para `CLIENT`, e gravado atomicamente com `role` no fluxo `become-professional` (Google). Como o contrato de dados (`UserProfile.professional_type`) é o mesmo consumido por `Profile.tsx`/`Login.tsx`/`AuthCallback.tsx`, a validação do backend cobre o caminho de dados ponta a ponta; a interação de UI em si (cliques nos seletores, navegação) já estava coberta pelo type-check estrito, lint e build limpos registados no critério de implementação acima.
- [x] **(TRD Adendo v1.4, item G)** Geocodificação reversa preenche `province`/`district`/`neighborhood` ao confirmar localização por GPS — `services/geocoding.ts` devolve os três campos junto do `placeName`; `LocationForm.tsx` envia-os no `PATCH /profile/location` a partir do resultado que a tela já tinha para a pré-visualização, sem chamada de rede nova. Consome o `GET /geocode/reverse` estendido do backend (ver critério correspondente no plano do backend). Type-check estrito, lint e build de produção confirmados limpos.
- [x] **(TRD Adendo v1.7)** `POST /notifications/welcome` chamado em `Login.tsx` (signup email/telefone com sessão imediata) e `AuthCallback.tsx` (signup via Google) — `services/notifications.ts`. Sem `await` bloqueante, erro engolido: uma falha aqui nunca pode fazer parecer que o signup falhou. **Limitação conhecida, não resolvida:** se o Supabase exigir confirmação de email antes de emitir sessão, o welcome não dispara nesse instante nem depois (não há hook no primeiro login pós-confirmação). `tsc -b`/`vite build`/`eslint` limpos; sem validação interativa em browser (sem ferramenta de automação disponível nesta sessão).
- [x] **(TRD Adendo v1.7)** Ecrã "Esqueci a password" em `Login.tsx` (`services/passwordRecovery.ts`, visível só em `sign-in`+`email`, mostra a mensagem exata devolvida pelo backend) + nova rota `/definir-nova-password` (`pages/DefinirNovaPassword.tsx`, sem `ProtectedRoute` — espera `isLoading` da sessão de recuperação como `AuthCallback.tsx` já faz para OAuth). `describeAuthError` extraída de `Login.tsx` para `lib/authErrors.ts`, partilhada pelas duas telas. `tsc -b`/`vite build`/`eslint` limpos. **Validado contra o backend real:** o pedido de recuperação (`POST /auth/password-recovery`) confirmado a funcionar e a ficar registado no audit log (`AUTH_PASSWORD_RECOVERY_REQUESTED`); o ecrã `/definir-nova-password` (conclusão, a partir do link recebido por email) ainda não foi exercitado de ponta a ponta.
- [x] **(TRD Adendo v1.7, item B)** Mudar password estando autenticado — nova secção "Segurança" em `pages/Profile.tsx`, mesma convenção de toggle já usada em "Os meus dados". Sem endpoint novo no backend: `supabase.auth.updateUser({ password })` diretamente, sem pedir a password atual (decisão consciente — ver TRD). `tsc -b`/`vite build`/`eslint` limpos; sem validação interativa em browser.

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
- [x] Listagem exibe profissionais reais do backend, ordenados corretamente por proximidade (`FindProfessionals.tsx`, consome `GET /professionals/nearby` via `useNearbyProfessionals`). Build (`tsc -b` + `vite build`) e lint confirmados limpos; validação manual completa (login real → busca → lista) **não foi possível nesta sessão** por não haver driver de browser (Playwright/chromium-cli) disponível na máquina — confirmado apenas que o dev server serve os novos módulos sem erro de compilação (`curl` aos ficheiros via Vite, HTTP 200).
- [x] Alterar o raio de busca atualiza os resultados sem recarregar a página inteira — slider de raio (1-50km) muda um parâmetro do React Query (`useNearbyProfessionals`), refetch automático, sem reload.
- [x] Estados de vazio/erro têm feedback visual claro (mensagens dedicadas para `isLoading`/`isError`/lista vazia, não tela em branco).
- [ ] Testado em condição de rede lenta/3G simulada. **Não feito** — fora do escopo desta entrega (sem simulação de rede configurada no projeto).
- **Desvio deliberado:** não foi implementado scroll infinito/`useInfiniteQuery` nem paginação incremental — a query usa `limit`/`offset` fixos (`limit=20`), suficiente para o volume esperado nesta fase. Reavaliar se a listagem crescer a ponto de justificar paginação real.

---

## Fase 3 — Pedidos de Serviço: Criação, Acompanhamento & Ciclo de Vida

**Objetivo:** Implementar a criação de `service_requests` pelo `CLIENT` e as telas de gestão do ciclo de vida do pedido (`OPEN` → `ASSIGNED` → `COMPLETED`/`CANCELLED`) para ambos os perfis, consumindo a Fase 3 (Adendo v1.2) do backend.

**Escopo:**
- Formulário de criação de pedido (título, descrição, localização — GPS ou hierarquia).
- Tela do `CLIENT`: lista dos seus pedidos com estado atual e ação de cancelar (quando aplicável).
- Tela do `PROFESSIONAL`: lista de pedidos `OPEN` próximos (reutilizando componente de proximidade da Fase 2) com ação "Aceitar pedido".
- Tratamento explícito de conflito de atribuição: se dois profissionais tentarem aceitar o mesmo pedido, o segundo deve receber feedback claro (ex. "Este pedido já foi atribuído") em vez de erro genérico — reflete o teste de concorrência da Fase 3 do backend.
- Ação de marcar pedido como concluído, **visível apenas para o `CLIENT`** (decidido: quem recebeu o serviço confirma que foi prestado). Na vista do `PROFESSIONAL`, um pedido `ASSIGNED` mostra que aguarda confirmação do cliente — não um botão de concluir desativado.
- Ação de cancelar. **Decisão tomada (2026-09-17, ver plano do backend):** só o cliente pode cancelar, em qualquer estado não terminal (`OPEN` ou `ASSIGNED`) — mesma regra do endpoint de concluir. Um profissional atribuído não tem ação de cancelar na UI (só o cliente vê o botão).
- Notificações in-app (toast) para mudanças de estado. **Implementado** com `sonner` (`<Toaster />` montado em `App.tsx`, nível raiz): criar pedido, aceitar, concluir e cancelar disparam `toast.success`/`toast.error` a partir dos hooks (`useServiceRequests.ts`), reaproveitando a mensagem específica que o interceptor de `lib/api.ts` já extrai do backend (ex. "Este pedido já não está disponível para atribuição.") em vez de um texto genérico.

**Critérios de Entrega:**
- [x] Criação de pedido persiste corretamente e aparece na listagem do cliente com estado `OPEN` (`FindProfessionals.tsx` cria via `useCreateServiceRequest`; `MyServiceRequests.tsx` lista via novo endpoint `GET /service_requests` — **adicionado fora do escopo original desta fase**, ver TRD Adendo v1.5/backend: sem ele o cliente não tinha como voltar a ver um pedido já criado).
- [x] Aceitar um pedido já atribuído por outro profissional exibe mensagem de conflito específica (`NearbyServiceRequests.tsx`: "pode já ter sido atribuído a outro profissional" em vez de erro técnico cru) — reflete o 409 que o backend devolve quando a corrida de `assign` é perdida (testado no backend, ver critério de concorrência da Fase 3).
- [x] Transições de estado refletem-se na UI após refresh — `complete`/`cancel`/`assign` invalidam a query de listagem correspondente (React Query `invalidateQueries`), sem necessidade de reload manual. **Não em tempo real** (sem websocket/polling) — só após a própria ação do utilizador.
- [ ] Testes E2E (Playwright/Cypress) cobrindo o fluxo completo. **Não feito** — não existe suíte E2E neste repositório; validação foi build/lint limpos + leitura do fluxo, sem execução visual (sem driver de browser disponível nesta sessão). **Feito em parte (12/10/2026, Adendo v1.31, item B):** suite Playwright (`e2e/`, `npm run test:e2e`, 15 testes, no CI) sobre o build real com o backend simulado no browser — cliente da pesquisa ao pedido, guardas de rota, onboarding, Home e modo avião. **Continua por fazer** a jornada completa registo → KYC → subscrição → atribuição → conclusão, que só faz sentido contra o staging (Fase 7).

---

## Fase 4 — Onboarding de Profissional: KYC & Subscrição

**Objetivo:** Implementar o fluxo de verificação de identidade e ativação de subscrição para o perfil `PROFESSIONAL`, consumindo as Fases 4 e 5 do backend.

**Escopo:**
- Formulário de submissão KYC (BI, NUIT) com upload de documento (Supabase Storage via backend), incluindo validação de formato/tamanho de ficheiro.
- Tela de estado do KYC (`PENDING`/`APPROVED`/`REJECTED`), exibindo `review_notes` quando rejeitado (Adendo v1.2).
- Fluxo de subscrição: seleção de gateway mock (Vodacom/Movitel), input de contacto, chamada a `POST /subscriptions`.
- Tela de estado da subscrição (`INACTIVE`/`ACTIVE`/`EXPIRED`) com data de expiração visível.
- Bloqueio de funcionalidades dependentes (ex. aceitar pedidos) enquanto KYC não está `APPROVED` ou subscrição não está `ACTIVE`, com mensagens explicativas do que falta.

**Implementado em `feat/fase-4-kyc-onboarding`** (consumindo só a Fase 4 do backend — ver nota de escopo abaixo): `services/kyc.ts` (tipos + `fetchOwnKyc`/`submitKyc`/`uploadKycDocument`), `hooks/useKyc.ts` (`useOwnKyc`, `useSubmitKyc`), `pages/Kyc.tsx` (formulário de submissão BI/NUIT/documento + tela de estado com os três badges PENDING/APPROVED/REJECTED e `review_notes` visível na rejeição), rota `/verificacao-identidade` em `App.tsx`, link condicional em `Home.tsx` (só `profile.role === 'PROFESSIONAL'`). Upload usa signed upload URL (`POST /kyc/upload-url` + `supabase.storage.uploadToSignedUrl`) — primeira vez que este padrão aparece no frontend (diferente do avatar, que usa bucket público com upload direto). Validado manualmente no browser com utilizadores de teste reais (signup via Admin API, sessão real) contra o backend real: submissão → PENDING, rejeição via `/admin/kyc/:id` com `review_notes` → badge vermelho com motivo, resubmissão (upsert) → PENDING limpo, aprovação → badge verde, formulário de submissão escondido. Utilizadores e ficheiros de teste apagados após validação.

**Decisão de escopo (fora do TRD original, registada aqui e no TRD — ver Adendo abaixo):** esta entrega cobre só a parte de KYC. A parte de subscrição (Backend Fase 5) fica para quando essa fase do backend existir — não havia endpoint `POST /subscriptions` para consumir. Dividir a fase evita a regra fullstack (CLAUDE.md — backend e frontend andam sempre juntos) bloquear a entrega de KYC à espera de Subscrição, que depende de uma fase do backend ainda não iniciada.

**Item adicional fora do escopo original (TRD Adendo v1.6):** o backend expõe `GET /admin/kyc` e `PATCH /admin/kyc/:id` desde a Fase 4, mas nenhuma tela consumia esses endpoints — só eram exercíveis via API direta. Identificado ao promover a primeira conta real a `ADMIN` em produção e constatar que não havia forma de a usar dentro da app. Ver Adendo v1.6 do TRD para o contexto/decisão completos.

**Implementado em `feat/fase-4-subscricao` (parte de subscrição, consumindo a Fase 5 do backend — TRD Adendo v1.12):** `services/subscriptions.ts` + `hooks/useSubscription.ts` (resumo com polling de 3 s enquanto a última transação está `PENDING`, início de pagamento, leitura e ativação manual pelo admin); `pages/Subscription.tsx` (rota `/subscricao`) com os estados pela ordem em que bloqueiam — KYC não aprovado (pagamento indisponível até lá, decisão do Adendo v1.12 item F), pagamento a aguardar confirmação no telemóvel, pagamentos online indisponíveis (produção: ativação pela equipa), formulário M-Pesa/e-Mola com o prefixo `+258` fixo e validação do operador (84/85 Vodacom, 86/87 Movitel) antes do envio, renovação antecipada quando já ativa; `hooks/useProfessionalEligibility.ts` + `components/EligibilityNotice.tsx`; `pages/AssignedServiceRequests.tsx` (rota `/trabalhos-aceites`, para onde "Aceitar pedido" navega depois do sucesso); secção "Subscrição" em `AdminUserDetail.tsx`; links novos em `Home.tsx` para profissionais. O texto do KYC aprovado em `Kyc.tsx` deixou de dizer "já podes aceitar pedidos" (falta a subscrição) e passa a apontar para `/subscricao`.

**Critérios de Entrega:**
- [x] Upload de documento KYC funciona e o estado atualiza corretamente após revisão (simulada em staging). Validado manualmente (ver nota acima); sem staging dedicado ainda (Fase 7), testado contra o Supabase de desenvolvimento do projeto.
- [x] Profissional com KYC pendente/rejeitado ou subscrição inativa não consegue aceder às ações de aceitar pedidos — com explicação clara na UI, não apenas botão desabilitado sem contexto. Implementado em `feat/fase-4-subscricao` (ver nota abaixo): `EligibilityNotice` em "Pedidos perto de ti" lista os passos em falta, pela ordem real (KYC → subscrição), com link para cada um, e o botão "Aceitar pedido" referencia o aviso (`aria-describedby`). `tsc -b`/`vite build`/`eslint` limpos; **sem validação interativa em browser**.
- [x] Fluxo de subscrição mock completo testado: seleção → pendente → ativo (após webhook simulado no backend). Ecrã `pages/Subscription.tsx`, polling a `GET /subscriptions` enquanto o pagamento está `PENDING`; os endpoints que consome foram validados contra o backend real em 29/09/2026 (script de ponta a ponta, 30/30 — ver Fase 5 do plano do backend), teste que encontrou e corrigiu um `+` duplicado no telefone do cliente (`lib/phone.ts`, `formatInternationalPhone`). **Percorrido no browser em 29/09/2026** (ver nota "Validação no browser" abaixo): sem KYC aprovado o ecrã manda para a verificação e não mostra o formulário; e-Mola com número 84 é rejeitado no ecrã sem criar transação; M-Pesa → "A aguardar confirmação" (telefone com um só `+`) → "Ativa" com "Válida até" sem recarregar, e o formulário passa a "Renovar antecipadamente"; BD com a subscrição `ACTIVE` por 30 dias.
- [x] **(Adicionado, TRD Adendo v1.12)** Contacto do cliente para o profissional atribuído (`pages/AssignedServiceRequests.tsx`, rota `/trabalhos-aceites`): lista de trabalhos aceites, "Ver contacto do cliente" só nos pedidos em curso (pedido só quando aberto, não para a lista inteira), telefone como `tel:` e localização exata como link para o mapa; 403/409 do backend mostrados com a explicação e link para a subscrição. **Validado no browser em 29/09/2026:** em "Pedidos perto de ti" o profissional sem KYC vê o pedido da zona com "Aceitar pedido" bloqueado e o aviso com "Verificar"; com KYC e sem subscrição o aviso passa a "Ativar"; já elegível o aviso desaparece, "Aceitar pedido" navega para `/trabalhos-aceites`, o pedido aparece "Em curso" e o contacto mostra o nome, o `tel:` com o telefone certo do cliente e o link do mapa com as coordenadas exatas do pedido. Os caminhos 403/409 do contacto não foram exercitados no browser (cobertos pelos testes do backend).
- [x] **(Adicionado, TRD Adendo v1.12)** Ativação manual da subscrição pelo ADMIN na ficha de utilizador (`AdminUserDetail.tsx`, secção "Subscrição", só para `PROFESSIONAL`): estado atual, nota obrigatória sobre o pagamento recebido, confirmação em dois passos; indisponível enquanto o KYC não estiver aprovado. **Validado no browser em 29/09/2026:** profissional sem KYC → "A ativação só fica disponível depois de o KYC…"; com KYC → estado "Inativa", botão desativado sem nota, confirmação em dois passos, toast "Subscrição ativada até …", estado "Ativa" e botão "Renovar manualmente"; BD com uma transação `MANUAL` `CONFIRMED` sem telefone e `SUBSCRIPTION_ACTIVATE_MANUAL` no audit log com o admin como autor.

**Validação no browser (29/09/2026) — 33/33 verificações.** Script Playwright (`playwright-core` com o Chrome instalado, fora das dependências do projeto) contra o backend local (`ENABLE_PAYMENT_MOCK=true`, SMTP desligado) e o Supabase real, viewport de telemóvel (390×844), geolocalização simulada na Baixa de Maputo. Cinco contas descartáveis criadas pela Admin API (admin, profissional sem KYC, profissional que paga online, profissional ativado à mão, cliente com um pedido criado pela API) e apagadas no fim — 0 linhas restantes em `users_profile`, `professional_kyc`, `subscriptions`, `payment_transactions`, `service_requests` e `audit_log`. **Nota de ambiente:** o relógio desta máquina estava ~35 s atrás do da BD; sem o corrigir no processo do backend, uma subscrição acabada de pagar aparece como "Expirada" até o `starts_at` (hora da BD) passar, e o polling já parou. Corrigido no backend (`fix/subscricao-inicio-tolerancia-relogio`, tolerância de 5 minutos no início do período — ver Fase 5 do plano do backend e o TRD do backend, Adendo v1.12 item A), sem alteração neste repositório.
- [x] Testes cobrem os três estados de KYC e os três estados de subscrição na UI. Até 29/09/2026 o projeto não tinha test runner (decisão de não o introduzir na entrega original da fase); introduzido depois a pedido do utilizador (TRD Adendo v1.14): Vitest + Testing Library + jsdom, `npm test`, a correr no CI. `pages/Kyc.test.tsx` (5 testes: sem submissão, `PENDING`, `APPROVED` — aponta para a subscrição, não diz que já pode aceitar pedidos —, `REJECTED` com o motivo e o formulário de volta, erro ao carregar) e `pages/Subscription.test.tsx` (10 testes: `INACTIVE`/`ACTIVE`/`EXPIRED`; bloqueios pela ordem — KYC por aprovar, pagamento `PENDING` com o telefone com um só `+`, sem gateway —; último pagamento `FAILED`; e-Mola com número Vodacom e número incompleto sem pedido; M-Pesa envia só os 9 dígitos e o gateway). Os hooks do TanStack Query são simulados — os testes cobrem o que o ecrã mostra e envia, não a rede (essa ficou coberta pela validação no browser acima).
- [x] Tela de administração (TRD Adendo v1.6) permite a um `ADMIN` listar submissões KYC por estado e aprovar/rejeitar cada uma, com motivo obrigatório na rejeição — só acessível quando `profile.role === 'ADMIN'`. Implementado em `feat/painel-admin-kyc` (`pages/AdminKyc.tsx`, rota `/admin/kyc`), validado manualmente no browser com a conta admin real e um profissional de teste descartável.
- [x] **(TRD Adendo v1.8)** Tela de administração para o audit log — `services/auditLog.ts` + `hooks/useAuditLog.ts` + `pages/AdminAuditLog.tsx`, rota `/admin/audit-log`, mesma convenção de acesso do item acima (`profile.role === 'ADMIN'`). Filtros implementados: `action` (texto livre) e `success`; paginação Anterior/Seguinte. **Sem filtro por `user_id`/`entity_type`/intervalo de datas nesta entrega** (o backend já os aceita — extensão natural, não pedida). `created_at` formatado em `Africa/Maputo`, não na hora local do browser. `tsc -b`/`vite build`/`eslint` limpos; sem validação interativa em browser nem contra dados reais (migration do backend ainda não aplicada).

**Nota (Adendo v1.6):** o papel `ADMIN` como um todo está consolidado no TRD, Secção 7 ("Perfil ADMIN"), não repetido aqui por fase.

**Contrato ajustado à Fase 6 do backend (TRD Adendo v1.15), em `fix/contrato-fase-6-seguranca`:** `fetchOwnKyc`/`submitKyc` passam a devolver `OwnKyc` (sem `bi_document_url` nem `reviewed_by`, que o backend deixou de enviar ao próprio profissional) e `NearbyServiceRequest` perde `client_id`. Nenhum ecrã usava esses campos; `npm test` (15), lint e build limpos.

---

## Fase 5 — Experiência Offline & Resiliência de Rede

**Objetivo:** Consolidar o comportamento da PWA em condições de rede instável, típicas do contexto de uso em Moçambique (Secção 6 do TRD).

**Escopo:**
- Armazenamento de última localização conhecida em `localStorage`/IndexedDB, usada como fallback quando `navigator.geolocation` falha ou demora.
- Indicador visual de estado de conectividade (online/offline) na interface.
- Fila local (IndexedDB) para ações críticas tentadas offline (ex. criação de pedido), com sincronização e reconciliação quando a conexão volta — incluindo tratamento de idempotência (evitar duplicar o pedido se o retry coincidir com sucesso anterior).
- Testes com throttling de rede (DevTools) e modo avião.

**Critérios de Entrega:**
- [ ] Última localização conhecida é reutilizada corretamente quando GPS falha. **Implementado** (`lib/ultimaLocalizacao.ts`, `useGeolocation`, aviso em `FindProfessionals` e `NearbyServiceRequests`; Adendo v1.25): 18 testes novos. **Falta verificar num browser/telemóvel real** com o GPS recusado ou em modo avião.
- [ ] Criar um pedido em modo offline não perde os dados — é enfileirado e sincronizado ao reconectar, sem duplicação. **Implementado** (Adendo v1.27; backend Fase 13, Adendo v1.26, já em produção): fila em IndexedDB (`lib/filaOffline.ts`), `Idempotency-Key` gerada por formulário e guardada com o pedido, envio automático (`ProcessadorDaFila`), lista «Por enviar» em `MyServiceRequests`. 29 testes novos (a chave usada na tentativa é a mesma do item guardado; reenvio sem duplicar; 4xx recusa em vez de reenviar; isolamento por utilizador). **Falta verificar num browser real** (modo avião a meio de criar um pedido; fechar e reabrir a app com pedidos guardados) e que a criação com chave funciona contra o backend de produção. **E2E (12/10/2026, Adendo v1.31, item B):** `e2e/modo-aviao.spec.ts` corta a ligação antes de enviar, vê o pedido em «Por enviar» e confirma que, ao voltar a rede, é enviado **uma só vez** com `Idempotency-Key` — num Microsoft Edge real (emulação de rede e IndexedDB reais), mas com o backend simulado e sem service worker. **Continua por fazer** o teste num telemóvel e contra o backend de produção.
- [ ] Indicador de conectividade reflete o estado real da rede. **Implementado** (`lib/conectividade.ts`, `IndicadorDeLigacao`, ligado ao interceptor de `lib/api.ts`; Adendo v1.25): distingue «sem internet» de «servidor sem resposta». 6 testes. **Falta verificar com o modo avião e com throttling no DevTools.**
- [ ] Lighthouse PWA audit mantém pontuação alta (>90) após as mudanças desta fase.
- [x] **(Adendo v1.29, 13/10/2026 — branch `feat/aviso-nova-versao-centrado`, pedido do utilizador)** O aviso de nova versão passa a ser um cartão ao centro do ecrã, com a data da actualização e um resumo das novidades em linguagem simples (`components/AvisoDeNovaVersao.tsx`, `lib/novidades.ts`, `lib/novaVersao.ts`, `public/novidades.json`), em vez do botão pequeno no topo. Continua a nunca recarregar sozinho. **Processo novo:** editar `public/novidades.json` em cada versão a anunciar. 18 testes novos (suite a 222). `tsc -b`, `eslint` e `vite build` limpos. **Só aparece a partir da versão seguinte à que o traz, e não foi visto num browser real** (precisa de dois deploys seguidos).
- [x] **(Adendo v1.20, 07/10/2026 — branch `feat/pwa-aviso-nova-versao`, descoberto em produção)** Aviso de nova versão da PWA: o site publicado mostrava o ecrã antigo porque o service worker (`autoUpdate` sem recarregar) mantinha a versão antiga em quem deixava a app aberta. `registerType: 'prompt'` + `src/lib/pwaUpdate.ts` + registo em `main.tsx`: aviso persistente «Há uma nova versão disponível — Actualizar» (só activa e recarrega ao aceitar, para não apagar formulários a meio) e verificação de hora a hora com rede. 7 testes novos (suite a 88). `tsc -b`, `eslint` e `vite build` limpos. **Fluxo completo não verificado num browser real** (precisa de dois deploys seguidos); o primeiro browser com o service worker antigo precisa de um carregamento extra, uma única vez.

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
- [ ] Lighthouse Accessibility score > 90. **Medido (13/10/2026, build local, sem sessão): 96 no login e 100 no início** — cumpre nos ecrãs medidos. Falta medir os ecrãs com sessão e o site em produção (Adendo v1.30). A única falha é o contraste do «24» amarelo do logótipo (decisão pendente).
- [ ] Lighthouse Performance score > 80 em simulação de rede 4G/dispositivo médio. **Medido (13/10/2026, build local, sem sessão): 86 no login (era 82) e 89 no início** — cumpre nos ecrãs medidos, depois de code-splitting e bibliotecas em ficheiros próprios. Falta medir os ecrãs com sessão e o site em produção.
- [x] Nenhuma tela crítica (login, busca, criação de pedido) sem estado de carregamento/erro tratado. **Auditado (12/10/2026, Adendo v1.31, item C):** login e busca já tratavam os quatro estados (testes de `FindProfessionals`/`Login`, E2E de erro com «Tentar de novo»); `NewServiceRequest` confundia erro de rede com «sem localização» — corrigido e testado. `Profile` (histórico sem estado de erro) e os ecrãs de onboarding (erro sem botão para tentar de novo) **corrigidos depois (12/10/2026, Adendo v1.33)**, com `CompleteLocation` a ganhar teste.
- [ ] Revisão manual em pelo menos 3 tamanhos de viewport (mobile pequeno, mobile grande, desktop).
- [x] **(Adiantado no Adendo v1.13, pedido do utilizador)** Identidade visual da marca aplicada — paleta `piquete-*`, fontes Inter/Outfit alojadas no bundle (compatível com a CSP e offline), componentes `Button`/`Input`/`Card`/`Badge` em `src/components/ui/`, ícones PWA quadrados. Perfil migrado em `feat/redesign-tela-perfil`. **Migração dos ecrãs restantes concluída em 03/10/2026:** `pages/Subscription.tsx`, `pages/Kyc.tsx`, `pages/AssignedServiceRequests.tsx` e os seis ecrãs do painel de admin (`AdminUsers.tsx`, `AdminUserDetail.tsx`, `AdminMetrics.tsx`, `AdminServiceRequests.tsx`, `AdminAuditLog.tsx`, `AdminKyc.tsx`) passaram a usar `Button`/`Badge`/`Card`/`Input` e a paleta `piquete-*` em vez de Tailwind genérico (`bg-gray-900`, badges inline, `<button>`/`<input>` sem estilo do design system) — sem mudança de comportamento, props ou textos. `tsc -b`, `eslint` e `vite build` limpos; os 15 testes Vitest existentes (`Subscription.test.tsx`, `Kyc.test.tsx`) continuam a passar sem alteração (a interação e os textos verificados não mudaram). **Sem validação interativa em browser nesta sessão** (sem ferramenta de automação disponível) — risco baixo por ser só troca de classes/componentes de apresentação, mas por confirmar visualmente no primeiro acesso real. `FindProfessionals.tsx`, `NearbyServiceRequests.tsx`, `MyServiceRequests.tsx` não foram inspecionados nesta entrega — não estavam na lista de ecrãs pendentes registada aqui; confirmar se também precisam de migração numa próxima passagem pela Fase 6. **(Adendo v1.16, 03/10/2026)** `Profile.tsx` sofreu uma simplificação adicional, por pedido do utilizador com várias iterações de feedback sobre capturas de ecrã: remoção de badges/estrelas/selo de verificado/label "Conta: Cliente"/botões "Editar" e "Solicitar Novo Serviço", consolidação de editar dados + password + remover foto atrás de um só ícone de definições, mobile a ocupar o ecrã todo, e `LocationForm` a gravar a localização por GPS automaticamente (sem passo de confirmação). Uma tentativa de modal com fundo escurecido no desktop foi revertida — ver detalhe completo no TRD.
- [x] **(Adendo v1.19, 07/10/2026 — branch `feat/refinamento-tela-home`, pedido do utilizador)** Ecrã inicial (`Home`) redesenhado e decomposto: de um componente de 860 linhas para `pages/Home.tsx` (~120) + `hooks/useHomeUser.ts` + `hooks/useHomeFeed.ts` + `components/home/` (cabeçalho em barra de largura total, barra de categorias em texto, linha de boas-vindas com os dados de quem entrou, atalhos por papel, carrosséis com setas, cartões planos, menu do avatar com "Sair" também no telemóvel). Responsividade mobile-first: cabeçalho numa só árvore DOM, cartões em fracção da fila, alvos de toque ≥ 44 px, `dvh`/`safe-area`, `motion-reduce`. Fundo branco (o `body` global continua `gray-50` nos outros ecrãs). **Correcções:** cartões repetidos nos carrosséis, toast de favoritos duplicado em StrictMode, ponto vermelho do sino removido (não tinha dados). **Removido:** `components/ServiceSearch.tsx` (a pesquisa vive no cabeçalho; mesmo contrato `?q=`/`?category=`). 19 testes novos (`useHomeFeed`, `UserMenu`, `useFavorites`; suite a 81). `tsc -b`, `eslint` e `vite build` limpos. **Sem validação interativa automatizada** — aspeto visto e aprovado pelo utilizador no browser durante as iterações. Detalhe no Adendo v1.19 do TRD.
- [x] **(Adendo v1.21, 07/10/2026 — branch `feat/redesign-tela-login`, pedido do utilizador)** Ecrã de login redesenhado e decomposto: `pages/Login.tsx` de 571 para 37 linhas + `hooks/useLoginForm.ts` + `components/auth/` (`AuthLayout`, `CredentialsForm`, `RecoveryForm`, `AuthInput`, `ChannelTabs`, `OptionCards`, …) + `lib/authIntent.ts`. Título só "Bem-vindo" (tinha texto de outro produto, "Welcome back to Nucleus"), tudo em português, cores da marca, alvos de toque ≥ 44 px, `dvh`/`safe-area`, uma coluna abaixo de `lg`. Depoimento inventado do painel de imagem substituído por três frases verdadeiras; imagem com `loading="lazy"` (300 KB deixam de ser descarregados no telemóvel). **Regresso ao destino** (`lib/postLoginRedirect.ts`): `ProtectedRoute` → `/entrar?next=`, `?modo=criar-conta` para o botão "Criar conta" da Home, destino do Google via `sessionStorage`; só aceita caminhos internos (anti *open redirect*). **Página de termos de utilização** (`/termos`, pública, `pages/Terms.tsx` + `components/legal/LegalDocument.tsx` + `data/termosDeUtilizacao.ts`), ligada ao login numa nova aba — **rascunho de produto, a rever por um jurista**. **Eliminar conta** em *O meu perfil → Definições* (`components/profile/DeleteAccountSection.tsx`, confirmação escrita, aviso por papel, não aparece a administradores; `useDeleteAccount` ganhou `aoApagar` para navegar antes de a sessão terminar). Suite a 138 testes (Login reescrito, `postLoginRedirect`, `ProtectedRoute`, `Terms`, `DeleteAccountSection`). `tsc -b`, `eslint` e `vite build` limpos. **Não verificado num browser real.** Por fazer: comprimir `auth-hero.jpg`, revisão jurídica dos termos, **validar a eliminação de conta contra o Supabase real com dados da Fase 10/11** (convites, propostas, catálogo, avaliações — a cascata só foi testada em setembro, antes dessas tabelas), e o destino perde-se se o `OnboardingGate` desviar para completar o perfil. Detalhe no Adendo v1.21 do TRD.
- [x] Trabalhos em destaque da Home ligados a dados reais: hoje vêm de `src/data/featuredWorks.ts` (16 trabalhos fixos, fotos do Unsplash). Precisa de um endpoint do backend (trabalhos concluídos e avaliados, por serviço) — por decidir. **Feito (12/10/2026, Adendo v1.31, item E; Backend Fase 14):** `GET /portfolio/featured`, `useFeaturedWorks`, `EstadoDaMontra`; `src/data/featuredWorks.ts` apagado. **Montra pública (Adendo v1.32, decisão do utilizador):** o visitante sem sessão vê os trabalhos; o cartão leva à pesquisa do serviço (que passa pelo login), porque a resposta pública não traz o id do profissional. Termos de utilização actualizados (secções 4 e 7, 12/10/2026). **Opção `VITE_MONTRA_DE_DEMONSTRACAO` (Adendo v1.34, desligada por omissão)** mostra dados inventados, com aviso, enquanto não houver trabalhos reais — só para avaliar o aspecto, nunca em produção pública. Não visto no browser real.
- [x] Ponto de "por ler" no sino da Home, com contagem real (para o profissional, convites pendentes). Removido até lá. **Feito (12/10/2026, Adendo v1.31, item D):** o profissional vê o nº de convites por responder (`INVITED` com pedido `OPEN`), a partir de `GET /service_requests/invitations`, sem endpoint novo. O cliente continua sem ponto.
- [x] Home: `width`/`height` nas imagens dos cartões e esqueleto enquanto as categorias carregam — **já cobertos, sem código novo (Adendo v1.30, item F):** os cartões reservam o espaço com `aspect-ratio` (CLS medido 0,011) e a barra de categorias mostra a lista por omissão enquanto a API responde.

---

## Fase 7 — Integração Final, Staging & Deploy de Produção

**Objetivo:** Validar a integração completa com o backend em staging, executar testes de jornada completa e preparar o deploy de produção, em coordenação com a Fase 7 do backend.

**Estado (12/10/2026):** a Fase 7 do backend entregou o que esta fase consome — contrato OpenAPI em `GET /openapi.json` (e `/docs`), CORS por lista de origens, smoke e runbook (TRD Adendo v1.24). **O domínio oficial do frontend em produção é `https://piquete-pro24-front-end-beta.vercel.app`**: o domínio antigo (`piquete-pro24-front-end.vercel.app`) redirecciona para ele na Vercel, e `CORS_ORIGIN`/`FRONTEND_URL` (Fly) e os *Redirect URLs* (Supabase Auth) apontam só para ele. Em 13/10/2026 um deploy de produção saiu com `VITE_API_URL=http://localhost:3000` (valor do `.env` local) e o site ficou sem dados; corrigido e confirmado no ficheiro publicado (Adendo v1.28) — ao fechar esta fase, verificar sempre o `baseURL` no JavaScript publicado. Ainda **não existe ambiente de staging** (nem Fly nem Supabase), pelo que os critérios que o pedem continuam por marcar; o smoke de produção do backend passou 7/7 (sem passos autenticados).

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
- [x] **(Adiantado no Adendo v1.11, auditoria `appsec-health-audit`)** CSP e headers de segurança (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) configurados em `vercel.json`. **Pendente:** validar no primeiro deploy real (preview/produção) que a CSP não bloqueia nenhuma chamada legítima ao Supabase/backend — o header só é aplicado pelo Vercel, não pelo `vite dev` local. **Parcial (29/09/2026):** em produção, `/`, `/entrar` e `/profissionais` carregam sem nenhuma violação de CSP (`securitypolicyviolation` e consola) nem pedidos falhados — mas sem sessão a app não chama o Supabase nem o backend, por isso só a casca da app ficou validada. Falta repetir com login real (Supabase Auth + chamadas a `piquetepro24-backend.fly.dev`).

---

## Fase 8 — Painel de Administração Avançado (espelha o backend)

**Objetivo:** Consumir os endpoints da Fase 9 do backend (`Doc's/PLANO_IMPLEMENTACAO_BACKEND.md` e TRD Adendo v1.9 desse repositório) — diretório de utilizadores, visão administrativa de pedidos de serviço, métricas agregadas, alertas de segurança, ferramentas operacionais e moderação de contas. Ver TRD deste repositório, Adendo v1.9, para a lista completa.

**Nota de dependência:** só pode começar depois de cada endpoint correspondente existir no backend (Fase 9 desse repositório) — nenhum destes ecrãs tem para onde apontar antes disso. Não depende de nenhuma fase deste plano além da Fase 4 (mesma convenção de acesso `profile.role === 'ADMIN'` já estabelecida em `AdminKyc.tsx`/`AdminAuditLog.tsx`).

**Escopo:**
- `pages/AdminUsers.tsx` + `AdminUserDetail.tsx` — diretório e ficha individual, com link para o histórico desse utilizador em `/admin/audit-log?user_id=`.
- `pages/AdminServiceRequests.tsx` — lista global de pedidos + link para a timeline de um pedido via `/admin/audit-log?entity_type=service_requests&entity_id=`.
- `pages/AdminMetrics.tsx` — tiles com as métricas agregadas (sem componente financeiro).
- Alertas de segurança (secção própria ou dentro do ecrã de audit log existente).
- Na ficha de utilizador: banir/desbanir, mudar `role` (`CLIENT ↔ PROFESSIONAL` só — a UI não oferece `ADMIN` como opção, mesmo que o backend já rejeitasse), reenviar email. **"Revogar sessões" removido do escopo** — ver TRD do backend, Adendo v1.9 item G: o SDK do Supabase Auth instalado não suporta revogação por ID de utilizador.
- Estender `services/auditLog.ts` (hoje só `action`/`success`) para aceitar `user_id`/`entity_type`/`entity_id`/intervalo de datas.
- Links condicionais em `Home.tsx`, mesma convenção dos ecrãs de admin existentes.

**Critérios de Entrega:**
- [x] Diretório de utilizadores funciona (pesquisa, filtro por role) e a ficha individual mostra os dados corretos — `services/adminUsers.ts`, `hooks/useAdminUsers.ts`, `pages/AdminUsers.tsx` (`/admin/utilizadores`) + `pages/AdminUserDetail.tsx` (`/admin/utilizadores/:id`). `tsc -b`/`vite build`/`eslint` limpos; sem validação interativa em browser (sem ferramenta de automação disponível nesta sessão).
- [x] Link "Ver histórico" na ficha de utilizador abre o audit log já filtrado por esse utilizador — `AdminAuditLog.tsx` passou a ler `?user_id=` da URL (`useSearchParams`), com indicador do filtro ativo e botão para o limpar; `services/auditLog.ts` estendido para enviar `user_id` ao backend (que já o aceitava desde a Fase 8).
- [x] Lista de pedidos de serviço mostra pedidos de qualquer cliente, não só do admin autenticado — `services/adminServiceRequests.ts` + `hooks/useAdminServiceRequests.ts` + `pages/AdminServiceRequests.tsx` (`/admin/pedidos-servico`), filtro por estado, cancelamento admin com confirmação em duas etapas, link "Ver histórico" que abre o audit log filtrado por `entity_type`/`entity_id` (`AdminAuditLog.tsx` e `services/auditLog.ts` estendidos para aceitar os dois). `tsc -b`/`vite build`/`eslint` limpos; sem validação interativa em browser.
- [x] Métricas mostradas — `services/adminMetrics.ts` + `hooks/useAdminMetrics.ts` + `pages/AdminMetrics.tsx` (`/admin/metricas`), tiles simples sem gráficos (decisão registada no TRD). `tsc -b`/`vite build`/`eslint` limpos. **Correcção (03/10/2026):** esta nota dizia "não validado, RPC não aplicada" — desactualizada. A RPC `admin_metrics()` foi aplicada ao Supabase e o endpoint foi validado contra a produção em 29/09/2026 (27/27 verificações, ver Fase 9 do plano do backend); falta só repetir a comparação quando houver profissionais/KYC/pedidos reais em produção (cobertura à data limitada a 5 contas, todas `CLIENT`).
- [x] Alertas de segurança — `services/adminSecurityAlerts.ts` + `hooks/useAdminSecurityAlerts.ts` + secção `SecurityAlertsPanel` embutida no topo de `AdminAuditLog.tsx` (não uma tela à parte). Sem alertas, não mostra nada (evita ruído de "está tudo bem" permanente). Clique num alerta por utilizador filtra o audit log por esse `user_id`, reaproveitando o mesmo mecanismo do item B. `tsc -b`/`vite build`/`eslint` limpos. **Correcção (03/10/2026):** esta nota dizia "não validado, RPC não aplicada" — desactualizada. A RPC `admin_security_alerts()` foi aplicada ao Supabase e o endpoint foi validado contra um caso real de tentativas negadas repetidas (ver Fase 9 do plano do backend).
- [x] Botão de reenviar email na ficha de utilizador — `services/adminUsers.ts` (`resendEmail`) + `hooks/useAdminUsers.ts` (`useResendEmail`) + secção nova em `AdminUserDetail.tsx` (select de template + botão, feedback via `toast` distinguindo sucesso/desligado/falha). `tsc -b`/`vite build`/`eslint` limpos; sem validação interativa em browser.
- [x] Ações de moderação (banir/desbanir/mudar role) — `services/adminUsers.ts` (`banUser`/`unbanUser`/`changeUserRole`) + `hooks/useAdminUsers.ts` (`useBanUser`/`useUnbanUser`/`useChangeUserRole`, cada mutação invalida a query de detalhe do utilizador) + secção "Moderação de conta" em `AdminUserDetail.tsx`, com confirmação explícita em duas etapas antes de executar (mesma convenção de "Apagar conta" em `Profile.tsx`). Estado do banimento (`banned_until`) decide se o botão mostra "Banir conta" ou "Levantar banimento". Mudar role só aparece para `CLIENT`/`PROFESSIONAL` (oculto para `ADMIN`); ao mudar `CLIENT` → `PROFESSIONAL` pede o `professionalType` (`SINGULAR`/`COMPANY`), obrigatório no backend. **"Revogar sessão" não implementado** — ver nota no escopo acima. `tsc -b`/`vite build`/`eslint` limpos; sem validação interativa em browser (sem ferramenta de automação disponível nesta sessão); sem suite de testes automatizados configurada neste frontend (`package.json` não tem script `test`).
- [x] Nenhum ecrã ou botão oferece promover alguém a `ADMIN` — o seletor de role em `AdminUserDetail.tsx` nunca lista `ADMIN` como opção (é um toggle fixo entre o role atual e o outro), e o backend usa `z.discriminatedUnion` para rejeitar ativamente qualquer tentativa.

---

## Fase 9 — Catálogo do Profissional (Bio, Portfólio & Avaliações)

**Objetivo:** consumir a Fase 10 do backend (`Doc's/PLANO_IMPLEMENTACAO_BACKEND.md` desse repositório e TRD Adendo v1.17) — ecrã onde o profissional edita a própria bio e fotos de trabalhos, e ecrã onde qualquer utilizador autenticado vê o catálogo de um profissional (bio, fotos, avaliações de clientes).

**Nota de dependência:** só pode começar depois dos endpoints da Fase 10 do backend existirem. Não depende de nenhuma fase deste plano além da Fase 4 (mesma convenção de guard `profile.role === 'PROFESSIONAL'` já estabelecida em `Kyc.tsx`/`Subscription.tsx`).

**Escopo:**
- `src/services/catalog.ts` — tipos (`PortfolioPhoto`, `Review`, `ProfessionalCatalog`) + `fetchProfessionalCatalog(id)`, `addPortfolioPhoto(url)`, `removePortfolioPhoto(id)`, `submitReview(serviceRequestId, { rating, comment })`.
- `src/services/portfolio.ts` — upload de foto de portfólio, **mesmo padrão de `src/services/avatar.ts`**: converte com `convertToWebp` (`src/lib/imageConversion.ts`, já existente e já preparado para este caso — comentário no código previa exactamente esta reutilização), valida tipo/tamanho (reaproveitar `MAX_FILE_SIZE_BYTES` do padrão de avatar), faz upload directo ao bucket `portfolio-photos` com a `anon key` (RLS por pasta `<user_id>/...`, ver Fase 10 do backend), devolve o URL público para `addPortfolioPhoto`. **Nenhuma lógica de conversão nova** — só reutilização.
- `src/hooks/useCatalog.ts` — `useProfessionalCatalog(id)`, `useAddPortfolioPhoto()`, `useRemovePortfolioPhoto()`, `useSubmitReview()`, cada mutação invalida a query do catálogo afetado.
- `src/pages/MyCatalog.tsx` — ecrã de edição do próprio catálogo: `bio` (textarea, reaproveita o padrão de edição inline de `Profile.tsx`, grava via `PATCH /profile` já existente), grid de fotos com botão de remover, input de upload que chama `portfolio.ts`. Guard inline `profile?.role !== 'PROFESSIONAL'` (mesmo padrão de `AdminKyc.tsx`).
- `src/pages/ProfessionalCatalog.tsx` — ecrã de visualização (bio, grid de fotos, média de avaliação, lista de comentários com nome do cliente). Usado tanto quando um `CLIENT` vê um profissional (link novo em `FindProfessionals.tsx`) como quando o próprio profissional pré-visualiza o que editou (link a partir de `MyCatalog.tsx`).
- Formulário de avaliação: secção nova em `AssignedServiceRequests.tsx`/`MyServiceRequests.tsx` (ecrã do cliente), visível só quando `status = 'COMPLETED'` e o pedido ainda não tem avaliação — reaproveita o padrão de confirmação já usado noutras ações.
- Rotas novas em `App.tsx`: `/catalogo` (`ProtectedRoute` + `OnboardingGate`, guard `PROFESSIONAL` dentro da página) e `/profissionais/:id` (`ProtectedRoute` + `OnboardingGate`, qualquer role).
- Link para `/catalogo` em `Home.tsx`, só visível a `profile.role === 'PROFESSIONAL'` (mesma convenção dos outros links condicionais); link "Ver perfil" em `FindProfessionals.tsx` para `/profissionais/:id`.

**Implementado em `feat/fase-9-catalogo-profissional`:** `services/catalog.ts` (tipos `Review`/`ProfessionalCatalog` + `fetchProfessionalCatalog`), `services/portfolio.ts` (`uploadPortfolioPhoto` — reaproveita `convertToWebp` de `lib/imageConversion.ts` sem lógica nova, `addPortfolioPhoto`, `removePortfolioPhoto`), `hooks/useCatalog.ts` (`useProfessionalCatalog`, `useAddPortfolioPhoto`, `useRemovePortfolioPhoto`, `useSubmitReview`), `pages/MyCatalog.tsx` (edição: bio via `PATCH /profile` já existente, grid de fotos com remover, upload), `pages/ProfessionalCatalog.tsx` (visualização: bio, grid de fotos, média + lista de avaliações). **Desvio ao escopo original:** o formulário de avaliação (`ReviewForm`, submissão de `rating`/`comment`) entrou em `MyServiceRequests.tsx` (ecrã do cliente) e **não** em `AssignedServiceRequests.tsx` (ecrã do profissional) — é o cliente que avalia o profissional, não o inverso; o plano original listava os dois ecrãs por engano. Depende de `has_review` por pedido, devolvido por `GET /service_requests` desde o desvio registado na Fase 10 do backend — sem isso o formulário reapareceria em cada visita a um pedido já avaliado. Rotas `/catalogo` e `/profissionais/:id` registadas em `App.tsx`; link "O meu catálogo" em `Home.tsx`; nome do profissional em `FindProfessionals.tsx` passou a `<Link>` para `/profissionais/:id`. `tsc -b`, `eslint` e `vite build` limpos (os 2 avisos/erro de lint existentes em `Logo.tsx`/`AuthContext.tsx` são pré-existentes, não tocados por esta entrega). **Correcção (05/10/2026):** esta nota dizia que o frontend não tinha suite de testes — errado, existe Vitest (`npm test`, `Kyc.test.tsx` e `Subscription.test.tsx`, 15 testes, que continuam a passar); o que é verdade é que **os ecrãs do catálogo desta fase não têm testes**. Validado só por build/lint, sem verificação interativa em browser (sem ferramenta de automação disponível nesta sessão).

**Critérios de Entrega:**
- [x] Profissional edita a própria `bio` e o valor persiste depois de recarregar a página — implementado via `PATCH /profile`; não validado interativamente em browser nesta sessão.
- [x] Upload de foto de portfólio funciona de ponta a ponta, convertida para `.webp` antes do envio — reaproveita `convertToWebp`, já validado para o avatar; não repetido manualmente para portfólio nesta sessão.
- [x] Remover foto própria funciona; tentar remover foto de outro profissional é rejeitado pelo backend — coberto pelos testes de rota do backend (`catalog.test.ts`), não por teste de frontend (sem suite configurada).
- [x] `ProfessionalCatalog.tsx` mostra bio, fotos, média de avaliação e lista de comentários.
- [x] Formulário de avaliação só aparece em pedidos `COMPLETED` sem avaliação prévia (`has_review === false`); depois de submetida, a mutação invalida a lista e o formulário desaparece. **Sem edição posterior** (decisão do backend, TRD Adendo v1.17, item E) — não "mostra a avaliação já dada", como o plano original admitia como alternativa; fica simplesmente sem formulário.
- [x] `tsc -b`, `eslint` e `vite build` limpos.

---

## Fase 10 — Pesquisa por Serviço, Pedido a Vários Profissionais & Propostas

**Estado: plano aprovado pelo utilizador (05/10/2026). Blocos A e B em `main` e em produção (backend v41 no Fly a 06/10/2026; o fluxo completo convite → proposta → escolha ainda por validar contra o backend real, ver critérios). Bloco C em `main` (07/10/2026), depois de o backend do Bloco C estar em produção (v42).**

**Implementado — Bloco A:** `services/serviceCategories.ts` + `hooks/useServiceCategories.ts`, `services/professionalSearch.ts` + `hooks/useProfessionalSearch.ts` (`useInfiniteQuery`, offset com o mesmo tecto do backend); `pages/FindProfessionals.tsx` reescrita (campo de pesquisa com debounce de 350 ms, chips de serviço, agrupamento "Perto de ti"/"Outros profissionais", estados loading/erro/vazio/sucesso, "Ver mais"); `components/ServiceSearch.tsx` no ecrã inicial do cliente (`Home.tsx`) — **pedido do utilizador durante a implementação: "ao entrar no sistema deve aparecer um campo de busca por serviços"** (campo + atalhos das 6 primeiras categorias; o texto viaja no URL como `?q=`/`?category=`); `MyCatalog.tsx` ganha a escolha de serviços (chips, 1–5, "Guardar serviços") e `ProfessionalCatalog.tsx` mostra-os. **Desvios ao plano abaixo:**
- **O botão "Pedir" (pedido aberto, sem profissional) mantém-se nos cartões por agora.** O plano dizia que saía neste bloco, mas sem ele o cliente ficava sem qualquer forma de criar um pedido até o Bloco B existir. Sai no Bloco B, quando a selecção múltipla o substituir.
- **GPS pedido sozinho só se a permissão já tiver sido dada** (Permissions API); caso contrário o cliente usa o botão "Localizar". Sem localização a lista aparece na mesma, sem distâncias.
- `hooks/useNearbyProfessionals.ts` e `services/nearbyProfessionals.ts` **apagados** — ficaram sem consumidores com a reescrita (o endpoint `/professionals/nearby` mantém-se no backend).
- `FindProfessionals.test.tsx` (10 testes novos: agrupamento perto/outros, distâncias, serviços truncados a 2, sem localização, vazio, erro, filtros vindos do URL). `tsc -b` limpo; `eslint` só com os 2 problemas pré-existentes (`Logo.tsx`, `AuthContext.tsx`). Não verificado em browser nesta sessão.

**Implementado — Bloco B:** `services/invitations.ts` (tipos e chamadas; `INVITATIONS_PER_REQUEST = 3`), `hooks/useInvitations.ts`, `pages/NewServiceRequest.tsx` (`/novo-pedido`), `pages/ReceivedInvitations.tsx` (`/pedidos-recebidos`), `pages/RequestProposals.tsx` (`/os-meus-pedidos/:id/propostas`); `FindProfessionals.tsx` ganha a selecção de profissionais e a barra "Pedir a N"; `MyServiceRequests.tsx` mostra "Enviado a N profissionais · M propostas" com atalho; `Home.tsx` do profissional ganha "Pedidos recebidos" como acção principal ("Pedidos perto de ti" passa a secundária); rotas em `App.tsx`. **Desvios ao plano abaixo:**
- **Exatamente 3 profissionais, não "3 a 5"** — decisão do utilizador em 06/10/2026 ("no máximo 3 propostas"; ver Adendo v1.18, item C). A barra mostra "0/3" e só activa o botão com 3 escolhidos; quando há menos de 3 profissionais para o serviço, escolhem-se todos ("só há 2 para Canalização"). Com mais páginas de resultados por carregar não se sabe ainda quantos há: pede-se 3 e o backend confirma.
- **Que serviço se está a pedir:** o botão de serviço escolhido ou, sem botão, o único serviço comum a todos os resultados (quem pesquisa "canalizador" só vê canalizadores). Com resultados de serviços diferentes o ecrã pede para escolher o serviço primeiro e não mostra caixas de selecção. Não estava no plano — o backend exige `category_id` e o texto livre da pesquisa não o dá.
- **O botão provisório "Pedir" (pedido aberto) saiu**, como previsto; `useCreateServiceRequest` passou a ser usado só por `NewServiceRequest.tsx`.
- **O local do serviço vem do perfil** (o onboarding já obriga a ter localização), não de um formulário novo com `LocationForm` como o plano dizia: pedir outra vez a mesma morada seria atrito. O ecrã mostra o local e um atalho "Alterar no perfil"; sem província no perfil não deixa enviar.
- **`hooks/useProposals.ts` não existe** — as propostas ficaram em `hooks/useInvitations.ts` (um só ficheiro por domínio, como o resto do repositório).
- **O pedido fica sem "Concluir" até ser escolhido alguém:** um pedido dirigido continua `OPEN`; só depois de escolher passa a `ASSIGNED` e o botão "Concluir" aparece (comportamento herdado de `MyServiceRequests.tsx`, não alterado).
- Testes novos: `ReceivedInvitations.test.tsx` (15), `RequestProposals.test.tsx` (11) e 6 casos de selecção em `FindProfessionals.test.tsx` (agora 16). `NewServiceRequest.tsx`, `ServiceSearch.tsx` e a ligação em `MyServiceRequests.tsx` **não têm teste**. `tsc -b` limpo; `eslint` só com os 2 problemas pré-existentes. Não verificado em browser, nem contra o backend real (o do Bloco B ainda não está em produção).

**Objetivo:** consumir a Fase 11 do backend (`Doc's/PLANO_IMPLEMENTACAO_BACKEND.md` desse repositório e TRD Adendo v1.18): o cliente pesquisa um serviço ou nome, vê os profissionais (perto primeiro, depois os restantes), abre o catálogo, escolhe três, envia o pedido, compara propostas e escolhe; o profissional define os seus serviços e responde a convites.

**Nota de dependência:** cada bloco só começa depois do bloco correspondente do backend existir. Reaproveita o catálogo (Fase 9) como ecrã de destino da lista de resultados.

**Escopo — três blocos, na mesma ordem do backend:**

**Bloco A — Serviços e pesquisa**
- `services/serviceCategories.ts` + `hooks/useServiceCategories.ts` (lista), `services/professionalSearch.ts` + `hooks/useProfessionalSearch.ts` (`GET /professionals/search`, paginação com `useInfiniteQuery`).
- `pages/FindProfessionals.tsx` é **reescrita**: campo de pesquisa (texto + chips das categorias mais comuns), pede a localização (reaproveita `useGeolocation`; sem GPS pesquisa na mesma, ordenada sem distância), resultados em duas secções — "Perto de ti" (`is_nearby`) e "Outros profissionais" — cada cartão com foto, nome, serviços, média de avaliações, distância; toque abre `/profissionais/:id`. Estados: loading (skeleton), erro, vazio ("Nenhum canalizador encontrado"), sucesso. O botão "Pedir" actual (pedido aberto sem profissional) sai deste ecrã; o fluxo passa a ser o do Bloco B.
- `pages/MyCatalog.tsx` ganha a escolha dos serviços (chips multi-selecção de `GET /service-categories`, 1–5, `PUT /professionals/me/services`); `pages/ProfessionalCatalog.tsx` mostra os serviços do profissional.

**Bloco B — Pedido, propostas e escolha**
- Cartões de resultado ganham selecção (caixa), barra fixa em baixo "Pedir a N" (activa com exatamente 3 escolhidos, ou todos se houver menos de 3) → `pages/NewServiceRequest.tsx` (título, descrição, local do perfil) → `POST /service_requests` com `category_id` + `professional_ids`.
- Profissional: `pages/ReceivedInvitations.tsx` (`/pedidos-recebidos`, link em `Home.tsx`) — convites com estado, formulário de proposta (preço em MZN + mensagem) ou recusar; se não elegível, mostra porquê com link para KYC/subscrição.
- Cliente: `pages/MyServiceRequests.tsx` mostra, por pedido, nº de propostas; novo `pages/RequestProposals.tsx` (`/os-meus-pedidos/:id/propostas`) compara propostas lado a lado (preço, mensagem, média e nº de avaliações, link para o catálogo) e permite **escolher** (confirmação em duas etapas, mesma convenção de "Apagar conta"). Depois de escolhido mostra o telefone do profissional.
- `hooks/useInvitations.ts`, `services/invitations.ts`; todas as mutações invalidam as queries afectadas.

**Implementado — Bloco C:** `services/clientHistory.ts`, `hooks/useWorkedWithProfessionals.ts` (a chave é invalidada ao concluir um pedido e ao avaliar), `pages/MyProfessionals.tsx` (`/os-meus-profissionais`, atalho "Os meus profissionais" em `Home.tsx` do cliente) com os quatro estados (skeleton, erro com "Tentar de novo", vazio com atalho para procurar, lista) e `MyProfessionals.test.tsx` (5 testes). `MyServiceRequests.tsx` mostra "Profissional: <nome>" (link para o catálogo) nos pedidos com profissional, a partir do novo `professional_name` de `GET /service_requests`. **Desvio ao plano:** "Pedir outra vez" abre o catálogo do profissional (`/profissionais/:id`) e não cria um pedido directo — o fluxo de pedido parte sempre da escolha de 3 profissionais, e um atalho que enviasse o pedido a um só contradiria essa regra.

**Bloco C — Histórico**
- `pages/MyProfessionals.tsx` (`/os-meus-profissionais`, link em `Home.tsx` do cliente): "Profissionais com quem já trabalhaste" — nº de trabalhos, último, a tua avaliação, atalho "Pedir outra vez" (abre o catálogo). `MyServiceRequests.tsx` mostra o profissional escolhido por pedido.

**Critérios de Entrega:**
- [x] Bloco A: pesquisar "canalizador" lista os canalizadores, os próximos primeiro, depois os restantes, com os quatro estados de UI tratados — por teste de componente (`FindProfessionals.test.tsx`); não visto no browser.
- [x] Bloco A: profissional escolhe e guarda vários serviços; aparecem no catálogo e na pesquisa — implementado em `MyCatalog.tsx`/`ProfessionalCatalog.tsx`; **sem teste de componente e não visto no browser**.
- [x] Bloco B: só deixa enviar com exatamente 3 escolhidos (ou todos, se houver menos de 3 profissionais para o serviço), bloqueia as restantes caixas aos 3 e leva ao novo pedido com o serviço e os profissionais certos — por teste de componente.
- [x] Bloco B: profissional convidado vê o convite, propõe (preço com vírgula decimal, mensagem opcional) ou recusa; preço inválido não envia; não elegível vê o motivo e o caminho para resolver, sem formulário — por teste de componente.
- [x] Bloco B: cliente compara propostas e escolhe uma com confirmação em duas etapas; só depois vê o telefone do profissional — por teste de componente. **Fluxo completo contra o backend real por validar** (o backend do Bloco B ainda não está em produção).
- [x] Bloco C: histórico lista os profissionais devolvidos por `GET /clients/me/professionals` (só pedidos concluídos, garantido pelo backend), com os quatro estados, e "Pedir outra vez" abre o catálogo certo — por teste de componente (`MyProfessionals.test.tsx`); **não visto no browser nem validado contra dados reais** (o endpoint já está em produção, v42).
- [x] `tsc -b`, `eslint` e `vite build` limpos (os 2 problemas de lint pré-existentes em `Logo.tsx`/`AuthContext.tsx` não contam). Blocos A e B: `tsc -b`, `eslint` e `vite build` limpos (57 testes de frontend a passar). Fica por marcar até o Bloco C estar feito. **Fechado com o Bloco C feito (12/10/2026):** `tsc -b`, `eslint` (só o aviso pré-existente de `AuthContext.tsx`) e `vite build` limpos; 325 testes Vitest e 15 E2E.

---

## Fase 11 — Portfólio por Trabalho (carrossel)

**Estado: implementada em `feat/portfolio-por-projeto` (12/10/2026); a migration da Fase 12 do backend já está aplicada ao Supabase real (12/10/2026).** Ver Adendo v1.23 do TRD.

**Objetivo:** o profissional cria **trabalhos** (serviço + descrição + 1 a 10 fotos) e o cliente vê cada um como um carrossel, como um post com várias imagens.

**Nota de dependência:** consome os endpoints `/professionals/me/projects*` e o campo `projects` do catálogo (Backend Fase 12). Backend primeiro, frontend depois.

**Escopo:**
- `services/portfolio.ts`: tipos `PortfolioProject`/`ProjectPhoto`; `uploadPortfolioPhotos` (WebP, 3 em paralelo, ordem preservada, pára à primeira falha, progresso); chamadas à API dos trabalhos. Removidos `uploadPortfolioPhoto`, `addPortfolioPhoto` e `removePortfolioPhoto` (fotos soltas), sem consumo.
- `hooks/useCatalog.ts`: `useCreateProject`, `useUpdateProject`, `useAddProjectPhotos`, `useRemoveProjectPhoto`, `useRemoveProject`.
- `components/portfolio/`: `ProjectCarousel` (`scroll-snap` em CSS, contador, pontos, setas só com rato), `PhotoLightbox` (setas, teclado e deslize, só entre as fotos do trabalho), `ProjectCard`, `NewProjectForm` (serviço → fotos com capa e reordenação → descrição), `ProjectEditor` (serviço, descrição, fotos e apagar).
- `pages/MyCatalog.tsx`: secção «Os teus trabalhos». `pages/ProfessionalCatalog.tsx`: lista de cartões, filtro por serviço (2 ou mais serviços), contador «Trabalhos» por trabalho, capa a partir do trabalho mais recente.

**Critérios de Entrega:**
- [x] Os 4 estados (loading, erro, vazio, dados) em «Os teus trabalhos» e em «Trabalhos realizados»; sem serviços guardados o botão «Novo trabalho» fica desactivado com a explicação.
- [x] Upload de várias fotos: ordem preservada, máx. 3 em simultâneo, pára à primeira falha, ficheiro inválido rejeitado antes do Storage — por teste (`portfolio.test.ts`). Carrossel (contador só com 2+ fotos, abrir foto por índice) e lightbox (navegação limitada ao trabalho, teclado, deslize, fechar) — por teste (`ProjectCarousel.test.tsx`).
- [x] Lint (`oxlint`), `npm run build` e 152 testes (eram 138) limpos. Sem dependência nova.
- [ ] **Não validado no browser real nem em telemóvel** (deslize do carrossel com o dedo, `scroll-snap` em Safari/iOS, pré-visualizações, fluxo completo contra o backend). `NewProjectForm` e `ProjectEditor` **passaram a ter teste de componente** (25 testes, 12/10/2026, Adendo v1.31).
- [ ] Reordenar fotos de um trabalho já publicado: fora de âmbito (só se ordena ao criar).

**Consumo do backend:** Fase 12 do `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`.

---

## Fase 12 — Dashboard de Entrada do Admin

**Estado: em produção — integrada em `main` pelo merge `9d57177` de `feat/dashboard-admin`; por validar no browser.** Ver Adendo v1.39 do TRD.

**Objetivo:** dar ao `ADMIN` uma entrada única (`/admin`) que mostre o que precisa de atenção agora e leve a todos os ecrãs de administração. Hoje o atalho «Painel Admin» da Home abre directamente `/admin/kyc`, as Métricas e o Registo de auditoria só se alcançam escrevendo o URL, e não há contadores de pendentes.

**Nota de dependência:** **só frontend** — não há endpoint novo. Reutiliza `GET /admin/metrics` (`kycByStatus.PENDING`, `serviceRequestsByStatus.OPEN`) e `GET /admin/security-alerts`, ambos já em produção. Os contadores vêm de agregados; não se pagina nenhuma lista só para contar.

**Escopo:**
- `pages/AdminDashboard.tsx` (`/admin`, `lazy`, `ProtectedRoute` + `RotaDeAdmin`).
- Cartões de atenção: KYC em análise, pedidos abertos e alertas de segurança das últimas 24h (mesmos parâmetros do `AdminAuditLog`), cada um a levar ao ecrã correspondente (o de verificações já abre em «Em análise»; os outros abrem sem filtro). Zero pendentes mostra «Tudo em dia», não um número 0 destacado.
- Grelha de atalhos para os cinco ecrãs de destino (a ficha de utilizador chega-se pela lista), incluindo Métricas e Registo de auditoria.
- `components/admin/NavegacaoAdmin` (barra de separadores, com `destinos.ts` como lista única) nos seis ecrãs existentes e no dashboard. **Desvio:** acrescenta-se por baixo do cabeçalho; o botão de voltar mantém-se.
- Extrair o guard de role (hoje repetido em 6 páginas) para um componente `RotaDeAdmin`, aplicado **na rota** (`App.tsx`) e não dentro de cada página; os seis guards inline foram removidos. Aprovado pelo utilizador ao pedir a implementação. Efeito: uma página de admin já não monta (nem pede dados que dariam 403) para quem não é ADMIN.
- Home: o atalho «Painel Admin» passa a apontar para `/admin` (`acoesRapidas.ts`, `papeis.ts`).

**Critérios de Entrega:**
- [x] `/admin` trata os 4 estados (skeleton, erro, vazio/«Tudo em dia», dados); um erro numa fonte não esconde as outras — por teste (`AdminDashboard.test.tsx`).
- [ ] Os contadores batem com os ecrãs de destino. Vêm das mesmas fontes (`/admin/metrics`, `/admin/security-alerts` com 24h/5 tentativas, como o Registo de auditoria); **falta confirmar contra dados reais.**
- [x] Não-admin é redireccionado para a Home sem montar o ecrã (`RotaDeAdmin.test.tsx`); sem sessão o `ProtectedRoute` leva a `/entrar?next=/admin` (comportamento já testado em `ProtectedRoute.test.tsx`).
- [ ] Todos os ecrãs de admin acessíveis a partir do dashboard e de volta, em telemóvel (390 px) e desktop. **Ligações testadas; layout não visto num browser.**
- [x] Testes de componente (10 novos: 5 do dashboard, 5 do guard); `npm run lint` (0 erros; 1 aviso que já existia em `AuthContext.tsx`), `npm run build` e `npm test` (382 testes) limpos. Sem dependência nova.

**Decisões:** o refactor `RotaDeAdmin` entrou nesta fase; o dashboard fica sem gráficos (Adendo v1.9 D).

**Consumo do backend:** Fase 9 do `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md` (já entregue). Sem alterações no backend.

---

## Fase 13 — Subscrições e Pagamentos no Painel de Admin

**Estado: em produção — integrada em `main` pelo merge `9d57177`; por validar no browser.** Ver Adendo v1.41 do TRD. Consome a Fase 15 do backend (backend primeiro).

**Escopo:**
- `pages/AdminSubscriptions.tsx` (`/admin/subscricoes`): separadores Subscrições (filtro: a expirar por omissão, activas, expiradas, sem pagamento) e Pagamentos (filtro por estado), paginados de 25 em 25; «Suspender» com motivo obrigatório.
- `services/adminSubscriptions.ts`, `hooks/useAdminSubscriptions.ts`.
- Dashboard: novo cartão «Subscrições a expirar (7 dias)»; entrada «Subscrições» na navegação (`destinos.ts`). A activação manual continua na ficha do utilizador (já existia).

**Critérios de Entrega:**
- [x] 4 estados (a carregar, erro, vazio, dados), motivo obrigatório antes de suspender, «Suspender» só em subscrições activas, separador de pagamentos — 5 testes (`AdminSubscriptions.test.tsx`); dashboard actualizado (6 testes).
- [ ] Layout em 390 px e em desktop, e contra o backend real: não verificado.

---

## Fase 14 — Revisão de KYC mais completa

**Estado: em produção — integrada em `main` pelo merge `9d57177`; por validar no browser.** Ver Adendo v1.42 do TRD. Consome a Fase 16 do backend (migration primeiro).

**Escopo (`pages/AdminKyc.tsx`):**
- Cada submissão em análise mostra «Em espera há X» e, a partir de 48 h, «— em atraso» (texto, não só cor). Lógica em `lib/esperaKyc.ts` (`LIMITE_ESPERA_KYC_HORAS`).
- Motivos frequentes de rejeição (`MOTIVOS_DE_REJEICAO_KYC`): um toque preenche a caixa, que continua editável.
- «Reabrir revisão» nas submissões rejeitadas (`useReopenKyc`, `reopenKyc` em `services/kyc.ts`).
- `ProfessionalKyc.submitted_at` no contrato (`OwnKyc` não o inclui).

**Critérios de Entrega:**
- [x] Espera (horas, dias, atraso, datas inválidas), motivos e reabertura — 9 testes (`esperaKyc.test.ts`, `AdminKyc.test.tsx`).
- [ ] Contra o backend real, com a migration aplicada, e o layout num telemóvel: não verificado.

---

## Fase 15 — Denúncias e Moderação

**Estado: em produção — integrada em `main` pelo merge `9d57177`; por validar no browser.** Ver Adendo v1.43 do TRD. Consome a Fase 17 do backend (migration primeiro).

**Escopo:**
- `components/moderacao/BotaoDenunciar.tsx`: formulário inline (motivo + detalhes) que cria a denúncia; confirma o envio e mostra o erro do servidor (ex. «já denunciaste»). Usado no catálogo de um profissional por quem **não** é o dono: a conta (fim da página), cada trabalho e cada comentário de avaliação.
- Catálogo: o dono vê os trabalhos ocultados com o aviso e o motivo; um comentário ocultado mostra «Comentário removido pela moderação» (`PortfolioProject.hidden/hidden_reason`, `Review.comment_hidden`).
- `pages/AdminModeration.tsx` (`/admin/moderacao`): fila de denúncias (abertas por omissão; filtros resolvidas / rejeitadas / todas), quem denunciou, o alvo e se já está oculto ou já não existe; «Decidir» com nota obrigatória e, em trabalhos e comentários, «Ocultar o conteúdo denunciado»; «Repor conteúdo»; ligação à conta quando o alvo é uma conta.
- Dashboard: cartão «Denúncias por tratar»; «Moderação» na navegação.

**Critérios de Entrega:**
- [x] 4 estados na fila, nota obrigatória, ocultar só ao resolver (nunca ao rejeitar), reposição, alvo inexistente — 6 testes (`AdminModeration.test.tsx`); `BotaoDenunciar` (abrir, enviar, confirmar, erro do servidor) — 4 testes; dashboard — 5 testes.
- [ ] Contra o backend real com a migration aplicada, e o aspeto num telemóvel: não verificado.

---

## Fase 16 — Notas Internas e Disputas de Pedidos

**Estado: em produção — integrada em `main` pelo merge `9d57177`; por validar no browser.** Ver Adendo v1.44 do TRD. Consome a Fase 18 do backend (migration primeiro).

**Escopo:**
- `components/admin/NotasInternas.tsx` (`services/adminNotes.ts`, `hooks/useAdminNotes.ts`): escrever e ler notas de equipa; na ficha do utilizador (`AdminUserDetail`) e, atrás de um botão «Notas», em cada pedido de `AdminServiceRequests`.
- «Reportar um problema» (`BotaoDenunciar` com `rotulo`) em «Os meus pedidos» (pedidos já atribuídos, concluídos ou cancelados com profissional) e em «Trabalhos aceites» do profissional. O pedido segue para a fila de `/admin/moderacao` como denúncia de um pedido (`SERVICE_REQUEST`); o backend só aceita do cliente e do profissional desse pedido.

**Critérios de Entrega:**
- [x] Notas: lista com autor, a carregar / erro / vazio, recusa de nota vazia, texto aparado — 3 testes (`NotasInternas.test.tsx`).
- [ ] Não há teste de componente para os botões nas listas de pedidos (`MyServiceRequests` e `AssignedServiceRequests` não têm teste) nem validação no browser / contra o backend real.

---

## Fase 17 — Gestão de Serviços pelo Admin

**Estado: em produção — integrada em `main` pelo merge `9d57177`; por validar no browser.** Ver Adendo v1.45 do TRD. Consome a Fase 19 do backend (sem migration).

**Escopo:**
- `pages/AdminServices.tsx` (`/admin/servicos`; `services/adminCategories.ts`, `hooks/useAdminCategories.ts`): lista os serviços com o slug, as palavras de pesquisa e quantos profissionais os usam; criar, editar (nome e palavras; o slug não muda) e apagar com confirmação. «Apagar» fica desactivado enquanto há profissionais com o serviço; se um pedido ainda o referir, o 409 do backend aparece como mensagem.
- Aviso «Sem ícone» e instrução quando o slug não está em `caminhosDosIcones.ts` (um serviço novo usa o ícone genérico até lá).
- Qualquer alteração invalida também a lista pública `['service-categories']`.
- «Serviços» na navegação do admin.

**Critérios de Entrega:**
- [x] 4 estados, contagem, aviso de ícone, apagar com confirmação e bloqueado se em uso, criar (nome curto recusado) e editar — 7 testes (`AdminServices.test.tsx`).
- [ ] Contra o backend real e num telemóvel: não verificado.

---

## Fase 18 — Comunicados da Equipa

**Estado: em produção — integrada em `main` pelo merge `9d57177`; por validar no browser.** Ver Adendo v1.46 do TRD. Consome a Fase 20 do backend (migration primeiro).

**Escopo:**
- `pages/AdminBroadcasts.tsx` (`/admin/comunicados`; `services/adminBroadcasts.ts`, `hooks/useAdminBroadcasts.ts`): grupo (clientes / profissionais / todos) + província opcional, assunto e mensagem; **«Ver destinatários»** calcula o número; só então aparece «Enviar comunicado», com confirmação («Enviar para N pessoas? Não se pode desfazer.»), e esse N segue no pedido. Mudar o grupo depois de contar apaga o número.
- Histórico com estado (a enviar / concluído), quem enviou e os totais («37 de 40 enviados · 3 sem entrega»). Enquanto algum comunicado está a ser enviado, a lista actualiza de 5 em 5 segundos.
- «Comunicados» na navegação do admin.

**Critérios de Entrega:**
- [x] 4 estados no histórico; o envio não existe sem contar; envia o número contado; grupo vazio e texto curto bloqueiam; mudar o grupo exige contar de novo; o erro do servidor volta a pedir confirmação — 8 testes (`AdminBroadcasts.test.tsx`).
- [ ] Contra o backend real com SMTP configurado, e num telemóvel: não verificado.

---

## Fase 19 — Relatórios e Exportações

**Estado: em produção — integrada em `main` pelo merge `9d57177`; por validar no browser.** Ver Adendo v1.47 do TRD. Consome a Fase 21 do backend (sem migration).

**Escopo:**
- `pages/AdminReports.tsx` (`/admin/relatorios`; `services/adminReports.ts`, `hooks/useAdminReports.ts`): período «De / Até» (na hora de Maputo, UTC+2) que vale para o funil e para as exportações; funil de profissionais em barras com o número e a percentagem dos registados; três botões de exportação CSV (utilizadores, pedidos, pagamentos).
- Exportar: pede o ficheiro como `blob`, entrega-o ao browser (`guardarFicheiro`, que liberta o URL de objecto), confirma o número de linhas, **avisa quando o backend cortou no tecto de 5000** e não descarrega um ficheiro vazio quando o período não tem dados.
- **`lib/api.ts`:** o interceptor deixa passar as respostas `responseType: 'blob'` sem as desembrulhar (um CSV não traz o envelope `{ success, data }`; desembrulhá-lo dava `undefined`). Alteração a código partilhado, coberta por `lib/api.test.ts`.
- «Relatórios» na navegação do admin.

**Critérios de Entrega:**
- [x] Funil (percentagens, 4 estados), datas em Maputo, exportar (sucesso, cortado, vazio, erro), leitura dos cabeçalhos do backend, descarga do ficheiro, interceptor JSON vs. blob — 14 testes (`AdminReports.test.tsx`, `adminReports.test.ts`, `api.test.ts`).
- [ ] A descarga num browser real (nome do ficheiro, acentos no Excel) e contra o backend real: não verificado. Os cabeçalhos `X-Linhas` / `X-Truncada` só chegam ao browser se o CORS os expuser (o backend envia `Access-Control-Expose-Headers`); confirmar com o domínio de produção.

---

## Fase 20 — Verificação em Dois Passos do Admin

**Estado: em produção — integrada em `main` pelo merge `9d57177`; por validar no browser e contra o Supabase real.** Ver Adendo v1.48 do TRD. Pareada com a Fase 22 do backend (`ADMIN_REQUIRE_MFA`, desligada por omissão).

**Escopo:**
- `services/mfa.ts` + `hooks/useMfa.ts`: estado (factor TOTP confirmado? nível da sessão), registo de factor (apaga antes os factores abandonados a meio, que o Supabase não deixa duplicar) e verificação do código — tudo directamente contra `supabase.auth.mfa`.
- `pages/AdminSecurity.tsx` (`/admin/seguranca`): ativar (código QR + segredo em texto + código de 6 dígitos). **Não há «desativar»** de propósito: tirar a protecção a partir de uma sessão que pode estar roubada é o que o segundo factor existe para impedir; a recuperação de um telemóvel perdido é feita no painel do Supabase.
- `RotaDeAdmin`: um admin com factor mas sessão `aal1` vê `DesafioMfa` antes de qualquer ecrã de admin. Sem factor, entra (o aviso para o ativar está no dashboard) — mas o primeiro 403 do backend leva-o à Segurança (Fase 32). Se o estado do MFA não puder ser lido, **deixa passar**: quem protege é o backend, e trancar o painel por uma falha de leitura seria pior do que deixar o backend dizer 403.
- `FormularioDeCodigo` (partilhado): só aceita dígitos, 6 no máximo; código incompleto é recusado sem gastar um pedido; erros do Supabase traduzidos para português; campo limpo ao falhar.
- Dashboard: aviso «Protege a tua conta de administrador» só quando se sabe que **não** há segundo factor (não alarma durante o carregamento nem numa falha). «Segurança» na navegação.

**Critérios de Entrega:**
- [x] Estado do MFA, registo (com limpeza de factores abandonados), verificação, validação do código e mensagens — 11 testes (`mfa.test.ts`); guard por papel e por nível `aal` (desafio, entrada, carregamento, falha de leitura) — 10 testes (`RotaDeAdmin.test.tsx`); ecrã de segurança — 6 testes (`AdminSecurity.test.tsx`); aviso no dashboard — 1 teste. A CSP já permite `img-src data:` para o QR.
- [ ] **Não testado contra o Supabase real:** o TOTP tem de estar activo no projecto (Authentication → Multi-Factor), e o fluxo completo (registar → sair → entrar → desafio → painel) só se confirma num browser com uma app de autenticação.
- [x] Ordem de activação em produção: registar o factor de cada admin **antes** de ligar `ADMIN_REQUIRE_MFA=true` no backend — ligada em produção (confirmado pelo utilizador a 22/10/2026).

---

## Fase 21 — Estado do Sistema

**Estado: em produção — integrada em `main` pelo merge `9d57177`; por validar no browser.** Ver Adendo v1.49 do TRD. Consome a Fase 23 do backend (sem migration).

**Escopo:**
- `pages/AdminSystem.tsx` (`/admin/sistema`; `services/adminSystem.ts`, `hooks/useAdminSystem.ts`): base de dados (com a latência), cache e email, cada um com o estado **em texto** («A funcionar» / «Com falha» / «Desligado»), e uma nota quando está desligado a explicar o efeito (sem cache a app só é mais lenta; sem SMTP os emails ficam no log); modo de pagamentos e se o segundo factor é obrigatório; pendentes (KYC, denúncias, comunicados presos) com ligação ao ecrã de cada um. Actualiza de 30 em 30 segundos.
- «Sistema» na navegação do admin.

**Critérios de Entrega:**
- [x] 4 estados, latência, falha com detalhe, desligado explicado, configuração e pendentes com ligações — 6 testes (`AdminSystem.test.tsx`).
- [ ] Contra o backend real e num telemóvel: não verificado. Não mostra o estado dos jobs nem erros recentes (o backend não os guarda — ver Fase 23 do backend).

---

## Fase 22 — Gestão de Administradores

**Estado: em produção — integrada em `main` pelo merge `9d57177`; por validar no browser.** Ver Adendo v1.50 do TRD. Consome a Fase 24 do backend (sem migration).

**Escopo:**
- `pages/AdminAdmins.tsx` (`/admin/administradores`; `services/adminAccounts.ts`, `hooks/useAdminAccounts.ts`): lista dos administradores (a própria conta marcada «(tu)»), formulário para adicionar (nome + email) e «Remover» com confirmação.
- **Conta nova:** o ecrã mostra a **palavra-passe provisória uma só vez**, com botão «Copiar» e o aviso de que o backend não a guarda; fica até o admin fechar («Já guardei, fechar») e recarregar a página perde-a. **Promoção** de um cliente que já tinha conta: não mostra palavra-passe nenhuma.
- Sem «Remover» na própria conta; remover explica que a conta fica como cliente, não é apagada; os erros do backend (último administrador, conta de profissional, já é administrador) aparecem como mensagem.
- «Administradores» na navegação do admin. O formulário usa `noValidate` para a mensagem de erro ser a nossa, em português, e não a bolha nativa do browser.

**Critérios de Entrega:**
- [x] 4 estados na lista, sem «Remover» na própria conta, confirmação ao remover, erro do servidor, validação do formulário, palavra-passe mostrada uma vez e fechável, promoção sem palavra-passe, erro ao adicionar — 9 testes (`AdminAdmins.test.tsx`).
- [ ] Contra o backend real e num telemóvel: não verificado.

---

## Fase 23 — Empresas e Equipas: papel do técnico e ecrã «A minha equipa»

**Estado: plano APROVADO pelo utilizador a 14/10/2026; em produção — integrada em `main` pelo merge `1ee0998` de `feat/empresas-equipas`; por validar no browser.** Ver Adendo v1.51 do TRD e as Fases 25 a 28 do backend (modelo, regras e decisões). Backend primeiro.

**Decisões (resumo):** o técnico tem **login próprio** (papel `TECHNICIAN`), criado pelo administrador da empresa; subscrição única da empresa; **máximo 15 técnicos**; **KYC da empresa e de cada técnico com a lógica que já existe**; técnico atribuído **só depois de a empresa ser escolhida**; **avaliação da empresa e do técnico**; um singular **não** se converte em empresa; Termos a dizer que a empresa responde pelos técnicos.

**Escopo:**
- `UserRole` ganha `TECHNICIAN` (`services/profile.ts`); os mapas por papel (`ACCOES_RAPIDAS`, `papeis.ts`, rótulos de perfil e de admin, `DeleteAccountSection`) ganham o técnico. O **`OnboardingGate` deixa o técnico passar** sem telefone nem localização (não os tem e não os usa); o que lhe falta é o KYC, no ecrã que já existe (`/verificacao-identidade`), e «Os meus trabalhos». **Desvio:** a página `/tecnico/trabalhos` (`TechnicianJobs`, que o plano punha na Fase 24) fica **aqui**, para o atalho do técnico não apontar para uma rota que ainda não existe.
- Componentes partilhados novos: `ContactoCliente` (extraído de «Trabalhos aceites», agora usado também pelo técnico) e `PalavraPasseProvisoria` (partilhado com a criação de administradores).
- `pages/CompanyTeam.tsx` (`/equipa`, só para `professional_type === 'COMPANY'`, guard `RotaDeEmpresa`): lista os técnicos com o **estado do KYC de cada um**, o título e os serviços; **adicionar** (nome, email, título, serviços; mostra a palavra-passe provisória **uma só vez**); editar; desactivar/reactivar; contador «X de 15». Atalho no menu do profissional **só para empresas**.
- Os 4 estados em cada ecrã; «vazio» explica o que fazer.

**Critérios de Entrega:**
- [x] `/equipa`: 4 estados, KYC e trabalhos em curso por técnico, «X de 15», botão de adicionar desativado nos 15 (e desativados não contam), adicionar com validação, serviços obrigatórios, palavra-passe provisória mostrada uma vez, erro do servidor, editar só título e serviços, desativar bloqueado com trabalhos em curso, reativar — 12 testes (`CompanyTeam.test.tsx`). `TechnicianJobs` (4 estados, contacto só ao pedir, avisos de KYC e de empresa sem elegibilidade) — 7 testes. Guards `RotaDeEmpresa` / `RotaDeTecnico` — 9 testes. `OnboardingGate` (técnico passa) e atalhos (só a empresa tem «A minha equipa») — 5 testes.
- [ ] Não verificado no browser nem contra o backend real (as migrations das Fases 25 a 27 do backend têm de estar aplicadas).

---

## Fase 24 — Empresas e Equipas: atribuir técnico ao pedido

**Estado: em produção — integrada em `main` pelo merge `1ee0998` de `feat/empresas-equipas`; por validar no browser.** (A página «Os meus trabalhos» do técnico passou para a Fase 23.)

- Em «Trabalhos aceites» da **empresa**: cada pedido ganha **«Atribuir técnico»** (só técnicos activos, com KYC aprovado e que façam o serviço do pedido) e um aviso para os pedidos **ainda sem técnico**.
- O cliente, em «Os meus pedidos», vê o técnico do pedido: «Vem o João · Canalizador», com a foto ou a inicial. Nunca telefone nem email.
- `AtribuirTecnico` (`components/equipa/`): mostra o técnico atual ou «Este trabalho ainda não tem técnico», e deixa atribuir/mudar entre os técnicos **elegíveis** (ativo, identidade verificada, faz o serviço do pedido; a mesma regra do backend, que é quem decide). Sem nenhum elegível, explica porquê. A lista da equipa só se pede a uma **empresa** (um singular não tem rota nem equipa).

**Critérios de Entrega:**
- [x] Regra dos técnicos elegíveis, atribuir/mudar, sem escolher, sem elegíveis, erro do servidor — 8 testes (`AtribuirTecnico.test.tsx`); aviso de quantos trabalhos em curso ainda não têm técnico («1 trabalho… / 2 trabalhos…»), só em pedidos em curso, só para empresas — 6 testes (`AssignedServiceRequests.test.tsx`); o cliente vê quem vem, com foto ou inicial, e nunca telefone nem email — 5 testes (`MyServiceRequests.test.tsx`).
- [ ] Não verificado no browser nem contra o backend real.

---

## Fase 25 — Empresas e Equipas: equipa no catálogo e avaliação do técnico

**Estado: em produção — integrada em `main` pelo merge `1ee0998` de `feat/empresas-equipas`; por validar no browser.**

- `ProfessionalCatalog`: secção **«A equipa»** (foto, nome próprio, título, nota; nunca telefone), só técnicos aprovados.
- Formulário de avaliação (`MyServiceRequests`): nota da **empresa** e, se o pedido teve técnico, nota **opcional do técnico**; as avaliações do catálogo da empresa mostram o técnico.

**Critérios de Entrega:**
- [x] Secção «A equipa» (técnico, título, nota e nº de avaliações; «Ainda sem avaliações»; ausente em singulares e em empresas sem técnicos; nunca telefone nem email); a avaliação diz «Feito por João · Canalizador» e a nota dele; sem técnico não menciona nenhum — 6 testes novos em `ProfessionalCatalog.test.tsx`. Formulário de avaliação: a nota do técnico só aparece se o pedido teve técnico, é opcional, tocar outra vez tira-a, e sem ela a avaliação da empresa segue sozinha — 5 testes novos em `MyServiceRequests.test.tsx`.
- [ ] Não verificado no browser nem contra o backend real (migration `20261015120000_avaliacao_do_tecnico.sql`).

---

## Fase 26 — Empresas e Equipas: termos e administração

**Estado: em produção — integrada em `main` pelo merge `1ee0998` de `feat/empresas-equipas`; por validar no browser.**

- **Termos de utilização** (`data/termosDeUtilizacao.ts`): **secção nova «5. Se és uma empresa»** (a empresa é o profissional perante o cliente e paga a subscrição única que cobre a equipa; **responde pelos seus técnicos**; máximo de 15 técnicos ativos; cada técnico tem conta e identidade verificada próprias; o contacto do cliente só é revelado à empresa e ao técnico atribuído, com a empresa verificada e subscrita; o cliente vê o primeiro nome, o título e a foto do técnico e avalia a empresa e o técnico; a empresa garante que o técnico aceita o tratamento dos seus dados; um técnico só pode estar numa empresa de cada vez). A secção 2 diz que **um singular não se converte em empresa**. As secções 5 a 12 passam a 6 a 13 e as referências cruzadas foram ajustadas; data de atualização passa a 15 de outubro de 2026. **Rascunho de produto: tem de ser revisto por um jurista antes de ser vinculativo**, em especial a secção 5.
- **Admin:** `EquipaNaFicha` (ficha de uma empresa: técnicos com KYC, título, email e trabalhos em curso, cada nome a levar à ficha do técnico), `EmpresaNaFicha` (ficha de um técnico: a empresa e o estado dele nela); filtro «Técnicos» na lista de utilizadores; «Técnicos» nas métricas.

**Critérios de Entrega:**
- [x] Numeração dos Termos contínua; secção de empresas logo a seguir à dos profissionais; diz que a empresa responde pelos técnicos, o limite de 15, a identidade verificada de cada técnico, a subscrição única, a quem se revela o contacto e que um singular não se converte — 7 testes novos em `Terms.test.tsx`; ficha da empresa com a equipa e do técnico com a empresa — 5 testes (`EquipaNaFicha.test.tsx`).
- [ ] Revisão jurídica do texto dos Termos.

---

## Fase 27 — Solicitar Serviço (pedido direto)

**Estado: em produção — integrada em `main` pelo merge `5ce41e1` de `feat/pedido-direto`; por validar no browser.** Ver Adendo v1.52 do TRD. Consome a Fase 29 do backend (migration primeiro).

**Decisão do utilizador:** o cliente vê o telefone do profissional (singular ou empresa) **só depois de carregar em «Solicitar serviço»**, e o profissional vê o cliente **ao carregar em «Ver pedido de serviço»**. Obriga a seguir o fluxo: sem pedidos registados não há estados, fotos nem avaliações.

**Escopo:**
- **Catálogo (`ApresentacaoDoProfissional`):** o botão principal passa a **«Solicitar serviço»** (`/solicitar/:id`), com a frase «Ao enviares o pedido, vês o contacto e podes ligar». A alternativa «Ou pede propostas… a 3 profissionais» (o fluxo anterior) mantém-se como ligação secundária. (Superado pela Fase 28: o catálogo passou a mostrar o contacto.)
- **`pages/SolicitarServico.tsx`** (`/solicitar/:id`, `ProtectedRoute` + `OnboardingGate`): serviço (só se o profissional tem vários), «O que precisas?», detalhes e o local do perfil (helper partilhado `lib/localDoPedido.ts`, extraído do pedido a 3 profissionais). Enviar chama `POST /service_requests/direct` (`services/directRequest.ts`, `hooks/useDirectRequest.ts`, com `Idempotency-Key` por formulário; sem fila offline, o número exige o servidor). Só depois de enviado mostra **«Pedido enviado»** com o botão **«Ligar: +258…»** (`components/pedidos/ContactoDoProfissional`), ou, se o profissional não tem telefone, que foi avisado por email. Os erros do servidor (já há um pedido em curso com este profissional, profissional indisponível) aparecem como mensagem.
- **«Os meus pedidos» (cliente):** em pedidos em curso, «Ver contacto do profissional» (pede o contacto só ao clicar, `GET /service_requests/:id/professional`), e para pedidos diretos «O profissional já viu o teu pedido» / «foi avisado e ainda não abriu o pedido».
- **Profissional / empresa («Trabalhos aceites») e técnico («Os meus trabalhos»):** «Ver contacto do cliente» passa a **«Ver pedido de serviço»**; um pedido direto ainda por abrir leva o selo **«Novo pedido»**.
- **Termos de utilização:** a secção 3 passa a descrever as duas formas de pedir, que os contactos «nunca estão à vista no catálogo nem na pesquisa», que o profissional vê o cliente ao abrir o pedido (com KYC e subscrição), e que o cliente deve manter o pedido atualizado e avaliar; não há dois pedidos em curso com o mesmo profissional. Data de atualização: 16 de outubro de 2026. Rascunho a rever por um jurista.

**Critérios de Entrega:**
- [x] `SolicitarServico` (a carregar, erro, formulário sem o número à vista, um serviço vs. vários, sem título, sem localização, profissional sem serviços, erro do servidor, **só depois de enviar mostra o telefone para ligar**, sem telefone) — 10 testes; contacto do profissional em «Os meus pedidos» (não está à vista, só ao pedir, carregar/erro, só em pedidos em curso, «visto» / «ainda não abriu», pedido não direto sem estado) — 6 testes novos; catálogo (botão principal, nunca mostra telefone, alternativa das 3 propostas) — 3 testes; Termos atualizados.
- [ ] Não verificado no browser nem contra o backend real (migration `20261016090000_pedido_direto.sql`).

**Por fazer (a decidir com o utilizador):** o profissional **recusar** um pedido direto; lembretes para atualizar o estado do trabalho; exigir fotos ou avaliação antes de um novo pedido.

---

## Fase 28 — Contacto do profissional à vista no catálogo

**Estado: em produção — integrada em `main` pelo merge `5ce41e1` de `feat/pedido-direto`; por validar no browser.** Ver Adendo v1.53 do TRD. Consome a Fase 30 do backend. Substitui a regra «o catálogo nunca mostra telefone» da Fase 27.

**Decisão do utilizador:** nome e telefone do profissional (singular ou empresa) explícitos e sempre visíveis no catálogo, sem clicar. O botão «Solicitar serviço» mantém-se como a via que **regista** o pedido.

**Escopo:**
- **`ApresentacaoDoProfissional`** (só para quem não é o dono): bloco do contacto no topo da ação — `ContactoDoProfissional` (nome + «Ligar: +258…», `tel:`); se `contact_available` é falso, «O contacto de X fica disponível quando tiver a conta verificada e a subscrição ativa»; se não tem telefone, «ainda não registou um número… Solicita o serviço e ele é avisado por email». Por baixo, «Solicitar serviço» com «Regista o pedido para acompanhares o estado e avaliares o trabalho».
- **`SolicitarServico`:** a frase «o contacto aparece para poderes ligar» passa a «${nome} é avisado»; o telefone continua a aparecer em «Pedido enviado».
- **Tipo `ProfessionalCatalog`:** `contact_available`, `phone`.
- **Termos de utilização:** o telefone fica à vista no catálogo enquanto o profissional tiver identidade verificada e subscrição ativa; recomenda-se registar o pedido mesmo que a conversa comece por telefone. Rascunho a rever por um jurista.

**Critérios de Entrega:**
- [x] Catálogo: telefone à vista pronto a ligar, sem subscrição/KYC (explica, sem número), elegível sem telefone, dono não vê o seu contacto, técnico sem telefone — testes em `ProfessionalCatalog.test.tsx`; Termos e `SolicitarServico` ajustados. Suite completa: 574 testes, `tsc` e lint sem erros.
- [ ] Não verificado no browser nem contra o backend real.

---

## Fase 29 — Correcção: captar a localização

**Estado: em produção — integrada em `main` pelo merge `3b8c3c1` de `fix/captar-localizacao`; por validar no telemóvel e no browser.** Ver Adendo v1.54 do TRD. Só frontend; o backend não mudou.

**Problema reportado:** «a funcionalidade captar localização não está a funcionar». O sintoma exato não foi indicado; a análise do código encontrou quatro causas prováveis, todas tratadas:
- **Só GPS, 10 s:** `getCurrentPosition` com `enableHighAccuracy: true` e sem `maximumAge` dava TIMEOUT/POSITION_UNAVAILABLE em portáteis e em telemóveis dentro de casa, embora o browser soubesse a zona por Wi-Fi. Agora tenta o GPS (8 s) e, se falhar sem ser por permissão, a localização aproximada (15 s, aceita posição de há até 10 min).
- **Página não segura:** em `http://` por IP (POS no telemóvel, rede local) o browser recusa a localização e o erro aparecia como «permissão negada». Agora diz que exige HTTPS.
- **Fora de Moçambique:** o backend recusa coordenadas fora de lat -27..-10 / lng 30..41 (400) e o ecrã mostrava um «não foi possível guardar» sem causa. Agora a captura diz «fora de Moçambique» e remete para a seleção manual; o erro do servidor, quando existe, passa a ser mostrado.
- **Gravação lenta:** a geocodificação inversa repetia 3 vezes com espera crescente (~7 s) antes de a localização ser gravada, quando o serviço falhava. Agora repete 1 vez.
- A mensagem de permissão negada explica como a ativar (cadeado junto ao endereço).

**Critérios de Entrega:**
- [x] `useGeolocation.test.ts` (4 testes novos): timeout do GPS → localização aproximada; permissão negada não repete e explica; fora de Moçambique não é «success»; página não segura. Suite completa: 584 testes, `tsc` e lint sem erros.
- [ ] Validar num telemóvel real, em HTTPS, dentro e fora de casa; confirmar o sintoma original.

---

## Fase 30 — Aviso de nova versão: mostra o que realmente muda

**Estado: implementada em `fix/novidades-do-aviso` (14/10/2026), em `main` pelo merge `4e92d69` (19/10/2026), só frontend.** Ver Adendo v1.55 do TRD.

**Problema reportado:** o aviso «Nova versão disponível» mostrava novidades que não tinham a ver com a versão e uma data que não era a do dia, e tem de mostrar sempre o que realmente está a ser actualizado. **Causa:** `public/novidades.json` era editado à mão (Adendo v1.29, item C) e não foi actualizado nas entregas seguintes; e, mesmo actualizado, dizia «a última versão» a todos, mesmo a quem tinha saltado versões.

**Feito:**
- **Uma entrada por versão** em `src/data/novidadesPorVersao.json` (`versao`, `data`, 1 a 4 frases até 140 caracteres). A versão do `package.json` (agora `0.1.0`) é a que a app conhece de si própria (`__APP_VERSION__`, `define` do Vite).
- **O `/novidades.json` é gerado no build** (plugin em `vite.config.ts`; em desenvolvimento é servido pelo servidor do Vite). O ficheiro `public/novidades.json` deixou de existir. Repete a versão publicada no formato antigo (`atualizadoEm`, `novidades`) para as apps já instaladas, e traz `versoes`.
- **`vite build` falha** se a versão do `package.json` não tiver entrada, se a entrada tiver data inventada, frases a mais ou compridas, ou se o histórico tiver uma versão mais recente do que o pacote. Em desenvolvimento só avisa.
- **O aviso mostra só o que falta a quem o vê:** as entradas posteriores à versão instalada (quem saltou versões vê todas, até 4, as mais recentes primeiro), com a data da versão mais recente. Quem já tem a última, ou se o ficheiro falha, vê a mensagem genérica, sem novidades inventadas.
- Regra no `CLAUDE.md` do frontend: cada entrega visível sobe a versão e acrescenta a entrada.

**Critérios de Entrega:**
- [x] `versoes.test.ts` (comparação de versões, datas, só o que falta a quem está a ver, limites, falhas do histórico, ficheiro gerado, histórico real válido) e `novidades.test.ts` (por versão instalada, formato antigo); build real gera `dist/novidades.json`; build com versão sem entrada falha. Suite completa: 606 testes, `tsc` e lint sem erros.
- [ ] Ver o aviso no browser depois do deploy. As apps já instaladas (sem versão) lêem o formato antigo e mostram a entrada 0.1.0; a partir daí, cada uma vê só o que lhe falta.

---

## Fase 31 — Refinamento dos ecrãs de admin

**Estado: implementada em `refactor/refinamento-telas-admin` (14/10/2026), integrada em `main`, só frontend.** Ver Adendo v1.56 do TRD. Documentada a posteriori (19/10/2026).

**Feito:**
- `/admin` abre a revisão de KYC; o dashboard passou para `/admin/visao-geral` (separador «Visão Geral»).
- `NavegacaoAdmin` com separadores principais e menu «Mais» para as ferramentas secundárias.
- Utilizadores e Pedidos com pesquisa e estado vazio próprio; ficha do utilizador em secções (dados, subscrição, reenvio de email, moderação, histórico).
- Na Home do admin, só o atalho «Painel Admin».

**Critérios de Entrega:**
- [x] `AdminUsers.test.tsx` e `AdminServiceRequests.test.tsx`; `tsc` e build sem erros (corrigidos os tipos dos mocks em `fix/testes-admin-tipos`).
- [ ] Ver os ecrãs em 390 px, tablet e desktop num browser.
- [ ] **Divergência a decidir:** o aviso «Protege a tua conta de administrador» (Fase 20) ficou no dashboard, que já não é o ecrã de entrada. A Fase 32 resolve o caso do 403; o aviso proactivo pode voltar a aparecer no ecrã de entrada.

---

## Fase 32 — Admin sem segundo factor é levado à Segurança

**Estado: implementada em `fix/mfa-admin-reencaminha-para-seguranca` (19/10/2026), em `main` pelo merge `ce36aa4`, só frontend, por validar no browser.** Ver Adendo v1.57 do TRD. Completa a Fase 20.

**Problema reportado:** com `ADMIN_REQUIRE_MFA=true` e uma conta ADMIN sem factor registado, o painel abria e todas as listas davam 403 (`GET /admin/users` → 403), sem indicação do que fazer.

**Feito:**
- `lib/segundoFactorExigido.ts`: reconhece o 403 dos dois passos (só com a mensagem do backend; um 403 por papel não conta) e emite o aviso.
- `lib/api.ts`: o interceptor avisa; o erro continua a chegar a quem fez o pedido.
- `components/admin/ReencaminharParaSegundoFactor.tsx` (montado no `App`): navega para `/admin/seguranca` com `replace`; já lá, não navega.
- `AdminSecurity`: aviso «O painel de administração exige verificação em dois passos» quando chega reencaminhado.

**Critérios de Entrega:**
- [x] `segundoFactorExigido.test.ts` (inclui a frase exacta do backend), `api.test.ts` (avisa no 403 dos dois passos; não avisa no 403 por papel nem no 401), `ReencaminharParaSegundoFactor.test.tsx`, `AdminSecurity.test.tsx`; `tsc` sem erros.
- [ ] **No browser, contra o backend real:** com `ADMIN_REQUIRE_MFA=true` e uma conta sem factor, abrir `/admin/utilizadores` leva a `/admin/seguranca` com o aviso; registar o factor, sair, entrar, e a lista abre.
- [ ] Melhoria futura: `code` no 403 do backend, para o frontend deixar de depender do texto.

---

## Fase 33 — Localização captada a mais de 1 km do sítio real

**Estado: implementada (19/10/2026), em `main` pelo merge `8141584` de `fix/localizacao-precisao`, só frontend, por validar no telemóvel.** Ver Adendo v1.58 do TRD.

**Problema reportado:** o serviço de localização grava, em alguns casos, um ponto a mais de 1 km de onde o utilizador está.

**Causa:** `useGeolocation` aceitava a primeira leitura devolvida por `getCurrentPosition`, sem olhar a `coords.accuracy`. A primeira leitura é tipicamente de antena/Wi-Fi (km de erro), e `maximumAge` (60 s no GPS, 10 min no fallback «aproximado» da Fase 29) ainda deixava passar posições em cache.

**Feito:** `watchPosition` com `maximumAge: 0`; conclui logo com precisão ≤ 50 m, senão ao fim de 15 s fica com a melhor leitura; acima de 500 m não é `success` (erro «pouco precisa», cai na selecção manual / última conhecida). O fallback aproximado da Fase 29 foi retirado. O watch pára ao concluir, ao relocalizar e ao desmontar.

**Critérios de Entrega:**
- [x] `useGeolocation.test.ts` (15 testes): sem cache; ignora a leitura grosseira; melhor leitura da janela; >500 m recusada; sem leitura; limpeza no desmontar; erro passageiro não aborta.
- [ ] **No telemóvel:** captar a localização em sítio aberto e dentro de casa e comparar com o ponto real (esperado < 100 m ao ar livre; dentro de casa pode recusar por precisão).
- [x] Decisão em aberto: o limiar de 500 m (`PRECISAO_MAXIMA_M`) pode ter de baixar/subir conforme o resultado em campo. → Revista na Fase 35: acima de 500 m a posição passa a «aproximada» em vez de recusada.

---

## Fase 34 — Painel de admin: menu lateral e secções com separadores

**Estado: implementada em `feat/redesign-tela-usuarios-admin` (19/10/2026), em `main` pelo merge `5d43b97` (versão 0.2.0) e corrigida em `f7bcab7`, só frontend, por validar no browser.** Ver Adendo v1.59 do TRD. Pedido do utilizador: adoptar a lógica do menu lateral e dos separadores do ControlCore.

**Feito:**
- `components/admin/layout/`: `LayoutDeAdmin` (barra fixa em `lg+`, recolhível; gaveta abaixo de `lg`), `BarraLateral` (grupos, secção acesa, selo de KYC, perfil e terminar sessão), `Cabecalho` (☰ e nome da secção), `caminhoActivo`, `seccoes`, `rotas` (secções, separadores e rotas antigas), `ParaOSeparador`.
- `components/admin/estrutura/`: `Separadores` + `SeccaoComSeparadores` (tablist ARIA com teclado), `useSeparadorDoEndereco` (`?tab=` com `replace`), `ConteudoDoSeparador` (substitui `PaginaDeAdmin`), e os componentes partilhados da reorganização dos ecrãs (`EstadosDaLista`, `Paginacao`, `CamposDeFiltro`, `CamposDeFormulario`, `FiltroEmPilulas`, `IconeDeAdmin`).
- Secções: KYC, Utilizadores e Pedidos com os filtros de estado/cargo como separadores; `pages/AdminVisaoGeral.tsx` (Painel, Métricas, Relatórios, Auditoria, Sistema) e `pages/AdminMais.tsx` (Subscrições, Moderação, Serviços, Comunicados, Administradores, Segurança).
- `App.tsx`: todas as rotas `/admin/*` filhas de um só `RotaDeAdmin` + `LayoutDeAdmin`; `/admin` → `/admin/kyc`; as rotas antigas de cada ferramenta redireccionam para o separador, com parâmetros e `state`.
- `ReencaminharParaSegundoFactor` aponta para `/admin/mais?tab=seguranca`. Atalhos (Painel, Sistema, «Ver histórico», ficha do utilizador) construídos a partir de `layout/rotas.ts`. `NavegacaoAdmin` e `PaginaDeAdmin` removidos.
- Antes disto, na mesma branch: os 14 ecrãs reorganizados para não haver componentes que fazem tudo — cada linha/cartão no seu ficheiro em `components/admin/<área>/`, com o seu estado.

**Critérios de Entrega:**
- [x] `caminhoActivo.test.ts`, `Separadores.test.tsx` (endereço, teclado, selo), `LayoutDeAdmin.test.tsx` (secção acesa, selo de KYC, recolher, gaveta, terminar sessão, rotas antigas com parâmetros e `state`), `ReencaminharParaSegundoFactor.test.tsx` actualizado; 641 testes, `tsc`, lint e `vite build` sem erros.
- [ ] Ver no browser a 390 px, tablet e desktop: gaveta, barra recolhida, separadores com scroll horizontal no telemóvel.
- [ ] A ficha do utilizador (`AdminUserDetail`, layout dividido com foto) dentro do novo layout: confirmar que a coluna da foto se comporta bem ao lado da barra lateral.
- [x] Correcções (`fix/botao-voltar`): «voltar» no cabeçalho do painel com destino quando não há ecrã anterior (`BackButton.test.tsx`, `LayoutDeAdmin.test.tsx`); «voltar» em `/definir-nova-password`; logótipo oficial (`public/logo.png`) na barra lateral. Lint do CI corrigido (`useGeolocation.test.ts`).
- [ ] Ver o logótipo oficial no browser em ecrã de alta densidade (o PNG tem só 234 px de desenho; um SVG ou PNG maior evitaria a imagem suave).
- [ ] Decisão em aberto: a lista de utilizadores mostra sempre «Activo» na coluna Estado (o `AdminUserSummary` não traz `banned_until`); precisa do campo no `GET /admin/users` do backend.

---

## Fase 35 — Localização em zonas com pouca cobertura e logótipo oficial

**Estado: implementada em `fix/logotipo-e-localizacao-aproximada` (20/10/2026), em `main` pelo merge `f68eea3`, só frontend, por validar no telemóvel.** Ver Adendo v1.60 do TRD. Revê a decisão em aberto da Fase 33 (o limiar de 500 m).

**Problema reportado:** (1) o logótipo mostrado na app não é o oficial (`public/logo.png`); (2) na Av. das Indústrias a localização deu erro: a melhor leitura em 15 s passava dos 500 m e era recusada. No Perfil, sem selecção manual, ficava-se sem forma de se localizar.

**Feito:**
- `useGeolocation`: janela de 30 s (sai aos 10 s com ≤ 100 m, logo com ≤ 50 m); pedido paralelo de baixa precisão; novo estado `aproximada` (500 m–10 km) em vez de erro; erro só acima de 10 km ou sem leitura, com a mensagem do último erro do browser; `locating` com a precisão actual.
- `LocationForm`: posição aproximada com nome do lugar, «Usar esta localização» / «Tentar de novo»; não grava sozinha. Etiqueta «A melhorar a precisão (±X)…» durante a espera.
- `AvisoLocalizacaoAproximada` em `FindProfessionals` e `NearbyServiceRequests`; `descreverPrecisao` em `lib/ultimaLocalizacao.ts`.
- `LogoOficial` com a variante `escudo`; usado na Home, login/registo, painel do login e páginas legais. `Logo.tsx` e `LogoIcon.tsx` removidos.

**Critérios de Entrega:**
- [x] `useGeolocation.test.ts`: aproximada em vez de erro, >10 km é erro, saída aos 10 s, leitura de rede, rede não ganha ao GPS, `POSITION_UNAVAILABLE`; `tsc` sem erros.
- [ ] **No telemóvel, na Av. das Indústrias (ou noutra zona onde falhou):** a localização chega a `success` ou a «aproximada», nunca a erro. Com a «localização precisa» do Android desligada, confirmar que aparece «aproximada».
- [x] Ver o logótipo no browser: Home (telemóvel e desktop), login (telemóvel e desktop, com o cartão branco no painel azul) e termos — Edge, 20/10/2026.
- [x] Correcção (`fix/logotipo-transparente`, Adendo v1.62): logótipo com fundo transparente em toda a app e versão negativa (texto branco) no painel escuro do login, em vez do cartão branco; gerados por `scripts/gerar-logotipos.mjs` a partir do PNG oficial. Visto no browser.
- [x] Correcção (`fix/logotipo-completo-no-telemovel`, Adendo v1.64): no telemóvel a Home mostrava só o escudo; passa a mostrar o logótipo completo (120 px abaixo de `sm`). Visto no browser a 320/360/390 px, com e sem sessão, sem scroll horizontal. Variante `escudo` removida.
- [ ] Decisão em aberto: um mapa com pino arrastável para corrigir a posição aproximada (exige biblioteca de mapas; ver Adendo v1.60).

---

## Fase 36 — Localização captada em segundo plano depois do login

**Estado: implementada em `fix/logotipo-e-localizacao-aproximada` (20/10/2026), em `main` pelo merge `f68eea3`, só frontend, por validar no telemóvel.** Ver Adendo v1.61 do TRD. Proposta do utilizador, aprovada com as quatro regras abaixo: a captação (até 30 s, Fase 35) começa depois do login, e quando a pessoa carrega no botão a posição já está pronta.

**Regras:**
1. Só arranca sozinha se a permissão de localização já estiver concedida (`navigator.permissions`). Sem ela, o pedido continua a vir do botão: um pedido de permissão sem gesto do utilizador é recusado por reflexo e penalizado pelo browser.
2. Captar não é gravar. A posição só se grava no perfil quando o utilizador carrega no botão do `LocationForm`; o perfil de um profissional é a base de trabalho, não onde abriu a app.
3. Validade de 3 min: dentro dela, uma posição `success`/`aproximada` é reutilizada de imediato. Mais antiga, ou depois de um erro, faz-se uma captação nova (rápida: o GPS já está quente). «Tentar de novo» força sempre uma captação nova.
4. Só com a app aberta: uma captação no arranque da sessão e outra quando a app volta ao primeiro plano (se a anterior já tiver expirado). Sem seguir o GPS continuamente.

**Tarefas:**
- [x] `lib/servicoDeLocalizacao.ts`: o algoritmo da Fase 35 passa do hook para um serviço único da app (estado partilhado, `subscrever`/`estadoActual`, `localizar({ forcar })`, `repor()`), com a validade de 3 min e sem reiniciar uma captação em curso.
- [x] `useGeolocation` passa a ler o serviço (`useSyncExternalStore`), com a mesma interface para os ecrãs. Desvio: em vez de `locate(true)`, uma função `tentarDeNovo()` própria — `locate` é passado directamente a `onClick` e o evento seria lido como «forçar».
- [x] `components/AquecerLocalizacao.tsx` no `App`, dentro do `AuthProvider`: com sessão e permissão concedida, localiza no arranque e ao voltar ao primeiro plano; ao terminar sessão, `repor()`.
- [x] `LocationForm`: grava só depois do clique do utilizador (um `success` vindo do segundo plano não grava sozinho); a caixa «aproximada» só aparece depois do clique; «Tentar de novo» força.
- [x] `AvisoLocalizacaoAproximada` «Tentar de novo» força.
- [x] Testes (`useGeolocation.test.ts` 27, `AquecerLocalizacao.test.tsx` 6, `LocationForm.test.tsx` 4): serviço partilhado entre ecrãs, reutilização dentro da validade, nova captação depois dela, sem reinício durante a captação, `forcar`, `repor`; `AquecerLocalizacao` (com/sem permissão, sem sessão, primeiro plano); `LocationForm` não grava sem clique.
- [x] Adendo v1.61 do TRD (as duas cópias) e versão nas novidades.

**Como verificar:**
- [x] No browser (Edge com GPS emulado e API simulada, 20/10/2026): com sessão e permissão capta sem clique; sem permissão ou sem sessão não chama o GPS; a pesquisa e o Perfil reutilizam a posição (o clique gravou em ~50 ms, sem nova captação); voltar ao primeiro plano dentro dos 3 min não repete; a ±2 km a pesquisa mostra «aproximada» e o Perfil só mostra a caixa depois do clique, e «Usar esta localização» grava.
- [ ] No telemóvel, com a permissão já concedida: entrar na app, esperar ~30 s e ir ao Perfil — o botão grava quase de imediato.
- [ ] Primeira vez (sem permissão): nenhum pedido de permissão aparece no login; só ao carregar no botão.

---

## Fase 37 — Actualização automática da app

**Estado: implementada em `fix/actualizacao-automatica` (20/10/2026), em `main` pelo merge `2012864` (versão 0.2.2), só frontend.** Ver Adendo v1.63 do TRD.

**Problema reportado:** (1) a actualização exigia carregar em «Actualizar agora», e o aviso às vezes demorava a aparecer; (2) utilizadores antigos não viam alterações já publicadas, como o logótipo oficial no telemóvel.

**Causa:** service worker em modo `prompt`: a versão nova ficava à espera de um clique, e quem não o dava continuava com o precache antigo. Os cabeçalhos HTTP do Vercel estão certos (`max-age=0`).

**Feito:**
- `vite.config.ts`: `skipWaiting`, `clientsClaim` e `cleanupOutdatedCaches`; histórico de novidades injectado no bundle (`__NOVIDADES__`), sem `/novidades.json`.
- `lib/pwaUpdate.ts` (`iniciarActualizacaoAutomatica`): conta como versão nova um `controllerchange` quando já havia controlador; procura de hora a hora e ao voltar à app (no máximo uma vez por minuto).
- `lib/novaVersao.ts`: recarrega nos primeiros 15 s, na mudança de ecrã (`ActualizarAoMudarDeEcra`) ou ao voltar à app depois de ≥ 5 min fora.
- `AvisoDeNovaVersao` informativo («A app foi actualizada», «Continuar»), depois do recarregamento; `lib/novidades.ts` (`novidadesPorMostrar`, `marcarNovidadesVistas`).
- Versão 0.2.2.

**Critérios de Entrega:**
- [x] Testes: `pwaUpdate.test.ts` (8), `novaVersao.test.ts` (6), `novidades.test.ts` (9), `AvisoDeNovaVersao.test.tsx` (6), `ActualizarAoMudarDeEcra.test.tsx` (2); 667 testes, `tsc`, lint e build sem erros.
- [x] Browser real (Edge, servidor que troca de build a meio, como num deploy):
  - da build de `main` (modo `prompt`) para esta, sem pedido de actualização; versão nova na abertura seguinte, com o aviso;
  - versão nova nos primeiros segundos: recarrega sozinha;
  - a meio do uso: só recarrega na mudança de ecrã.
- [ ] No telemóvel com a PWA instalada, que estava na versão antiga: abrir a app depois do deploy. Deve ficar com o logótipo novo e mostrar «A app foi actualizada», sem carregar em nada. Pode ser preciso fechar e abrir a app duas vezes: na primeira, o browser descarrega a versão nova em segundo plano.

---

## Fase 38 — Zona de atendimento do profissional (N1)

**Estado: implementada em `feat/novas-funcionalidades` (21/10/2026), em `main` pelo merge `4b2cbb7` e em produção; por validar no browser.** Aprovada pelo utilizador a 21/10/2026 (TRD Adendo v1.66, N1). Consome a Fase 31 do backend (migration primeiro, depois backend, depois frontend).

**Escopo:**
- `components/catalogo/ZonaDeAtendimento.tsx` em «O meu catálogo» (secção «Onde trabalhas»): raio em botões (5, 10, 25, 50, 100 km ou «Não definido») e as 11 províncias (`lib/provinces.ts`), com aviso quando o perfil não tem localização (o raio ainda não conta). Grava por `useUpdateServiceArea`, que invalida o catálogo e a pesquisa.
- `components/catalogo/zona.ts` (`descreverZona`): «Atende: até 25 km · Cidade de Maputo, Maputo» na apresentação do catálogo; nada quando não há zona.
- Pesquisa: sem GPS, `useProfessionalSearch` envia a província do perfil (só se for uma das 11); o cartão mostra o selo «Atende a tua zona» em texto.
- Tipos: `ServiceArea` e `service_area` em `services/catalog.ts`; `serves_area` e `province` em `services/professionalSearch.ts`.

**Desvio ao plano:** N2 (preço indicativo) foi adiado pelo utilizador; nada de preço nesta fase (nem `lib/dinheiro.ts`).

**Critérios de Entrega:**
- [x] Editor: sem mudanças não grava, escolher raio e província, tirar província guardada e «Não definido», aviso sem localização, erro do servidor no toast; `descreverZona` — 6 testes (`ZonaDeAtendimento.test.tsx`).
- [x] Selo «Atende a tua zona» só em quem atende — 1 teste novo em `FindProfessionals.test.tsx` (que passou a simular `useProfile`).
- [ ] Visto no browser a 390 px e contra o backend real (migration da Fase 31 aplicada).

---

## Fase 39 — Procura sem oferta (N4)

**Estado: implementada em `feat/novas-funcionalidades` (21/10/2026), em `main` pelo merge `4b2cbb7` e em produção; por validar no browser.** Aprovada pelo utilizador a 21/10/2026 (TRD Adendo v1.66, N4). Consome a Fase 32 do backend.

**Escopo:**
- `components/busca/AvisaMe.tsx`: «Ainda não há [serviço] perto de ti. Queres que te avisemos quando houver?», com a província do perfil pré-escolhida (pode mudar) e confirmação no ecrã. Aparece em `ResultadosDaBusca` só para **clientes** com um **serviço escolhido**, quando não há ninguém, ou quando há localização e ninguém está perto nem atende a zona (a mesma regra do backend).
- `components/profile/OsMeusAvisos.tsx` no Perfil (só `CLIENT`; não aparece sem avisos), com «Apagar».
- Admin: separador **«Procura»** na Visão Geral (`pages/AdminProcura.tsx` + `components/admin/procura/TabelaDaProcura.tsx`): serviço × província, procuras, clientes, avisos pendentes, profissionais elegíveis e o selo «Falta oferta» em texto; filtro de datas e «Exportar CSV» (o mecanismo de `ExportacoesCsv`).
- `services/searchAlerts.ts`, `hooks/useSearchAlerts.ts`; `fetchProcura`/`useProcura` e o tipo de exportação `demand` em `services/adminReports.ts`.
- Termos de utilização, secção 9: o registo das pesquisas sem resultado (grelha de ~1 km, 12 meses) e dos avisos. Data dos termos: 21/10/2026.

**Critérios de Entrega:**
- [x] `AvisaMe`: pedido com a província do perfil, mudar a província, província inválida no perfil, 409 do servidor; quando aparece e quando não aparece (com alguém perto, a atender a zona, sem localização com resultados, não cliente) — 5 testes.
- [x] `OsMeusAvisos`: lista com estado, apagar, escondido sem avisos, erro — 3 testes. `AdminProcura`: dados com «Falta oferta», vazio e erro — 3 testes.
- [ ] Visto no browser a 390 px e contra o backend real (migration da Fase 32 aplicada).

---

## Fase 40 — Clientes empresariais e locais guardados (N6)

**Estado: implementada em `feat/novas-funcionalidades` (21/10/2026), em `main` pelo merge `4b2cbb7` e em produção; por validar no browser.** Aprovada pelo utilizador a 21/10/2026 (TRD Adendo v1.66, N6). Consome a Fase 33 do backend.

**Escopo:**
- Perfil do cliente: `components/profile/DadosDaEmpresa.tsx` («Sou uma empresa ou instituição», nome, NUIT de 9 dígitos validado antes de enviar) e `components/profile/OsMeusLocais.tsx` (lista, acrescentar com província/distrito/bairro e, opcionalmente, as coordenadas GPS do perfil; apagar; limite de 20).
- Pedidos: `components/pedidos/EscolhaDoLocal.tsx` em «Novo pedido» e «Solicitar serviço» — a localização do perfil ou um local guardado (só aparece a quem tem locais).
- «Os meus pedidos»: «Exportar (CSV)» (`components/pedidos/ExportarOsMeusPedidos.tsx`, reutiliza `guardarFicheiro`).
- Contacto do cliente (`ContactoCliente`): «Facturar a: nome · NUIT» quando o cliente é empresa.
- `services/clientLocations.ts`, `hooks/useClientLocations.ts`; tipos novos em `services/profile.ts` e `services/serviceRequests.ts` (opcionais, para não partir contra um backend antigo).
- Termos de utilização, secção 9: nome e NUIT mostrados ao profissional do pedido.

**Desvio ao plano:** o frontend **copia** o local guardado para `location` (`lib/localDoPedido.ts`, `moradaEscolhida`) em vez de enviar `saved_location_id`. Assim o pedido continua a poder ir para a fila offline (Fase 5) e sai igual sem rede; `saved_location_id` fica disponível na API.

**Critérios de Entrega:**
- [x] Dados da empresa (enviar, NUIT incompleto e nome em falta bloqueiam, voltar a particular), locais (acrescentar com coordenadas do perfil, listar e apagar), `moradaEscolhida` (perfil, local copiado, local apagado) — 6 testes (`ClienteEmpresarial.test.tsx`). Os testes de Perfil, Novo pedido, Solicitar serviço e Os meus pedidos passaram a simular `useClientLocations`.
- [ ] Visto no browser a 390 px e contra o backend real (migration da Fase 33 aplicada); confirmar o CSV no Excel.

---

## Fase 41 — Selos de credenciais (N5)

**Estado: implementada em `feat/novas-funcionalidades` (21/10/2026), em `main` pelo merge `4b2cbb7` e em produção; por validar no browser.** Aprovada pelo utilizador a 21/10/2026 (TRD Adendo v1.66, N5). Consome a Fase 34 do backend.

**Escopo:**
- `pages/Credentials.tsx` em `/credenciais` (profissional e técnico; sem `OnboardingGate`, como os trabalhos do técnico): enviar, ver o estado e o motivo de uma rejeição, apagar. Atalho «As minhas credenciais» no Perfil.
- `components/credenciais/FormularioDeCredencial.tsx`: tipo, título, emissor, datas e fotografia (upload por URL assinado, como o KYC). O registo criminal exige a data de emissão; validade anterior à emissão bloqueia.
- `components/catalogo/SelosDeCredenciais.tsx`: «Registo criminal verificado, válido até 03/2027», na apresentação do profissional e em cada técnico da equipa.
- Admin: separador **«Credenciais»** na secção KYC (`components/admin/kyc/FilaDeCredenciais.tsx`): titular e KYC dele, «Ver documento» (URL de 60 s pedido só ao carregar, mostrado como imagem), aprovar, rejeitar com motivo obrigatório.
- `services/credentials.ts`, `services/adminCredentials.ts`, `hooks/useCredentials.ts`, `hooks/useAdminCredentials.ts`; `credentials` (opcional) em `services/catalog.ts`.
- Termos de utilização, secção 9: os documentos das credenciais.

**Desvio ao plano:** o visualizador ficou dentro de `FilaDeCredenciais` (imagem com ligação para o tamanho real) em vez de um `VisualizadorDeDocumento` partilhado — o KYC (problema 3 do Adendo v1.65) não foi aprovado, por isso ainda não há segundo uso.

**Critérios de Entrega:**
- [x] Formulário (registo criminal sem emissão bloqueado, envio com ficheiro, datas trocadas), selos (texto com validade, nada sem credenciais), fila do admin (documento só a pedido, imagem com o URL, rejeitar exige motivo, fila vazia) — 6 testes (`Credenciais.test.tsx`).
- [ ] Visto no browser e num telemóvel, contra o backend real (migration da Fase 34 aplicada): upload, URL de 60 s e selo no catálogo.

---

## Fase 42 — Serviços recorrentes (N3)

**Estado: implementada em `feat/novas-funcionalidades` (21/10/2026), em `main` pelo merge `4b2cbb7` e em produção; por validar no browser. Versão 0.3.0 (entrada em `novidadesPorVersao.json` cobre as Fases 38 a 42).** Aprovada pelo utilizador a 21/10/2026 (TRD Adendo v1.66, N3). Consome a Fase 35 do backend.

**Escopo:**
- «Os meus pedidos»: «Repetir regularmente» nos pedidos concluídos com profissional e serviço (`components/pedidos/RepetirRegularmente.tsx`: frequência, próxima data a partir de amanhã em Maputo e as três datas seguintes, com a mesma regra do backend); ligação a «Serviços recorrentes».
- `pages/RecurringRequests.tsx` em `/servicos-recorrentes` (o endereço dos emails do backend): estado, próxima data, pausar, retomar, cancelar; explica a pausa por falhas e o motivo de quem deixou de aceitar.
- «Trabalhos aceites»: etiqueta «Recorrente» nos pedidos que vêm de uma recorrência e a secção `components/pedidos/RecorrenciasDoProfissional.tsx` com «Deixar de aceitar» (motivo obrigatório).
- `services/recurringRequests.ts`, `hooks/useRecurringRequests.ts`; `recurring_request_id` (opcional) no tipo do pedido.
- Termos de utilização, secção 3: os serviços recorrentes.

**Desvio ao plano:** a lista do cliente é um ecrã próprio (`/servicos-recorrentes`) e não uma secção de «Os meus pedidos»: é para lá que os emails do backend apontam.

**Critérios de Entrega:**
- [x] Datas (mensal com fim de mês, mudança de ano), marcar com as próximas datas e confirmação, data antes de amanhã bloqueada, lista do cliente (pausar, cancelar, retomar, pausa por falhas, motivo do profissional, vazio), «Deixar de aceitar» com motivo obrigatório, secção escondida sem recorrências — 9 testes (`Recorrentes.test.tsx`).
- [ ] Visto no browser e contra o backend real (migration da Fase 35 aplicada), incluindo uma vez criada pelo job.

---

## Fase 43 — E2E do CI de volta ao verde e barra «Pedir a 3» no telemóvel

**Estado: implementada em `fix/e2e-ecras-de-perfil` (21/10/2026), por fazer merge. Versão 0.3.1.** Ver Adendo v1.68 do TRD. Só frontend.

**Problema reportado:** o CI do frontend falhava desde 13/10 (runs #42 a #48) em `e2e/ecras-de-perfil.spec.ts`.

**Causas e correcções:**
- `ecras-de-perfil.spec.ts` media a posição da foto a meio da animação `fade-in` (`scale(0.98)`, x ≠ 0); agora espera que as animações finitas acabem (`esperarAnimacoes`). Procurava ainda o link «Pedir Canalização», substituído na Fase 28 por «Solicitar serviço» e «Ou pede propostas de Canalização»; as asserções seguem os links actuais.
- Com a sessão gravada pelo `entrarComo`, `lib/novidades.ts` conclui que «já usava a app» e abre «O que há de novo» por cima da página, que intercepta os cliques. `e2e/ajudas.ts` grava também `piquete:versao-vista` com a versão do `package.json`.
- **Defeito real no telemóvel:** em `FindProfessionals.tsx`, as formas decorativas (`-right-20`, `w-80`) alargavam a página 80 px. A página deslizava para o lado e o botão «Pedir a 3» da barra fixa saía do ecrã. Correcção: `overflow-x-clip` no `main` (`clip` e não `hidden`, que criaria um contentor de deslocamento).
- A Fase 40 (N6) pôs o `/novo-pedido` a ler `GET /clients/me/locations`; os E2E que passam pelo formulário simulam essa rota.
- `playwright.config.ts`: `VITE_MONTRA_DE_DEMONSTRACAO=false` no build dos E2E. Um `.env` local com a montra ligada escondia o estado de erro da Home; o CI não tem `.env`.
- Versão 0.3.1, com entrada em `novidadesPorVersao.json`.

**Critérios de Entrega:**
- [x] E2E: 25/25 com `E2E_BROWSER=msedge npx playwright test`; 705 testes unitários, lint (só os 2 avisos que já existiam) e build sem erros.
- [ ] CI verde em `fix/e2e-ecras-de-perfil`.
- [ ] No telemóvel: a pesquisa de profissionais não desliza para o lado, e «Pedir a 3» fica à vista.

---

## Fase 44 — Publicação: política de privacidade e base de SEO

**Estado: implementada em `feat/privacidade-e-seo-base` (22/10/2026), por fazer merge. Versão 0.4.0.** Bloco P4 do TRD Adendo v1.69, aprovado pelo utilizador a 22/10/2026; o que foi feito, as decisões e os desvios estão no Adendo v1.70. Só frontend.

**Objetivo:** com o domínio `www.piquetepro24.co.mz` no ar, ter a política de privacidade que o Google exige, deixar indexar só as páginas públicas e mostrar uma pré-visualização decente quando o endereço é partilhado.

**Escopo:**
- `src/lib/paginasPublicas.ts` (lista das páginas indexáveis, sitemap) e `src/lib/metadadosDaPagina.ts` + `components/MetadadosDaPagina.tsx` (título, descrição, `canonical` e `robots` por rota).
- Plugin `indexacao` no `vite.config.ts`: gera `app.html` (com `noindex`) e `sitemap.xml`; `vercel.json` serve `index.html` nas páginas públicas e `app.html` no resto; `Permissions-Policy`.
- `index.html` com descrição e Open Graph; `public/og-image.jpg`, `public/robots.txt`, `public/.well-known/security.txt`; manifest com `id`, `scope`, `lang`, `dir` e `categories`.
- Página `/privacidade` (`src/data/politicaDePrivacidade.ts`, `pages/Privacidade.tsx`), ligação no registo e ligações entre os documentos legais (`LegalDocument`).

**Critérios de Entrega:**
- [x] Testes: lista de páginas contra o `vercel.json` e o `index.html`, sitemap, metadados por rota (públicas e privadas, sem duplicar etiquetas), conteúdo e página da privacidade, ligação no registo — 724 testes, lint (só os 2 avisos que já existiam) e build sem erros.
- [x] Build: `dist/app.html` com `noindex`, `dist/index.html` com `index, follow`, `sitemap.xml` com as 3 páginas, `.well-known/security.txt` copiado.
- [x] No browser (Edge, `vite preview`, ecrã de telemóvel): `/privacidade` e `/termos` com título e `canonical` próprios; uma rota privada com `noindex` e sem `canonical`; a política lê-se bem no telemóvel.
- [ ] Em produção, depois do deploy: `noindex` em `/perfil`, `index, follow` em `/` e `/privacidade`; `sitemap.xml`, `robots.txt`, `security.txt` e `og-image.jpg` respondem 200.
- [ ] Pré-visualização de `https://www.piquetepro24.co.mz` no WhatsApp com imagem e descrição.
- [ ] Texto da política revisto por jurista e `geral@piquetepro24.co.mz` confirmado como caixa lida.
- [ ] Branding do Google com `https://www.piquetepro24.co.mz/privacidade`.

---

## Fase 45 — Segurança (OWASP Top 10): dados da sessão, cabeçalhos e CI

**Estado: implementada em `fix/seguranca-owasp` (22/10/2026), em `main` pelo merge `19b0418` e publicada na Vercel a 22/10/2026 (CSP nova e HSTS confirmados nos cabeçalhos). Versão 0.4.1.** Auditoria OWASP Top 10:2025 e plano S1–S10 aprovados pelo utilizador a 22/10/2026; o que foi feito, as decisões e os desvios estão no TRD, Adendo v1.71. Corresponde à Fase 36 do backend, mas não depende dela: não lê nada novo da API e pode sair antes ou depois.

**Escopo:**
- **S3 — dados da sessão anterior:** o `AuthProvider` (`src/store/AuthContext.tsx`) limpa a cache do React Query quando a sessão termina (`SIGNED_OUT`) ou quando entra outra pessoa no mesmo aparelho; até aqui só era limpa ao apagar a conta. O `vite.config.ts` deixa de ter `runtimeCaching` para `/api/*` (decisão do utilizador).
- **S7 — cabeçalhos:** `connect-src` da CSP com as origens exactas (o projecto Supabase e `piquetepro24-backend.fly.dev`, em vez de `*.supabase.co` e `*.fly.dev`); `Strict-Transport-Security: max-age=63072000` explícito no `vercel.json`.
- **S2 — CI e dependências:** actions fixadas por SHA, `permissions: contents: read`, `.github/dependabot.yml`; `npm audit fix` (só o lock) — produção passa a 0 vulnerabilidades.
- Versão 0.4.1, com entrada em `novidadesPorVersao.json`.

**Desvios ao plano (S1–S10 da auditoria):**
- **A regra `runtimeCaching` de `/api/*` nunca guardou nada em produção:** a API responde na raiz do Fly, sem `/api/` no caminho. Esta parte do item 1 da auditoria foi um erro; o problema real era a cache do React Query em memória. A regra sai na mesma, para não começar a guardar dados se a API mudar de caminho.
- `Permissions-Policy` já tinha entrado na Fase 44.
- Ficam por subir o `vitest` (3 → 5) e o `tailwindcss` (3 → 4), que trazem as vulnerabilidades críticas e altas que restam — só de desenvolvimento (testes e build), não chegam ao browser. São subidas de versão major; a do Tailwind é uma migração de configuração e de estilos. No backlog.

**Critérios de Entrega:**
- [x] `AuthProvider`: sair limpa; outra pessoa a entrar limpa; a mesma a renovar o token não perde nada; o primeiro login no aparelho não apaga — 4 testes (`AuthContext.test.tsx`).
- [x] `vercel.json`: `connect-src` sem wildcards e com as duas origens, `script-src 'self'`, HSTS — 3 testes (`cabecalhosDeSeguranca.test.ts`).
- [x] 731 testes unitários, lint (só os 2 avisos que já existiam), build sem erros e sem `api-cache` no `sw.js`; E2E 25/25 com `E2E_BROWSER=msedge`.
- [ ] Depois do deploy: login com email e com Google no `www` (a CSP só deixa falar com o projecto Supabase indicado), pesquisa e catálogo carregam, upload de foto de perfil funciona; `curl -sI` mostra a CSP nova e o HSTS.
- [ ] No telemóvel: terminar sessão e entrar com outra conta não mostra nada da anterior.
- [ ] CI verde com as actions fixadas por SHA; o Dependabot abre o primeiro PR.

---

## Resumo de Dependências entre Fases

```
Fase 0 (Fundação PWA)
   └─> Fase 1 (Auth & Perfil)
          └─> Fase 2 (Busca por Proximidade)
                 └─> Fase 3 (Ciclo de Vida do Pedido)
                        └─> Fase 4 (KYC & Subscrição)
                               ├─> Fase 5 (Offline & Resiliência)
                               │      └─> Fase 6 (Acessibilidade & Performance)
                               │             └─> Fase 7 (Integração Final & Deploy)
                               ├─> Fase 8 (Painel de Administração Avançado — depende da Fase 9 do backend)
                               └─> Fase 9 (Catálogo do Profissional — depende da Fase 10 do backend)
                                      └─> Fase 10 (Pesquisa por Serviço, Pedido a Vários & Propostas — depende da Fase 11 do backend)
                                             ├─> Fase 11 (Portfólio por trabalho — backend 12)
                                             ├─> Fases 12–22 (Painel de admin completo — backend 9 e 15–24) ─> Fases 31, 32 e 34 (refinamento, dois passos, menu lateral)
                                             ├─> Fases 23–26 (Empresas e equipas — backend 25–28)
                                             └─> Fase 27 (Pedido directo — backend 29) ─> Fase 28 (Contacto no catálogo — backend 30)

Só frontend, sem dependência do backend: Fases 29, 33, 35 e 36 (localização), 30 e 37 (aviso e actualização da app).
```

**Alinhamento com o Backend:** cada fase deste plano depende do endpoint correspondente já estar disponível (ainda que em staging) no repositório [PiquetePro24_Backend](https://github.com/Nexel002/PiquePro24_Backend) — Fase 1 ↔ Backend Fase 2, Fase 2/3 ↔ Backend Fase 3, Fase 4 ↔ Backend Fases 4-5, Fase 7 ↔ Backend Fase 7. A documentação OpenAPI publicada desde cedo pelo backend (ver Adendo v1.2 no plano do backend) é o contrato de referência para desbloquear o desenvolvimento do frontend antes de cada endpoint estar 100% pronto (mock local contra o schema documentado).

A correspondência completa, fase a fase, entre os dois planos está no fim de `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md` («Correspondência com as fases do frontend»).

---

## Backlog — propostas da análise de 21/10/2026 (por aprovar)

Origem: TRD Adendo v1.65. **Nada aqui está aprovado.** Cada item, quando aprovado, passa a fase própria com adendo do TRD e critérios de entrega, depois da fase correspondente do backend (backend primeiro). A ordem dentro de cada grupo é a ordem recomendada.

**Verificação (sem código):**
- [ ] Sessão de validação no telemóvel e no browser com os critérios por marcar das Fases 11 a 37, por esta ordem: pedido directo e contacto (27, 28), empresas (23 a 26, depois de confirmadas as migrations do backend), localização (29, 33, 35, 36), actualização da app (37), painel de admin (12 a 22, 31, 32, 34).
- [ ] Lighthouse com sessão e em produção (Fases 5 e 6).

**Correcções (Adendo v1.65, parte C):**
- [ ] **Problema 2** — na pesquisa, o selo «Responde a pedidos» e os elegíveis primeiro; na escolha dos 3, explicar porque um profissional não conta.
- [ ] **Problema 3** — o cartão de KYC mostra a imagem do documento (URL assinado do backend), com zoom.
- [ ] **Problema 5** — enquanto não há notificações (D2): no ecrã «Os meus pedidos», um indicador de propostas novas por pedido, para quem se registou por telefone e não recebe email.
- [ ] **Problema 6** — «Trabalho terminado» do lado do profissional; confirmar ou contestar do lado do cliente; pedido de avaliação logo a seguir.
- [ ] **Problema 7** — prazo de resposta visível nos convites e nos pedidos directos; «Recusar» no pedido directo, com motivo.
- [ ] **Problema 9** — estado real na lista de utilizadores do admin (`banned_until`); reconhecer o 403 dos dois passos pelo `code` (depois do backend); favoritos guardados no servidor; contraste do «24» do logótipo.

**Funcionalidades (Adendo v1.65, parte D):**
- [ ] D2 — central de notificações no sino (lista, marcar como lido) e Web Push no service worker, com o pedido de permissão só depois de uma acção do utilizador (como na localização, Fase 36).
- [ ] D2 — botão «Abrir no WhatsApp» (`wa.me`) onde hoje aparece o telefone do profissional e do cliente.
- [ ] D1 — ecrã de subscrição com pagamento real, período experimental e escolha de plano.
- [ ] D2 — pedido urgente; «Disponível agora» e horário no perfil do profissional; fotos e data preferida no formulário do pedido.
- [ ] D3 — motivo ao cancelar; avaliar o cliente (profissional); responder a uma avaliação.
- [ ] D4 — painel de desempenho do profissional (convites, propostas, taxa de escolha, visualizações do catálogo).
- [ ] D5 — selfie com o BI no ecrã de KYC.

**Ideias novas (Adendo v1.65, D7 — plano detalhado no TRD Adendo v1.66 e na secção «Propostas N1 a N7» abaixo):**
- [ ] N1 — zona de atendimento do profissional.
- [ ] N2 — preço indicativo por serviço.
- [ ] N3 — serviços recorrentes (depois dos problemas 6 e 7).
- [ ] N4 — procura sem oferta e avisos ao cliente.
- [ ] N5 — selos de credenciais.
- [ ] N6 — clientes empresariais e locais guardados.
- [ ] N7 — pagamento do serviço pela app, com comissão (bloqueada pelo parecer jurídico e pelo M-Pesa real).

**Técnico (Adendo v1.65, parte E):**
- [ ] Testes de componente de `MyServiceRequests` e `AssignedServiceRequests` (Fase 16).
- [ ] `framer-motion`: remover das dependências ou usá-lo (hoje nenhum ficheiro de `src/` o importa).
- [ ] `README.md` do repositório.

**Segurança — o que ficou da auditoria OWASP de 22/10/2026 (TRD Adendo v1.71):**
- [ ] Subir o `vitest` de 3 para 5 (traz o `tinypool` e o `@vitest/mocker` corrigidos — críticas, só em testes).
- [ ] Subir o `tailwindcss` de 3 para 4 (traz o `braces` e o `postcss-selector-parser` corrigidos — altas e moderadas, só no build); é uma migração de configuração e estilos, com revisão visual dos ecrãs.

---

## Propostas N1 a N7 — implementação no frontend (por aprovar)

**Estado: PLANO, por aprovar (TRD Adendo v1.66, 21/10/2026).** O objectivo, as regras, as decisões e as perguntas de cada proposta estão no TRD, Adendo v1.66. Os endpoints e a migration de cada uma estão no plano do backend, na secção com o mesmo nome. Aqui fica só o que se faz neste repositório. Ao ser aprovada, uma proposta passa a «Fase 38», «Fase 39»… pela ordem de aprovação, **sempre depois** da fase do backend correspondente estar em produção.

**Regras para todas.** São as mesmas de qualquer fase deste plano:
- **Camadas:** chamadas em `src/services/`, estado de servidor em hooks do TanStack Query em `src/hooks/`, tipos iguais ao que a API devolve.
- **Estados:** quatro em cada ecrã — a carregar (esqueleto), erro (mensagem compreensível), vazio e com dados.
- **Desenho:** mobile-first (390 px primeiro) e componentes de `src/components/ui/`.
- **Testes:** um teste de componente por ecrã novo (Vitest + Testing Library), ao nível dos que já existem.
- **Versão:** cada entrega visível sobe a versão do `package.json` e acrescenta uma entrada em `src/data/novidadesPorVersao.json`.

### N1 + N2 — Zona de atendimento e preço indicativo

> **21/10/2026:** N1 aprovada e implementada como **Fase 38**. N2 **adiada** pelo utilizador: o que abaixo diz respeito ao preço continua por aprovar.

| Ficheiro | Acção | O quê |
|---|---|---|
| `src/lib/dinheiro.ts` (+ `.test.ts`) | criar | `formatarMzn(valor)` e `rotuloDaUnidade(unidade)`. Hoje o formato dos preços em MZN repete-se em `RequestProposals.tsx` e `ReceivedInvitations.tsx`: os dois passam a usar este |
| `src/services/catalog.ts`, `src/services/professionalSearch.ts`, `src/services/serviceCategories.ts` | alterar | Tipos: `service_area` e o preço em cada serviço do catálogo; `serves_area`, `price_from`, `price_unit` na pesquisa; `updateServiceArea()` e `updateServicePrice()` |
| `src/hooks/useCatalog.ts`, `src/hooks/useServiceCategories.ts` | alterar | `useUpdateServiceArea` e `useUpdateServicePrice`; invalidam a chave do catálogo do próprio |
| `src/components/catalogo/ZonaDeAtendimento.tsx` | criar | Editor: raio em botões (5, 10, 25, 50, 100 km, «Não definido») e províncias em caixas de selecção (`MOZAMBIQUE_PROVINCES`). Aviso quando o perfil não tem localização: o raio não conta |
| `src/components/catalogo/PrecoDoServico.tsx` | criar | Por serviço escolhido: valor e unidade, «Retirar preço» e o rótulo «indicativo» |
| `src/pages/MyCatalog.tsx` | alterar | Secções «Onde trabalho» e preços junto da lista de serviços |
| `src/components/catalogo/ApresentacaoDoProfissional.tsx` | alterar | «Atende: até 25 km · Maputo, Matola» e os preços («a partir de 500 MZN por visita — indicativo») |
| `src/hooks/useProfessionalSearch.ts`, `src/pages/FindProfessionals.tsx` | alterar | Sem GPS, enviar a província do perfil (`province`) |
| `src/components/busca/CartaoDeProfissional.tsx` | alterar | Selo «Atende a tua zona» (com texto, não só cor) e «a partir de …» quando há filtro de serviço |

**Critérios de entrega**
- [ ] Editar zona e preço, com erro do servidor e gravação optimista desfeita — testes de `ZonaDeAtendimento` e `PrecoDoServico`.
- [ ] Cartão da pesquisa com e sem selo, com e sem preço — teste.
- [ ] Catálogo de um profissional sem zona nem preços igual ao de hoje — teste.
- [ ] Visto num telemóvel a 390 px: botões do raio com alvo de toque adequado.

### N3 — Serviços recorrentes

> **21/10/2026:** aprovada e implementada como **Fase 42**.

**Pré-requisito:** os ecrãs da conclusão pelo profissional e da recusa (Adendo v1.65, problemas 6 e 7).

| Ficheiro | Acção | O quê |
|---|---|---|
| `src/services/recurringRequests.ts`, `src/hooks/useRecurringRequests.ts` | criar | Chamadas e hooks; ao criar, mudar ou recusar, invalidam as listas de recorrências e de pedidos |
| `src/components/pedidos/RepetirRegularmente.tsx` | criar | Frequência (semanal, de 15 em 15 dias, mensal) e data da próxima vez; mostra as três datas seguintes antes de confirmar |
| `src/components/pedidos/ListaDeRecorrencias.tsx` | criar | Estado (activa, pausada, cancelada, falhas), próxima data, pausar, retomar, mudar e cancelar |
| `src/pages/MyServiceRequests.tsx` | alterar | Botão «Repetir regularmente» nos pedidos concluídos com profissional; secção «Recorrentes» |
| `src/pages/AssignedServiceRequests.tsx` | alterar | Etiqueta «Recorrente» nos pedidos que vêm de uma recorrência; «Deixar de aceitar» com motivo |

**Critérios de entrega**
- [ ] Criar, pausar, retomar e cancelar; ver as próximas datas; recusar do lado do profissional — testes.
- [ ] Estado vazio («Ainda não tens serviços recorrentes») e recorrência pausada por falhas, com o motivo — teste.

### N4 — Procura sem oferta

> **21/10/2026:** aprovada e implementada como **Fase 39**.

| Ficheiro | Acção | O quê |
|---|---|---|
| `src/services/searchAlerts.ts`, `src/hooks/useSearchAlerts.ts` | criar | Avisos do cliente |
| `src/components/busca/AvisaMe.tsx` | criar | «Ainda não há [serviço] perto de ti. Avisa-me quando houver», com a província do perfil pré-escolhida; confirma por toast |
| `src/components/busca/ResultadosDaBusca.tsx` | alterar | Mostrar `AvisaMe` quando não há ninguém perto (lista vazia ou só «Outros profissionais») e há um serviço escolhido |
| `src/components/profile/OsMeusAvisos.tsx`, `src/pages/Profile.tsx` | criar / alterar | Lista dos avisos com «Apagar» (só `CLIENT`) |
| `src/services/adminReports.ts`, `src/hooks/useAdminReports.ts` | alterar | Procura e exportação |
| `src/components/admin/procura/TabelaDaProcura.tsx` | criar | Serviço × província: procuras, clientes, avisos pendentes e profissionais elegíveis, ordenada pela falta de oferta. Filtro de datas e «Exportar CSV» (o mesmo mecanismo de `ExportacoesCsv.tsx`) |
| `src/pages/AdminVisaoGeral.tsx` | alterar | Separador novo «Procura» |
| `src/data/termosDeUtilizacao.ts` | alterar | Frase sobre o registo das pesquisas sem resultado (grelha de ~1 km, 12 meses) |

**Critérios de entrega**
- [ ] `AvisaMe` aparece só no caso certo; criar, duplicado (mensagem do 409) e apagar — testes.
- [ ] Separador «Procura» com dados, vazio e erro — teste.

### N5 — Selos de credenciais

> **21/10/2026:** aprovada e implementada como **Fase 41**.

| Ficheiro | Acção | O quê |
|---|---|---|
| `src/services/credentials.ts`, `src/hooks/useCredentials.ts` | criar | Upload (URL assinado, como o KYC em `services/kyc.ts`), submeter, listar e apagar |
| `src/pages/Credentials.tsx`, `src/App.tsx` | criar / alterar | Ecrã `/credenciais` (`PROFESSIONAL` e `TECHNICIAN`), com a lista, o estado e o motivo de rejeição de cada credencial |
| `src/components/credenciais/FormularioDeCredencial.tsx` | criar | Tipo, título, emissor, datas e fotografia (reutiliza a conversão de imagem de `lib/imageConversion.ts`) |
| `src/components/profile/AtalhoDoCatalogo.tsx` (ou um atalho novo) | alterar | Entrada «As minhas credenciais» no perfil do profissional e do técnico |
| `src/components/catalogo/SelosDeCredenciais.tsx` | criar | Selos com texto («Registo criminal verificado, válido até 03/2027») |
| `src/components/catalogo/IdentidadeDoProfissional.tsx`, `src/components/catalogo/EquipaDaEmpresa.tsx` | alterar | Selos do profissional e de cada técnico |
| `src/components/admin/VisualizadorDeDocumento.tsx` | criar | Imagem a partir de um URL temporário, com zoom e aviso de expiração. **Partilhado** com o documento do KYC (Adendo v1.65, problema 3) |
| `src/services/adminCredentials.ts`, `src/hooks/useAdminCredentials.ts`, `src/components/admin/kyc/CartaoDeCredencial.tsx`, `src/pages/AdminKyc.tsx` | criar / alterar | Separador «Credenciais» na secção KYC: fila por antiguidade, ver o documento, aprovar ou rejeitar com motivo |
| `src/data/termosDeUtilizacao.ts` | alterar | Tratamento dos documentos de credenciais (só a equipa os vê; apagados com a conta) |

**Critérios de entrega**
- [ ] Submeter (com upload a falhar a meio), lista com os três estados, apagar — testes.
- [ ] Selos só com dados aprovados vindos da API; o documento nunca aparece fora do admin — teste.
- [ ] Revisão no admin: ver o documento, aprovar, rejeitar sem motivo (bloqueado) — teste.

### N6 — Clientes empresariais

> **21/10/2026:** aprovada e implementada como **Fase 40**.

| Ficheiro | Acção | O quê |
|---|---|---|
| `src/services/profile.ts`, `src/hooks/useProfile.ts` | alterar | Tipos `client_type`, `business_name` e `business_nuit` |
| `src/components/profile/DadosDaEmpresa.tsx` | criar | «Sou uma empresa ou instituição», nome e NUIT (9 dígitos, validado antes de enviar); só `CLIENT` |
| `src/services/clientLocations.ts`, `src/hooks/useClientLocations.ts`, `src/components/profile/OsMeusLocais.tsx` | criar | Locais guardados: lista, criar (com o `LocationForm` existente), editar e apagar; máximo de 20 com mensagem própria |
| `src/components/LocationForm.tsx` | alterar | Opção «Usar um local guardado» antes do GPS e da escolha manual, quando o cliente tem locais |
| `src/pages/NewServiceRequest.tsx`, `src/pages/SolicitarServico.tsx` | alterar | Enviar `saved_location_id` quando se escolhe um local guardado |
| `src/pages/MyServiceRequests.tsx`, `src/services/serviceRequests.ts` | alterar | «Exportar (CSV)» com filtro de datas (descarga como em `ExportacoesCsv.tsx`) |
| `src/components/ContactoCliente.tsx` | alterar | Nome da entidade e NUIT quando o cliente é empresa |

**Critérios de entrega**
- [ ] Dados da empresa (NUIT inválido bloqueado), locais (limite, apagar), escolher um local no pedido — testes.
- [ ] Contacto do cliente com e sem dados de empresa — teste.

### N7 — Pagamento do serviço pela app, com comissão e retenção

**Bloqueada** pelas mesmas condições da proposta N7 do backend (parecer jurídico, M-Pesa real, conclusão automática).

| Ficheiro | Acção | O quê |
|---|---|---|
| `src/services/servicePayments.ts`, `src/hooks/useServicePayments.ts` | criar | Iniciar o pagamento, ler o estado (polling a cada 3 s só enquanto está pendente, como em `Subscription.tsx`) e propor o preço (profissional) |
| `src/components/pedidos/PagamentoDoServico.tsx` | criar | Valor, telefone pagador (M-Pesa 84/85, e-Mola 86/87: a regra que hoje vive em `Subscription.tsx` passa para `lib/phone.ts` e serve os dois), «Confirma no teu telemóvel» e o estado em texto («Pago — o valor fica guardado até concluíres o serviço») |
| `src/pages/RequestProposals.tsx`, `src/pages/SolicitarServico.tsx`, `src/pages/MyServiceRequests.tsx` | alterar | Pagar depois de escolher a proposta, ou de aceitar o preço do pedido directo; estado do pagamento em cada pedido |
| `src/pages/AssignedServiceRequests.tsx` | alterar | Propor o preço num pedido directo; «Valor a receber» (já sem a comissão) e a data prevista |
| `src/pages/AdminMais.tsx`, `src/components/admin/pagamentosDeServicos/` | alterar / criar | Separador «Pagamentos de serviços»: lista por estado, libertar, reembolsar ou dividir com nota obrigatória |
| `src/data/termosDeUtilizacao.ts` | alterar | Retenção, comissão, prazos de libertação e reembolso (texto a rever por jurista) |

**Critérios de entrega**
- [ ] Pagar (pendente → retido), falha e repetição, e o polling pára fora de `PENDING` — testes.
- [ ] O profissional vê o valor líquido; o cliente nunca vê a comissão como «taxa escondida» (texto claro) — teste.
- [ ] Acções do admin com nota obrigatória — teste.
- [ ] Jornada E2E (Playwright, API simulada) do pagamento até à libertação.

---

## Publicação em `www.piquetepro24.co.mz` (TRD Adendos v1.69 e v1.70)

Plano completo e justificações no TRD, Adendo v1.69; decisões tomadas e estado verificado no Adendo v1.70. Cada bloco só ganha número de fase quando é aprovado (P4 = Fase 44). Aqui ficam as tarefas do frontend; as do backend e da infra (DNS, Fly, Supabase, Google, email) estão no plano do backend, secção com o mesmo nome.

**Decisões tomadas:** D1 endereço oficial `www` (22/10/2026); D8 todos os rastreadores; plano gratuito do Supabase com cópia manual (Adendo v1.70, B). **Por decidir:** D2 API em `api.piquetepro24.co.mz`; D5 pré-renderização; D6 perfis públicos dos profissionais; D7 ferramenta de analytics.

**P1 — Domínio na Vercel**
- [x] `piquetepro24.co.mz` → 308 para `www.piquetepro24.co.mz`, que serve a app (verificado a 21/10/2026).
- [ ] Login com Google e com email em `https://www.piquetepro24.co.mz` termina com sessão (teste do utilizador).
- [ ] Só com D2: `VITE_API_URL=https://api.piquetepro24.co.mz`, novo deploy, `baseURL` confirmado no JS publicado, e no `connect-src` do `vercel.json` trocar `https://piquetepro24-backend.fly.dev` (origem exacta desde a Fase 45) por `https://api.piquetepro24.co.mz` — o teste `cabecalhosDeSeguranca.test.ts` acompanha a troca.

**P3 — Mudança de domínio para quem já usa a app**
- [ ] Aviso fixo quando a app abre num anfitrião `*.vercel.app`, com botão para o `www` e instruções para reinstalar a PWA.
- [ ] Antes de sair, tentar enviar a fila offline e avisar se ficarem pedidos por enviar — testes.

**P4 — Política de privacidade e base de SEO → Fase 44** (critérios na própria fase).

**P5 — Páginas públicas pré-renderizadas** (com D5)
- [ ] Entrada SSR do Vite + `scripts/prerender.mjs`: um HTML por rota pública, com título, descrição, `canonical`, Open Graph e JSON-LD próprios. Também resolve a pré-visualização de `/termos` e `/privacidade` (Adendo v1.70, desvios).
- [ ] Rotas: `/servicos`, `/servicos/<slug>` (8 serviços), `/como-funciona`, `/para-profissionais`, `/empresas`, `/sobre`, `/contacto`, `/perguntas-frequentes`. `/servicos/<slug>/<cidade>` só com ≥ 3 profissionais elegíveis na cidade. Cada uma entra em `src/lib/paginasPublicas.ts` e no `vercel.json`.
- [ ] As páginas públicas não carregam o Supabase nem o React Query.
- [ ] JSON-LD: `Organization` + `WebSite` em todas; `Service` + `BreadcrumbList` nos serviços; `FAQPage` nas FAQ — sem erros no Teste de Resultados Enriquecidos.
- [ ] `public/llms.txt`; `curl -A "GPTBot"` devolve o texto de cada página pública.
- [ ] Lighthouse no telemóvel: LCP < 2,5 s, CLS < 0,1 nas páginas públicas.

**P6 — Perfil público `/p/:slug`** (só com D6)
- [ ] Página pública do profissional sem telefone, com `ProfessionalService` + `AggregateRating`; botão «Pedir serviço» que leva ao login.
- [ ] Botão «Partilhar o meu perfil» (WhatsApp) no ecrã do profissional.

**P7 — Fora do código**
- [ ] Search Console (propriedade de domínio por DNS) com o sitemap; Bing Webmaster Tools + IndexNow.
- [ ] Analytics (D7); Google Business Profile e Bing Places; perfis nas redes com os mesmos dados.
- [ ] Lista mensal de perguntas aos motores de IA (Adendo v1.69, G7).

**P8 — Antes de abrir ao público**
- [ ] Monitorização externa de `https://www.piquetepro24.co.mz` e registo de erros no browser.
- [ ] `VITE_MONTRA_DE_DEMONSTRACAO` vazio em produção.

**P9 — Corte do domínio antigo**
- [ ] Redirect 308 de `*.vercel.app` para o `www` na Vercel; só depois o backend retira o domínio antigo do CORS (Adendo v1.69, C7).
- [x] `CLAUDE.md` com o domínio oficial novo (22/10/2026, na Fase 44).
