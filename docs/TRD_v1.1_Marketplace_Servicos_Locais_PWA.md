# TRD v1.1 — Documento de Requisitos Técnicos

| Campo | Detalhe |
|---|---|
| Projeto | Marketplace de Serviços Locais PWA (Moçambique) |
| Versão | 1.1 (+ [Adendo v1.2](#adendo-v12), + [Adendo v1.3](#adendo-v13), + [Adendo v1.4](#adendo-v14)) |
| Autor | Engenheiro de Software Lead |
| Estado | Aprovado para Desenvolvimento (Sprint 0) — Adendo v1.2 em revisão de engenharia |

## 1. Visão Geral da Arquitetura & Stack Tecnológica

| Camada | Tecnologia Escolhida | Justificação Técnica |
|---|---|---|
| Frontend / PWA | React + Vite + Tailwind CSS + Framer Motion | Alta performance, suporte offline nativo (Service Workers), suporte a HTML5 Geolocation. |
| Backend & API | Node.js | Deployed no Fly.io (Região ~~jnb - Joanesburgo~~ **fra - Frankfurt**, ver [Adendo v1.3](#adendo-v13)), responsável pela lógica de negócio e queries espaciais. |
| Backend & DB | Supabase (PostgreSQL + PostgREST + Auth + PostGIS) | Autenticação pronta, Row Level Security (RLS) e extensão espacial nativa PostGIS. |
| Alojamento & CDN | Vercel (Frontend) + Supabase Cloud (Cape Town af-south-1) | Latência de banco < 15ms para o backend no Fly.io e CDN com PoPs na África Austral. |
| Armazenamento | Supabase Storage (Buckets Privados/Públicos) | Gestão segura para documentos KYC (BI/NUIT) e galeria pública de portfólios. |
| Cache | Upstash Redis via Fly.io (`fra`, mesma região do backend), ver [Adendo v1.3, item C](#adendo-v13) | Cache de resultados de queries geoespaciais frequentes (`GET /professionals/nearby`, Fase 3), reduzindo carga repetida no Supabase. |

## 2. Módulo de Geolocalização & Dados Geoespaciais (NOVO)

Para lidar com a realidade de mapeamento em Moçambique (onde existem coordenadas GPS exatas e também referências por bairros/distritos):

### A. Estratégia de Captura no Frontend (PWA)

- **Captura Automática (GPS)**: Utilização da HTML5 Geolocation API (`navigator.geolocation`) no PWA para obter Latitude e Longitude exatas mediante permissão do utilizador.
- **Fallback Manual (Hierarquia Geográfica)**: Seleção via dropdown estruturado: Província → Distrito/Município → Bairro (ex: Cidade de Maputo → KaLhamanculo → Xipamanine).

### B. Processamento Espacial (PostGIS no Supabase)

- **Tipo de Dado**: Coluna `GEOGRAPHY(POINT, 4326)` para armazenar as coordenadas cartográficas.
- **Cálculo de Proximidade**: O Backend (Fly.io) executa buscas geoespaciais utilizando a função `ST_DWithin` para cruzar pedidos de clientes com profissionais num raio específico em metros (ex: 10 km).

## 3. Esquema do Banco de Dados (PostgreSQL / Supabase)

### Extensões e Enums

```sql
-- Ativação da extensão de dados geoespaciais
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE user_role AS ENUM ('CLIENT', 'PROFESSIONAL', 'ADMIN');
CREATE TYPE professional_type AS ENUM ('SINGULAR', 'COMPANY'); -- ver Adendo v1.4, item F
CREATE TYPE kyc_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE sub_status AS ENUM ('INACTIVE', 'ACTIVE', 'EXPIRED');
CREATE TYPE payment_gateway AS ENUM ('MPESA_MOCK', 'EMOLA_MOCK', 'MANUAL');
```

### Tabelas Principais

**1. users_profile**
- `id` (UUID, PK, FK -> auth.users.id)
- `full_name` (TEXT, NOT NULL)
- `phone` (VARCHAR, UNIQUE, ~~NOT NULL~~ **nullable** — ver [Adendo v1.4, item A](#adendo-v14))
- `role` (user_role, DEFAULT 'CLIENT')
- `professional_type` (professional_type, NULL) — só relevante quando `role = PROFESSIONAL`; ver [Adendo v1.4, item F](#adendo-v14)
- `province` (TEXT) — ex: "Cidade de Maputo"
- `district` (TEXT) — ex: "KaLhamanculo"
- `neighborhood` (TEXT) — ex: "Xipamanine"
- `location` (GEOGRAPHY(POINT, 4326)) — Coordenadas GPS (Lng, Lat)
- `avatar_url` (TEXT, NULL) — URL público no bucket `avatars` do Supabase Storage; ver [Adendo v1.4, item C](#adendo-v14)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**2. professional_kyc**
- `id` (UUID, PK)
- `user_id` (UUID, FK -> users_profile.id, **UNIQUE** — ver [Adendo v1.2](#adendo-v12))
- `bi_number` (VARCHAR, NOT NULL)
- `nuit_number` (VARCHAR, NOT NULL)
- `bi_document_url` (TEXT, Bucket Privado)
- `status` (kyc_status, DEFAULT 'PENDING')
- `reviewed_by` (UUID, FK -> users_profile.id, NULL) — ver [Adendo v1.2](#adendo-v12)
- `review_notes` (TEXT, NULL) — ver [Adendo v1.2](#adendo-v12)
- `verified_at` (TIMESTAMPTZ)

**3. subscriptions**
- `id` (UUID, PK)
- `professional_id` (UUID, FK -> users_profile.id)
- `amount` (NUMERIC(10,2), DEFAULT 800.00)
- `status` (sub_status, DEFAULT 'INACTIVE')
- `gateway` (payment_gateway)
- `starts_at` (TIMESTAMPTZ)
- `expires_at` (TIMESTAMPTZ)

**4. service_requests**
- `id` (UUID, PK)
- `client_id` (UUID, FK -> users_profile.id)
- `professional_id` (UUID, FK -> users_profile.id, NULL) — ver [Adendo v1.2](#adendo-v12)
- `title` (TEXT, NOT NULL)
- `description` (TEXT)
- `status` (request_status, DEFAULT 'OPEN') — ver [Adendo v1.2](#adendo-v12)
- `province` (TEXT, NOT NULL)
- `district` (TEXT)
- `neighborhood` (TEXT)
- `location` (GEOGRAPHY(POINT, 4326)) — Coordenadas onde o serviço será realizado
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `assigned_at` (TIMESTAMPTZ, NULL) — ver [Adendo v1.2](#adendo-v12)
- `completed_at` (TIMESTAMPTZ, NULL) — ver [Adendo v1.2](#adendo-v12)

## 4. Abstração de Pagamentos & Arquitetura Sandbox (M-Pesa / e-Mola)

A camada de pagamentos utiliza o padrão Strategy Design Pattern para isolar as chamadas externas.

### Estrutura de Interfaces (PaymentProvider)

- `initiateSubscription(userId, phone, amount)`
- `handleWebhook(payload)`
- `checkStatus(transactionId)`

### Fluxo de Mocks

1. O profissional seleciona a subscrição mensal de 800 MZN e insere o contacto Vodacom/Movitel.
2. A API (Fly.io) aciona o `MockPaymentService`, registando a transação pendente no Supabase.
3. O simulador de Webhook aprova automaticamente em ambiente sandbox, atualizando o estado da subscrição para `ACTIVE` por 30 dias.

## 5. Controlo de Acesso, Segurança & Queries Espaciais

**Filtro de Oportunidades por Proximidade**: Endpoint da API que retorna profissionais num determinado raio:

```sql
SELECT id, full_name, phone, neighborhood,
       ST_Distance(location, ST_SetSRID(ST_MakePoint($longitude, $latitude), 4326)) AS distance_m
FROM users_profile
WHERE role = 'PROFESSIONAL'
  AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($longitude, $latitude), 4326), $raio_em_metros)
ORDER BY distance_m ASC
LIMIT $page_size OFFSET $page_offset;
```

> Nota (v1.2): `distance_m` incluído para permitir ordenação por proximidade no frontend; paginação (`LIMIT`/`OFFSET`) adicionada para evitar respostas ilimitadas — ver [Adendo v1.2](#adendo-v12).

- **Row Level Security (RLS)**: O número de contacto e endereço exato dos clientes só são visíveis para profissionais com `subscriptions.status = 'ACTIVE'` e KYC em estado `APPROVED`.
- **Proteção de Documentos**: Ficheiros no Supabase Storage (`bi_document_url`) apenas podem ser lidos por utilizadores com perfil `ADMIN`.

## 6. Estratégia de PWA & Cache

- **Service Worker**: Configurado via `vite-plugin-pwa` com estratégia Stale-While-Revalidate para o shell da aplicação e Network-First para requisições à API de serviços.
- **Geolocalização Offline**: Armazenamento temporário das últimas coordenadas conhecidas em localStorage / IndexedDB caso a ligação 4G oscile.

## 7. Perfil ADMIN (espelha o backend)

**Contexto:** ver TRD do backend, Secção 7, para o texto completo (como se chega a `ADMIN`, tabela de funcionalidades, itens fora do escopo atual). Esta secção resume só a perspetiva do frontend.

**Funcionalidades disponíveis hoje:**

| Funcionalidade | Onde na app |
|---|---|
| Listar submissões de KYC, com filtro por estado | `/admin/kyc` |
| Aprovar uma submissão de KYC | `/admin/kyc`, botão "Aprovar" |
| Rejeitar uma submissão de KYC com motivo obrigatório | `/admin/kyc`, botão "Rejeitar" |

Rota visível só quando `profile.role === 'ADMIN'` (link condicional em `Home.tsx`) — mesma convenção usada para "Pedidos perto de ti"/"Verificação de identidade". A restrição real de segurança vive no backend (`requireRole`), não nesta condição de UI.

**Fora do escopo atual:** ver TRD do backend, Secção 7 — inclui gestão de subscrições, moderação de contas, métricas agregadas e visualizador de imagem do documento KYC dentro da tela de admin (hoje sem `<img>` a mostrar o documento).

---

## Adendo v1.2

Correções e clarificações identificadas em revisão de engenharia antes do início da Fase 1 de implementação. Estas alterações têm precedência sobre o schema original da Secção 3 e a query da Secção 5.

### A. Integridade de Dados — `professional_kyc`

**Problema:** o schema original não impedia múltiplas submissões KYC por profissional, permitindo estados `PENDING`/`APPROVED` simultâneos para o mesmo `user_id`.

**Correção:**
```sql
ALTER TABLE professional_kyc
  ADD CONSTRAINT uq_professional_kyc_user UNIQUE (user_id);

ALTER TABLE professional_kyc
  ADD COLUMN reviewed_by UUID REFERENCES users_profile(id),
  ADD COLUMN review_notes TEXT;
```
`reviewed_by`/`review_notes` fornecem trilha de auditoria mínima: quem aprovou/rejeitou e porquê.

### B. Ciclo de Vida de `service_requests`

**Problema:** o TRD original descrevia apenas a criação de pedidos e a busca por proximidade, sem modelar a atribuição a um profissional nem o estado do pedido. Sem isto, dois profissionais podem responder ao mesmo pedido em simultâneo.

**Correção:**
```sql
CREATE TYPE request_status AS ENUM ('OPEN', 'ASSIGNED', 'COMPLETED', 'CANCELLED');

ALTER TABLE service_requests
  ADD COLUMN professional_id UUID REFERENCES users_profile(id),
  ADD COLUMN status request_status NOT NULL DEFAULT 'OPEN',
  ADD COLUMN assigned_at TIMESTAMPTZ,
  ADD COLUMN completed_at TIMESTAMPTZ;
```
**Regras de negócio do ciclo de vida:**

- **Atribuição (`OPEN` → `ASSIGNED`)** deve ser atómica (ex. `UPDATE ... WHERE status = 'OPEN'` com verificação de `rowcount`) para evitar condições de corrida entre profissionais concorrentes. Só o profissional atribuído passa a constar em `professional_id`.
- **Conclusão (`ASSIGNED` → `COMPLETED`)** é feita **pelo cliente** (`client_id` do pedido), não pelo profissional. Quem recebeu o serviço é quem confirma que foi prestado; permitir que o profissional feche o pedido unilateralmente abriria espaço a marcar como concluído um trabalho não entregue. O endpoint tem de validar que o utilizador autenticado é o `client_id` do pedido e que o estado atual é `ASSIGNED`.
- **Cancelamento (`OPEN`/`ASSIGNED` → `CANCELLED`)** — permissões por definir caso a caso; um pedido ainda `OPEN` é razoável o cliente cancelar sozinho, mas o cancelamento depois de atribuído afeta duas partes. Decisão pendente antes da Fase 3.

### C. Índices Espaciais (Performance)

**Problema:** o tipo `GEOGRAPHY(POINT, 4326)` foi definido, mas o TRD não especificava o índice necessário para que `ST_DWithin`/`ST_Distance` evitem sequential scan em escala.

**Correção:**
```sql
CREATE INDEX idx_users_profile_location ON users_profile USING GIST (location);
CREATE INDEX idx_service_requests_location ON service_requests USING GIST (location);
```

### D. Isolamento do Mock de Pagamento

**Problema:** o simulador de webhook (Secção 4) que aprova subscrições automaticamente não tinha isolamento explícito de ambiente, criando risco de ativação de subscrições sem pagamento real caso o endpoint mock permaneça acessível em produção.

**Correção (requisito de implementação, não de schema):**
- O endpoint de simulação de webhook só pode estar registado nas rotas da API quando `NODE_ENV !== 'production'` ou equivalente feature flag (`ENABLE_PAYMENT_MOCK=true`), validado por teste automatizado que falha o build se a flag estiver ativa em config de produção.
- Antes da integração real com M-Pesa/e-Mola, qualquer ambiente de produção deve ter `MockPaymentService` desabilitado ou protegido por autenticação de serviço interna (não exposto publicamente).

### E. Paginação e Cálculo de Distância

**Problema:** o endpoint de busca por proximidade (Secção 5) não retornava a distância calculada nem limitava o número de resultados.

**Correção:** ver query atualizada na Secção 5 (`ST_Distance` + `LIMIT`/`OFFSET`).

### F. Preço de Subscrição como Configuração

**Observação (não bloqueante):** `subscriptions.amount DEFAULT 800.00` está correto como valor por omissão ao nível do schema, mas a lógica de negócio que determina o preço ativo no momento da subscrição deve vir de configuração de aplicação (tabela `plans` ou variável de ambiente), não depender do default da coluna, para permitir alteração de preço sem migration.

---

## Adendo v1.3

Registo de desvio de infraestrutura identificado durante a Fase 0 de implementação do backend (Sprint 0). Revisto após decisão de co-localizar backend e banco.

### A. Região do Supabase Cloud — Frankfurt em vez de af-south-1 (Cape Town)

**Contexto:** a Secção 1 do TRD especifica Supabase Cloud na região `af-south-1` (Cape Town). No momento da criação do projeto, essa região não foi encontrada como opção disponível no painel do Supabase, e o projeto foi criado em **Frankfurt (eu-central-1)**.

### B. Fly.io movido de jnb para fra — co-localização deliberada com o banco

**Contexto:** a Secção 1 do TRD especifica Fly.io em `jnb` (Joanesburgo), justificado por latência de banco < 15ms assumindo Supabase em `af-south-1` (mesma região geral). Com o Supabase em Frankfurt (item A), manter o backend em `jnb` criaria o pior dos dois mundos: todo pedido à API faria um salto intercontinental **backend↔banco** (Joanesburgo↔Frankfurt) antes de responder ao utilizador.

**Decisão:** mover o Fly.io de `jnb` para **`fra`** (Frankfurt), co-localizado com o Supabase. A app `piquetepro24-backend` foi recriada nessa região (`fly.toml`: `primary_region = "fra"`).

**Efeito da mudança — onde está o gargalo agora:**

| | Antes desta decisão | Depois desta decisão |
|---|---|---|
| Backend ↔ Banco | Intercontinental (`jnb` ↔ Frankfurt), toda query | Local (mesma região), latência desprezável |
| Utilizador (Moçambique) ↔ Backend | Regional (Moçambique ↔ `jnb`), baixa | Intercontinental (Moçambique ↔ Frankfurt), alta |

Ou seja: a decisão **resolve** o problema original descrito na v1.2 deste Adendo (múltiplas queries sequenciais acumulando latência backend↔banco), mas **desloca** o custo de latência para o salto utilizador↔servidor, que agora acontece em **toda** chamada à API, não só nas que tocam o banco.

**Impacto esperado:** RTT utilizador (Maputo) ↔ Frankfurt estimado em 150–250ms, presente em cada request HTTP. Funcionalmente nada muda (PostGIS, RLS, lógica de negócio inalterados) — é uma questão de tempo de resposta percebido, agravado pelo contexto de rede 3G/4G instável que já motiva a Secção 6 (PWA offline) do TRD.

**Ação de acompanhamento:** medir RTT real utilizador↔`fra` em ambiente de staging (Fase 7 do [Plano de Implementação](./PLANO_IMPLEMENTACAO_BACKEND.md)) e decidir formalmente se compensa migrar backend+banco como par para uma região mais próxima de Moçambique (ex. `af-south-1`/Cape Town, caso volte a ficar disponível no Supabase) antes do lançamento em produção. Migrar só um dos dois sem o outro reintroduz o problema original — a decisão tem de mover backend e banco juntos.

### C. Cache de queries geoespaciais — Upstash Redis via Fly.io

**Contexto:** `GET /professionals/nearby` (Fase 3) é o endpoint mais chamado do marketplace — toda busca de cliente por profissionais próximos passa por ele, com `ST_DWithin` sobre `location`. Mesmo com índice GiST (Secção 2/Adendo v1.2, item C), é uma query geoespacial repetida com alta sobreposição de parâmetros (mesma zona geográfica, raios comuns), candidata natural a cache.

**Decisão:** usar **Upstash Redis provisionado via Fly.io** (`flyctl redis create`), não uma instância Redis própria como processo separado na app. Motivo: Upstash é gerido (sem operação própria de failover/backup), fica disponível na mesma região `fra` do backend (latência local, mesmo raciocínio de co-localização do item B), e a integração via Fly injeta a `REDIS_URL` diretamente como secret — sem infraestrutura adicional para manter.

**Uso:** cache de leitura (read-through) para `GET /professionals/nearby`, chave derivada de `(lat, lng arredondados, raio, cursor de paginação)`, TTL curto (segundos a poucos minutos — a localização de um profissional pode mudar). Não usado para sessão, filas ou rate limiting nesta fase; se esses usos surgirem, reavaliar aqui antes de estender o uso do mesmo Redis para responsabilidades diferentes.

**Falha aberta:** Redis é uma otimização, não uma dependência crítica. Se a ligação ao Redis falhar, o endpoint deve degradar para consulta direta ao Supabase (cache miss silencioso), nunca falhar o pedido por causa do cache.

**Ação de acompanhamento:** implementar e validar na Fase 3 do [Plano de Implementação](./PLANO_IMPLEMENTACAO_BACKEND.md); medir taxa de acerto do cache em staging antes de decidir o TTL final.

## Adendo v1.4

Seis funcionalidades adicionadas durante a implementação da Fase 2 (Autenticação & Perfis) que não estavam previstas no corpo original do TRD nem nos Adendos anteriores — registadas aqui como requisito formal, não apenas como decisão de implementação.

### A. Login/Registo via Google OAuth

**Contexto:** a Secção 3 (schema original) e a Fase 2 do [Plano de Implementação](./PLANO_IMPLEMENTACAO_BACKEND.md) prev­iam registo/login por email ou telefone (Supabase Auth). Google OAuth foi adicionado como terceiro canal, também via Supabase Auth (`supabase.auth.signInWithOAuth({ provider: 'google' })`).

**Decisão:** `users_profile.phone` passa de `NOT NULL` para **nullable** (mantendo `UNIQUE`) — o Google não partilha número de telefone via OAuth, e a Fase 2 já usa uma trigger no Postgres (`on_auth_user_created`) para criar `users_profile` atomicamente no signup; essa trigger falharia num signup Google se `phone` continuasse obrigatório.

**Consequência de produto (ver item B):** um perfil com `phone IS NULL` fica com "onboarding incompleto" — não é apenas um campo em falta, é um estado que a aplicação trata explicitamente antes de dar acesso ao resto da app.

### B. Onboarding obrigatório de telefone e localização pós-signup

**Contexto:** nem a Secção 2A (captura de localização) nem a Secção 3 (schema) do TRD original definiam o *momento* em que telefone e localização passam a ser exigidos — a Fase 2 implementou-os como campos opcionais/atualizáveis a qualquer momento no perfil, sem obrigar o preenchimento antes de usar a app.

**Decisão:** após o primeiro login, a aplicação (PWA) força uma sequência de duas telas obrigatórias, sem opção de "saltar", antes de dar acesso a qualquer outra funcionalidade:
1. **Telefone** — só apresentada a quem tem `phone IS NULL` (na prática, hoje, só quem entrou via Google — item A). Quem se regista por email ou telefone já fornece o número no próprio formulário de signup, logo nunca vê esta tela.
2. **Localização** — apresentada a todos os canais de signup (GPS via `navigator.geolocation` ou fallback hierárquico Província → Distrito → Bairro, conforme Secção 2A), porque nenhum canal de signup pede localização no próprio formulário.

**Detecção do estado "incompleto":** derivada diretamente do estado dos campos existentes (`phone IS NULL` → falta telefone; sem `province` nem coordenadas → falta localização), não de uma coluna dedicada — mantém uma única fonte de verdade em vez de duplicar o estado.

### C. Foto de perfil (avatar) opcional

**Contexto:** a Secção 1 do TRD já previa Supabase Storage com "Buckets Privados/Públicos... galeria pública de portfólios", mas não detalhava um bucket para foto de perfil do utilizador (avatar), distinto da galeria de portfólio dos profissionais (fora do escopo da Fase 2).

**Decisão:** `users_profile.avatar_url` (nullable) guarda o URL público de um ficheiro no bucket `avatars`, novo, público — mesmo princípio de "bucket público" já previsto na Secção 1, aplicado agora ao avatar. Diferente do bucket de documentos KYC (`bi_document_url`, privado, só `ADMIN` — Secção 5), o avatar é público por natureza: aparece no perfil e, futuramente, em listagens de profissionais.

- **Upload direto do frontend ao Storage** (não pelo backend/API): usa a `anon` key e é autorizado por RLS em `storage.objects` (o próprio utilizador só escreve na sua pasta, identificada por `auth.uid()`), respeitando o princípio geral de RLS da Secção 5 (autorização vive no banco).
- **Conversão para WebP antes do upload**, no browser (Canvas API, sem dependência de servidor) — poupa espaço no Storage mantendo qualidade aceitável. Implementada como utilitário reutilizável (não específico ao avatar), para servir também o upload futuro de fotos de trabalhos dos profissionais (portfólio, já previsto na Secção 1 mas ainda fora de escopo de implementação).
- **Opcional em todo o fluxo:** não faz parte do onboarding obrigatório (item B) — o utilizador pode usar a app indefinidamente sem definir avatar.

### D. Eliminação de conta ("direito ao esquecimento")

**Contexto:** nenhuma versão anterior do TRD (corpo original, Adendos v1.2/v1.3) previa um fluxo de eliminação de conta pelo próprio utilizador. Ao validar a Fase 2 contra o Supabase real, confirmou-se que nenhuma FK de `professional_kyc`, `subscriptions` ou `service_requests` para `users_profile` tinha `ON DELETE` definido (default `RESTRICT`) — apagar um utilizador exigia apagar manualmente cada tabela relacionada, pela ordem certa, o que não é uma operação seguramente exposta ao próprio utilizador sem tratamento explícito.

**Decisão:** endpoint `DELETE /profile` (autenticado, apaga sempre a própria conta — nunca a de outro utilizador) apaga em definitivo: `auth.users` (via Admin API do Supabase, que exige a `service_role` key — só o backend pode fazê-lo), `users_profile` e todas as tabelas dependentes, e o avatar no Storage (item C), se existir.

**Comportamento por relação, não um `ON DELETE CASCADE` genérico em tudo:**
- Registos que **pertencem** ao utilizador (`professional_kyc.user_id`, `subscriptions.professional_id`, `service_requests.client_id`) → `CASCADE`. Apagar a conta apaga tudo o que só faz sentido em relação a ela.
- `professional_kyc.reviewed_by` (um `ADMIN` que reviu o KYC de **outra** pessoa) → `SET NULL`. Apagar a conta do admin não pode apagar o KYC de terceiros que ele reviu — só perde a referência a quem reviu.
- `service_requests.professional_id` (profissional **atribuído** ao pedido de **outro** cliente) → `SET NULL`, com o `status` do pedido reposto para `OPEN` (não `ASSIGNED` sem profissional, que não é um estado válido do ciclo de vida — Adendo v1.2, item B). O pedido pertence ao cliente que o criou (esse sim com `CASCADE`), não ao profissional; apagar a conta do profissional não pode fazer o cliente perder o pedido que criou, só liberta-o de novo para outro profissional aceitar.

**UI:** confirmação em duas etapas (aviso explícito de irreversibilidade + botão de confirmação final), não um único clique — dado o impacto irreversível da ação.

**Validado de ponta a ponta contra o Supabase real**, com dados de teste em todas as tabelas relacionadas: apagar um cliente com KYC/subscrição/pedido próprio remove tudo em cascata; apagar um profissional atribuído ao pedido de outro cliente preserva o pedido, repondo `OPEN`. Durante esta validação descobriu-se que a FK mais básica — `users_profile.id → auth.users.id` (da migration inicial da Fase 1) — também nunca tinha `ON DELETE` definido, e precisou do mesmo tratamento (`CASCADE`): sem essa correção, apagar qualquer conta falhava sempre, mesmo sem nenhum dado relacionado nas outras tabelas.

### E. Escolha de perfil (Cliente/Profissional) no registo

**Contexto:** até esta correção, todo signup — por qualquer canal — criava sempre `users_profile.role = 'CLIENT'`, sem exceção. Não havia forma de um profissional se declarar como tal no registo; a Fase 2 tinha isto registado como "decisão por resolver" desde o início, sem nunca ter sido implementado. Identificado pelo próprio utilizador ao testar o fluxo de signup.

**Decisão:** a escolha "Sou cliente" / "Sou profissional" acontece logo no início do ecrã de registo, antes de qualquer canal (Google, email ou telefone) — não é uma tela de onboarding separada. O tratamento difere por canal, porque só email/telefone permitem enviar metadata customizado no momento do signup:

- **Email/telefone:** a escolha vai em `raw_user_meta_data.role`, lida por `handle_new_user` (a mesma trigger dos itens A/B). Validação estrita: só `'PROFESSIONAL'` explícito é aceite; qualquer outro valor (incluindo `'ADMIN'`, que um utilizador malicioso poderia tentar enviar no próprio formulário) cai no default `'CLIENT'` — nunca uma escalação de privilégio via signup.
- **Google:** `supabase.auth.signInWithOAuth` não aceita `options.data` como `signUp` aceita — não há como comunicar a escolha antes do redirect completo para o Google. A escolha é guardada em `sessionStorage` no frontend antes do redirect, e aplicada depois, na página de callback, via `POST /profile/become-professional` — um endpoint novo, dedicado, não um campo aberto no `PATCH /profile` genérico (`role` é sensível o suficiente para justificar isolamento, não mistura com edição trivial de nome/telefone). Transição única e atómica `CLIENT → PROFESSIONAL` (update condicional `WHERE role = 'CLIENT'`, mesmo princípio de update condicional atómico da Secção 5 para evitar corrida), idempotente: chamado outra vez sem efeito, devolve o perfil atual em vez de erro.

**Fora de escopo desta correção (fica para a Fase 4):** nenhum campo adicional de perfil profissional (categoria de serviço, KYC — BI/NUIT/documento) é pedido no registo. Só o `role` fica correto desde o signup; os dados de KYC continuam a ser submetidos depois, via o fluxo já previsto na Fase 4.

**Validado de ponta a ponta contra o Supabase real:** signup por email com "Profissional" selecionado grava `role: PROFESSIONAL`; com "Cliente" (default) continua `CLIENT`, sem regressão; `POST /profile/become-professional` chamado duas vezes seguidas devolve `200` em ambas, com o mesmo estado (idempotência confirmada). O fluxo completo via Google (sessionStorage → redirect → callback → `become-professional`) foi validado por partes (escrita em sessionStorage confirmada antes do redirect; o endpoint em si testado diretamente) — o round-trip completo pelo ecrã de consentimento do Google não foi automatizado nesta sessão.

### F. Distinção Singular/Empresa dentro do perfil Profissional

**Contexto:** ideia surgida já depois do item E estar implementado e validado — para além de "Sou cliente"/"Sou profissional", um profissional pode ser uma pessoa singular ou uma empresa, e essa distinção deveria ser perguntada logo "ao criar conta", não só desenhada na Fase 4 (KYC). Identificado pelo próprio utilizador, com a ressalva explícita de que a lógica de onboarding para empresa "deve ser mais complexa" — mas sem certeza de como, na altura.

**Decisão (âmbito deliberadamente reduzido, confirmado com o utilizador):** por agora, só regista a decisão e o campo — não desenha nenhum formulário ou passo adicional diferenciado por tipo. O KYC diferenciado (ex. BI+NUIT para singular, NUIT+alvará+representante legal para empresa) fica para quando a Fase 4 for desenhada a sério; nada neste item antecipa esse desenho.

- **Nova coluna** `users_profile.professional_type` (enum `professional_type`, valores `SINGULAR`/`COMPANY`, nullable), não uma coluna em `professional_kyc` — mesma lógica do item E (`role`) e do item A (`phone`): `users_profile` já é onde o resto do onboarding vive, e `professional_kyc` só passa a existir na Fase 4, o que adiaria a captura desta escolha para depois da conta já criada, contrariando o pedido de perguntar isto "ao criar conta". Null para `CLIENT`/`ADMIN`, e também para um `PROFESSIONAL` anterior a esta migration que ainda não passou por esta escolha.
- **Momento e local da pergunta:** logo a seguir a escolher "Sou profissional" no mesmo ecrã de registo do item E — não um passo extra no onboarding obrigatório (item B), nem uma tela separada. Aparece antes de qualquer canal (Google, email ou telefone), como sub-escolha visível só quando "Sou profissional" está selecionada.
- **Tratamento por canal**, mesmo padrão do item E: email/telefone envia `professional_type` em `raw_user_meta_data`, lido por `handle_new_user()` (mesma trigger, `create or replace function`) — só gravado quando `role` sai `PROFESSIONAL`, nunca para `CLIENT`. Google não permite metadata customizado no `signInWithOAuth`; a escolha é guardada em `sessionStorage` (par com `INTENDED_ROLE_STORAGE_KEY`) e aplicada em `/auth/callback`, agora enviada no corpo de `POST /profile/become-professional` (`{ professional_type }`) — este endpoint passa a exigir o campo sempre, mesmo no caminho idempotente, porque é a única fonte da escolha para o fluxo Google.
- **UI:** `Profile.tsx` mostra "Tipo de profissional" (Singular/Empresa) só quando `role === 'PROFESSIONAL'` e o campo está preenchido — sem alterar o resto do ecrã de perfil.

**Validado contra a suite de testes real (Vitest, Supabase real por aplicar a migration no momento da escrita deste Adendo):** `becomeProfessional()` grava `role` e `professional_type` no mesmo update atómico; `POST /profile/become-professional` sem `professional_type` no corpo devolve `400`; o caminho idempotente (role já não é `CLIENT`) continua a devolver o perfil atual sem exigir novo valor coerente. Build e lint limpos em ambos os repositórios.

### G. Geocodificação reversa também preenche `province`/`district`/`neighborhood` quando a localização é definida por GPS

**Contexto:** identificado pelo próprio utilizador ao inspecionar a tabela `users_profile` no Supabase — todo perfil com localização definida por GPS (`location` preenchido) tinha `province`/`district`/`neighborhood` sempre `NULL`. Não era um bug de gravação: a Secção 2A original já desenhava `location` (GEOGRAPHY) e a hierarquia `province`/`district`/`neighborhood` como duas representações mutuamente exclusivas de localização, e cada branch de `updateLocation()` (backend) limpa explicitamente os campos da outra ao gravar. O que faltava é que `LocationForm.tsx` já chama `GET /geocode/reverse` ao obter o GPS — só para mostrar um nome de lugar legível antes do utilizador confirmar — e a resposta (que já inclui os `address_components` estruturados do Google: província, distrito, bairro) era usada só para essa string, nunca enviada ao `PATCH /profile/location`.

**Decisão:** `reverseGeocode()` (`src/services/geocoding.ts`) passa a devolver um objeto (`{ placeName, province, district, neighborhood }`) em vez de só a string do nome do lugar — espelhando os três campos novos que `GET /geocode/reverse` (backend, ver TRD do backend, Adendo v1.4 item G) agora expõe. `LocationForm.tsx`, ao confirmar a localização por GPS (`handleConfirmGps`), passa a enviar `province`/`district`/`neighborhood` (já obtidos da geocodificação reversa que a tela já tinha chamado para a pré-visualização) junto com `latitude`/`longitude` no `PATCH /profile/location` — sem chamada de rede extra, sem pedir nada novo ao utilizador. Se a geocodificação reversa ainda não respondeu ou falhou no momento da confirmação, os três campos seguem `undefined` e o backend grava `null`, sem bloquear a confirmação do GPS por isso.

**Não é uma segunda fonte de verdade:** estes três campos continuam a ser só uma cache legível (ex. "Baixa, Maputo" em `currentLocationLabel`) quando a localização foi definida por GPS. A busca por raio/proximidade (Fase 3) usa exclusivamente as coordenadas, nunca estes campos de texto.

**Validado:** build e lint (`tsc -b`, `eslint`) limpos. Sem suite de testes automatizados no frontend nesta fase (o repositório não tem Vitest/testing-library configurado) — validação end-to-end da tela feita manualmente (ver Plano de Implementação do Frontend).

## Adendo v1.5

### A. `GET /service_requests` — listagem dos próprios pedidos do cliente (espelha o backend)

**Contexto:** ver TRD do backend, Adendo v1.5, item A — a Fase 3 original do backend só previa `POST /service_requests` (criação) e `GET /service_requests/nearby` (para profissionais). Ao construir o consumo destes endpoints nas Fases 2/3 do frontend (regra do CLAUDE.md: nenhum endpoint fica sem consumo real na mesma entrega), ficou claro que sem uma listagem "os meus pedidos" o cliente não tinha como voltar a um pedido já criado para o concluir ou cancelar.

**Decisão:** backend passou a expor `GET /service_requests` (pedidos do cliente autenticado, qualquer estado, sem paginação); frontend consome via `fetchMyServiceRequests()`/`useMyServiceRequests()` (`src/services/serviceRequests.ts`, `src/hooks/useServiceRequests.ts`) numa nova tela `MyServiceRequests.tsx` (`/os-meus-pedidos`), que mostra o estado de cada pedido e as ações `Concluir`/`Cancelar` só quando o estado atual as permite (espelhando exatamente as transições que o backend já valida — `ASSIGNED` para concluir, `OPEN`/`ASSIGNED` para cancelar).

### B. Consumo completo da Fase 3 do backend (proximidade + ciclo de vida de pedidos)

**Contexto:** os 6 endpoints originais da Fase 3 do backend (`GET /professionals/nearby`, `POST /service_requests`, `GET /service_requests/nearby`, `assign`/`complete`/`cancel`) tinham ficado sem nenhum consumo no frontend depois de o backend os implementar — identificado ao auditar explicitamente a cadeia endpoint → api → hook → UI (regra do CLAUDE.md).

**Decisão:** implementadas as Fases 2 e 3 do frontend (ver `docs/PLANO_IMPLEMENTACAO_FRONTEND.md` para os critérios de entrega detalhados e desvios de escopo assumidos, incluindo o item A acima):

- `FindProfessionals.tsx` (`/profissionais`): busca de profissionais por raio (GPS), com criação de pedido diretamente a partir da lista.
- `MyServiceRequests.tsx` (`/os-meus-pedidos`): listagem e gestão dos próprios pedidos do cliente.
- `NearbyServiceRequests.tsx` (`/pedidos-proximos`): pedidos `OPEN` próximos para profissionais, com ação de aceitar.
- `Home.tsx` passa a mostrar navegação condicional por `role` (`PROFESSIONAL` vê "Pedidos perto de ti"; outros veem "Procurar profissionais" + "Os meus pedidos").

**Validado:** build (`tsc -b` + `vite build`) e lint (`eslint`) limpos. Validação manual completa (login real, fluxo ponta a ponta no browser) **não foi possível nesta sessão** — sem driver de browser (Playwright/chromium-cli) disponível na máquina de desenvolvimento usada. Confirmado apenas que o dev server (Vite) serve e transforma os novos módulos sem erro de compilação. Recomenda-se validação manual/Playwright antes de considerar as Fases 2/3 do frontend definitivamente fechadas.

---

## Adendo v1.6

### A. Painel de administração para revisão de KYC (espelha o backend)

**Contexto:** ver TRD do backend, Adendo v1.6, item A. A Fase 4 implementou os endpoints administrativos (`GET /admin/kyc`, `PATCH /admin/kyc/:id`) e a policy de RLS que restringe `bi_document_url` a `ADMIN`, mas nem o TRD original nem o plano do frontend previam nenhuma tela para os exercer — só eram acessíveis diretamente via API. Identificado depois de promover a primeira conta real a `ADMIN` em produção e constatar que não havia forma de a usar dentro da app.

**Decisão:** nova tela no frontend, acessível só a `profile.role === 'ADMIN'`, que lista submissões KYC (com filtro por estado) e permite aprovar/rejeitar cada uma (rejeição exige motivo, espelhando `review_notes` obrigatório já validado no backend). Sem alteração de schema/endpoint no backend — o consumo é da API já existente desde a Fase 4.

**Frontend:** nova rota protegida (`/admin/kyc`), visível só quando `profile.role === 'ADMIN'`, mesma convenção de visibilidade condicional por role já usada em `Home.tsx`.

**Critério de entrega correspondente:** ver `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, novo item na Fase 4.

## Adendo v1.7

### A. Infraestrutura de email transacional (espelha o backend)

**Contexto:** ver TRD do backend, Adendo v1.7. O backend passou a ter `EmailService`/`CatalogoTemplatesEmail` (nodemailer/SMTP) e dois endpoints novos — identificado como consumo em falta ao perguntar explicitamente "o que falta no frontend" depois da entrega do backend, não durante a implementação em si (desvio à regra do CLAUDE.md Secção 1 deste repositório, corrigido nesta mesma entrega).

**Implementado em `feat/notificacoes-email-e-audit-log`:**
- `services/notifications.ts` (`sendWelcomeNotification`) — chamado em dois pontos, sempre sem `await` bloqueante e com o erro engolido (`.catch(() => {})`): `Login.tsx`, logo a seguir a um `signUp()` por email/telefone com sessão imediata (`data.session` preenchida); `AuthCallback.tsx`, quando o redirect do Google partiu de um `sign-up` (mesmo sinal — presença de `INTENDED_ROLE_STORAGE_KEY` — que já decide se se chama `become-professional`). **Limitação conhecida, herdada do backend e não resolvida aqui:** se o Supabase exigir confirmação de email antes de emitir sessão, não há chamada nenhuma no momento do signup — falaria disparar depois do primeiro login pós-confirmação, o que não foi implementado (o `else` que já existe em `Login.tsx` para o caso "sem sessão imediata" não dispara o welcome).
- `services/passwordRecovery.ts` (`requestPasswordRecovery`) + ecrã "Esqueci a password" dentro de `Login.tsx` (troca o formulário principal por um formulário só de email quando `showRecovery` é `true`, visível apenas em `mode === 'sign-in'` e `channel === 'email'` — recuperação por telefone não é suportada pelo backend, que gera o link via `admin.generateLink` para um endereço de email). A mensagem de sucesso mostrada é sempre a que o backend devolve (`response.data.message`), nunca um texto fixo no frontend — evita duplicar a cópia e mantém a garantia anti-enumeração do lado que a decide. Um erro real (rede, `400` de email inválido, `429` de rate limit, ver Adendo v1.7 do backend) aparece à parte, nunca disfarçado da mensagem de sucesso.
- `pages/DefinirNovaPassword.tsx`, rota `/definir-nova-password` (sem `ProtectedRoute` — a sessão de recuperação resolve-se de forma assíncrona via `detectSessionInUrl`, e um `ProtectedRoute` a decidir antes disso mandaria embora um link válido; a própria tela espera `isLoading` ficar `false`, mesmo padrão de `AuthCallback.tsx`, antes de decidir se mostra o formulário, o erro de "link inválido/expirado", ou a confirmação). Chama `supabase.auth.updateUser({ password })` diretamente, sem passar pelo backend — fluxo padrão do Supabase Auth. `describeAuthError` (tradução de erros do Supabase Auth) foi extraída de `Login.tsx` para `lib/authErrors.ts`, reutilizada pelas duas telas.

**Resolve uma limitação já registada na Fase 1:** a nota "Configurar SMTP próprio... é decisão explicitamente adiada — sem isso, também não há como enviar um email de boas-vindas personalizado" deixa de se aplicar ao email de boas-vindas e à recuperação de password (os dois têm agora template próprio, via SMTP próprio do backend). Continua a aplicar-se só ao email de **confirmação de conta** no signup por email/telefone, que continua a ser enviado pelo Supabase Auth diretamente (fora do controlo do `EmailService`).

**Validado:** `tsc -b` (strict) e `vite build` de produção limpos; `eslint` sem erros novos (um aviso pré-existente em `AuthContext.tsx`, sem relação com esta mudança). **Não validado interativamente num browser** (sem ferramenta de automação de browser disponível nesta sessão, ao contrário de entregas anteriores validadas com Playwright) — confirmado apenas que os módulos novos transformam sem erro no servidor de desenvolvimento do Vite (sem overlay de erro de sintaxe/import).

**Critério de entrega correspondente:** ver `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, itens da Fase 1.

### B. Mudar password estando autenticado — pedido do utilizador, sem componente no backend

**Contexto:** pedido explícito do utilizador ao testar a recuperação de password (item A) — reparou que não havia forma de mudar a password estando já com sessão iniciada, só o fluxo de "esqueci a password" para quem não está autenticado. Diferente do item A: **não existe endpoint novo no backend nem alteração ao TRD do backend** — usa a mesma chamada `supabase.auth.updateUser({ password })` que `DefinirNovaPassword.tsx` já usa, só que com a sessão normal do utilizador em vez da sessão especial de recuperação.

**Implementado em `pages/Profile.tsx`:** nova secção "Segurança", mesma convenção de toggle "Editar"/"Fechar" já usada na secção "Os meus dados" — botão "Mudar password" revela um formulário (nova password + confirmação), sem pedir a password atual. **Decisão consciente, não uma omissão:** o Supabase Auth não exige a password atual para `updateUser()` com uma sessão já válida — reautenticação adicional (pedir a password atual antes de aceitar a nova) fica como extensão futura, só se vier a ser pedida. `describeAuthError` (já extraída para `lib/authErrors.ts` no item A) é reutilizada para traduzir um eventual erro do Supabase Auth.

**Validado:** `tsc -b` (strict), `vite build` de produção e `eslint` limpos (mesmo aviso pré-existente de sempre, sem relação). Sem validação interativa em browser, mesma limitação de ferramenta do item A.

**Critério de entrega correspondente:** ver `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, novo item na Fase 1.

## Adendo v1.8

### A. Audit log — histórico de ações (espelha o backend)

**Contexto:** ver TRD do backend, Adendo v1.8. `GET /admin/audit-log` existe no backend, protegido por `ADMIN` — estava na mesma situação em que `GET /admin/kyc` esteve antes do Adendo v1.6 deste TRD: endpoint pronto, sem nenhuma tela a consumi-lo, até esta entrega.

**Implementado em `feat/notificacoes-email-e-audit-log`:** `services/auditLog.ts` (`fetchAuditLog`) + `hooks/useAuditLog.ts` (TanStack Query) + `pages/AdminAuditLog.tsx`, rota `/admin/audit-log`, mesma convenção de guard de role dentro do próprio componente já usada em `AdminKyc.tsx` (`profile.role !== 'ADMIN'` → `<Navigate to="/" />`). Filtros implementados: `action` (texto livre, espelha o campo do backend) e `success` (Todos/Sucesso/Falha); paginação simples Anterior/Seguinte via `limit`/`offset` (sem filtro por `user_id`/`entity_type`/intervalo de datas nesta entrega — o backend já os aceita, mas não há ainda um caso de uso concreto que os peça na UI; fica como extensão natural). `created_at` é formatado explicitamente em `Africa/Maputo` (`toLocaleString` com `timeZone`), não na hora local do browser do admin — o TRD do backend deixa essa conversão como responsabilidade de quem exibe. Link condicional em `Home.tsx`, ao lado do link de "Revisão de KYC", visível só a `profile.role === 'ADMIN'`.

**Validado:** `tsc -b` (strict) e `vite build` de produção limpos; `eslint` sem erros novos. **Não validado interativamente num browser** (mesma limitação de ferramenta descrita no Adendo v1.7) nem contra o backend real com dados de audit log de verdade — a migration do backend (`supabase/migrations/20260919180000_audit_log.sql`) ainda não tinha sido aplicada ao Supabase real no momento desta entrega (ver TRD do backend, Adendo v1.8).

## Adendo v1.9

### A. Painel de Administração Avançado (espelha o backend)

**Contexto:** ver TRD do backend, Adendo v1.9 — sessão de brainstorm explícita com o utilizador sobre capacidades de `ADMIN` para além de KYC e audit log. Seis áreas (item B a G, mesma numeração do TRD do backend); implementadas incrementalmente, uma de cada vez, não numa entrega só — cada item abaixo diz o estado real.

**B. Diretório de utilizadores + ficha individual — implementado em `feat/admin-diretorio-utilizadores`:** `services/adminUsers.ts` (`fetchUsers`/`fetchUserDetail`) + `hooks/useAdminUsers.ts` + `pages/AdminUsers.tsx` (`/admin/utilizadores`, pesquisa por nome/telefone + filtro por role) + `pages/AdminUserDetail.tsx` (`/admin/utilizadores/:id`, mostra KYC e contagem de pedidos). `AdminAuditLog.tsx` passou a ler `?user_id=` da URL (`useSearchParams`), com indicador do filtro ativo e botão para o limpar — `services/auditLog.ts` estendido para enviar esse filtro (o backend já o aceitava desde a Fase 8). Link "Utilizadores" em `Home.tsx`, ao lado de "Revisão de KYC"/"Histórico de ações". `tsc -b`/`vite build`/`eslint` limpos; sem validação interativa em browser.

**C. Visão administrativa de pedidos de serviço — implementado em `feat/admin-diretorio-utilizadores`:** `services/adminServiceRequests.ts` (`fetchAllServiceRequests`/`cancelServiceRequestAsAdmin`) + `hooks/useAdminServiceRequests.ts` + `pages/AdminServiceRequests.tsx` (`/admin/pedidos-servico`, filtro por estado, cancelamento admin com confirmação em duas etapas — mesma convenção de "Apagar conta" em `Profile.tsx`). `AdminAuditLog.tsx` e `services/auditLog.ts` estendidos para aceitar `entity_type`/`entity_id` (o backend já os aceitava desde a Fase 8), com o mesmo padrão de indicador de filtro ativo já usado para `user_id` (item B). Link "Pedidos de serviço" em `Home.tsx`. `tsc -b`/`vite build`/`eslint` limpos; sem validação interativa em browser.

**D. Métricas agregadas — implementado em `feat/admin-metricas`:** `services/adminMetrics.ts` (`fetchAdminMetrics`) + `hooks/useAdminMetrics.ts` + `pages/AdminMetrics.tsx` (`/admin/metricas`) — tiles simples (números, sem gráficos, decisão consciente para esta entrega) para utilizadores por role, novos registos em 30 dias, funil de KYC, profissionais ativos por província, pedidos por estado e tempos médios de atribuição/conclusão. Sem componente financeiro (depende da Fase 5 do backend, que não existe). Link "Métricas" em `Home.tsx`. `tsc -b`/`vite build`/`eslint` limpos. **Não validado contra dados reais** — a função RPC `admin_metrics()` do backend também não foi aplicada ao Supabase ainda (mesmo passo manual do audit log, ver TRD do backend).

**E. Alertas de segurança — implementado em `feat/admin-alertas-seguranca`:** `services/adminSecurityAlerts.ts` (`fetchSecurityAlerts`) + `hooks/useAdminSecurityAlerts.ts` + componente `SecurityAlertsPanel`, embutido no topo de `AdminAuditLog.tsx` — secção, não tela à parte (as duas opções estavam abertas desde o Adendo v1.9 original). Sem alertas na janela (24h/5 tentativas por omissão), não mostra nada — uma secção "sem alertas" permanente seria ruído. Clicar num alerta agrupado por `user_id` filtra o audit log por esse utilizador, reaproveitando o mesmo `?user_id=` do item B (limpa `entity_type`/`entity_id` do item C, que nunca fazem sentido ao mesmo tempo); alertas por `ip_address` são só informativos, sem filtro correspondente no audit log (não implementado ainda). `tsc -b`/`vite build`/`eslint` limpos. **Não validado contra dados reais** — a função RPC `admin_security_alerts()` também não foi aplicada ao Supabase.

**F. Reenviar email — implementado em `feat/admin-ferramentas-operacionais`:** `services/adminUsers.ts` ganha `resendEmail` + `hooks/useAdminUsers.ts` ganha `useResendEmail` — secção nova em `AdminUserDetail.tsx` com um `<select>` dos três templates (boas-vindas/KYC aprovado/KYC rejeitado) e um botão "Reenviar". Sem lógica de esconder templates "não relevantes" para o utilizador em causa — decisão consciente de simplicidade, o admin sabe o que está a fazer. Feedback distingue três casos via `toast` (`sonner`): sucesso, "desligado" (sem SMTP configurado no ambiente — informativo, não erro) e falha real. `tsc -b`/`vite build`/`eslint` limpos; sem validação interativa em browser.

**G. Moderação de contas — implementado em `feat/admin-moderacao-contas`:** `services/adminUsers.ts` ganha `banUser`/`unbanUser`/`changeUserRole` + `hooks/useAdminUsers.ts` ganha `useBanUser`/`useUnbanUser`/`useChangeUserRole` (cada mutação invalida a query de detalhe do utilizador, para o novo estado — `banned_until` ou `role` — aparecer de imediato). Nova secção "Moderação de conta" em `AdminUserDetail.tsx`: mostra se a conta está banida (e até quando, `banned_until` vindo da ficha do backend) e alterna entre "Banir conta"/"Levantar banimento"; "mudar role" é um toggle fixo entre o role atual e o outro (nunca um `<select>` com `ADMIN` como opção), pedindo `professionalType` (`SINGULAR`/`COMPANY`) apenas ao promover `CLIENT` → `PROFESSIONAL`. Confirmação em duas etapas antes de cada ação, mesma convenção de "Apagar conta" em `Profile.tsx`. **"Revogar sessões" não implementado — removido do escopo desta entrega.** O desenho original assumia um endpoint de sign-out por ID de utilizador; o SDK do Supabase Auth instalado (`GoTrueAdminApi.signOut(jwt, scope)`) exige o JWT da sessão a terminar, não um ID, e não há alternativa nesta versão (ver TRD do backend, Adendo v1.9, item G, para o detalhe completo). `ban`/`unban` já cobrem o caso de uso de segurança na prática. `tsc -b`/`vite build`/`eslint` limpos; sem validação interativa em browser; sem suite de testes automatizados configurada neste frontend.

**Critério de entrega correspondente:** ver `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 8.
