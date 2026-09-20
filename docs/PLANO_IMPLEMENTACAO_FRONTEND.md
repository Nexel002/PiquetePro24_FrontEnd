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
- [ ] Testes de componente automatizados (Vitest/Testing Library) ainda não configurados neste repositório — validação desta fase foi manual (Playwright ad-hoc), não uma suíte que corra em CI.
- [x] **(TRD Adendo v1.4, item A)** Login/registo via Google OAuth (`signInWithOAuth` + `/auth/callback`). Fluxo completo confirmado manualmente pelo utilizador: chega ao ecrã de consentimento do Google e autentica com sucesso. **Pendência conhecida (não bloqueante):** o ecrã do Google mostra o domínio técnico do projeto Supabase em vez de "PiquetePro24" — requer *brand verification* formal no Google Cloud Console, fora do controlo do código (ver nota no plano do backend).
- [x] **(TRD Adendo v1.4, item B)** Onboarding obrigatório de telefone (só quem entra via Google) e localização (todos os canais), via `OnboardingGate` + `pages/onboarding/`. Validado de ponta a ponta: acesso direto a `/perfil` sem completar os passos é bloqueado e devolvido ao passo em falta; sequência telefone → localização → perfil confirmada.
- [x] **(TRD Adendo v1.4, item C)** Foto de perfil opcional, com conversão para WebP reutilizável (`lib/imageConversion.ts`) e upload direto ao Storage. Validado de ponta a ponta: upload, `mimetype: image/webp` confirmado no ficheiro gravado, exibição na UI, remoção.
- [x] **(TRD Adendo v1.4, item D)** Apagar conta: secção "Zona de perigo" em `Profile.tsx`, confirmação em duas etapas, `useDeleteAccount()` chama `DELETE /profile` e depois `supabase.auth.signOut()` + `queryClient.clear()`, redireciona para `/`. `DELETE /profile` validado de ponta a ponta contra o Supabase real pelo backend (cliente com dados relacionados apagados em cascata; profissional atribuído a pedido de outro cliente não apaga o pedido — repõe `OPEN`), incluindo a correção de uma FK em falta descoberta nesse teste (ver plano do backend). O fluxo UI→`signOut`→redirect não foi exercitado via Playwright nesta sessão (a chamada de rede já está coberta pela validação do backend).
- [x] **(TRD Adendo v1.4, item E)** Escolha de `role` (Cliente/Profissional) logo no ecrã de registo — `fieldset` visível só em `sign-up`, antes de Google/email/telefone. Email/telefone envia `role` em `raw_user_meta_data`; Google guarda a escolha em `sessionStorage` antes do redirect e `AuthCallback.tsx` aplica-a depois via `POST /profile/become-professional`. Validado de ponta a ponta contra o Supabase e o backend reais: seletor correto (ausente em `sign-in`, presente em `sign-up`), signup por email grava o `role` escolhido (`PROFESSIONAL` e `CLIENT` default, sem regressão). O round-trip completo pelo Google (sessionStorage → redirect real → callback → `become-professional`) não foi automatizado — validado por partes (escrita em sessionStorage confirmada antes do redirect; endpoint testado diretamente contra o backend, incluindo idempotência).
- [x] **(TRD Adendo v1.4, item F)** Distinção Singular/Empresa — implementação: segundo `fieldset` em `Login.tsx`, visível só quando `intendedRole === 'PROFESSIONAL'` em `sign-up`. Email/telefone envia `professional_type` em `raw_user_meta_data`; Google guarda em `sessionStorage` (`INTENDED_PROFESSIONAL_TYPE_STORAGE_KEY`) e `AuthCallback.tsx` passa-o a `useBecomeProfessional()`, agora com `professionalType` obrigatório. `Profile.tsx` mostra "Tipo de profissional" quando aplicável. Type-check estrito, lint e build limpos.
- [x] **(TRD Adendo v1.4, item F)** Validação de ponta a ponta contra o Supabase real, feita pelo backend após a migration ser aplicada (ver critério correspondente no plano do backend): `professional_type` gravado corretamente para `SINGULAR`/`COMPANY` via signup, nunca preenchido para `CLIENT`, e gravado atomicamente com `role` no fluxo `become-professional` (Google). Como o contrato de dados (`UserProfile.professional_type`) é o mesmo consumido por `Profile.tsx`/`Login.tsx`/`AuthCallback.tsx`, a validação do backend cobre o caminho de dados ponta a ponta; a interação de UI em si (cliques nos seletores, navegação) já estava coberta pelo type-check estrito, lint e build limpos registados no critério de implementação acima.
- [x] **(TRD Adendo v1.4, item G)** Geocodificação reversa preenche `province`/`district`/`neighborhood` ao confirmar localização por GPS — `services/geocoding.ts` devolve os três campos junto do `placeName`; `LocationForm.tsx` envia-os no `PATCH /profile/location` a partir do resultado que a tela já tinha para a pré-visualização, sem chamada de rede nova. Consome o `GET /geocode/reverse` estendido do backend (ver critério correspondente no plano do backend). Type-check estrito, lint e build de produção confirmados limpos.
- [x] **(TRD Adendo v1.7)** `POST /notifications/welcome` chamado em `Login.tsx` (signup email/telefone com sessão imediata) e `AuthCallback.tsx` (signup via Google) — `services/notifications.ts`. Sem `await` bloqueante, erro engolido: uma falha aqui nunca pode fazer parecer que o signup falhou. **Limitação conhecida, não resolvida:** se o Supabase exigir confirmação de email antes de emitir sessão, o welcome não dispara nesse instante nem depois (não há hook no primeiro login pós-confirmação). `tsc -b`/`vite build`/`eslint` limpos; sem validação interativa em browser (sem ferramenta de automação disponível nesta sessão).
- [x] **(TRD Adendo v1.7)** Ecrã "Esqueci a password" em `Login.tsx` (`services/passwordRecovery.ts`, visível só em `sign-in`+`email`, mostra a mensagem exata devolvida pelo backend) + nova rota `/definir-nova-password` (`pages/DefinirNovaPassword.tsx`, sem `ProtectedRoute` — espera `isLoading` da sessão de recuperação como `AuthCallback.tsx` já faz para OAuth). `describeAuthError` extraída de `Login.tsx` para `lib/authErrors.ts`, partilhada pelas duas telas. `tsc -b`/`vite build`/`eslint` limpos; sem validação interativa em browser nem contra um link de recuperação real (depende da migration do backend, ainda não aplicada — ver TRD do backend, Adendo v1.8).

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
- [ ] Testes E2E (Playwright/Cypress) cobrindo o fluxo completo. **Não feito** — não existe suíte E2E neste repositório; validação foi build/lint limpos + leitura do fluxo, sem execução visual (sem driver de browser disponível nesta sessão).

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

**Critérios de Entrega:**
- [x] Upload de documento KYC funciona e o estado atualiza corretamente após revisão (simulada em staging). Validado manualmente (ver nota acima); sem staging dedicado ainda (Fase 7), testado contra o Supabase de desenvolvimento do projeto.
- [ ] Profissional com KYC pendente/rejeitado ou subscrição inativa não consegue aceder às ações de aceitar pedidos — com explicação clara na UI, não apenas botão desabilitado sem contexto. **Pendente:** depende da parte de subscrição (Backend Fase 5), ainda não implementada.
- [ ] Fluxo de subscrição mock completo testado: seleção → pendente → ativo (após webhook simulado no backend). **Pendente:** Backend Fase 5 ainda não implementada.
- [ ] Testes cobrem os três estados de KYC e os três estados de subscrição na UI. **Pendente:** projeto não tem test runner configurado (sem Vitest/RTL) — decisão explícita de não o introduzir nesta entrega; os três estados de KYC foram validados manualmente (ver nota acima), não por teste automatizado.
- [x] Tela de administração (TRD Adendo v1.6) permite a um `ADMIN` listar submissões KYC por estado e aprovar/rejeitar cada uma, com motivo obrigatório na rejeição — só acessível quando `profile.role === 'ADMIN'`. Implementado em `feat/painel-admin-kyc` (`pages/AdminKyc.tsx`, rota `/admin/kyc`), validado manualmente no browser com a conta admin real e um profissional de teste descartável.
- [x] **(TRD Adendo v1.8)** Tela de administração para o audit log — `services/auditLog.ts` + `hooks/useAuditLog.ts` + `pages/AdminAuditLog.tsx`, rota `/admin/audit-log`, mesma convenção de acesso do item acima (`profile.role === 'ADMIN'`). Filtros implementados: `action` (texto livre) e `success`; paginação Anterior/Seguinte. **Sem filtro por `user_id`/`entity_type`/intervalo de datas nesta entrega** (o backend já os aceita — extensão natural, não pedida). `created_at` formatado em `Africa/Maputo`, não na hora local do browser. `tsc -b`/`vite build`/`eslint` limpos; sem validação interativa em browser nem contra dados reais (migration do backend ainda não aplicada).

**Nota (Adendo v1.6):** o papel `ADMIN` como um todo está consolidado no TRD, Secção 7 ("Perfil ADMIN"), não repetido aqui por fase.

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
