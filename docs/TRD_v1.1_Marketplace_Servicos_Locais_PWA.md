# TRD v1.1 — Documento de Requisitos Técnicos

| Campo | Detalhe |
|---|---|
| Projeto | Marketplace de Serviços Locais PWA (Moçambique) |
| Versão | 1.1 (+ [Adendo v1.2](#adendo-v12), + [Adendo v1.3](#adendo-v13), + [Adendo v1.4](#adendo-v14)) |
| Autor | Engenheiro de Software Lead |
| Estado | Aprovado para Desenvolvimento (Sprint 0) — Adendo v1.2 em revisão de engenharia |

> **Documento único, sincronizado nos dois repositórios** (`PiquePro24_Backend/Doc's/` e `PiquetePro24_FrontEnd/docs/`): as duas cópias são idênticas e qualquer alteração faz-se nas duas. Caminhos de ficheiro dentro de um bloco **«Perspetiva do frontend»** referem-se ao repositório `PiquetePro24_FrontEnd`; os restantes, ao `PiquePro24_Backend`, salvo indicação em contrário.

---

## 1. Visão Geral da Arquitetura & Stack Tecnológica

| Camada | Tecnologia Escolhida | Justificação Técnica |
|---|---|---|
| Frontend / PWA | React + Vite + Tailwind CSS + Framer Motion | Alta performance, suporte offline nativo (Service Workers), suporte a HTML5 Geolocation. |
| Backend & API | Node.js | Deployed no Fly.io (Região ~~jnb - Joanesburgo~~ **fra - Frankfurt**, ver [Adendo v1.3](#adendo-v13)), responsável pela lógica de negócio e queries espaciais. |
| Backend & DB | Supabase (PostgreSQL + PostgREST + Auth + PostGIS) | Autenticação pronta, Row Level Security (RLS) e extensão espacial nativa PostGIS. |
| Alojamento & CDN | Vercel (Frontend) + Supabase Cloud (Cape Town af-south-1) | Latência de banco < 15ms para o backend no Fly.io e CDN com PoPs na África Austral. |
| Armazenamento | Supabase Storage (Buckets Privados/Públicos) | Gestão segura para documentos KYC (BI/NUIT) e galeria pública de portfólios. |
| Cache | Upstash Redis via Fly.io (`fra`, mesma região do backend), ver [Adendo v1.3, item C](#adendo-v13) | Cache de resultados de queries geoespaciais frequentes (`GET /professionals/nearby`, Fase 3), reduzindo carga repetida no Supabase. |

---

## 2. Módulo de Geolocalização & Dados Geoespaciais (NOVO)

Para lidar com a realidade de mapeamento em Moçambique (onde existem coordenadas GPS exatas e também referências por bairros/distritos):

### A. Estratégia de Captura no Frontend (PWA)

- **Captura Automática (GPS)**: Utilização da HTML5 Geolocation API (`navigator.geolocation`) no PWA para obter Latitude e Longitude exatas mediante permissão do utilizador.
- **Fallback Manual (Hierarquia Geográfica)**: Seleção via dropdown estruturado: Província → Distrito/Município → Bairro (ex: Cidade de Maputo → KaLhamanculo → Xipamanine).

### B. Processamento Espacial (PostGIS no Supabase)

- **Tipo de Dado**: Coluna `GEOGRAPHY(POINT, 4326)` para armazenar as coordenadas cartográficas.
- **Cálculo de Proximidade**: O Backend (Fly.io) executa buscas geoespaciais utilizando a função `ST_DWithin` para cruzar pedidos de clientes com profissionais num raio específico em metros (ex: 10 km).

---

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

---

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

---

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

---

## 6. Estratégia de PWA & Cache

- **Service Worker**: Configurado via `vite-plugin-pwa` com estratégia Stale-While-Revalidate para o shell da aplicação e Network-First para requisições à API de serviços.
- **Geolocalização Offline**: Armazenamento temporário das últimas coordenadas conhecidas em localStorage / IndexedDB caso a ligação 4G oscile.

---

## 7. Perfil ADMIN

O `user_role` `ADMIN` (Secção 3) existe desde o schema inicial, mas nunca teve uma secção própria — ficava disperso entre a definição do enum, a regra de acesso a documentos (Secção 5) e o Adendo que introduziu o painel (Adendo v1.6). Esta secção consolida o que o papel cobre, hoje e no que está previsto.

**Como se chega a ADMIN:** nunca por signup — a trigger de criação de perfil só aceita `CLIENT`/`PROFESSIONAL` vindos do formulário (Adendo v1.4, item C); qualquer valor `'ADMIN'` enviado é ignorado e cai no default `CLIENT`. A promoção é sempre manual, via `UPDATE users_profile SET role = 'ADMIN'` com a `service_role` key — não existe (ainda) um fluxo de convite/promoção dentro da própria aplicação.

**Funcionalidades disponíveis hoje** (implementadas na Fase 4 do backend + Adendos v1.6 e v1.8):

| Funcionalidade | Endpoint / Superfície | Onde na app |
|---|---|---|
| Listar submissões de KYC, com filtro por estado (`PENDING`/`APPROVED`/`REJECTED`) | `GET /admin/kyc?status=` | Frontend: `/admin/kyc` |
| Aprovar uma submissão de KYC | `PATCH /admin/kyc/:id` (`status: APPROVED`) | Frontend: `/admin/kyc`, botão "Aprovar" |
| Rejeitar uma submissão de KYC com motivo obrigatório | `PATCH /admin/kyc/:id` (`status: REJECTED`, `review_notes` obrigatório) | Frontend: `/admin/kyc`, botão "Rejeitar" |
| Ler o documento de identidade (`bi_document_url`) de qualquer profissional | RLS de `storage.objects` no bucket `kyc-documents` (Secção 5) | Sem UI própria — leitura direta do Storage, hoje sem visualizador de imagem na tela de admin |
| Consultar o histórico detalhado de ações dos utilizadores, com filtros e paginação (Adendo v1.8) | `GET /admin/audit-log` | Frontend: `/admin/audit-log` |

Todas restritas por `requireRole(supabase, 'ADMIN')` no backend (consulta `users_profile.role`, nunca confia num claim do JWT) — o link no frontend (`Home.tsx`, visível só para `profile.role === 'ADMIN'`) é conveniência de navegação, não a fronteira de segurança real.

**Ainda fora do escopo, extensão natural do papel (não implementado, não pedido ainda):**
- ~~Ativar manualmente a subscrição de um profissional~~ — **implementado no Adendo v1.12** (`POST /admin/users/:id/subscription`, gateway `MANUAL`), sem UI ainda. Continuam fora do escopo: desativar/encurtar uma subscrição paga, ver o histórico de pagamentos no painel, MRR/receita.
- Visualizador de imagem do documento KYC dentro da própria tela de admin (hoje o backend só expõe o path/URL assinado; não há `<img>` na UI a mostrá-lo).
- Reverter uma decisão de KYC já tomada (`APPROVED`/`REJECTED` → o estado oposto) — ver Adendo v1.9, item G, para o porquê de não ter sido desenhado ainda.

Estes itens só entram no plano de implementação (backend e/ou frontend) quando forem pedidos e desenhados explicitamente — listados aqui apenas para não ficarem invisíveis enquanto extensão óbvia do papel.

**Segunda funcionalidade exclusiva de `ADMIN` (Adendo v1.8, Fase 8):** consultar o histórico detalhado de ações dos utilizadores (audit log) — `GET /admin/audit-log`, frontend em `/admin/audit-log`. Implementado e validado contra o Supabase real (login/logout via Google confirmados; ver Adendo v1.8 para o detalhe e as duas pendências não bloqueantes que restam).

**Planeado, ainda não implementado (Adendo v1.9, Fase 9):** painel de administração avançado — diretório de utilizadores com ficha individual e histórico ligado ao audit log, visão administrativa de pedidos de serviço (lista global + timeline por pedido), métricas agregadas (utilizadores, KYC, pedidos — sem componente financeiro), alertas de segurança sobre o audit log, ferramentas operacionais (reenvio manual de email, log de entrega consultável) e moderação de contas (banir/revogar sessões/mudar `role` entre `CLIENT`/`PROFESSIONAL`, nunca promover a `ADMIN` pela API). Ver Adendo v1.9 para o desenho completo de cada área.

**Perspetiva do frontend:**

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

### D. App "suspensa" em produção — causa raiz era `GOOGLE_MAPS_API_KEY` em falta como `fly secret`, não o auto-stop

**Sintoma (2026-09-17):** com o frontend já em produção e a receber utilizadores reais, a app apareceu como "suspended" — `flyctl status` mostrava a única máquina (`fra`) em `stopped`, e o domínio `piquetepro24-backend.fly.dev` sem registo DNS A/AAAA.

**Hipótese inicial (descartada):** `fly.toml` tinha `min_machines_running = 0` com `auto_stop_machines`/`auto_start_machines` ativos, o que parece explicar uma máquina parada por inatividade. `min_machines_running` foi alterado para `1` (mantém sempre uma máquina viva em `fra`; `auto_stop_machines`/`auto_start_machines` mantidos para escalar acima de 1 sob carga) — correção válida por si só (elimina cold start/DNS vazio no primeiro pedido após inatividade), mas **não era a causa deste incidente**: mesmo depois de forçar `flyctl machine start`, a máquina voltava a `stopped` em segundos.

**Causa raiz real, encontrada em `flyctl logs`:** `Invalid environment configuration: { GOOGLE_MAPS_API_KEY: [ 'Required' ] }`. A variável `GOOGLE_MAPS_API_KEY` (validada em `src/config/env.ts`, usada em `src/controllers/geocodingController.ts` para geocodificação reversa) existia em `.env` local e nos mocks de teste, mas nunca tinha sido definida como `fly secret` em produção. A validação Zod de arranque (comportamento correto — "falhar cedo e ruidosamente", Secção 4 deste TRD) rejeitava o processo a cada tentativa; a Fly.io reiniciou automaticamente até ao limite de 10 tentativas (`machine has reached its max restart count of 10`) e desistiu, deixando a máquina presa em `stopped` — visualmente indistinguível de um auto-stop por inatividade sem inspecionar os logs.

**Correção:** `flyctl secrets set GOOGLE_MAPS_API_KEY=<chave>` — definir o secret em falta reiniciou a máquina automaticamente, arranque confirmado nos logs (`PiquetePro24 backend listening on port 3000 (production)`, health check `servicecheck-00-http-3000` a passar).

**Lição para diagnóstico futuro:** um estado `stopped`/"suspended" na Fly.io não implica auto-stop por inatividade — `flyctl logs` (histórico, não streaming) é o primeiro passo obrigatório para distinguir "máquina parada de propósito" de "crash-loop no arranque por configuração em falta", antes de mexer em `min_machines_running` ou outras definições de scaling.

### E. Perda de IP público na app + `CORS_ORIGIN` com o domínio Vercel errado (dois incidentes distintos, mesmo dia)

**Sintoma 1 (2026-09-17):** `piquetepro24-backend.fly.dev` deixou de resolver (`ERR_NAME_NOT_RESOLVED`, tanto no browser do utilizador como via `curl`/`nslookup` a partir de outra máquina). A app estava `started` e saudável (`flyctl status`), mas `flyctl ips list` devolvia vazio — sem nenhum IP público (v4 nem v6) alocado. O domínio Fly não tinha para onde apontar.

**Correção:** `flyctl ips allocate-v4 --shared` + `flyctl ips allocate-v6`. Confirmado o registo A/AAAA no nameserver autoritativo do Fly (`ns1.flydns.net`) imediatamente após a alocação; a propagação para resolvers públicos (`8.8.8.8`) demorou alguns minutos — durante esse intervalo, `curl --resolve <host>:443:<ip>` confirmou que o servidor já respondia normalmente, isolando o atraso como puramente de propagação DNS, não de disponibilidade do serviço.

**Sintoma 2 (mesmo dia, imediatamente a seguir):** com o DNS já resolvido, o frontend em produção falhava a autenticar (`GET /profile`) com erro de CORS no browser: `Access-Control-Allow-Origin` devolvia `https://piquetepro24-frontend.vercel.app` (sem hífens), mas o domínio real do deploy Vercel é `https://piquete-pro24-front-end.vercel.app` (com hífens) — uma string diferente, rejeitada pelo preflight do browser.

**Causa raiz:** o `fly secret` `CORS_ORIGIN` tinha sido configurado nalgum momento anterior com o domínio Vercel escrito de forma ligeiramente errada (sem os hífens do nome real do projeto) — nunca chegou a ser notado porque o erro de DNS (Sintoma 1) já impedia qualquer pedido de chegar ao backend, mascarando o problema de CORS por baixo.

**Correção:** `flyctl secrets set CORS_ORIGIN=https://piquete-pro24-front-end.vercel.app` — aplicado imediatamente (não staged), por já estar a bloquear produção. Confirmado com `curl -X OPTIONS` simulando o preflight do browser (`Origin: https://piquete-pro24-front-end.vercel.app` → resposta com o mesmo valor em `Access-Control-Allow-Origin`).

**Lição para diagnóstico futuro:** quando múltiplos sintomas aparecem em sequência no mesmo incidente de produção, corrigir o primeiro pode só então revelar o segundo (aqui, corrigir o DNS foi o que permitiu o erro de CORS aparecer). Validar cada camada isoladamente (DNS → conectividade de rede → CORS → aplicação) em vez de assumir que corrigir um sintoma resolve tudo.

---

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

**Contexto:** identificado pelo próprio utilizador ao inspecionar a tabela `users_profile` no Supabase — todo perfil com localização definida por GPS (`location` preenchido) tinha `province`/`district`/`neighborhood` sempre `NULL`. Não era um bug de gravação: a Secção 2A original já desenhava `location` (GEOGRAPHY) e a hierarquia `province`/`district`/`neighborhood` como duas representações mutuamente exclusivas de localização (`updateLocation()`, item B do Adendo v1.4), e cada branch limpa explicitamente os campos da outra ao gravar. O que faltava é que `GET /geocode/reverse` (usado só para mostrar um nome de lugar legível ao utilizador antes de confirmar o GPS) já recebe da Google Geocoding API os `address_components` estruturados (província, distrito, bairro) para o mesmo ponto, e esses dados eram descartados — só `formatted_address` chegava a ser usado.

**Decisão:** `reverseGeocode()` (`src/services/geocodingService.ts`) passa a extrair também `province`/`district`/`neighborhood` de `address_components` do resultado mais detalhado (`results[0]`), mapeando por tipo do Google: `administrative_area_level_1` → província; `administrative_area_level_2`, com fallback para `locality` → distrito (cidades como Maputo são o próprio nível 2, sem `level_2` distinto); `sublocality`, com fallback para `neighborhood` → bairro. `GET /geocode/reverse` passa a devolver esses três campos junto com `placeName`.

`PATCH /profile/location` com coordenadas GPS aceita agora `province`/`district`/`neighborhood` opcionais no corpo — o frontend envia-os quando a geocodificação reversa já respondeu no momento de confirmar o GPS (ver Adendo v1.5, item A no TRD do frontend). `updateLocation()` deixa de limpar estes três campos a `null` no branch de coordenadas; grava-os junto com `location` quando fornecidos, ou `null` quando não (geocodificação falhou, ou pedido antigo sem os campos) — nunca mantém um valor anterior desatualizado.

**Não é uma segunda fonte de verdade:** `province`/`district`/`neighborhood` continuam a ser só uma cache legível para mostrar ao utilizador (ex. "Baixa, Maputo" em vez de coordenadas) quando a localização foi definida por GPS. Qualquer busca por raio/proximidade (Fase 3, `ST_DWithin`) continua a usar exclusivamente `location`/PostGIS — nunca estes campos de texto, que o Google pode não devolver para todo ponto (áreas rurais sem `sublocality`, por exemplo).

**Perspetiva do frontend:**

**Contexto:** identificado pelo próprio utilizador ao inspecionar a tabela `users_profile` no Supabase — todo perfil com localização definida por GPS (`location` preenchido) tinha `province`/`district`/`neighborhood` sempre `NULL`. Não era um bug de gravação: a Secção 2A original já desenhava `location` (GEOGRAPHY) e a hierarquia `province`/`district`/`neighborhood` como duas representações mutuamente exclusivas de localização, e cada branch de `updateLocation()` (backend) limpa explicitamente os campos da outra ao gravar. O que faltava é que `LocationForm.tsx` já chama `GET /geocode/reverse` ao obter o GPS — só para mostrar um nome de lugar legível antes do utilizador confirmar — e a resposta (que já inclui os `address_components` estruturados do Google: província, distrito, bairro) era usada só para essa string, nunca enviada ao `PATCH /profile/location`.

**Decisão:** `reverseGeocode()` (`src/services/geocoding.ts`) passa a devolver um objeto (`{ placeName, province, district, neighborhood }`) em vez de só a string do nome do lugar — espelhando os três campos novos que `GET /geocode/reverse` (backend, ver TRD do backend, Adendo v1.4 item G) agora expõe. `LocationForm.tsx`, ao confirmar a localização por GPS (`handleConfirmGps`), passa a enviar `province`/`district`/`neighborhood` (já obtidos da geocodificação reversa que a tela já tinha chamado para a pré-visualização) junto com `latitude`/`longitude` no `PATCH /profile/location` — sem chamada de rede extra, sem pedir nada novo ao utilizador. Se a geocodificação reversa ainda não respondeu ou falhou no momento da confirmação, os três campos seguem `undefined` e o backend grava `null`, sem bloquear a confirmação do GPS por isso.

**Não é uma segunda fonte de verdade:** estes três campos continuam a ser só uma cache legível (ex. "Baixa, Maputo" em `currentLocationLabel`) quando a localização foi definida por GPS. A busca por raio/proximidade (Fase 3) usa exclusivamente as coordenadas, nunca estes campos de texto.

**Validado:** build e lint (`tsc -b`, `eslint`) limpos. Sem suite de testes automatizados no frontend nesta fase (o repositório não tem Vitest/testing-library configurado) — validação end-to-end da tela feita manualmente (ver Plano de Implementação do Frontend).

---

## Adendo v1.5


### A. `GET /service_requests` — listagem dos próprios pedidos do cliente

**Contexto:** a Fase 3 original (Secção 5, ver escopo em `PLANO_IMPLEMENTACAO_BACKEND.md`) definia `POST /service_requests` (criação) e `GET /service_requests/nearby` (para profissionais encontrarem pedidos `OPEN` próximos), mas nenhum endpoint para o **cliente** listar os próprios pedidos depois de os criar. Identificado ao construir o consumo no frontend (regra do CLAUDE.md — nenhum endpoint fica sem consumo real na mesma entrega): sem esta listagem, o cliente não tem como voltar a ver um pedido já criado para o concluir (`POST /service_requests/:id/complete`) ou cancelar (`POST /service_requests/:id/cancel`) depois de sair do ecrã de criação — os dois endpoints ficariam sem qualquer UI possível.

**Decisão:** `GET /service_requests` (autenticado, sem `requireRole` — qualquer utilizador vê só os próprios pedidos) devolve todos os pedidos do `client_id` autenticado, em qualquer estado (`OPEN`/`ASSIGNED`/`COMPLETED`/`CANCELLED`), ordenados por `created_at` decrescente (mais recente primeiro). `listServiceRequestsByClient()` (`src/services/serviceRequestService.ts`) — filtro simples `eq('client_id', ...)`, sem paginação (o volume esperado por cliente é baixo, ao contrário de `nearby`, que pode atravessar toda a base). Reaproveita `SERVICE_REQUEST_COLUMNS` e o mesmo `ServiceRequest` já definidos para os outros endpoints do ciclo de vida.

**Frontend:** consumido por uma nova tela "Os meus pedidos" (`FindProfessionals.tsx`/rota dedicada, ver TRD do frontend) que lista os pedidos do cliente e mostra `complete`/`cancel` conforme o `status` atual — só pedidos `ASSIGNED` mostram "Concluir", só `OPEN`/`ASSIGNED` mostram "Cancelar" (espelha as mesmas transições que o backend já valida).

**Validado:** suite Vitest atualizada e verde nos dois repositórios (`geocodingService.test.ts` cobre a extração por tipo de componente e o fallback `locality`; `profileService.test.ts` cobre a gravação da hierarquia junto do `POINT`; `geocoding.test.ts` e `profile.test.ts` cobrem os endpoints HTTP). Build e lint limpos em ambos os repositórios.

**Perspetiva do frontend:**

**Contexto:** ver TRD do backend, Adendo v1.5, item A — a Fase 3 original do backend só previa `POST /service_requests` (criação) e `GET /service_requests/nearby` (para profissionais). Ao construir o consumo destes endpoints nas Fases 2/3 do frontend (regra do CLAUDE.md: nenhum endpoint fica sem consumo real na mesma entrega), ficou claro que sem uma listagem "os meus pedidos" o cliente não tinha como voltar a um pedido já criado para o concluir ou cancelar.

**Decisão:** backend passou a expor `GET /service_requests` (pedidos do cliente autenticado, qualquer estado, sem paginação); frontend consome via `fetchMyServiceRequests()`/`useMyServiceRequests()` (`src/services/serviceRequests.ts`, `src/hooks/useServiceRequests.ts`) numa nova tela `MyServiceRequests.tsx` (`/os-meus-pedidos`), que mostra o estado de cada pedido e as ações `Concluir`/`Cancelar` só quando o estado atual as permite (espelhando exatamente as transições que o backend já valida — `ASSIGNED` para concluir, `OPEN`/`ASSIGNED` para cancelar).

### B. Consumo completo da Fase 3 do backend (proximidade + ciclo de vida de pedidos)

*(Só com componente de frontend.)*

**Contexto:** os 6 endpoints originais da Fase 3 do backend (`GET /professionals/nearby`, `POST /service_requests`, `GET /service_requests/nearby`, `assign`/`complete`/`cancel`) tinham ficado sem nenhum consumo no frontend depois de o backend os implementar — identificado ao auditar explicitamente a cadeia endpoint → api → hook → UI (regra do CLAUDE.md).

**Decisão:** implementadas as Fases 2 e 3 do frontend (ver `docs/PLANO_IMPLEMENTACAO_FRONTEND.md` para os critérios de entrega detalhados e desvios de escopo assumidos, incluindo o item A acima):

- `FindProfessionals.tsx` (`/profissionais`): busca de profissionais por raio (GPS), com criação de pedido diretamente a partir da lista.
- `MyServiceRequests.tsx` (`/os-meus-pedidos`): listagem e gestão dos próprios pedidos do cliente.
- `NearbyServiceRequests.tsx` (`/pedidos-proximos`): pedidos `OPEN` próximos para profissionais, com ação de aceitar.
- `Home.tsx` passa a mostrar navegação condicional por `role` (`PROFESSIONAL` vê "Pedidos perto de ti"; outros veem "Procurar profissionais" + "Os meus pedidos").

**Validado:** build (`tsc -b` + `vite build`) e lint (`eslint`) limpos. Validação manual completa (login real, fluxo ponta a ponta no browser) **não foi possível nesta sessão** — sem driver de browser (Playwright/chromium-cli) disponível na máquina de desenvolvimento usada. Confirmado apenas que o dev server (Vite) serve e transforma os novos módulos sem erro de compilação. Recomenda-se validação manual/Playwright antes de considerar as Fases 2/3 do frontend definitivamente fechadas.

---

## Adendo v1.6


### A. Painel de administração para revisão de KYC

**Contexto:** a Fase 4 (KYC de Profissionais) implementou os endpoints administrativos (`GET /admin/kyc`, `PATCH /admin/kyc/:id`, protegidos por `requireRole('ADMIN')`) e a policy de RLS que restringe `bi_document_url` a utilizadores `ADMIN` (Secção 5). Nem o TRD original nem o plano de implementação do frontend definiam, no entanto, nenhuma interface para um `ADMIN` de facto listar submissões pendentes e aprovar/rejeitar — os endpoints só podiam ser exercidos diretamente via API (curl/Postman), sem nenhuma tela na aplicação. Identificado depois de promover a primeira conta real a `ADMIN` em produção e constatar que não existia forma de a usar dentro da própria app.

**Decisão:** adicionar uma tela de administração no frontend, acessível só a utilizadores com `profile.role === 'ADMIN'`, que lista submissões KYC (com filtro por estado) e permite aprovar ou rejeitar cada uma (rejeição exige motivo, espelhando a obrigatoriedade de `review_notes` já validada no backend). Não é um "painel" no sentido de múltiplas telas/métricas — é a superfície mínima para exercer os dois endpoints administrativos já existentes. Nenhuma alteração de schema ou de endpoint no backend é necessária; o backend já suporta este consumo desde a Fase 4.

**Frontend:** nova rota protegida (ex. `/admin/kyc`), visível só quando `profile.role === 'ADMIN'` (mesma convenção de visibilidade condicional por role já usada para "Pedidos perto de ti"/"Verificação de identidade" em `Home.tsx` — sem guard de rota dedicado no backend, a restrição real continua a vir do `requireRole` da API).

**Critério de entrega correspondente:** ver `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, novo item na Fase 4.

**Perspetiva do frontend:**

**Contexto:** ver TRD do backend, Adendo v1.6, item A. A Fase 4 implementou os endpoints administrativos (`GET /admin/kyc`, `PATCH /admin/kyc/:id`) e a policy de RLS que restringe `bi_document_url` a `ADMIN`, mas nem o TRD original nem o plano do frontend previam nenhuma tela para os exercer — só eram acessíveis diretamente via API. Identificado depois de promover a primeira conta real a `ADMIN` em produção e constatar que não havia forma de a usar dentro da app.

**Decisão:** nova tela no frontend, acessível só a `profile.role === 'ADMIN'`, que lista submissões KYC (com filtro por estado) e permite aprovar/rejeitar cada uma (rejeição exige motivo, espelhando `review_notes` obrigatório já validado no backend). Sem alteração de schema/endpoint no backend — o consumo é da API já existente desde a Fase 4.

**Frontend:** nova rota protegida (`/admin/kyc`), visível só quando `profile.role === 'ADMIN'`, mesma convenção de visibilidade condicional por role já usada em `Home.tsx`.

**Critério de entrega correspondente:** ver `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, novo item na Fase 4.

---

## Adendo v1.7


### A. Infraestrutura de email transacional (SMTP)

**Contexto:** o projeto não tinha nenhuma capacidade de enviar email próprio — nem o TRD nem o plano de implementação previam isto como item explícito. A mudança de estado do KYC (Fase 4) era notificada só por um mock em log (`notifyKycStatusChange`, comentário original: "sem serviço de email/push implementado ainda"), e não existe hoje nenhum ecrã de "esqueci a password" no frontend (a recuperação de password do Supabase Auth nunca foi exercida por este produto). Pedido explícito do utilizador: ligar o que já existe (KYC) a um email real, dar um endpoint para o email de boas-vindas e um para recuperação de password, e preparar os templates dos fluxos que ainda não existem (pagamento/subscrição, Fase 5) para não haver dois ciclos de revisão de template quando essa fase for implementada.

**Decisão:** nodemailer com SMTP (conta Gmail com App Password em desenvolvimento — variáveis `SMTP_*`/`EMAIL_FROM_*` em `.env`, nunca hardcoded; ver `.env.example`). Duas peças reutilizáveis, novas em `src/services/email/`:

- `CatalogoTemplatesEmail` (`templates.ts`) — um método estático por template (`boasVindas`, `recuperacaoPassword`, `passwordAlterada`, `kycAprovado`, `kycRejeitado`, `pagamentoConfirmado`, `subscricaoAExpirar`), cada um documentado com objetivo e o fluxo que o dispara. Layout único partilhado (tabelas HTML, sem ícones/emoji, paleta alinhada com o Tailwind do frontend — cinza-escuro de marca, verde/âmbar/vermelho para sucesso/aviso/erro), para que uma alteração de marca se faça num único sítio. Texto livre vindo de um admin (`review_notes`) ou do próprio utilizador (`full_name`) é escapado antes de entrar no HTML.
- `EmailService` (`emailService.ts`) — única classe que chama `nodemailer.sendMail`; nunca lança (SMTP em baixo não pode bloquear um fluxo de negócio, mesmo princípio do Redis opcional da Fase 3), resolve sempre com `{ enviado, motivo? }`. Sem `SMTP_USER`/`SMTP_PASSWORD` no ambiente (dev/test/CI), o transporter é `null` e o envio fica "desligado" — só regista em log, nunca falha o pedido.

**Ligado hoje** (âmbito desta entrega):
- `reviewKyc` (Fase 4) — o mock em log foi substituído por `enviarKycAprovado`/`enviarKycRejeitado` reais, com o `full_name` do perfil e o email obtido via `auth.admin.getUserById` (Admin API — `users_profile` não guarda email).
- `POST /notifications/welcome` (endpoint novo, autenticado) — o frontend deve chamá-lo logo a seguir a um `supabase.auth.signUp()` bem-sucedido. **Limitação conhecida, não resolvida nesta entrega:** se o projeto Supabase exigir confirmação de email antes de emitir sessão, `signUp()` devolve sucesso sem sessão e o frontend não tem token para chamar este endpoint nesse instante — nesse caso o email de boas-vindas só pode ser disparado depois do primeiro login pós-confirmação. Decisão de wiring do frontend, ainda por fazer (ver plano de implementação do frontend).
- `POST /auth/password-recovery` (endpoint novo, público) — gera o link com `supabase.auth.admin.generateLink({ type: 'recovery' })` (Admin API) em vez de deixar o Supabase Auth enviar o email dele próprio, precisamente para poder usar o template próprio em vez do template genérico do painel Supabase. Resposta sempre genérica (200, mesma mensagem), mesmo quando o email não corresponde a nenhuma conta — defesa contra enumeração de contas. O link redireciona para `${FRONTEND_URL}/definir-nova-password`, uma tela que **ainda não existe no frontend** — falta criá-la (chama `supabase.auth.updateUser({ password })` diretamente com a sessão de recuperação, sem passar pelo backend; fluxo padrão do Supabase Auth).
- **Rate limiting neste endpoint (`src/middlewares/rateLimit.ts`, novo):** `admin.generateLink` corre com a `service_role` key, por isso não passa pelo rate limiting nativo do Supabase Auth que protegeria o fluxo normal de recuperação (esse só existe para chamadas com a anon key). Sem limite próprio, o endpoint permitia "email-bombing" a um alvo à escolha, ou martelar o endpoint sem custo — ambos arriscando sinalizar a conta SMTP como spam e derrubar os outros emails do sistema (boas-vindas, KYC) que a partilham. Dois limites independentes, por janela fixa de 15 minutos: 5 pedidos por IP, 3 pedidos por email de destino (mais apertado de propósito — protege um alvo específico mesmo de um atacante distribuído por vários IPs). Usa Redis (`INCR`/`EXPIRE`) quando `REDIS_URL` está configurado — partilhado e exato entre instâncias — com fallback em memória por processo quando não está (dev/test, ou Redis indisponível); nunca bloqueia o pedido se o Redis falhar (fail-open, mesmo princípio do cache de `professionals/nearby`). Exige `app.set('trust proxy', 1)` em `app.ts` — sem isto, `req.ip` seria sempre o IP interno do proxy do Fly, não o do cliente, e o limite por IP contaria todos os clientes como um só. Middleware genérico, pensado para ser reaproveitado pela Fase 6 ("Rate limiting nos endpoints públicos") noutros endpoints, não só neste.

**Preparado, ainda não ligado a nenhum fluxo:**
- `passwordAlterada` — falta o handler que confirma a alteração de password (a tela `/definir-nova-password` acima).
- `pagamentoConfirmado` / `subscricaoAExpirar` — dependem da Fase 5 (Subscrições & Pagamentos), que ainda não existe.

**Critérios de entrega correspondentes:** ver `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`, novo item na Fase 4 e nota na Fase 5.

**Perspetiva do frontend — Infraestrutura de email transacional:**

**Contexto:** ver TRD do backend, Adendo v1.7. O backend passou a ter `EmailService`/`CatalogoTemplatesEmail` (nodemailer/SMTP) e dois endpoints novos — identificado como consumo em falta ao perguntar explicitamente "o que falta no frontend" depois da entrega do backend, não durante a implementação em si (desvio à regra do CLAUDE.md Secção 1 deste repositório, corrigido nesta mesma entrega).

**Implementado em `feat/notificacoes-email-e-audit-log`:**
- `services/notifications.ts` (`sendWelcomeNotification`) — chamado em dois pontos, sempre sem `await` bloqueante e com o erro engolido (`.catch(() => {})`): `Login.tsx`, logo a seguir a um `signUp()` por email/telefone com sessão imediata (`data.session` preenchida); `AuthCallback.tsx`, quando o redirect do Google partiu de um `sign-up` (mesmo sinal — presença de `INTENDED_ROLE_STORAGE_KEY` — que já decide se se chama `become-professional`). **Limitação conhecida, herdada do backend e não resolvida aqui:** se o Supabase exigir confirmação de email antes de emitir sessão, não há chamada nenhuma no momento do signup — falaria disparar depois do primeiro login pós-confirmação, o que não foi implementado (o `else` que já existe em `Login.tsx` para o caso "sem sessão imediata" não dispara o welcome).
- `services/passwordRecovery.ts` (`requestPasswordRecovery`) + ecrã "Esqueci a password" dentro de `Login.tsx` (troca o formulário principal por um formulário só de email quando `showRecovery` é `true`, visível apenas em `mode === 'sign-in'` e `channel === 'email'` — recuperação por telefone não é suportada pelo backend, que gera o link via `admin.generateLink` para um endereço de email). A mensagem de sucesso mostrada é sempre a que o backend devolve (`response.data.message`), nunca um texto fixo no frontend — evita duplicar a cópia e mantém a garantia anti-enumeração do lado que a decide. Um erro real (rede, `400` de email inválido, `429` de rate limit, ver Adendo v1.7 do backend) aparece à parte, nunca disfarçado da mensagem de sucesso.
- `pages/DefinirNovaPassword.tsx`, rota `/definir-nova-password` (sem `ProtectedRoute` — a sessão de recuperação resolve-se de forma assíncrona via `detectSessionInUrl`, e um `ProtectedRoute` a decidir antes disso mandaria embora um link válido; a própria tela espera `isLoading` ficar `false`, mesmo padrão de `AuthCallback.tsx`, antes de decidir se mostra o formulário, o erro de "link inválido/expirado", ou a confirmação). Chama `supabase.auth.updateUser({ password })` diretamente, sem passar pelo backend — fluxo padrão do Supabase Auth. `describeAuthError` (tradução de erros do Supabase Auth) foi extraída de `Login.tsx` para `lib/authErrors.ts`, reutilizada pelas duas telas.

**Resolve uma limitação já registada na Fase 1:** a nota "Configurar SMTP próprio... é decisão explicitamente adiada — sem isso, também não há como enviar um email de boas-vindas personalizado" deixa de se aplicar ao email de boas-vindas e à recuperação de password (os dois têm agora template próprio, via SMTP próprio do backend). Continua a aplicar-se só ao email de **confirmação de conta** no signup por email/telefone, que continua a ser enviado pelo Supabase Auth diretamente (fora do controlo do `EmailService`).

**Validado:** `tsc -b` (strict) e `vite build` de produção limpos; `eslint` sem erros novos (um aviso pré-existente em `AuthContext.tsx`, sem relação com esta mudança). **Não validado interativamente num browser** (sem ferramenta de automação de browser disponível nesta sessão, ao contrário de entregas anteriores validadas com Playwright) — confirmado apenas que os módulos novos transformam sem erro no servidor de desenvolvimento do Vite (sem overlay de erro de sintaxe/import).

**Critério de entrega correspondente:** ver `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, itens da Fase 1.

### B. Mudar password estando autenticado — pedido do utilizador, sem componente no backend

*(Só com componente de frontend.)*

**Contexto:** pedido explícito do utilizador ao testar a recuperação de password (item A) — reparou que não havia forma de mudar a password estando já com sessão iniciada, só o fluxo de "esqueci a password" para quem não está autenticado. Diferente do item A: **não existe endpoint novo no backend nem alteração ao TRD do backend** — usa a mesma chamada `supabase.auth.updateUser({ password })` que `DefinirNovaPassword.tsx` já usa, só que com a sessão normal do utilizador em vez da sessão especial de recuperação.

**Implementado em `pages/Profile.tsx`:** nova secção "Segurança", mesma convenção de toggle "Editar"/"Fechar" já usada na secção "Os meus dados" — botão "Mudar password" revela um formulário (nova password + confirmação), sem pedir a password atual. **Decisão consciente, não uma omissão:** o Supabase Auth não exige a password atual para `updateUser()` com uma sessão já válida — reautenticação adicional (pedir a password atual antes de aceitar a nova) fica como extensão futura, só se vier a ser pedida. `describeAuthError` (já extraída para `lib/authErrors.ts` no item A) é reutilizada para traduzir um eventual erro do Supabase Auth.

**Validado:** `tsc -b` (strict), `vite build` de produção e `eslint` limpos (mesmo aviso pré-existente de sempre, sem relação). Sem validação interativa em browser, mesma limitação de ferramenta do item A.

**Critério de entrega correspondente:** ver `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, novo item na Fase 1.

---

## Adendo v1.8


### A. Audit Log — histórico detalhado de ações dos utilizadores (acesso exclusivo a ADMIN)

**Contexto:** pedido explícito do utilizador — nenhuma ação de um utilizador fica hoje registada de forma pesquisável; o mais próximo que existe é `professional_kyc.reviewed_by`/`review_notes` (auditoria pontual de um único fluxo) e logs estruturados soltos em `console.info`/`console.error` (`notifyKycStatusChange`, `rate-limit:redis-falha`, etc.), que não são consultáveis pela aplicação nem persistem de forma pesquisável em produção. Requisito: todas as ações que mudam estado ficam registadas — o quê, quando (data e hora) e quem —, com acesso de leitura exclusivo a `ADMIN`.

**Âmbito confirmado com o utilizador:**
- Regista ações que mudam estado (`POST`/`PATCH`/`DELETE` no backend) — não leituras (`GET`). Ver perfil ou pesquisar profissionais não é uma "ação" no sentido de responsabilização, e o volume não traria valor de auditoria.
- Regista também tentativas negadas ou falhadas (`401`/`403`) — não só sucessos. Uma tentativa de acesso negado é frequentemente o dado mais importante de um audit log (indício de abuso ou conta comprometida).
- Cobre também login, logout, signup e o ciclo completo de recuperação de password — mesmo os que **nunca passam pelo Express** (ver arquitetura, fonte 2, abaixo).
- Leitura exclusiva a `ADMIN`, incluindo o próprio dono da ação — não há vista "a minha atividade" para o utilizador comum nesta entrega (extensão natural, não pedida).

**Arquitetura — duas fontes, uma tabela (`public.audit_log`):**

1. **Ações da aplicação (Express).** Middleware novo (`src/middlewares/auditLog.ts`), registado antes de qualquer rota — precisa de correr mesmo quando `requireAuth`/`requireRole` bloqueiam o pedido, para poder capturar o `401`/`403`. Filtra por método (`POST`/`PATCH`/`DELETE`/`PUT`; ignora `GET`/`OPTIONS` sem custo) e grava em `res.on('finish')`, depois da resposta já ter sido enviada ao cliente — nunca atrasa nem falha o pedido de negócio (mesmo princípio do `EmailService`: uma falha ao escrever no audit log fica só em log, não propaga). Lê `req.user?.id` (pode ser `undefined` num `401`, antes de `requireAuth` identificar alguém) e `res.statusCode`.
   - **Enriquecimento semântico:** o middleware sozinho só sabe método + caminho + estado — não chega a "bem detalhado". Cada controller/service preenche `req.auditContext` (`action`, `description`, `entityType`, `entityId`, `metadata`) antes de responder (ex. `reviewKyc` grava `action: 'KYC_REVIEW_REJECTED'`, `description: 'Rejeitou o KYC de <user_id> — motivo: ...'`, `entityType: 'professional_kyc'`). Sem esse contexto, o middleware ainda grava uma linha (baseline genérico a partir do método+caminho) — nenhuma ação mutável fica de fora só porque um developer se esqueceu de enriquecer, mas fica menos detalhada até alguém acrescentar o contexto.
   - Endpoints a enriquecer nesta entrega (mutáveis já existentes): `POST /kyc`, `PATCH /admin/kyc/:id`, `PATCH /profile`, `PATCH /profile/location`, `POST /profile/become-professional`, `DELETE /profile`, `POST /service_requests`, `POST /service_requests/:id/assign`, `POST /service_requests/:id/cancel`, `POST /service_requests/:id/complete`, `POST /auth/password-recovery` (incluindo a tentativa para um email sem conta — âmbito confirmado acima).

2. **Eventos de identidade/sessão (Supabase Auth).** Login, logout e signup são feitos pelo frontend diretamente contra o Supabase Auth (`supabase.auth.signInWithPassword`/`signInWithOAuth`/`signOut`/`signUp`) — **nunca chegam ao Express**, por isso o middleware do ponto 1 não os vê. O Supabase Auth (GoTrue) já mantém o seu próprio histórico interno destes eventos em `auth.audit_log_entries` (schema `auth`, gerido pelo Supabase, não pela aplicação). Em vez de reinventar a captura de login/logout, uma trigger SQL (`AFTER INSERT ON auth.audit_log_entries`) espelha os eventos relevantes (login, logout, signup, pedido de recuperação de password, password alterada, conta apagada — **não** `token_refreshed`, que dispara a cada renovação de sessão e não tem valor de auditoria) para `public.audit_log`, unificando as duas fontes numa tabela só. Mesmo padrão já usado para `handle_new_user` (Fase 2) — trigger sobre uma tabela do Supabase, não polling nem duplicação de lógica no backend.
   - **Validado contra o projeto Supabase real:** os valores de `payload.action` são `login`/`logout` em minúsculas (a trigger aplica `upper()`, por isso ficam `LOGIN`/`LOGOUT` em `public.audit_log`) — confirmado com um login e logout reais, incluindo via **Google (OAuth)**, que grava o mesmo valor `login` que o login por password/telefone (não precisou de valor adicional no filtro da trigger).
   - **Descoberta ao validar (não estava prevista):** `auth.audit_log_entries` apareceu vazia mesmo depois de logins/logouts reais de teste, antes de se perceber a causa. Desde a atualização do Supabase de setembro/2026, os audit logs de Auth passaram a ser guardados **externamente por omissão** — escrever também em `auth.audit_log_entries` é uma opção que tem de ser ligada manualmente, projeto a projeto, em **Dashboard → Authentication → Configuration → Audit Logs → "Write audit logs to the database"**. Sem isto ligado, a trigger deste Adendo nunca dispara (a tabela de origem nunca recebe linhas), independentemente de a trigger em si estar correta. **Ativar este toggle é um passo de configuração fora do Git**, não coberto por nenhuma migration — tem de ser repetido manualmente em cada ambiente Supabase novo (staging, ou se o projeto for recriado), e fica registado aqui para não ser esquecido. Ativar o toggle só afeta eventos a partir desse momento, sem backfill do que já aconteceu antes. **Já ativado e validado no projeto de desenvolvimento.**
   - **Observação não bloqueante, a investigar:** o teste de logout via Google produziu duas linhas `LOGOUT` a poucos milissegundos de diferença (`auth.audit_log_entries` recebeu dois eventos reais, não é um artefacto da trigger). Possível duplo disparo de `supabase.auth.signOut()` no frontend (ex. React StrictMode em desenvolvimento a duplicar um efeito, ou um listener a par de uma chamada explícita) — a investigar no frontend quando houver oportunidade; não bloqueia nada, só polui ligeiramente o histórico com uma linha a mais por logout.

**Esquema de `audit_log` (proposto):**

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | `uuid PK` | `gen_random_uuid()` |
| `user_id` | `uuid FK -> auth.users`, nullable | `null` quando a identidade não foi estabelecida (ex. token ausente/inválido num `401`) |
| `action` | `text` | Código curto (`KYC_REVIEW_APPROVED`, `LOGIN`, `SERVICE_REQUEST_CANCEL`, ...). **Texto livre, não enum** — ao contrário de `user_role`/`kyc_status`/`request_status`: o conjunto de ações cresce a cada endpoint mutável novo, e um enum exigiria uma migration (`ALTER TYPE ... ADD VALUE`) por cada ação nova — fricção desproporcional para um campo que só serve para filtrar/ler, nunca para uma constraint de estado. |
| `description` | `text` | Detalhe legível por humano — o "bem detalhado" do pedido. |
| `entity_type` / `entity_id` | `text` / `uuid`, nullable | Para correlacionar (ex. "todas as ações sobre este pedido de serviço"). |
| `method` / `path` | `text` | Baseline do middleware, sempre presente. |
| `status_code` | `integer` | Resposta HTTP real. |
| `success` | `boolean` | `status_code < 400` — coluna explícita para filtrar sem repetir a lógica em cada query. |
| `ip_address` | `text`, nullable | De `req.ip` (já correto via `trust proxy`, Adendo v1.7). |
| `metadata` | `jsonb`, nullable | Detalhe estruturado por ação (ex. valores antigo/novo de um `PATCH /profile`), sem precisar de coluna nova por caso. |
| `created_at` | `timestamptz` | UTC, mesma convenção das outras tabelas — conversão para hora de Moçambique (UTC+2, sem DST) é responsabilidade de quem exibe (frontend/admin), não do backend. |

**Segurança e imutabilidade:**
- RLS: só `ADMIN` tem `SELECT` (mesma policy usada para `bi_document_url`, Secção 5) — nenhuma role tem `INSERT`/`UPDATE`/`DELETE` via API; só o backend (`service_role`, que ignora RLS) escreve, e só por `INSERT`. Um audit log que pode ser editado ou apagado por quem quer que seja deixa de servir de prova — **imutável mesmo para `ADMIN`** através da API; uma correção só seria possível por SQL direto (Supabase Studio), fora do fluxo normal, e é uma decisão consciente, não um esquecimento.
- `GET /admin/audit-log` (novo): paginado, filtros por `user_id`/`action`/`entity_type`/intervalo de datas/`success`, atrás de `requireRole(supabase, 'ADMIN')` — mesma dupla proteção (RLS + `requireRole`) já usada em `GET /admin/kyc`.

**Risco não bloqueante, a decidir mais tarde:** a tabela cresce sem limite (uma linha por ação mutável, mais os eventos de sessão do Supabase). Sem política de retenção/arquivo definida nesta entrega — não impede o lançamento inicial, mas fica registado para não ser esquecido quando o volume começar a importar.

**Critérios de entrega correspondentes:** ver `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`, nova Fase 8.

**Perspetiva do frontend — Audit log — histórico de ações:**

**Contexto:** ver TRD do backend, Adendo v1.8. `GET /admin/audit-log` existe no backend, protegido por `ADMIN` — estava na mesma situação em que `GET /admin/kyc` esteve antes do Adendo v1.6 deste TRD: endpoint pronto, sem nenhuma tela a consumi-lo, até esta entrega.

**Implementado em `feat/notificacoes-email-e-audit-log`:** `services/auditLog.ts` (`fetchAuditLog`) + `hooks/useAuditLog.ts` (TanStack Query) + `pages/AdminAuditLog.tsx`, rota `/admin/audit-log`, mesma convenção de guard de role dentro do próprio componente já usada em `AdminKyc.tsx` (`profile.role !== 'ADMIN'` → `<Navigate to="/" />`). Filtros implementados: `action` (texto livre, espelha o campo do backend) e `success` (Todos/Sucesso/Falha); paginação simples Anterior/Seguinte via `limit`/`offset` (sem filtro por `user_id`/`entity_type`/intervalo de datas nesta entrega — o backend já os aceita, mas não há ainda um caso de uso concreto que os peça na UI; fica como extensão natural). `created_at` é formatado explicitamente em `Africa/Maputo` (`toLocaleString` com `timeZone`), não na hora local do browser do admin — o TRD do backend deixa essa conversão como responsabilidade de quem exibe. Link condicional em `Home.tsx`, ao lado do link de "Revisão de KYC", visível só a `profile.role === 'ADMIN'`.

**Validado:** `tsc -b` (strict) e `vite build` de produção limpos; `eslint` sem erros novos. **Não validado interativamente num browser** (mesma limitação de ferramenta descrita no Adendo v1.7) nem contra o backend real com dados de audit log de verdade — a migration do backend (`supabase/migrations/20260919180000_audit_log.sql`) ainda não tinha sido aplicada ao Supabase real no momento desta entrega (ver TRD do backend, Adendo v1.8).

---

## Adendo v1.9


### A. Painel de Administração Avançado

**Contexto:** depois de KYC (Adendo v1.6) e audit log (Adendo v1.8), sessão de brainstorm explícita com o utilizador sobre que outras capacidades um `ADMIN` deste marketplace precisa — não um pedido pontual, mas uma ronda deliberada para consolidar o que falta antes de continuar a crescer o papel um pedido de cada vez. Cobre cinco áreas; uma sexta (financeiro/subscrições) fica deliberadamente fora, ver nota no fim.

**Ponto de partida já existente e reaproveitado por várias das áreas abaixo:** `GET /admin/audit-log` (Adendo v1.8) já aceita `user_id` e `entity_type`+`entity_id` como filtros no backend — a Secção B (ficha de utilizador) e a Secção C (timeline de pedido) não precisam de endpoint novo nenhum para a parte de histórico, só de o frontend passar esses filtros, que hoje não expõe.

**Perspetiva do frontend:**

**Contexto:** ver TRD do backend, Adendo v1.9 — sessão de brainstorm explícita com o utilizador sobre capacidades de `ADMIN` para além de KYC e audit log. Seis áreas (item B a G, mesma numeração do TRD do backend); implementadas incrementalmente, uma de cada vez, não numa entrega só — cada item abaixo diz o estado real.

**B. Diretório de utilizadores + ficha individual — implementado em `feat/admin-diretorio-utilizadores`:** `services/adminUsers.ts` (`fetchUsers`/`fetchUserDetail`) + `hooks/useAdminUsers.ts` + `pages/AdminUsers.tsx` (`/admin/utilizadores`, pesquisa por nome/telefone + filtro por role) + `pages/AdminUserDetail.tsx` (`/admin/utilizadores/:id`, mostra KYC e contagem de pedidos). `AdminAuditLog.tsx` passou a ler `?user_id=` da URL (`useSearchParams`), com indicador do filtro ativo e botão para o limpar — `services/auditLog.ts` estendido para enviar esse filtro (o backend já o aceitava desde a Fase 8). Link "Utilizadores" em `Home.tsx`, ao lado de "Revisão de KYC"/"Histórico de ações". `tsc -b`/`vite build`/`eslint` limpos; sem validação interativa em browser.

**C. Visão administrativa de pedidos de serviço — implementado em `feat/admin-diretorio-utilizadores`:** `services/adminServiceRequests.ts` (`fetchAllServiceRequests`/`cancelServiceRequestAsAdmin`) + `hooks/useAdminServiceRequests.ts` + `pages/AdminServiceRequests.tsx` (`/admin/pedidos-servico`, filtro por estado, cancelamento admin com confirmação em duas etapas — mesma convenção de "Apagar conta" em `Profile.tsx`). `AdminAuditLog.tsx` e `services/auditLog.ts` estendidos para aceitar `entity_type`/`entity_id` (o backend já os aceitava desde a Fase 8), com o mesmo padrão de indicador de filtro ativo já usado para `user_id` (item B). Link "Pedidos de serviço" em `Home.tsx`. `tsc -b`/`vite build`/`eslint` limpos; sem validação interativa em browser.

**D. Métricas agregadas — implementado em `feat/admin-metricas`:** `services/adminMetrics.ts` (`fetchAdminMetrics`) + `hooks/useAdminMetrics.ts` + `pages/AdminMetrics.tsx` (`/admin/metricas`) — tiles simples (números, sem gráficos, decisão consciente para esta entrega) para utilizadores por role, novos registos em 30 dias, funil de KYC, profissionais ativos por província, pedidos por estado e tempos médios de atribuição/conclusão. Sem componente financeiro (depende da Fase 5 do backend, que não existe). Link "Métricas" em `Home.tsx`. `tsc -b`/`vite build`/`eslint` limpos. **Não validado contra dados reais** — a função RPC `admin_metrics()` do backend também não foi aplicada ao Supabase ainda (mesmo passo manual do audit log, ver TRD do backend).

**E. Alertas de segurança — implementado em `feat/admin-alertas-seguranca`:** `services/adminSecurityAlerts.ts` (`fetchSecurityAlerts`) + `hooks/useAdminSecurityAlerts.ts` + componente `SecurityAlertsPanel`, embutido no topo de `AdminAuditLog.tsx` — secção, não tela à parte (as duas opções estavam abertas desde o Adendo v1.9 original). Sem alertas na janela (24h/5 tentativas por omissão), não mostra nada — uma secção "sem alertas" permanente seria ruído. Clicar num alerta agrupado por `user_id` filtra o audit log por esse utilizador, reaproveitando o mesmo `?user_id=` do item B (limpa `entity_type`/`entity_id` do item C, que nunca fazem sentido ao mesmo tempo); alertas por `ip_address` são só informativos, sem filtro correspondente no audit log (não implementado ainda). `tsc -b`/`vite build`/`eslint` limpos. **Não validado contra dados reais** — a função RPC `admin_security_alerts()` também não foi aplicada ao Supabase.

**F. Reenviar email — implementado em `feat/admin-ferramentas-operacionais`:** `services/adminUsers.ts` ganha `resendEmail` + `hooks/useAdminUsers.ts` ganha `useResendEmail` — secção nova em `AdminUserDetail.tsx` com um `<select>` dos três templates (boas-vindas/KYC aprovado/KYC rejeitado) e um botão "Reenviar". Sem lógica de esconder templates "não relevantes" para o utilizador em causa — decisão consciente de simplicidade, o admin sabe o que está a fazer. Feedback distingue três casos via `toast` (`sonner`): sucesso, "desligado" (sem SMTP configurado no ambiente — informativo, não erro) e falha real. `tsc -b`/`vite build`/`eslint` limpos; sem validação interativa em browser.

**G. Moderação de contas — implementado em `feat/admin-moderacao-contas`:** `services/adminUsers.ts` ganha `banUser`/`unbanUser`/`changeUserRole` + `hooks/useAdminUsers.ts` ganha `useBanUser`/`useUnbanUser`/`useChangeUserRole` (cada mutação invalida a query de detalhe do utilizador, para o novo estado — `banned_until` ou `role` — aparecer de imediato). Nova secção "Moderação de conta" em `AdminUserDetail.tsx`: mostra se a conta está banida (e até quando, `banned_until` vindo da ficha do backend) e alterna entre "Banir conta"/"Levantar banimento"; "mudar role" é um toggle fixo entre o role atual e o outro (nunca um `<select>` com `ADMIN` como opção), pedindo `professionalType` (`SINGULAR`/`COMPANY`) apenas ao promover `CLIENT` → `PROFESSIONAL`. Confirmação em duas etapas antes de cada ação, mesma convenção de "Apagar conta" em `Profile.tsx`. **"Revogar sessões" não implementado — removido do escopo desta entrega.** O desenho original assumia um endpoint de sign-out por ID de utilizador; o SDK do Supabase Auth instalado (`GoTrueAdminApi.signOut(jwt, scope)`) exige o JWT da sessão a terminar, não um ID, e não há alternativa nesta versão (ver TRD do backend, Adendo v1.9, item G, para o detalhe completo). `ban`/`unban` já cobrem o caso de uso de segurança na prática. `tsc -b`/`vite build`/`eslint` limpos; sem validação interativa em browser; sem suite de testes automatizados configurada neste frontend.

**Critério de entrega correspondente:** ver `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 8.

### B. Diretório de utilizadores e ficha individual

**Problema:** não existe hoje nenhum endpoint nem tela que liste todos os utilizadores da plataforma — `GET /admin/kyc` só devolve quem submeteu KYC, não é um diretório geral.

**Decisão:**
- `GET /admin/users` (novo) — paginado, filtros por `role`, pesquisa por `full_name`/`phone` (`ilike`), `province`. Devolve os mesmos campos de `PROFILE_COLUMNS` (sem `bi_document_url`, que não é campo de `users_profile`).
- `GET /admin/users/:id` (novo) — ficha individual: perfil completo + estado do KYC mais recente (join com `professional_kyc`) + contagem de pedidos de serviço como cliente e como profissional. Subscrição fica de fora (Adendo, nota final).
- Frontend: `pages/AdminUsers.tsx` (lista + pesquisa) e `pages/AdminUserDetail.tsx`, com um link "Ver histórico" que abre `/admin/audit-log?user_id=<id>` — exige estender `services/auditLog.ts` do frontend para aceitar `user_id` (o backend já aceita, só o frontend restringiu a `action`/`success` na Fase 4 original, por decisão de âmbito, não de limitação técnica).

### C. Visão administrativa de pedidos de serviço

**Problema:** um `CLIENT` só vê os próprios pedidos, um `PROFESSIONAL` só vê os `OPEN` perto de si — não há nenhuma visão "todos os pedidos da plataforma", necessária para detetar abuso (spam de pedidos, cancelamentos repetidos) ou resolver uma disputa.

**Decisão:**
- `GET /admin/service-requests` (novo) — paginado, filtros por `status`/`province`/intervalo de datas, sem o âmbito de `client_id ilha` que os endpoints existentes têm.
- Timeline de um pedido específico: reaproveita `GET /admin/audit-log?entity_type=service_requests&entity_id=<id>` (já suportado, ver nota do topo) — sem endpoint novo, só a tela.
- `POST /admin/service-requests/:id/cancel` (novo, override de admin) — cancela um pedido preso ou abusivo independentemente de quem é o dono. Reaproveita `cancelServiceRequest` do service (já genérico); a verificação de "só o dono cancela" que existe em `serviceRequestController.ts` fica só no controller do endpoint do cliente, não se aplica a este.

### D. Métricas agregadas (sem componente financeiro)

**Decisão:** `GET /admin/metrics` (novo, um único endpoint) devolvendo:
- Utilizadores por `role`, signups nos últimos 30 dias agregados por dia.
- Funil de KYC: contagem por `status`, tempo médio entre `created_at`... **nota:** `professional_kyc` não tem `created_at` própria hoje (só `verified_at`, preenchido só na revisão) — calcular "tempo médio até decisão" exige ou adicionar essa coluna (migration) ou aceitar que só se mede a partir de quando existe outra referência temporal. Decisão a tomar ao desenhar o endpoint, não assumida aqui.
- Profissionais ativos por `province` (conta profissionais com `role = 'PROFESSIONAL'` agrupados por província — cobertura geográfica, relevante para um marketplace hiperlocal).
- Pedidos de serviço por `status`, tempo médio `created_at` → `assigned_at` e `assigned_at` → `completed_at`.

**Fora desta fase, deliberadamente:** MRR, receita, qualquer métrica de `subscriptions` — a tabela não existe (Fase 5).

### E. Alertas de segurança sobre o audit log

**Decisão:** `GET /admin/security-alerts` (novo) — agrega `audit_log` onde `success = false`, agrupado por `user_id`/`ip_address`, numa janela (ex. últimas 24h), com um limiar (ex. 5+ tentativas) para aparecer como alerta. Reaproveita a tabela existente, sem schema novo.

### F. Ferramentas operacionais

**Decisão:**
- `POST /admin/users/:id/resend-email` (novo) — body `{ template: 'welcome' | 'kyc_aprovado' | 'kyc_rejeitado' }`, reaproveita `EmailService`/`CatalogoTemplatesEmail` já existentes (Adendo v1.7). Para `kyc_rejeitado`, vai buscar o `review_notes` mais recente de `professional_kyc`.
- **Log de entrega de email consultável:** hoje só existe `console.info`/`console.error` (`[email:enviado]`/`[email:falha]`), que não é pesquisável em produção. Decisão: `EmailService.enviar` (privado) passa a chamar também `writeAuditLog` (Adendo v1.8) com `action: 'EMAIL_SENT'`/`'EMAIL_FAILED'` e `metadata: { template, destinatario }` — reaproveita a tabela já existente em vez de criar uma nova só para isto. Acopla `services/email/` a `services/auditLogService.ts`, uma dependência nova entre os dois módulos, deliberada e pequena.

### G. Moderação de contas

**Decisão:**
- `POST /admin/users/:id/ban` / `POST /admin/users/:id/unban` (novos) — usam a capacidade nativa do Supabase Auth (`auth.admin.updateUserById(id, { ban_duration })`; `unban` usa `ban_duration: 'none'`, valor documentado no próprio SDK para levantar o banimento), sem campo novo em `users_profile`.
- **`POST /admin/users/:id/sign-out` não foi implementado — removido do escopo desta entrega.** O desenho original assumia `auth.admin.signOut(id, 'global')`, mas a assinatura real do SDK instalado (`@supabase/auth-js`, `GoTrueAdminApi.signOut(jwt: string, scope?)`) exige o **JWT da sessão a terminar**, não o ID do utilizador — o backend nunca tem esse JWT em mãos numa acção de moderação disparada pelo admin sobre outra conta. Não existe, nesta versão do SDK, um método para revogar sessões por ID de utilizador. Na prática, `ban` já cobre o caso de uso de segurança: um utilizador banido falha em qualquer novo login e em qualquer renovação de refresh token, pelo que uma sessão activa deixa de conseguir renovar o `access_token` (validade curta, configurada no projecto Supabase) assim que expirar. Revogação imediata do `access_token` já emitido fica deliberadamente fora do escopo — exigiria denylist própria de tokens, não suportada nativamente. Reavaliar se um incidente real exigir revogação instantânea.
- `PATCH /admin/users/:id/role` (novo) — **restrito a `CLIENT ↔ PROFESSIONAL`, nunca aceita `'ADMIN'` como valor de entrada.** Promover a `ADMIN` continua deliberadamente fora da API, só por `UPDATE` direto com a `service_role` key (TRD Secção 7) — um endpoint que aceitasse promover a `ADMIN` seria uma escalação de privilégio alcançável por qualquer `ADMIN` comprometido; manter esse caminho fechado é a mesma lógica já aplicada à trigger de signup (Adendo v1.4, item E: nunca aceita `'ADMIN'` vindo do próprio utilizador).
- **Reversão de decisão de KYC (`APPROVED`/`REJECTED` → o estado oposto) — não desenhada nesta entrega.** `reviewKyc` faz hoje um update condicional `WHERE status = 'PENDING'`, por desenho (Adendo, Fase 4): permitir reverter uma decisão já tomada tem consequências em cascata que não foram pensadas (um profissional já aprovado pode ter subscrição ativa e pedidos aceites) — fica registado como extensão futura, a desenhar com uma regra de negócio explícita antes de implementar, não uma simples remoção da condição do `WHERE`.

**Fora desta fase, deliberadamente (depende da Fase 5, que ainda não existe):** gerir subscrições (ativar/desativar/prolongar manualmente), histórico de transações, receita. Quando a Fase 5 for implementada, isto entra como extensão a este Adendo ou um Adendo próprio — decisão nessa altura, não agora.

**Critérios de entrega correspondentes:** ver `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`, nova Fase 9.

---

## Adendo v1.10


### A. Middleware de validação Zod centralizado

**Contexto:** pedido explícito do utilizador durante revisão de código do `adminUserController.ts` — cada controller fazia `schema.safeParse(req.body|req.query)` seguido de `if (!parsed.success) { res.status(400)... }` inline, repetido em 9 ficheiros (`adminUserController`, `adminSecurityAlertController`, `auditLogController`, `authController`, `geocodingController`, `kycController`, `professionalController`, `profileController`, `serviceRequestController`). Não era um desvio isolado — era a convenção estabelecida em todo o projeto (Secção 1 deste documento: "Validação de entrada com Zod, na fronteira (controller), nunca no service") — mas o próprio padrão repetido justificava extrair a mecânica de `safeParse` + resposta 400 para um único ponto, sem sair da fronteira do controller (o schema continua definido e exportado pelo controller; só a aplicação do `safeParse` sai dele).

**Decisão:** middleware `validate(schema, source, message)` (`src/middlewares/validate.ts`), aplicado nas rotas entre `requireAuth`/`requireRole` e o controller — não dentro do controller. Populamento em `req.validated.body` / `req.validated.query` (novo campo, `declare module 'express-serve-static-core'`, mesmo padrão de `req.user` em `auth.ts` e `req.auditContext` em `middlewares/auditLog.ts`), nunca sobrescrevendo `req.body`/`req.query` diretamente — decisão explícita para não mascarar defaults/coerções do Zod (ex. `limit` vira `number`) como se fossem o corpo bruto do pedido, o que confundiria quem lê o handler sem saber que passou por um middleware.

`message` aceita uma string fixa (14 dos 15 pontos de validação migrados) ou uma função `(error: ZodError) => string` — necessário para preservar o único outlier identificado: `kycController.makeReviewKyc` expunha `parsed.error.errors[0]?.message` para devolver a mensagem custom do `.refine()` de `reviewKycSchema` ("review_notes é obrigatório ao rejeitar uma submissão KYC.") em vez de uma string genérica. Sem este modo função, a migração teria regredido esse comportamento observável pela API.

**Fora do âmbito do middleware, deliberadamente:** validações que dependem de mais do que o corpo/query do pedido (ex. `kycController.makeSubmitKyc` verifica que `bi_document_path` começa por `${req.user.id}/`, o que depende de `req.user`, preenchido por `requireAuth`) e verificações de ownership pós-parse (ex. `serviceRequestController` — só o `client_id` do pedido pode completá-lo/cancelá-lo) continuam no controller, porque não são validação de forma do payload — são regras de autorização/negócio.

**Critérios de entrega correspondentes:** ver `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`, secção "Manutenção Transversal".

---

## Adendo v1.11


### A. Hardening de segurança adiantado da Fase 6 (auditoria `appsec-health-audit`)

**Contexto:** pedido explícito do utilizador para correr uma auditoria de segurança fullstack completa (backend + frontend), fora do ciclo normal de revisão de PR — não uma revisão de diff, um raio-X do estado actual do codebase. A auditoria confirmou que a base de autenticação/autorização (JWT via JWKS/ES256, role lido de `users_profile`, verificação de ownership em KYC e service requests, update condicional atómico na atribuição de pedidos) já estava sólida, mas identificou quatro lacunas de configuração e dependências, corrigidas de imediato em vez de ficarem só registadas como pendência — o utilizador pediu explicitamente a correção de todos os achados, não só o diagnóstico.

**Decisão — quatro correções, cada uma commitada isoladamente na branch `fix/appsec-audit-hardening`:**

1. **`CORS_ORIGIN='*'` sem guarda de produção.** `loadEnv()` já recusava arrancar com `ENABLE_PAYMENT_MOCK=true` em produção, mas não tinha guarda equivalente para CORS aberto. Adicionada a mesma lógica: falha o arranque se `NODE_ENV=production` e `CORS_ORIGIN==='*'` (`src/config/env.ts`). Confirmado via `flyctl secrets list` que o valor já configurado em produção não é `*` (mesmo digest de `FRONTEND_URL`) — a guarda nova não bloqueia o próximo deploy.
2. **`nodemailer@6.10.1` com CVE de severidade high** (SMTP command injection via `envelope.size`, CRLF injection em headers, bypass de `disableFileAccess`/`disableUrlAccess` habilitando SSRF). Actualizado para `^10.0.10`. O uso em `src/lib/mailer.ts` é a API `createTransport` simples, sem `raw`/`jsonTransport` — sem alterações de código necessárias, `npm audit` limpo.
3. **Ausência de headers HTTP de segurança básicos.** Adicionado `helmet` em `src/app.ts`, com `contentSecurityPolicy: false` deliberado — esta API só devolve JSON, não renderiza HTML, por isso CSP (pensada para carregamento de recursos numa página) não se aplica; os restantes headers (`X-Content-Type-Options`, `X-Frame-Options`, HSTS) ficam activos.
4. **Rate limiting só existia em `/auth/password-recovery`**, já sinalizado no próprio código-fonte como dívida da Fase 6 (ver Critério de Entrega da Fase 6, adiantado no Adendo v1.7). Reutilizado `createRateLimitMiddleware` (`src/middlewares/rateLimit.ts`, genérico desde o v1.7) em `POST /service_requests` (20 pedidos/hora por utilizador autenticado) e `POST /kyc` + `/kyc/upload-url` (10 pedidos/hora por utilizador autenticado) — limite por `req.user.id`, não por IP, porque estas rotas já exigem `requireAuth`.

**Confirmado sem necessidade de correção:** `REDIS_URL` já está configurado e implantado em produção (`flyctl secrets list`), portanto o rate limiting acima já é partilhado entre instâncias Fly desde o primeiro deploy, não apenas em memória por processo.

**Frontend (repositório irmão, mesmo achado da auditoria):** CSP e headers de segurança (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) adicionados a `vercel.json` na branch `fix/appsec-audit-csp-hardening` — ver Adendo v1.11 equivalente em `docs/TRD_v1.1_Marketplace_Servicos_Locais_PWA.md` desse repositório.

**Fora do âmbito desta ronda, deliberadamente:** o restante checklist da Fase 6 (auditoria de RLS tabela a tabela, logging estruturado/Sentry, checklist OWASP API Top 10 completo) — a auditoria cobriu o que a skill `appsec-health-audit` varre (auth, RLS aplicável, tokens, rate limiting, CORS, segredos, dependências), não substitui a Fase 6 completa quando ela for atacada a sério.

**Critérios de entrega correspondentes:** ver `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`, Fase 6.

**Perspetiva do frontend — CSP e headers de segurança no `vercel.json`:**

**Contexto:** ver TRD do backend, Adendo v1.11 — auditoria de segurança fullstack (`appsec-health-audit`) pedida explicitamente pelo utilizador, cobrindo backend e frontend na mesma ronda. Identificou ausência de Content-Security-Policy e de headers HTTP básicos (`X-Frame-Options`, `X-Content-Type-Options`) neste repositório.

**Decisão:** bloco `headers` adicionado a `vercel.json` (branch `fix/appsec-audit-csp-hardening`), aplicado a todas as rotas (`source: "/(.*)"`):
- `Content-Security-Policy`: `default-src 'self'`, scripts/estilos/fontes restritos a `'self'` (`style-src` inclui `'unsafe-inline'` como precaução — sem inline styles no código actualmente, mas Tailwind/Framer Motion podem gerar estilo em runtime dependendo da versão), `img-src` permite `https:`/`data:` (avatares e uploads podem vir de qualquer storage), `connect-src` restrito a `'self'`, `https://*.supabase.co` (API/Auth do Supabase) e `https://*.fly.dev` (API do backend), `frame-ancestors 'none'` (protecção contra clickjacking).
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.

**Verificado antes de aplicar:** sem `dangerouslySetInnerHTML` no código (`grep` confirmou zero ocorrências), sem scripts/fontes externas hardcoded em `index.html`, `npm run build` limpo com a alteração.

**Pendência explícita:** o header CSP só é aplicado pelo Vercel em produção/preview, não pelo `vite dev` local — por não haver ambiente de preview acessível nesta sessão, a validação de que nenhuma chamada legítima é bloqueada pela CSP fica para o primeiro deploy real, antes de mergear para `main`.

**Critério de entrega correspondente:** ver `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 7 (novo critério de entrega adicionado nesta ronda — a Fase 7 original já cobria validação de CORS/autenticação contra produção, mas não CSP/headers).

---

## Adendo v1.12

**Perspetiva do frontend:**

**Contexto:** ver TRD do backend, Adendo v1.12 — Fase 5 (subscrições e abstração de pagamentos). Esta secção resume só a perspetiva do frontend.

**Decisões com impacto no frontend (tomadas pelo utilizador, 29/09/2026):**
- **Aceitar pedidos exige KYC `APPROVED` e subscrição ativa.** "Pedidos perto de ti" continua a mostrar os pedidos a quem ainda não é elegível, mas bloqueia "Aceitar pedido" e explica o que falta, pela ordem real (primeiro KYC, depois subscrição).
- **Pagamento só depois do KYC aprovado.** O ecrã `/subscricao` não mostra o formulário de pagamento a quem ainda não tem o KYC aprovado — manda-o para a verificação de identidade.
- **Contacto do cliente só para o profissional atribuído**, e só enquanto o pedido está em curso. Novo ecrã `/trabalhos-aceites` (consome `GET /service_requests/assigned`); o contacto (`GET /service_requests/:id/contact`) só é pedido quando o profissional o abre.
- **Ativação manual pelo ADMIN** na ficha de utilizador, com nota obrigatória — é o caminho de produção enquanto não houver integração real M-Pesa/e-Mola (`payments_available: false` em `GET /subscriptions`, e o ecrã de subscrição explica que a ativação é feita pela equipa).

**Pagamento assíncrono:** `POST /subscriptions` devolve `202` (pedido enviado ao telemóvel, não pago). O frontend faz polling a `GET /subscriptions` a cada 3 s só enquanto a última transação está `PENDING` — nunca fora disso, para não gastar dados numa rede móvel.

**Fora do âmbito:** testes automatizados de UI (o repositório continuava sem test runner — introduzido depois, ver Adendo v1.14); histórico de pagamentos para o profissional; qualquer pagamento real.

**Critérios de entrega correspondentes:** ver `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 4.

### A. Subscrições e abstração de pagamentos (Fase 5)

**Contexto:** implementação da Fase 5 do plano (TRD Secção 4, Adendo v1.2 itens D e F). Três decisões de produto que o TRD não fechava foram tomadas explicitamente pelo utilizador antes da implementação (29/09/2026), registadas nos itens B a D abaixo.

**Decisão — arquitetura:**

- **`PaymentProvider`** (`src/services/payments/paymentProvider.ts`): `initiateSubscription`, `handleWebhook`, `checkStatus`, mais `gateways` (os gateways que o provider sabe cobrar). `initiateSubscription` recebe um objeto (`transactionId`, `userId`, `phone`, `amount`, `gateway`) em vez dos três argumentos posicionais da Secção 4: o gateway precisa do id da transação para o devolver no webhook, e a escolha M-Pesa/e-Mola faz parte do pedido. `handleWebhook` só traduz o payload do gateway para um evento normalizado (e, num gateway real, verifica a assinatura); a regra de negócio vive em `subscriptionService.ts` e não muda quando o gateway muda. `createPaymentProvider()` é o único sítio que decide o gateway ativo.
- **`MockPaymentService`**: gateways `MPESA_MOCK`/`EMOLA_MOCK`. Aprovação automática (Secção 4, "Fluxo de Mocks", passo 3) ao fim de `MOCK_PAYMENT_AUTO_APPROVE_MS` (5 s por omissão; 0 desliga), entregue pelo mesmo caminho do `POST /webhooks/payment` — não um atalho só do mock.
- **Tabela nova `payment_transactions`** (ver `Doc's/ESQUEMA_BASE_DADOS.md`): o "registo da transação pendente no Supabase" da Secção 4 não tinha onde viver no schema inicial.
- **Confirmação atómica** numa função SQL (`confirm_payment_transaction`): marcar a transação e ativar a subscrição acontecem juntas, e um webhook repetido (retry do gateway) é idempotente — `ALREADY_PROCESSED`, sem segundo período nem segundo email. **Renovação antecipada** soma ao período atual em vez de começar agora.
- **Preço** vem de `SUBSCRIPTION_PRICE_MZN` (Adendo v1.2, item F), 800 por omissão; duração fixa de 30 dias (Secção 4) em código.
- **Estado efetivo calculado por datas.** `GET /subscriptions` e a verificação de elegibilidade comparam `starts_at`/`expires_at` com a hora atual — uma subscrição vencida perde o acesso no segundo em que vence, não quando o job de expiração passar. **Tolerância de 5 minutos no início do período** (correção de 29/09/2026): o `starts_at` é o `now()` da BD e é comparado com a hora do processo; com o relógio do processo atrás do da BD, um pagamento acabado de confirmar vinha como `EXPIRED` e sem elegibilidade até o desvio passar. O resumo e a elegibilidade aceitam um `starts_at` até 5 minutos no futuro — a mesma regra nos dois. Uma renovação antecipada (início no fim do período atual) não é afetada, porque só existe enquanto há um período em vigor.
- **Job de expiração** (`src/jobs/subscriptionJobs.ts`, `setInterval` de hora a hora, arrancado em `index.ts`): `ACTIVE` → `EXPIRED` e aviso por email 3 dias antes (`enviarSubscricaoAExpirar`, preparado no Adendo v1.7). Idempotente com várias máquinas Fly. O email `enviarPagamentoConfirmado` sai de cada confirmação (webhook ou ativação manual).
- **Webhook sem autenticação de utilizador** (quem chama é o gateway) e **só registado com `ENABLE_PAYMENT_MOCK=true`** — sem a flag, `POST /webhooks/payment` é 404 (Adendo v1.2, item D). Um gateway real vai precisar de outra condição de registo e de verificação de assinatura dentro do seu `handleWebhook`.
- **Gate de CI:** `npm test` passou a correr em `ci.yml` e `deploy.yml` (antes só lint + build). Inclui um teste que falha se `fly.toml` ligar `ENABLE_PAYMENT_MOCK` ou deixar de definir `NODE_ENV=production` — o critério "teste automatizado falha o build/deploy" da Fase 5 não era cumprível enquanto os testes não corriam no pipeline.
- **Validação do telefone pagador:** número móvel moçambicano, normalizado para `258XXXXXXXXX`, e coerente com o gateway (Vodacom 84/85 → M-Pesa; Movitel 86/87 → e-Mola). Rate limit de 5 inícios/hora por utilizador (cada pedido dispara uma cobrança no telemóvel do pagador) e 409 se já houver um pagamento `PENDING` dos últimos 15 minutos.

### B. Contacto do cliente só para o profissional atribuído

`GET /service_requests/:id/contact` devolve nome, telefone e coordenadas exatas do cliente (TRD Secção 5) só se: quem pede é o `professional_id` do pedido; o pedido está `ASSIGNED`; e o profissional tem, **no momento do pedido**, KYC `APPROVED` e subscrição em vigor. **Decisão do utilizador:** não basta ser um profissional elegível qualquer — o cliente só expõe o contacto a quem aceitou o pedido. Até aqui nenhum endpoint devolvia o telefone ou as coordenadas do cliente a um profissional, por isso a regra da Secção 5 não tinha onde ser aplicada.

### C. Aceitar pedidos exige KYC e subscrição

`POST /service_requests/:id/assign` passa a devolver 403 (com a lista do que falta) a quem não tenha KYC `APPROVED` e subscrição em vigor. **Decisão do utilizador**, alinhada com o que a Fase 4 do plano do frontend já esperava. **Consequência em produção:** até existir um gateway real, só profissionais ativados manualmente (item D) conseguem aceitar pedidos.

### D. Ativação manual pelo ADMIN

`POST /admin/users/:id/subscription` (corpo: `note`, obrigatória — é a única prova do pagamento recebido por fora, e fica no audit log como `SUBSCRIPTION_ACTIVATE_MANUAL`). Gateway `MANUAL` (já existia no enum), sem telefone pagador, mesmo preço configurado, mesma confirmação atómica e mesmo email de um pagamento online. **Decisão do utilizador:** em produção não há gateway (`ENABLE_PAYMENT_MOCK` não pode estar ligada e não existe ainda integração M-Pesa/e-Mola), e sem isto nenhum profissional conseguiria aceitar pedidos (item C). Em produção, `POST /subscriptions` responde 503 e `GET /subscriptions` devolve `payments_available: false`, para o frontend explicar que a ativação é feita pela equipa.

### E. RLS de `service_requests` corrigida

A policy "profissional le pedidos abertos" (schema inicial) concedia `SELECT` sobre todos os pedidos `OPEN` — com a `location` exata — a qualquer role, incluindo a `anon` key sem sessão, o que contradizia a Secção 5. Removida na migration desta fase; o frontend não lê a tabela diretamente, não há fluxo afetado. As duas RPC novas têm `EXECUTE` revogado a `anon`/`authenticated`.

### F. Pagamento só depois do KYC aprovado

**Contexto:** na primeira versão desta fase, um profissional podia pagar a subscrição antes de o KYC estar decidido — e ver a identidade rejeitada a seguir, com o dinheiro já recebido por um serviço que não pode usar. **Decisão do utilizador (29/09/2026):** primeiro a verificação, depois o pagamento. `POST /subscriptions` devolve 403 a quem não tenha KYC `APPROVED` (sem submissão, `PENDING` ou `REJECTED`), **antes** do 503 de "sem gateway" — em produção, quem ainda não foi verificado tem de saber isso primeiro. A ativação manual pelo ADMIN (item D) aplica a mesma regra (409): aceitar um pagamento por fora também é aceitar um pagamento. `GET /subscriptions` passa a incluir `kyc_approved`, para o ecrã de subscrição decidir o que mostrar sem uma segunda chamada.

### G. Endpoints de leitura para o frontend

Surgidos ao implementar o consumo desta fase no frontend: `GET /service_requests/assigned` (pedidos aceites pelo profissional autenticado, qualquer estado, mais recentes primeiro — o único caminho de volta a um pedido aceite, e portanto ao contacto do item B) e `GET /admin/users/:id/subscription` (o resumo de `GET /subscriptions` para qualquer profissional, só `ADMIN` — o admin precisa de ver o estado antes de ativar manualmente).

**Fora do âmbito, deliberadamente:** integração real com M-Pesa/e-Mola; reconciliação periódica via `checkStatus` (existe na interface, nada a chama ainda); desativar ou reembolsar uma subscrição paga; UI de ativação manual no painel de admin.

**Critérios de entrega correspondentes:** ver `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`, Fase 5.

---

## Adendo v1.13


### A. Redesign de UI com a identidade visual da marca — pedido do utilizador, sem componente no backend

**Contexto:** a UI da Fase 1–4 usava o cinzento neutro do template (`gray-900`). O utilizador pediu um redesign com a identidade da marca (branch `feat/redesign-ui-premium`), antecipando parte do polimento visual previsto na Fase 6.

**Decisões:**
- **Paleta e tipografia no `tailwind.config.js`:** cores `piquete-*` (azul `#031F4B`, amarelo `#FFC700`, cinza `#8A8D91` e variantes), `font-sans` Inter e `font-heading` Outfit, sombra `shadow-card`. `theme_color` do manifest e do `index.html` passam a `#031F4B`.
- **Componentes partilhados em `src/components/ui/`:** `Button` (variantes `primary`/`secondary`/`outline`/`danger`, `isLoading` com spinner e botão desactivado), `Input` (label ligada ao campo por `htmlFor`/`useId`, `aria-invalid`, texto a 16 px para evitar o zoom automático do iOS ao focar) e `Card`. Migrados: `Login`, `Home`, `FindProfessionals`, `LocationForm` e os dois passos do onboarding. Os ecrãs vindos da Fase 4 (subscrição, trabalhos aceites, KYC) e o painel de admin ainda usam o estilo antigo.
- **Fontes alojadas no bundle (`@fontsource/inter`, `@fontsource/outfit`), e não via Google Fonts:** a CSP do Adendo v1.11 (`style-src`/`font-src 'self'`) bloquearia `fonts.googleapis.com`/`fonts.gstatic.com` sem erro visível, e offline a PWA perderia a tipografia. Só o subconjunto `latin` e os pesos usados (Inter 400–700, Outfit 500–800), importados em `src/main.tsx`; `woff2` acrescentado ao `globPatterns` do Workbox para entrar no precache. Duas dependências novas, sem custo de runtime além dos ficheiros de fonte.
- **Ícones PWA:** o logótipo fornecido (`public/pwa-icon.png`) é horizontal (1024×343) e não serve de ícone — declarado como 192/512, o Chrome rejeita-o. Gerados a partir do escudo do logótipo: `pwa-192x192.png`, `pwa-512x512.png` (transparentes), `pwa-maskable-512x512.png` (escudo dentro da zona segura de 80 %, fundo branco) e `apple-touch-icon.png` (180 px, fundo opaco — o iOS pinta a transparência de preto). Manifest único, gerado pelo `vite-plugin-pwa`.
- **Viewport sem `user-scalable=no`/`maximum-scale`:** bloquear o zoom falha WCAG 1.4.4 (Secção 5 do `CLAUDE.md`).

**Verificado:** `tsc --noEmit`, `eslint` e `npm run build` limpos. **Não verificado:** Lighthouse PWA/Accessibility, e validação visual em dispositivo real.

**Critério de entrega correspondente:** ver `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 6.

---

## Adendo v1.14

### A. Testes automatizados no frontend — pedido do utilizador, sem componente no backend

**Contexto:** até 29/09/2026 o frontend não tinha test runner — decisão explícita de não o introduzir na entrega da Fase 4, que deixou por cumprir o critério "testes cobrem os três estados de KYC e os três estados de subscrição" (ver também Adendo v1.12, perspetiva do frontend, "Fora do âmbito"). O utilizador pediu para o fechar.

**Decisões:**
- **Vitest + Testing Library + jsdom** (`vitest`, `@testing-library/react`, `@testing-library/dom`, `jsdom`), só em `devDependencies` — não entram no bundle da PWA (confirmado: nenhum código de teste em `dist/`). Vitest é o mesmo runner do backend e reutiliza a transformação do Vite.
- **`vitest.config.ts` separado de `vite.config.ts`**, sem o `vite-plugin-pwa` (geraria service worker e manifest a cada arranque da suite). Define valores falsos para `VITE_API_URL`/`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`: `src/lib/supabase.ts` cria o cliente no import e rebenta sem URL; os testes nunca fazem pedidos de rede.
- **Os hooks do TanStack Query são simulados** (`vi.mock('../hooks/...')`): os testes cobrem o que cada ecrã mostra e o que envia para cada estado devolvido pela API, não o transporte — esse fica para validações contra o backend real (ver validação no browser da Fase 4, no plano do frontend).
- **Sem `@testing-library/jest-dom`** nem `user-event`: as asserções usam só `vitest` e `fireEvent`, uma dependência a menos para o que os testes atuais precisam.
- **`npm test` no CI** (`.github/workflows/ci.yml`, entre lint e build), mesmo padrão do backend (Adendo v1.12, item A, "Gate de CI").

**Cobertura inicial:** `src/pages/Kyc.test.tsx` (5 testes) e `src/pages/Subscription.test.tsx` (10 testes). Os restantes ecrãs continuam sem testes automatizados.

**Critérios de entrega correspondentes:** ver `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 4 (e a nota na Fase 1).

---

## Adendo v1.15

**Contexto:** Fase 6 do plano do backend (Segurança, RLS completo e hardening), 29–30/09/2026. Uma revisão dos endpoints contra a Secção 5 e uma verificação da RLS contra a produção encontraram uma falha crítica (item A) e várias exposições de dados (itens C e D). Decisão do utilizador para os logs: JSON no stdout lido pelos logs do Fly, sem serviço externo (item B).

### A. RLS: escritas diretas fechadas e verificação por role

**Falha crítica, confirmada em produção a 29/09/2026 com uma conta descartável e corrigida no mesmo dia:** com a anon key (pública, vai no bundle do frontend) e a própria sessão, qualquer utilizador conseguia, pela API do PostgREST, **promover-se a ADMIN** (`UPDATE users_profile set role = 'ADMIN'` — a policy "utilizador atualiza o proprio perfil" não restringia colunas, e `requireRole` lê precisamente essa coluna), **auto-aprovar o KYC** (a policy de insert não limitava `status`) e **criar pedidos com estado arbitrário**. Sem sinais de exploração: à data havia uma só conta ADMIN (a real, de 17/09) e nenhum KYC nem pedido.

**Decisão:** o frontend não escreve em tabelas diretamente (só no Storage) — todas as escritas de negócio passam pelo backend, com a service_role. Por isso as policies de escrita saíram em vez de serem corrigidas (`20260929150000_fecha_escritas_diretas_rls.sql`), com `REVOKE INSERT, UPDATE, DELETE` a `anon`/`authenticated` nas tabelas de negócio como segunda camada — uma policy de escrita acrescentada no futuro por engano não chega para reabrir a porta. Saiu também "profissional atribuido le o pedido", que dava a `location` exata do pedido ao profissional atribuído sem verificar KYC/subscrição e depois de o pedido estar concluído (a regra vive em `GET /service_requests/:id/contact`). As policies de leitura do próprio registo ficam.

**RPC:** `EXECUTE` só para a service_role em todas as funções chamadas pelo backend (`find_nearby_*`, `admin_metrics`, `admin_security_alerts`, `get_profile_coordinates`, além das da Fase 5) — o Postgres dá-o a `PUBLIC` por omissão a uma função nova (`20260929160000`, `20260930090000`).

**Verificação:** `npm run verificar:rls` (`scripts/verificar-rls.ts`) cria contas descartáveis (anon, CLIENT, PROFESSIONAL, ADMIN) e dados de terceiros, tenta com a anon key cada leitura, cada escrita direta, cada RPC e o Storage, compara com o esperado e apaga tudo. Não corre no CI (precisa do projeto real e das chaves); corre-se à mão depois de qualquer migration que mexa em policies, grants ou funções. Resultado a 30/09/2026, com as três migrations aplicadas: **64/64**.

### B. Erros centralizados e logs estruturados

- **Logger** (`src/lib/logger.ts`): uma linha JSON por evento (`nivel`, `mensagem`, `hora`, contexto) no stdout/stderr, lida com `flyctl logs`. Sem serviço externo — nenhum dado de erro sai para terceiros e não há custo; em troca, não há alertas automáticos. Não leva dados pessoais (item D). Todos os `console.*` do código passaram por ele.
- **`contextoDoPedido`** (`src/middlewares/errorHandler.ts`, o primeiro middleware): id por pedido no header `X-Request-Id`, presente nas linhas de log sobre ele. Qualquer resposta **500** com o envelope de erro sai com uma mensagem genérica e a mensagem original vai só para o log — ~40 caminhos devolviam a mensagem crua do Postgres (ex. `invalid input syntax for type uuid`). A regra vive num só sítio em vez de nos 43 controllers. O 503 não é tocado: leva mensagens para o utilizador (ex. pagamentos indisponíveis).
- **`rotaNaoEncontrada`** e **`tratarErro`** (os últimos): rota inexistente → 404 no envelope JSON (antes, a página HTML do Express); corpo JSON malformado → 400; demasiado grande → 413; exceção → 500 genérico, registada com o stack.
- `GET /health` deixa de devolver o `detail` do Supabase (é público); vai para o log.
- **Limite conhecido:** no Express 4, uma exceção dentro de um handler async não chega a `tratarErro`. Os handlers deste projeto devolvem os erros dos services em vez de os lançar, e `index.ts` regista `unhandledRejection` (e termina em `uncaughtException`, para o Fly arrancar uma máquina nova).

### C. Buscas por proximidade sem a localização exata de terceiros

`distance_m` saía em metros exatos a partir de uma origem escolhida por quem pede: com três origens (ou movendo a origem até o valor mudar) calculava-se a morada de um cliente — que a Secção 5 reserva ao profissional atribuído e elegível — ou a posição de um profissional. E `GET /service_requests/nearby` estava aberto a qualquer utilizador autenticado, incluindo CLIENT.

**Decisão (três coisas juntas — cada uma sozinha não chega):** nas funções SQL, a origem é encaixada numa grelha de 0,005° (~500 m) e a distância sai arredondada para cima a múltiplos de 500 m (nunca 0); no controller, o raio só aceita km inteiros (um raio decimal permitia pesquisa binária sobre a fronteira do `ST_DWithin`). A ordenação continua pela distância real. Verificado a 30/09/2026: distâncias em múltiplos de 500 m, e deslocar a origem 100–150 m não muda o resultado.

Além disso: `/service_requests/nearby` passa a exigir `PROFESSIONAL` e deixa de devolver `client_id` (não é preciso para aceitar e permitia correlacionar pedidos de um mesmo cliente); rate limit por utilizador nos dois `/nearby` (60/min em `/professionals/nearby`, 30/min em `/service_requests/nearby`) — por utilizador e não por IP, porque as rotas exigem sessão e muitos utilizadores partilham o IP atrás do NAT de um operador móvel.

**Registo de contas:** passa pelo Supabase Auth, não pelo backend — o limite é o do painel do Supabase (Authentication → Rate Limits), não código deste repositório.

### D. Dados pessoais fora das respostas e do audit log

- `GET`/`POST /kyc` (o próprio profissional) deixam de devolver `bi_document_url` (documentos só para ADMIN) e `reviewed_by` (o UUID do admin revisor). Os endpoints `/admin/kyc` continuam completos.
- O `audit_log` sobrevive à eliminação da conta (`user_id` sem FK, de propósito — Adendo v1.8), por isso passou a ser o único sítio onde dados pessoais ficariam depois dela, contra o Adendo v1.4 D. Deixa de guardar BI, NUIT, telefone, coordenadas e emails em claro: guarda os **nomes** dos campos alterados, o tipo de captura da localização, e uma **impressão** do email (`src/lib/impressaoEmail.ts`, 16 caracteres de SHA-256 do email normalizado) — chega para ver tentativas repetidas contra o mesmo endereço, e quem conhece o email confirma um envio calculando a impressão. O mesmo nos logs.

### E. OWASP API Security Top 10 (2023) — revisão

| Risco | Estado | Onde |
|---|---|---|
| API1 Autorização ao nível do objeto | Coberto | Ownership em `assign`/`complete`/`cancel`/`contact`; RLS verificada por role (item A) |
| API2 Autenticação | Coberto, com limite | JWT ES256 via JWKS; rate limit na recuperação de password; ban. Limite: um access token emitido antes do ban vale até expirar (Adendo v1.9 G) |
| API3 Autorização ao nível da propriedade | Coberto | Zod na fronteira (só os campos permitidos passam); `role` só por endpoints próprios; exposição de campos corrigida (itens C, D) |
| API4 Consumo de recursos | Coberto | Rate limits (criação de pedidos, KYC, subscrições, recuperação, `/nearby`); `limit` ≤ 50; corpo JSON ≤ 100 kB |
| API5 Autorização ao nível da função | Coberto | `requireRole` em todos os `/admin/*`, com teste de 403 |
| API6 Fluxos de negócio sensíveis | Coberto | Aceitar pedidos exige KYC + subscrição; pagamento só com KYC; mock de pagamento impossível em produção (Adendo v1.2 D) |
| API7 SSRF | Coberto | O backend só chama a Google Geocoding API com URL fixo; `avatar_url` validado contra o bucket do projeto |
| API8 Configuração de segurança | Coberto | `helmet`; CORS explícito (`*` recusado em produção); erros genéricos (item B); escritas diretas fechadas (item A) |
| API9 Inventário da API | **Em falta** | Sem documentação OpenAPI — critério da Fase 7 |
| API10 Consumo inseguro de APIs | Coberto | Respostas do Google tratadas por `types` e com fallback; nenhuma falha externa bloqueia o fluxo principal |

**Pendente, não bloqueante:**
- Validar `:id` como UUID (hoje um id malformado dá 500 genérico, sem fuga — devia ser 400). Adiado: obriga a reescrever fixtures de teste que usam ids como `req-1`.
- O webhook do mock de pagamento não tem autenticação por desenho: em qualquer ambiente com `ENABLE_PAYMENT_MOCK=true` um profissional pode confirmar o próprio pagamento. Aceitável em dev/staging; um gateway real tem de verificar a assinatura.
- Política de retenção do `audit_log` (Adendo v1.8).

**Perspetiva do frontend:** só tipos — `OwnKyc` (sem `bi_document_url`/`reviewed_by`) para `GET`/`POST /kyc`, e `NearbyServiceRequest` sem `client_id`. Nenhum ecrã usava os campos retirados; os sliders de raio já só enviavam inteiros. Um 500 passa a trazer sempre a mesma mensagem genérica, que o interceptor mostra tal como vem.

**Critérios de entrega correspondentes:** ver `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`, Fase 6.

---

## Adendo v1.16

### A. Simplificação do ecrã de perfil e gravação automática da localização — pedido do utilizador, sem componente no backend

**Contexto:** depois do redesign de `feat/redesign-tela-perfil` (Adendo v1.13), o utilizador pediu, por iterações sucessivas de feedback sobre capturas de ecrã reais (mobile e desktop), uma simplificação adicional de `Profile.tsx` — menos elementos, ações de conta consolidadas, e captura de localização num só toque.

**Decisões:**
- **Removidos:** badges flutuantes de contagem de pedidos/concluídos sobre a foto, estrelas de avaliação (fixas, nunca refletiam dados reais), selo de "verificado", label "Conta: Cliente" (redundante com o que já era editável) e os botões "Editar" e "Solicitar Novo Serviço" (considerado desnecessário nesta tela — o CTA de pedir serviço já existe noutros ecrãs).
- **Ações de conta consolidadas:** editar nome/telefone, mudar password e remover foto passam todas a estar atrás de um único ícone de definições (engrenagem), em vez de três entradas separadas; um ícone de câmara ao lado dispara o upload de foto diretamente.
- **Layout responsivo:** em mobile o ecrã ocupa o espaço todo, sem margens laterais nem cantos arredondados (pedido explícito — "não pode haver espaços em branco no lado"); a partir do breakpoint `sm:` o cartão fica flutuante sobre a página branca. Foi tentado um tratamento de modal com fundo escurecido no desktop, inspirado no perfil de artista do Spotify — **revertido a pedido do utilizador**: além de não agradar visualmente, a combinação `position: fixed` + scroll interno + animação de escala (`animate-fade-in`) coincide com um bug de repintura conhecido no Chrome, e terá contribuído para um efeito "fantasma" (texto e ícones sobrepostos/pouco nítidos) relatado numa das iterações.
- **`BackButton` (`src/components/BackButton.tsx`) ganhou um `className` opcional**, com o valor por omissão preservado (cinzento, para cabeçalhos em fundo branco) — necessário porque o ícone ficava invisível sobre a foto escura do cabeçalho de `Profile.tsx`, que passa `text-white`. Os outros 12 ecrãs que usam `<BackButton />` sem argumentos não mudam.
- **`LocationForm` — mudança de comportamento, aplica-se a todos os consumidores do componente partilhado (`Profile.tsx` e `pages/onboarding/CompleteLocation.tsx`):** o botão "Usar a minha localização (GPS)" e o passo de confirmação ("Localização encontrada" + "Confirmar esta localização" + "Localização atualizada com sucesso!") foram removidos. Um único toque num ícone de localização obtém o GPS e grava de imediato assim que a geocodificação reversa termina (sucesso ou erro) — sem exigir um segundo toque. A gravação espera a geocodificação reversa responder para não perder `province`/`district`/`neighborhood` (mesma lógica de enriquecimento do Adendo v1.4 G), mas nunca bloqueia indefinidamente: um erro da geocodificação também desbloqueia a gravação.
- **CTA "Fazer o Meu Primeiro Pedido"** (histórico de pedidos vazio) passa de botão com texto a um ícone "+" sólido, redondo, com fundo amarelo.

**Verificado em cada uma das iterações desta entrega:** `tsc -b`, `eslint` e `vite build` limpos; os 15 testes Vitest existentes (`Subscription.test.tsx`, `Kyc.test.tsx`, que não tocam nesta página) continuam a passar sem alteração. **Não verificado:** validação interativa em browser (sem ferramenta de automação disponível nesta sessão) — cada iteração foi validada pelo próprio utilizador por captura de ecrã direta, incluindo a deteção do problema de repintura do modal desktop que levou à reversão acima.

**Critério de entrega correspondente:** ver `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 6.

---

## Adendo v1.17

### Catálogo do Profissional (Bio, Portfólio & Avaliações) — requisito previsto na Secção 2 (linha 396) nunca implementado

**Contexto:** ao criar contas de profissional de teste para validar o login, o utilizador pediu para "editar o catálogo como profissional". Esclarecido por iteração directa com o utilizador que não se trata de categorias de serviço, mas de um perfil de profissional dentro da app — bio (como no Instagram), fotos dos trabalhos já feitos, e avaliações/comentários de clientes (geradas pelo sistema, não editáveis pelo profissional, mas exibidas no catálogo dele). Nada disto existe hoje em nenhum dos dois repositórios: confirmado por leitura directa do schema (`supabase/migrations/`) — não há coluna de bio, tabela de fotos de portfólio, nem qualquer tabela de avaliações; as "estrelas de avaliação" removidas do ecrã de perfil no Adendo v1.16 eram decorativas, nunca refletiram dados reais.

**Decisões (confirmadas com o utilizador):**

**A. Avaliação só por cliente com pedido CONCLUÍDO com esse profissional.** Uma avaliação (`service_reviews`) só pode ser criada a partir de um `service_request` com `status = 'COMPLETED'` e `client_id` igual ao autor — não um formulário aberto para "avaliar qualquer profissional". Motivo: avaliação verificada, ligada a uma transação real, evita avaliações falsas ou manipuladas. Uma avaliação por pedido (`UNIQUE(service_request_id)`); um cliente com vários pedidos concluídos com o mesmo profissional pode avaliar cada pedido uma vez.

**B. Catálogo só visível a utilizadores autenticados, sem link público.** Consistente com o resto do projecto desde a Fase 6 (Adendo v1.15, item A): nenhuma tabela de negócio tem leitura pública directa, tudo passa pelo backend com sessão. `GET /professionals/:id/catalog` exige `requireAuth`, sem excepção. Partilha pública (link sem login) fica fora de âmbito — pode ser revisitado como funcionalidade de marketing/aquisição no futuro, não implícito nesta entrega.

**C. Fotos de portfólio sem limite de quantidade nem moderação prévia.** Decisão explícita do utilizador, com o risco registado: sem limite de quantidade nem moderação por `ADMIN`, um profissional pode subir um número arbitrário de fotos e qualquer conteúdo (dentro do que a conversão de imagem aceita) fica visível de imediato a outros utilizadores autenticados, sem revisão. Mesma lógica de confiança já aplicada ao `avatar_url` (sobe e aparece de imediato). Se vier a ser necessário, um limite ou fila de moderação entra como extensão futura, não retroactiva.

**D. Todas as imagens de upload (avatar e, agora, fotos de portfólio) passam por conversão para WebP antes de chegarem ao Storage.** Pedido explícito do utilizador, pela poupança de espaço (ex. uma foto de 12 MB em JPG pode ficar entre 1–2 MB em WebP). **Já implementado desde a Fase 2** para o avatar (`src/lib/imageConversion.ts`, `convertToWebp` — Canvas API no browser, sem dependência externa, redimensiona ao maior lado a 1280px e aplica qualidade 0.85; GIFs animados e SVGs ficam de fora da conversão, de propósito, para não perder animação nem converter algo já pequeno/vectorial; cai de volta ao ficheiro original, sem bloquear o upload, se o browser não suportar `canvas.toBlob` com WebP). O código já tinha um comentário a prever esta reutilização — `src/services/portfolio.ts` (Fase 9 do frontend) reaproveita a mesma função, sem lógica nova. Conversão acontece no cliente (browser), antes do upload directo ao Supabase Storage — não no backend, porque o ficheiro nunca passa pelo servidor Node (mesmo padrão de upload directo do avatar, Fase 2). **Fora de âmbito:** documentos de KYC (bucket privado, prioridade é fidelidade legal do documento para revisão do admin, não poupança de espaço — não converter).

**E. Fora de âmbito desta entrega, registado como trabalho futuro:** resposta do profissional a uma avaliação; edição ou eliminação de uma avaliação já submetida (nem pelo cliente, nem pelo admin); filtrar `GET /professionals/nearby` por classificação média; moderação de fotos/comentários por `ADMIN`.

**Critérios de entrega correspondentes:** ver `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`, Fase 10, e `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 9.

---

## Adendo v1.18

### Busca por serviço, pedido a vários profissionais e propostas — o fluxo central do produto (PLANO, por aprovar)

**Contexto:** depois de testar o catálogo (Adendo v1.17), o utilizador descreveu o fluxo que o sistema deve ter: o cliente pesquisa um serviço ("canalizador") ou um nome; vê os profissionais desse serviço, **os próximos primeiro e depois os restantes**; abre o perfil; **escolhe pelo menos três** e envia-lhes o pedido; cada um responde com a sua proposta e o cliente fica com a melhor; o profissional é avisado **por email**; o cliente tem **histórico** dos profissionais com quem já trabalhou. Confirmado no código que nada disto existia: sem tipo de serviço por profissional, sem pesquisa por texto, a busca de proximidade corta num raio de 50 km, `POST /service_requests` não recebe profissional (o pedido é aberto e qualquer profissional o auto-atribui) e o único email é o de boas-vindas/KYC/pagamento.

**Decisões (do utilizador, salvo indicação):**

**A. Reverte duas decisões do Adendo v1.17.** O item D ("filtrar por categoria fica fora de âmbito") e a premissa de pedido aberto a qualquer profissional deixam de valer. O pedido passa a ser **dirigido a vários profissionais escolhidos pelo cliente** (decisão do utilizador: pedido a um só profissional "será muito raro"). O pedido aberto e `/pedidos-proximos` mantêm-se, mas não apanham pedidos com convites.

**B. Vários serviços por profissional, lista fixa e curada** (decisão do utilizador: "podemos pôr mais que um serviço"). Máximo 5 por profissional. Lista inicial (seed da migration; crescer é nova migration, não ecrã de admin): Canalização, Eletricidade, Pintura, Jardinagem, Limpeza Doméstica, Carpintaria, Climatização (AC/Refrigeração), Serralharia, Mudanças & Transporte, Informática & Eletrónica. A pesquisa casa texto com o nome do profissional, o nome da categoria e as **palavras-chave** da categoria (`service_categories.keywords`: "canalizador", "picheleiro", "encanador"… para Canalização), sem acentos nem maiúsculas, e também quando o texto contém uma palavra-chave de 5 ou mais letras ("canalizadores" encontra "canalizador"). As palavras-chave existem porque o cliente escreve a profissão e não o nome da categoria — sem elas, "canalizador" não encontrava "Canalização" (implementado no Bloco A da Fase 11, 05/10/2026).

**C. Exatamente três convites por pedido, logo no máximo três propostas** (decisão do utilizador, 06/10/2026: pediu "pelo menos três" a quem o cliente envia o pedido e depois "no máximo 3 propostas"; as duas frases juntas só se cumprem com três). Se a categoria tiver menos de 3 profissionais, o pedido vai a todos os que existirem. A constante vive num só sítio do backend (`INVITATIONS_PER_REQUEST`) — se o número mudar, muda-se numa linha. Substitui a versão anterior deste item ("pelo menos três, no máximo cinco", com o máximo como assunção minha).

**D. Proposta estruturada (preço + mensagem), sem chat.** "O cliente vai falar com os canalizadores em forma de buscar quem tem a melhor proposta" — **assunção a confirmar:** modela-se como uma proposta por convidado (preço em MZN + mensagem), que o cliente compara e escolhe; depois de escolhido, o cliente passa a ver o **telefone do profissional** (extensão da Secção 5: hoje só o profissional vê contacto do cliente) e continuam a falar fora da app. Chat in-app fica de fora — é uma funcionalidade à parte, e a proposta estruturada já dá a comparação de preços que o utilizador descreveu.

**E. Elegibilidade para propor = a de aceitar um pedido** (KYC `APPROVED` + subscrição `ACTIVE`, Adendo v1.12). A lista mostra todos os profissionais; um não elegível recebe o email mas não consegue responder, e o ecrã diz porquê. Contacto e morada exacta do cliente continuam só para o profissional **escolhido** e elegível.

**F. Notificações só por email** nesta fase (decisão do utilizador): `novoPedidoDeServico`, `propostaRecebida`, `propostaEscolhida`/`propostaNaoEscolhida`. Push/WebSocket fora de âmbito.

**G. Histórico do cliente:** lista dos profissionais com quem já teve pedidos concluídos (nº de trabalhos, último, avaliação dada) e atalho para voltar a pedir.

**H. Privacidade da localização — risco assumido com mitigação.** Pesquisar sem tecto de raio e por categoria facilita aproximar onde mora um profissional (o que o Adendo v1.15, item C, evitou). Mitigação: origem na grelha de ~500 m, distância dos não-próximos arredondada a km inteiro, nunca coordenadas, paginação com tecto e rate limit por utilizador. Revisitar se houver abuso.

**Por decidir ainda (não bloqueia o plano, mas convém confirmar):** modelo de proposta estruturada em vez de chat (D — implementado assim no Bloco B; a assunção mantém-se, sem confirmação expressa do utilizador); se o pedido aberto e `/pedidos-proximos` devem ser removidos no futuro (o ecrã de pesquisa já não cria pedidos abertos; só o endpoint e o ecrã de "pedidos perto de ti" continuam); expiração automática de convites sem resposta.

**Estado de implementação (06/10/2026):** Bloco A (serviços e pesquisa) em produção. Bloco B (pedido a 3 profissionais, propostas, escolha e emails) em produção (migration aplicada ao Supabase e deploy v41 no Fly, 06/10/2026). Bloco C (histórico do cliente): em produção (backend v42 no Fly e frontend em `main`, 07/10/2026) — — `GET /clients/me/professionals` (só `CLIENT`; profissionais de pedidos `COMPLETED` do próprio cliente, com nº de trabalhos, último trabalho e a avaliação que o cliente deu), sem migration nova; frontend em `/os-meus-profissionais`. Ver `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`, Fase 11.

**Extensão da Secção 5 (implementada no Bloco B):** o dono do pedido vê o nome e o telefone do profissional escolhido (`GET /service_requests/:id/professional`), e só depois de o escolher — antes disso o endpoint responde `409`, e nunca a outro cliente (`403`). O contacto e a morada exacta do cliente continuam reservados ao profissional escolhido, com KYC aprovado e subscrição ativa. O convite recebido por um profissional (email e ecrã) só leva o título, a descrição e a hierarquia de localização escrita pelo cliente.

**Critérios de entrega correspondentes:** ver `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`, Fase 11, e `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 10.


---

## Adendo v1.19

### Ecrã inicial (`Home`) redesenhado e decomposto — só frontend (07/10/2026)

**Contexto:** o utilizador pediu o refinamento do ecrã inicial a partir de capturas de uma plataforma de catálogo de referência: fundo branco, barra de navegação em largura total, barra de categorias em texto, linha de boas-vindas com os dados de quem entrou, cartões planos e carrosséis. O `Home.tsx` tinha crescido para um único componente de 860 linhas e foi decomposto. **Sem alteração de contrato, de API, de dependências ou de variáveis de ambiente** — não há componente de backend; esta cópia do TRD existe nos dois repositórios só porque os dois TRDs são mantidos idênticos.

**Decisões:**

**A. Estrutura.** `pages/Home.tsx` (~120 linhas) só compõe. A lógica vive em dois hooks — `hooks/useHomeUser.ts` (nome, localização e papel já prontos a apresentar) e `hooks/useHomeFeed.ts` (categorias, pesquisa, filtro e os grupos de cada carrossel) — e a apresentação em `components/home/`: `HomeHeader`, `CategoryFilter`, `HomeHero`, `HomeShortcuts`, `WorkSlider`, `WorkCard`, `SearchResults`, `SearchForm`, `NotificationButton`, `UserMenu`, `UserAvatar`. Os atalhos de cada papel são dados (`acoesRapidas.ts`) e os rótulos/ligações de cada papel estão num só sítio (`papeis.ts`). A largura da coluna de conteúdo (`layout.ts`, 105 rem) é partilhada pelo cabeçalho e pelo corpo para ficarem alinhados.

**B. Responsividade.** Mobile-first. O cabeçalho é uma única árvore DOM (antes havia um bloco para telemóvel e outro para desktop, com dois formulários de pesquisa e dois botões de notificações): o CSS Grid põe a pesquisa por baixo em ecrã estreito e ao centro a partir de `md`. Larguras dos cartões em fracção da fila (78 % no telemóvel, depois 2, 3, 4 e 5 por fila) em vez de pixéis fixos; alvos de toque de pelo menos 44 px (inclui a barra inferior); campo de pesquisa a 16 px no telemóvel (o iOS faz zoom abaixo disso); `min-h-dvh` e `env(safe-area-inset-bottom)` na barra inferior; `motion-reduce` nas animações; barra de categorias que centra quando cabe e desliza com o dedo quando não cabe.

**C. Menu do avatar.** O "Sair" só existia a partir de `md`; no telemóvel só se saía passando pelo perfil. O avatar abre agora um menu (perfil, a ligação do papel, "Sair") que serve todos os tamanhos. Padrão de botão com `aria-expanded` e painel de ligações, não `role="menu"`; fecha com Esc (devolvendo o foco), ao clicar fora e ao escolher uma opção.

**D. Correcções de comportamento.** (1) Os carrosséis completavam a fila com `concat(slice(...))`, repetindo o mesmo cartão — e o coração de um acendia o do outro; cada carrossel mostra agora só os trabalhos do seu tema e esconde-se se não tiver nenhum. (2) O toast de favoritos estava dentro do updater do `setState`, que o React corre duas vezes em StrictMode — duas notificações por toque; saiu para fora. (3) O ponto vermelho do sino estava sempre visível sem dados que o justificassem; **removido** até existir uma contagem real (para o profissional, os convites pendentes seriam a fonte natural — fica no backlog).

**E. Fundo.** O `body` é `gray-50` para os restantes ecrãs; a Home põe-no a branco enquanto está montada (e repõe o valor anterior ao sair), para não aparecer cinzento atrás do conteúdo no "rubber-band" do telemóvel nem quando o conteúdo é mais curto que a janela.

**F. Dados ainda fixos.** Os "trabalhos em destaque" continuam a vir de `src/data/featuredWorks.ts` (16 trabalhos com fotos do Unsplash; a CSP já permite imagens `https:`). **Para produção precisam de um endpoint do backend** (trabalhos concluídos e avaliados, por serviço) — por decidir e fora desta entrega. As categorias vêm da API com as de reserva como fallback.

**G. Removido.** `components/ServiceSearch.tsx` (campo de pesquisa + atalhos de categoria do Bloco A da Fase 10): deixou de ser usado — a pesquisa vive agora no cabeçalho (`SearchForm`, mesmo contrato: o texto viaja em `/profissionais?q=`, a categoria em `?category=`).

**Fora do cabeçalho de propósito:** a localização (já aparece na linha de boas-vindas, e a pesquisa ganhou o espaço) e o coração de favoritos (não existe ecrã de favoritos — seria um botão sem destino). Os favoritos continuam só em `localStorage`.

**Validação:** `tsc -b`, `eslint` (só o aviso pré-existente de `AuthContext.tsx`) e `vite build` limpos; Vitest 81 testes (eram 62): `useHomeFeed.test.ts` (8), `UserMenu.test.tsx` (7) e `useFavorites.test.ts` (4, incluindo o toast único em StrictMode). **Não verificado em browser nesta sessão** (sem ferramenta de automação); o utilizador viu e aprovou o aspeto no browser durante as iterações.

**Critérios de entrega correspondentes:** `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 6.


---

## Adendo v1.20

### Aviso de "nova versão" da PWA — só frontend (07/10/2026)

**Contexto:** depois do deploy da Home redesenhada (Adendo v1.19), o utilizador continuou a ver o ecrã antigo no site publicado, com o login por email e por Google. O Vercel servia a versão nova (confirmado a descarregar o bundle de produção); quem a escondia era o service worker da PWA no browser. **Sem alteração de API, de contrato ou de variáveis de ambiente**; sem componente de backend (cópia sincronizada por regra).

**Causa:** o `vite-plugin-pwa` estava em `registerType: 'autoUpdate'` com o registo automático por omissão, que não recarrega a página. A sequência real era: o service worker antigo serve o shell antigo; o novo descarrega em segundo plano; só um segundo carregamento mostra a versão nova — e quem deixa o separador ou a PWA instalada aberta nunca recarrega, ficando na versão antiga indefinidamente. Não é algo que o utilizador final deva resolver à mão (limpar dados do site, desregistar o service worker).

**Decisão:** `registerType: 'prompt'` e registo explícito em `main.tsx` (`virtual:pwa-register`, lógica em `src/lib/pwaUpdate.ts`). Quando há versão nova aparece um aviso persistente («Há uma nova versão disponível — Actualizar», `sonner`) e só ao aceitar é que o service worker novo é activado (`SKIP_WAITING`) e a página recarrega. **Alternativa rejeitada:** recarregar sozinho — apagaria um formulário a meio (pedido de serviço, KYC) a um utilizador em rede instável. Quem não aceita fica na versão actual, sem perder nada. **Verificação periódica** (de hora a hora, só com rede) com `registration.update()`, porque o browser só procura um service worker novo quando a página carrega.

**Notas:** (1) o registo passa a vir do bundle da aplicação e já não de um `registerSW.js` injectado; (2) `tsconfig.app.json` ganha `vite-plugin-pwa/client` nos tipos; (3) a **primeira** vez que esta versão chega a um browser que ainda tem o service worker antigo, o aviso não pode aparecer (o código antigo não o tem) — esses utilizadores precisam de um carregamento extra, uma única vez; a partir daí os avisos funcionam; (4) sem nova dependência.

**Validação:** `tsc -b`, `eslint` (só o aviso pré-existente de `AuthContext.tsx`) e `vite build` limpos (`sw.js` só chama `skipWaiting` na mensagem `SKIP_WAITING`, ou seja, não força a activação); Vitest 88 testes (eram 81): `pwaUpdate.test.ts` (7) — aviso só com versão nova, só actualiza se o utilizador aceitar, verificação periódica só com rede, falha de rede sem rejeição por tratar. **Não verificado num browser real:** o fluxo completo (aviso → Actualizar → recarga) só se vê com dois deploys seguidos.

**Critérios de entrega correspondentes:** `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 5.

---

## Adendo v1.21

### Ecrã de login redesenhado, em português, com regresso ao destino, página de termos e eliminação de conta — só frontend (07/10/2026)

**Contexto:** o utilizador pediu o redesenho do ecrã de autenticação (`feat/redesign-tela-login`) e, ao rever o resultado, cinco correcções: (1) quem não tem sessão e toca num cartão da Home — ou em "Entrar"/"Criar conta" — deve ir para o login; (2) o título dizia "Welcome back to Nucleus" (texto de outro produto) e deve ser só "Bem-vindo"; (3) o ecrã deve estar todo em português; (4) melhorar o aspeto como um especialista em UI/UX; (5) responsividade. Pediu ainda que **não existam componentes gigantes**. **Sem alteração de API, de contrato, de dependências ou de variáveis de ambiente**; sem componente de backend (cópia sincronizada por regra).

**Decisões:**

**A. Estrutura (sem "god component").** `pages/Login.tsx` passou de 571 para 37 linhas e só compõe. O estado e os envios vivem em `hooks/useLoginForm.ts` (Supabase, `sessionStorage`/`localStorage`); a estrutura da página em `components/auth/AuthLayout.tsx`; o formulário de entrada/registo em `CredentialsForm.tsx`; a recuperação de palavra-passe em `RecoveryForm.tsx`, com o estado próprio. Peças reutilizáveis: `AuthInput`, `AuthToggleSwitch`, `ChannelTabs`, `OptionCards`, `GoogleButton`, `SubmitButton`, `AuthHeroPanel`. As chaves de sessão e os tipos partilhados ficaram em `lib/authIntent.ts` — o `AuthCallback` deixou de importar uma página só para ler duas constantes. Nenhum ficheiro novo passa de 190 linhas.

**B. Regresso ao destino (`lib/postLoginRedirect.ts`).** O `ProtectedRoute` manda quem não tem sessão para `/entrar?next=<caminho>`; ao entrar, a pessoa chega ao que queria (um cartão da Home leva a `/profissionais?category=…`, e depois do login é aí que aterra). O botão "Criar conta" da Home abre `/entrar?modo=criar-conta` (registo). No fluxo do Google o `?next=` perde-se na viagem, por isso vai para `sessionStorage` e o `AuthCallback` lê-o ao montar. **Segurança:** o destino vem do URL, logo só se aceitam caminhos internos — rejeitam-se `//host`, `/\host`, tabulações/quebras de linha (o parser de URLs remove-as: `/\t/host` vira `//host`), o próprio `/entrar` (ciclo) e `/auth/callback`. Sem isto seria um *open redirect* usado em phishing. **Efeito a notar:** terminar sessão numa página protegida passa a levar a `/entrar?next=<essa página>`; **limitação:** se o `OnboardingGate` desviar a pessoa para completar o perfil, o destino perde-se e cai na Home.

**C. Português e título.** "Bem-vindo" (entrar) e "Cria a tua conta" (registo); "Entrar", "Palavra-passe", "Esqueceste a palavra-passe?", "Lembrar o email/telefone neste dispositivo", "ou", "Ainda não tens conta? Criar conta". O teste do ecrã verifica agora a **ausência** de texto em inglês (incluindo "Nucleus"), para não voltar. Removido o "milhares de clientes" do registo — não havia número que o sustentasse.

**D. Identidade e aspeto.** Cores da marca (`piquete-blue`, `piquete-yellow`) no lugar do `indigo` genérico; etiqueta por cima do campo de 48 px (`text-base`, porque abaixo de 16 px o Safari/iOS faz zoom ao focar); botão de ver/ocultar palavra-passe, interruptor e separador de canal com 44 px de alvo de toque (o interruptor é a linha inteira); foco visível; `motion-reduce`; `autocomplete`/`inputMode` corretos (`username`/`current-password`/`new-password`) para os gestores de palavras-passe. **Painel de imagem:** o depoimento ("Helena Matsinhe, cliente em Maputo") **era inventado** — citação com nome e cara de uma pessoa que não existe — e foi substituído por três frases verdadeiras hoje (identidade verificada, pedido a 3 profissionais com propostas comparáveis, serviços 24 h). Só entra um depoimento quando for real.

**E. Responsividade.** Uma coluna abaixo de `lg`, duas a partir daí; `min-h-dvh` e `env(safe-area-inset-*)`; a barra de topo ("Voltar" + logótipo) está em fluxo normal — antes o "Voltar" era `absolute` e sobrepunha o logótipo em ecrã estreito. **Peso:** o `auth-hero.jpg` (308 KB) estava num bloco `hidden lg:block`, mas uma `<img>` normal descarrega mesmo dentro de um bloco escondido — 300 KB gastos em 3G no telemóvel para uma imagem que nunca se vê; passou a `loading="lazy"` (e `alt=""`, é decorativa).

**F. "Lembrar".** Guarda no `localStorage` o email **ou** telemóvel e o canal (`{canal, valor}`), nunca a palavra-passe, e repõe o separador certo; o texto deixou de sugerir que mantém a sessão.

**G. Termos de utilização (`/termos`, pública).** Pedido do utilizador no fim desta entrega. `pages/Terms.tsx` (8 linhas) + `components/legal/LegalDocument.tsx` (cabeçalho, índice e secções; serve também uma futura política de privacidade) + `data/termosDeUtilizacao.ts` (o texto, como dados). Sem `ProtectedRoute`: quem ainda não tem conta tem de os poder ler antes de os aceitar. O formulário de login mostra «Ao continuares, aceitas os Termos de utilização» com a ligação a abrir **numa nova aba** (na mesma apagava o que a pessoa já escreveu). O texto foi redigido a partir do que a plataforma faz hoje — identidade verificada e subscrição do profissional, pedido a 3 profissionais, contactos só depois da escolha, pagamento do serviço fora da app, localização aproximada (~500 m) — e **é um rascunho de produto, não um parecer jurídico: tem de ser revisto por um jurista antes de ser vinculativo**, em especial as secções 9 (responsabilidade), 10 (suspensão) e 12 (lei aplicável). **Decidido pelo utilizador:** a plataforma é operada pela «empresa PiquetePro24»; a correção dos dados e a eliminação da conta fazem-se na própria app (item H), sem canal de suporte. **Por decidir:** a denominação legal completa e o NUIT da empresa, a idade mínima (18 anos, assumida) e por quanto tempo se guardam registos (por exemplo de auditoria) depois de a conta ser eliminada — o texto não promete nada sobre isso. Quando o pagamento do serviço passar a ser feito dentro da app, as secções 3 e 4 têm de mudar.

**H. Eliminar conta, no perfil (`components/profile/DeleteAccountSection.tsx`).** Pedido do utilizador: a correção dos dados e a eliminação da conta fazem-se em *O meu perfil → Definições* (editar perfil). A correção já existia (nome e telefone, palavra-passe, foto, localização); a eliminação chama o `DELETE /profile` do backend (Adendo v1.4, item D) através de `useDeleteAccount`, que até aqui não tinha nenhum ecrã. Confirmação **escrita** (escrever ELIMINAR, sem distinguir maiúsculas nem espaços) em vez de um «Tens a certeza?», que se confirma por reflexo; o aviso lista o que se perde, por papel — cliente: perfil, pedidos e propostas recebidas, avaliações dadas; profissional: perfil, verificação, subscrição, catálogo, propostas, e os pedidos em que foi escolhido **voltam a ficar abertos** para o cliente (trigger do backend). **Não aparece a administradores** (apagar o último admin deixava a plataforma sem moderação). `useDeleteAccount` ganhou `aoApagar`, que corre **antes** de terminar a sessão e navega para a Home (pública): se a sessão caísse primeiro, o `ProtectedRoute` levava a pessoa para `/entrar?next=/perfil`, uma página de uma conta que já não existe. **Risco por validar:** a cascata foi validada ponta a ponta em setembro, antes das tabelas de convites, propostas, catálogo e avaliações; as migrations dessas tabelas definem `ON DELETE CASCADE` para `users_profile`, mas a eliminação **com dados desse fluxo não foi testada contra o Supabase real** — testar antes de depender dela.

**Fora de âmbito (por fazer):** a imagem continua sem compressão (308 KB, 1200×1798) e fora do precache da PWA; política de privacidade em página própria (hoje é a secção 8 dos termos); testes de interface num browser real.

**Validação:** `tsc -b`, `eslint` (só o aviso pré-existente de `AuthContext.tsx`) e `vite build` limpos; Vitest 138 testes: `DeleteAccountSection.test.tsx` (9 — fechada por omissão, aviso por papel, confirmação escrita, cancelar, erro, navegação antes de terminar a sessão), `Terms.test.tsx` (6 — ids únicos, índice, data, contactos só depois da escolha, quem opera e onde se corrige), `Login.test.tsx` reescrito (14 — incluindo a ligação aos termos — português sem texto inglês, canal, ver palavra-passe, registo e papel, recuperação, `?modo=`, `?next=` válido e malicioso, destino guardado para o Google, envio com email, metadados do registo, erro, "lembrar"), `postLoginRedirect.test.ts` (destinos seguros e inseguros) e `ProtectedRoute.test.tsx`. **Não verificado num browser real nesta sessão.**

**Critérios de entrega correspondentes:** `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 6 (e Fase 1, Autenticação).


## Adendo v1.22

### Geocodificação reversa em cascata: Nominatim → OpenRouteService → Google — só backend (11/10/2026)

**Contexto:** o utilizador quis saber se podia deixar de usar o Google Maps (pago) na geocodificação reversa e se o OpenRouteService (grátis) o substituía. Em vez de decidir por palpite, comparou-se o resultado dos três serviços em 10 pontos reais de Maputo (Zimpeto, Baixa/Central "B" e "C", Coop, Sommerschield; script pontual, fora do repositório). Resultado, contando pontos com rua ou bairro: **Nominatim 10/10, OpenRouteService 7/10, Google 7/10**; só rua: **Nominatim 8, ORS 7, Google 4**. O Nominatim e o ORS juntos deram rua ou ponto próximo nos 10. O utilizador esclareceu o critério: o cliente pede o serviço a partir de onde está, e o que importa é a **rua (ou o ponto mais próximo)** — o bairro é um extra que quase nenhum serviço (nem o Yango) dá de forma fiável.

**Decisões:**

**A. Ordem da cascata (`src/services/geocodingService.ts`).** (1) **Nominatim** (OpenStreetMap, sem chave); (2) **OpenRouteService** (`ORS_API_KEY`), o lugar mais próximo; (3) **Google** (`GOOGLE_MAPS_API_KEY`), só se os anteriores não deram rua. Pára no primeiro que dê rua — o pedido pago raramente acontece. Sem rua em ninguém, devolve o melhor que houver (bairro, depois cidade) em vez de falhar. Um bairro conhecido do OSM é preferido ao «Maputo, Moçambique» do Google.

**B. Falhar não é não saber.** Um fornecedor que lança (rede, 429 de cota, chave recusada) passa a vez ao seguinte; um «não conheço este sítio» devolve `null`. A resposta é `502` só se **todos** falharam, `404` se algum respondeu e ninguém conhecia.

**C. Contrato inalterado.** `GET /geocode/reverse` continua a devolver `{ placeName, province, district, neighborhood }`; o frontend não muda. `placeName` passa a ser montado das partes («Rua, Bairro, Cidade, Província», sem repetir) em vez do `formatted_address` do Google.

**D. Província.** Na cidade de Maputo o Nominatim não devolve `state` (em 9 dos 10 pontos); devolve o código `ISO3166-2-lvl4`. `services/geocoding/provincias.ts` traduz o código nas 11 províncias. O `state` do serviço tem sempre prioridade.

**E. Política do Nominatim.** Máximo **1 pedido por segundo** e uso moderado: os pedidos são serializados por um limitador (`criarLimitador`, 1,1 s), há **cache em memória** (1 h, por coordenadas a 4 casas decimais ≈ 11 m, máx. 5 000 entradas) e o pedido leva um `User-Agent` identificado (`GEOCODING_USER_AGENT`). O limite e a cache são **por máquina Fly**; se o tráfego crescer a sério, passar a um servidor Nominatim próprio ou pago.

**F. Configuração.** `GOOGLE_MAPS_API_KEY` deixa de ser obrigatória (era `z.string().min(1)`): sem ela a cascata acaba no Nominatim/ORS. `ORS_API_KEY` e `GEOCODING_USER_AGENT` são opcionais. Nenhuma das chaves vai para o frontend.

**Ficheiros:** `services/geocoding/{tipos,provincias,nominatim,openrouteservice,google}.ts` (o antigo `geocodingService.ts` passou para `google.ts`, mantendo os seus testes) e o orquestrador `services/geocodingService.ts`; `config/env.ts`; `controllers/geocodingController.ts`; `.env.example`.

**Fora de âmbito / por fazer:** a comparação foi só em **Maputo** — fora dela (Beira, Nampula, zonas rurais) o OpenStreetMap pode ter menos dados; convém repetir o teste com pontos de outras cidades. A cota e os termos do plano gratuito do ORS **não foram confirmados**. Para **desligar o Google por completo** basta retirar `GOOGLE_MAPS_API_KEY` dos `fly secrets` — decisão do utilizador, depois de validar noutras cidades. As chaves do Google e do ORS foram coladas numa conversa: restringir/substituir.

**Validação:** `tsc`, `eslint` e `tsc -p` (build) limpos; Vitest 447 testes (+~40: leitura do Nominatim e província por código ISO, limitador de 1 pedido/s com tempo simulado, ORS com 401/403/429/503, a cascata — pára na rua, falha do Nominatim passa ao ORS, bairro do OSM vs Google, 502 só com todos a falhar, cache, erro não guardado — e a rota `/geocode/reverse`). Corrida real da cascata nos 10 pontos de Maputo (Nominatim + ORS, sem Google): **rua em 10/10**.

**Critérios de entrega correspondentes:** `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`, Fase 2 (geocodificação reversa).

## Adendo v1.23

### Portfólio por trabalho (carrossel): um serviço, uma descrição e várias fotos (12/10/2026)

**Contexto:** no catálogo do profissional (Adendo v1.17) cada foto enviada era um «trabalho» solto, sem serviço nem descrição. O utilizador pediu que um trabalho seja, como um post do Instagram, **um serviço com N fotos e uma descrição**: o profissional escolhe o serviço que fez, junta as fotos desse serviço e escreve a descrição; no perfil, o cliente vê cada trabalho como um carrossel.

**Decisões (confirmadas pelo utilizador em 12/10/2026):**

**A. Serviço obrigatório nos trabalhos novos.** O serviço tem de ser um dos que o profissional presta (`professional_service_categories`). Na base de dados `category_id` é `nullable` apenas por causa das fotos antigas, que aparecem sem serviço até o profissional as editar.

**B. Fotos antigas: 1 foto = 1 trabalho.** A migration cria um trabalho por foto existente, com a data original e sem serviço nem descrição. Nada se perde; o profissional reagrupa à mão.

**C. Limites.** 1 a **10 fotos por trabalho** (como no Instagram); descrição até 500 caracteres; sem limite de número de trabalhos (mantém-se a decisão do Adendo v1.17). Um trabalho nunca fica sem fotos: apagar a última foto devolve `409` e pede para apagar o trabalho.

**D. Compatibilidade de contrato durante um ciclo.** `GET /professionals/:id/catalog` devolve `projects` **e** continua a devolver `portfolio` (fotos soltas) e os endpoints `POST`/`DELETE /professionals/me/portfolio`, para o frontend em produção e o PWA em cache não partirem entre os deploys. No modelo antigo foto = trabalho: `POST` cria um trabalho de 1 foto sem serviço; `DELETE` da única foto de um trabalho apaga o trabalho. **A remover** (backend: `portfolio`, os dois endpoints legados e `addPortfolioPhoto`/`removePortfolioPhoto`) quando o frontend novo estiver em produção e o PWA antigo deixar de circular.

**E. Atomicidade em funções SQL.** `create_portfolio_project`, `add_portfolio_project_photos` e `remove_portfolio_project_photo` (mesmo padrão de `replace_professional_categories`): o REST do Supabase não tem transacção, e o limite de 10 fotos e «nunca zero fotos» não se impõem lendo-contando-escrevendo em JS sem abrir corrida entre dois pedidos. As funções bloqueiam a linha do trabalho (`FOR UPDATE`) e levantam erros com SQLSTATE próprios (`PF001`–`PF005`) que o service traduz em 400/404/409.

**F. Upload.** O frontend envia as fotos ao Storage (WebP, 3 em paralelo) e só depois faz um único `POST`: nunca há trabalho incompleto. Se um upload falhar, nada é criado e as fotos que já subiram ficam órfãs no bucket (mesma omissão do Adendo v1.17, item D).

**API nova** (todas `requireAuth` + `requireRole('PROFESSIONAL')`): `POST /professionals/me/projects` `{ category_id, description?, photo_urls[1..10] }`; `PATCH /professionals/me/projects/:id` `{ category_id?, description? }`; `POST /professionals/me/projects/:id/photos`; `DELETE /professionals/me/projects/:id/photos/:photoId`; `DELETE /professionals/me/projects/:id`. Cada `photo_url` tem de apontar para a pasta do próprio utilizador no bucket `portfolio-photos`. Auditoria: `PROFESSIONAL_CATALOG_PROJECT_CREATE|UPDATE|DELETE` (as acções de foto `PROFESSIONAL_CATALOG_PHOTO_ADD|REMOVE` mantêm-se).

**Contrato do catálogo:** `projects: [{ id, category: {id, name} | null, description, created_at, photos: [{id, photo_url, position}] }]`, do mais recente para o mais antigo, fotos por `position`.

**Frontend:** `MyCatalog` ganha «Os teus trabalhos» (novo trabalho em 3 passos — serviço, fotos com capa e reordenação, descrição — e editor por trabalho). `ProfessionalCatalog` mostra cada trabalho como um cartão com carrossel (`scroll-snap` em CSS, **sem dependência nova** pelo peso do bundle), chip do serviço, descrição e data; filtro por serviço quando há 2 ou mais; o ecrã inteiro navega só pelas fotos do trabalho; o contador «Trabalhos» conta trabalhos e não fotos.

**Fora de âmbito / por fazer:** reordenar as fotos de um trabalho **já publicado** (a ordem só se define ao criar); apagar do Storage os ficheiros órfãos; moderação (mantém-se fora de âmbito, Adendo v1.17).

**Notas de deploy:** a migration `20261012090000_portfolio_por_projeto.sql` tem de estar aplicada à base **antes** do deploy do backend; backend primeiro, frontend depois. Sem variáveis de ambiente novas. **Migration aplicada ao Supabase real em 12/10/2026 (pelo SQL Editor) e validada** por um bloco `DO` com rollback: `fotos_sem_projecto=0`, criação com posições 0,1, `PF001` (0 e 11 fotos), `PF002` (serviço alheio), `PF003` (outro profissional), `PF005` (foto inexistente), `PF004` (última foto), total de 10 fotos após acrescentar e cascata ao apagar o trabalho. **Não exercido:** a corrida real entre dois pedidos simultâneos (`FOR UPDATE`) e o `verificar:rls`.

**Critérios de entrega correspondentes:** `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`, Fase 12; `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 11.


---

## Adendo v1.24

### Fase 7 — contrato OpenAPI, jornada E2E em CI, CORS multi-origem, smoke e carga — só backend (12/10/2026)

**Contexto:** a Fase 7 pede a API pronta para o PWA em produção. Entrou em `feat/fase-7-preparacao-integracao` o que se faz por código; o que exige infra ou medição fora desta máquina (staging, latência desde Maputo, smoke em produção) fica registado como pendente no plano.

**A. Contrato OpenAPI 3.0, gerado dos schemas Zod.** `GET /openapi.json` e `GET /docs` (Swagger UI) — **públicos de propósito**: descrevem o contrato, não expõem dados, e o repositório do frontend precisa de os ler sem sessão. O documento (`src/docs/openapi.ts`) usa os **mesmos objectos Zod** que os controllers passam a `validate(...)`, por isso mudar uma validação muda a documentação sem segunda edição. O que não se deriva (que rotas existem, quem as pode chamar) é declarado numa lista, e `src/docs/openapi.test.ts` **falha se a lista e as rotas registadas em `app.ts` divergirem em qualquer sentido** — rota nova sem documentação, ou documentação de rota que já não existe. `POST /webhooks/payment` só consta com `ENABLE_PAYMENT_MOCK=true`, tal como só existe nessa condição. Dependências novas: `@asteasolutions/zod-to-openapi@7` (a v8 exige Zod 4) e `swagger-ui-express`.
**Limitação assumida:** os schemas de **entrada** são exactos; as **respostas** só descrevem o envelope (`{ success, data }`) e os códigos de erro — o formato de `data` continua descrito neste TRD, não no OpenAPI. Modelar as respostas exigiria schemas de saída que hoje não existem no código; não se inventaram à mão porque desactualizariam.

**B. Jornada E2E em CI** (`src/e2e/jornada.test.ts`, `npm run test:e2e`, passo próprio em `ci.yml` e `deploy.yml`): registo (linha criada pela trigger de signup) → localização → tornar-se profissional → KYC (incluindo recusa de documento alheio) → aprovação (só ADMIN) → subscrição por webhook do mock → busca por proximidade → pedido → pedidos abertos (só PROFESSIONAL) → atribuição (2.ª tentativa = 409) → contacto só depois de atribuído → conclusão (só o dono) → avaliação. Atravessa rotas, guards, validação e services reais contra o `fakeSupabase`.
**O que NÃO prova:** o SQL. `ST_DWithin`, índices, funções plpgsql e RLS só se provam contra um Postgres real (staging) e, para o RLS, com `npm run verificar:rls`. As RPC são simuladas por handlers que espelham as migrations — como já acontecia em `confirmPaymentTransactionRpc`. O `fakeSupabase` ganhou `upsert`, `rpc(...).maybeSingle()/single()` e `padroes` (DEFAULTs de coluna nos inserts).

**C. CORS multi-origem.** `CORS_ORIGIN` passa a lista separada por vírgulas (`src/config/cors.ts`); uma entrada pode levar `*` **dentro de um segmento do anfitrião** (`https://piquetepro24-*.vercel.app`) para os previews da Vercel, cujo URL muda a cada PR. O `*` casa `[a-z0-9-]+` e nunca um ponto. Em produção o arranque **aborta** com um padrão cujo segmento é só `*` (`https://*.vercel.app` casaria o projecto de qualquer pessoa na Vercel — com credenciais equivale a `*`), além da recusa de `*` que já existia. Origem recusada: o pedido segue sem cabeçalhos CORS e é o browser que o bloqueia (passar um `Error` daria 500). Pedidos sem `Origin` (curl, health-check do Fly) passam. Compatível com o valor actual em produção (uma única origem).

**D. Smoke e carga.** `npm run smoke` (`scripts/smoke.mjs`) verifica um ambiente já no ar: `/health`, `/openapi.json`, 401 sem token, 404 em JSON, **`POST /webhooks/payment` = 404** (mock desligado), CORS (origem do frontend aceite, outra recusada) e, com `SMOKE_TOKEN`, a validação do JWT contra o JWKS. `npm run carga` (`scripts/carga.mjs`, `autocannon`) só faz **leituras** nos endpoints críticos, recusa-se a correr contra um `*.fly.dev` que não pareça staging, e separa 2xx de 429 — os endpoints têm rate limit por utilizador, e um 429 é rápido: contá-lo na média esconderia a latência real.

**E. Runbook.** `Doc's/RUNBOOK_DEPLOY.md`: deploy, lista de verificação pré-merge, smoke, rollback de código (`fly deploy --image`) e de base de dados (migrations só para a frente; compensar com migration nova), segredos expostos, diagnóstico, e o procedimento de medição de latência. **Escrito, não testado.**

**F. Caching de listagens:** já existia desde a Fase 3 (`GET /professionals/nearby` em Redis com degradação sem `REDIS_URL`); nada a acrescentar. `GET /service_requests/nearby` continua sem cache de propósito (Fase 3: os pedidos mudam de estado depressa demais).

**Por fazer (não é código):** ambiente de staging (app Fly + projecto Supabase); medição de latência desde Maputo e decisão fra/jnb; correr `npm run smoke` e `npm run carga` contra staging/produção; testar o rollback do runbook.

**Notas de deploy:** sem migrations nem variáveis de ambiente novas. `CORS_ORIGIN` já aceita lista, mas o valor actual (uma origem) continua válido. Dependências novas em `package.json`: `@asteasolutions/zod-to-openapi`, `swagger-ui-express` (produção); `autocannon` e os `@types` (desenvolvimento). Backend primeiro; o frontend não precisa de alteração.

**Verificação em produção (12/10/2026).** Deploy do backend concluído; `npm run smoke` contra `piquetepro24-backend.fly.dev`: 7/7 (sem passos autenticados). O smoke apanhou um problema de configuração e não de código: o frontend passou a ser servido num domínio novo da Vercel e o CORS, correctamente, recusou-o. **Decisão do utilizador:** o domínio oficial do frontend passa a ser `https://piquete-pro24-front-end-beta.vercel.app`; `CORS_ORIGIN` e `FRONTEND_URL` (Fly), o *Site URL* e os *Redirect URLs* (Supabase Auth) apontam só para ele, e o domínio antigo (`piquete-pro24-front-end.vercel.app`) redirecciona para o novo na Vercel. Confirmado: o login volta ao domínio novo e a origem antiga é recusada pela API. Efeito para os utilizadores: sessões abertas no domínio antigo perdem-se (a sessão é por origem).

**Critérios de entrega correspondentes:** `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`, Fase 7.

---

## Adendo v1.25

### Fase 5 do frontend — última localização conhecida e indicador de ligação — só frontend (12/10/2026)

**Contexto:** a Fase 5 pede resiliência a rede instável. Entraram os dois itens que não dependem do backend; a fila offline fica à espera de uma decisão (item C).

**A. Última localização conhecida.** `useGeolocation` guarda a posição em `localStorage` (`lib/ultimaLocalizacao.ts`) sempre que o GPS responde e, quando falha (recusado, indisponível, timeout de 10 s, dispositivo sem GPS), devolve-a em `coordinates` para os ecrãs que **pesquisam** (`FindProfessionals`, `NearbyServiceRequests`) com um aviso «a usar a tua última localização conhecida (há X)». **Não** a devolve como `success`: `LocationForm` grava no perfil quando o GPS responde, e gravar uma posição antiga como se fosse a actual seria um dado errado. Só se usa se tiver menos de 30 dias e estiver dentro dos limites de Moçambique que o backend aplica (um valor adulterado em `localStorage` seria recusado com 400). `localStorage` indisponível não é erro.

**B. Indicador de ligação.** Faixa fixa no topo, só visível com problema. Dois sinais, porque nenhum chega sozinho: `navigator.onLine` apanha o modo avião mas diz «online» com Wi-Fi sem dados (o caso comum em redes móveis); o resultado dos pedidos à API apanha esse caso (o interceptor de `lib/api.ts` marca o servidor como inalcançável quando um pedido nem obtém resposta, e como alcançável com qualquer resposta HTTP, mesmo 4xx/5xx). Estados: ligado / sem internet / servidor sem resposta. `role="status"` (polite), para o leitor de ecrã não interromper a cada perda de rede.

**C. Fila offline — decisão pendente.** `POST /service_requests` não é idempotente: se o pedido chega ao servidor mas a resposta se perde, o reenvio cria um segundo pedido. O frontend sozinho não consegue distinguir «nunca chegou» de «chegou e a resposta perdeu-se». Correcção proposta (backend, **primeiro**): coluna `idempotency_key uuid` em `service_requests` com índice único `(client_id, idempotency_key)`, cabeçalho opcional `Idempotency-Key`, e em repetição devolver o pedido já criado em vez de criar outro. Exige migration (aplicada pelo utilizador no SQL Editor) e deploy do backend antes do frontend. Depois, no frontend: fila em IndexedDB com a chave gerada ao enfileirar, reenvio ao reconectar.

**Fora de âmbito:** fila para outras acções além de criar pedido; sincronização em segundo plano com o separador fechado (Background Sync não existe em Safari/iOS).

**Notas de deploy:** sem variáveis de ambiente nem alterações ao backend. **Não verificado em browser real.**

**Critérios de entrega correspondentes:** `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 5.

---

## Adendo v1.26

### Idempotência da criação de pedidos (suporta a fila offline da Fase 5 do frontend) — só backend (13/10/2026)

**Contexto:** `POST /service_requests` não era idempotente. Se o pedido chegava ao servidor mas a resposta se perdia (rede móvel a cair), o cliente reenviava e criava um segundo pedido; o frontend sozinho não distingue «nunca chegou» de «chegou e a resposta perdeu-se». Decisão do utilizador (12/10/2026): resolver no backend, primeiro.

**A. Contrato.** Cabeçalho opcional `Idempotency-Key: <uuid>`, gerado pelo cliente ao decidir criar o pedido e reutilizado em todas as tentativas. Primeira vez: `201`. Repetição pelo mesmo cliente: `200` com o pedido original, **sem** nova notificação, auditoria nem convites. Chave que não é UUID: `400` (ignorá-la devolvia um `201` que não protege de nada e o cliente julgava-se a salvo). Aplica-se ao pedido aberto e ao dirigido. O corpo do reenvio não é comparado com o original.

**B. Escopo por cliente.** O índice único é `(client_id, idempotency_key)`, não global: a chave é escolhida por quem chama, e uma global deixaria um utilizador provocar colisões ou ver o pedido de outro ao adivinhá-la. A chave não é devolvida (não consta de `SERVICE_REQUEST_COLUMNS`).

**C. Atomicidade.** No pedido dirigido a chave vai para dentro de `create_service_request_with_invitations` (`INSERT ... ON CONFLICT DO NOTHING`), por isso dois reenvios simultâneos não criam dois pedidos. A função foi **substituída** (drop + create) e não alterada com `create or replace`, porque acrescentar um parâmetro cria um overload e a chamada por nome ficaria ambígua. No pedido aberto o `23505` é tratado no service, que devolve o vencedor. **Limite assumido:** se dois reenvios *simultâneos* do pedido dirigido chegarem antes de qualquer um existir, o perdedor também notifica os convidados (o pré-lookup do controller não vê o pedido ainda); o pedido, esse, não duplica. É o caso raro de corrida, não o do reenvio normal depois de uma resposta perdida.

**D. Ordem de deploy — crítico.** A migration tem de estar aplicada **antes** do deploy do backend. O código novo chama a função com 10 parâmetros; contra a função antiga (9) falha com «function does not exist» e **parte toda a criação de pedidos dirigidos**. O contrário é seguro: o código antigo em produção chama a função com 9 argumentos e a nova aceita-os (o décimo tem `default null`). Migration aditiva e compatível com o código anterior.

**E. Verificação da migration (a correr no SQL Editor do Supabase; faz rollback).** O SQL não foi executado pelo autor:

```sql
begin;
do $$
declare v_cliente uuid; v_cat uuid; v_pro uuid; a uuid; b uuid; n_pedidos int; n_convites int;
begin
  select id into v_cliente from users_profile where role = 'CLIENT' limit 1;
  select psc.professional_id, psc.category_id into v_pro, v_cat from professional_service_categories psc limit 1;
  a := public.create_service_request_with_invitations(v_cliente, 'teste', null, 'Maputo', null, null, null, v_cat, array[v_pro], gen_random_uuid());
  -- mesma chave: tem de devolver o mesmo id e não criar convites novos
  select idempotency_key into strict b from service_requests where id = a;
  b := public.create_service_request_with_invitations(v_cliente, 'teste', null, 'Maputo', null, null, null, v_cat, array[v_pro], b);
  select count(*) into n_pedidos from service_requests where client_id = v_cliente and title = 'teste';
  select count(*) into n_convites from service_request_invitations where service_request_id = a;
  raise notice 'mesmo_id=% pedidos=% convites=%', (a = b), n_pedidos, n_convites;  -- esperado: true / 1 / 1
end $$;
rollback;
```

**Notas de deploy:** 1) aplicar `supabase/migrations/20261013090000_idempotencia_criacao_pedido.sql`; 2) correr o bloco acima; 3) só então fazer o merge do backend. Sem variáveis de ambiente novas. Backend primeiro, frontend depois (o frontend ainda não envia o cabeçalho).

**Critérios de entrega correspondentes:** `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`, Fase 13; `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 5 (fila offline).

---

## Adendo v1.27

### Fila offline para criar pedidos — só frontend (13/10/2026)

**Contexto:** fecha o terceiro item da Fase 5 (o Adendo v1.25 deixou-o à espera da idempotência do backend, entregue no Adendo v1.26).

**A. Garantia contra duplicados.** Está na `Idempotency-Key`, não na fila. A chave é gerada **uma vez por formulário** e vai em todas as tentativas, inclusive o reenvio manual depois de um erro 5xx e o reenvio automático da fila: o `id` de cada item guardado É a chave usada na tentativa original. Por isso um pedido que chegou ao servidor mas cuja resposta se perdeu volta a ser enviado com a mesma chave e o servidor devolve o original. Depois de um pedido criado a chave renova-se, senão o seguinte devolveria sempre o primeiro.

**B. O que vai para a fila e o que não vai.** Só a falta de resposta (rede caiu, DNS, timeout de 20 s) e o estado «sem internet» à partida. Um erro do servidor (400, 403, ...) mostra-se logo no formulário: guardar um pedido inválido só o faria falhar mais tarde, longe do formulário. `ErroDeApi` (`lib/api.ts`) distingue os dois casos (`semResposta`).

**C. Envio.** `ProcessadorDaFila` (montado dentro de `AuthProvider`) envia por ordem ao abrir a app, ao voltar o evento `online`, quando o servidor volta a responder e de minuto a minuto (apanha o Wi-Fi sem dados que volta sem evento). Pára à primeira falha de rede. Estados HTTP 401/408/429/5xx são tratados como temporários (o pedido fica); qualquer outro 4xx marca o item como **recusado** com a mensagem do servidor — fica visível e nunca se apaga em silêncio. Um só envio de cada vez por separador; entre separadores a chave cobre o resto.

**D. Privacidade.** Cada item guarda o `userId`: num telemóvel partilhado, quem entra a seguir não vê nem envia os pedidos do anterior. Os dados ficam em IndexedDB no dispositivo até serem enviados ou descartados.

**E. UI.** «Por enviar (n)» no topo de «Os meus pedidos», com «Descartar» (pede confirmação). Aviso ao guardar («ficou guardado neste telemóvel») e ao enviar. A mutação usa `networkMode: "always"`: por omissão o TanStack Query pausa as mutações sem rede e o botão ficava a rodar para sempre.

**Dependência nova:** `fake-indexeddb` (**só desenvolvimento**, testes). Sem impacto no bundle.

**Limites assumidos:**
- Só funciona **dentro de uma sessão com a app aberta**. A página «Novo pedido» precisa do perfil e do estado de navegação (vindos de dados já carregados): abri-la de raiz sem rede não funciona. Cobre o caso real — a ligação cai ou falha a meio de criar o pedido.
- O envio acontece com a app aberta. Não há Background Sync (não existe em Safari/iOS), logo um pedido guardado só sai quando o utilizador volta a abrir a app com ligação.
- Só «criar pedido». Outras acções (aceitar, concluir, cancelar, propor) continuam a exigir ligação.
- O corpo de um reenvio não é comparado com o original (decisão do Adendo v1.26).

**Notas de deploy:** sem variáveis de ambiente nem alterações ao backend (já em produção). **Não verificado em browser real.**

**Critérios de entrega correspondentes:** `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 5.

---

## Adendo v1.28

### Verificação em produção do frontend: `VITE_API_URL` errada no build e meta `mobile-web-app-capable` — só frontend (13/10/2026)

**A. `VITE_API_URL` gravada como `http://localhost:3000` no build de produção.** Descoberto pelo utilizador a 13/10/2026: o `-beta` ficava no spinner, com a faixa «Sem resposta do servidor» e 5 erros de CSP na consola («Connecting to … violates connect-src»). Confirmado ao descarregar o JavaScript publicado: tinha `baseURL:"http://localhost:3000"` e **nenhuma** referência a `piquetepro24-backend.fly.dev`. Como a CSP do `vercel.json` só permite `*.supabase.co` e `*.fly.dev`, o browser bloqueava todos os pedidos. **Causa:** o valor de `VITE_API_URL` usado no build era o do `.env` local. O painel da Vercel não foi visto antes da correcção, por isso não se sabe se a variável lá estava com esse valor ou se o build usou outro ambiente. **Correcção (pelo utilizador):** `VITE_API_URL=https://piquetepro24-backend.fly.dev` em Production e Preview, e redeploy **sem cache**. Confirmado depois ao descarregar o novo JavaScript (`baseURL` correcto, 0 ocorrências de `localhost:3000`) e a API a aceitar a origem e o cabeçalho `Idempotency-Key` em CORS.
**Regra a reter:** as variáveis `VITE_*` são substituídas **no build**, não lidas em runtime; alterar uma variável no painel não muda o site já publicado — é preciso um novo deploy, sem cache. **Como verificar um deploy:** descarregar o `index-*.js` do site e procurar o endereço da API (`curl -s <site>/ | grep -o '/assets/index-[^"]*[.]js'`, depois `curl -s <site>/assets/index-XXXX.js | grep -o 'baseURL:"[^"]*"'`). O indicador de ligação da Fase 5 (Adendo v1.25) acusou o problema à vista do utilizador — um bom sinal de que cumpre o que promete.

**B. Meta `mobile-web-app-capable`.** O Chrome avisava que `apple-mobile-web-app-capable` está obsoleto. Acrescentada `<meta name="mobile-web-app-capable">` (a norma) em `index.html`, **mantendo** a da Apple, que o Safari/iOS continua a ler. Sem alteração de comportamento.

**Notas de deploy:** sem variáveis novas; `VITE_API_URL` já existia (ver `.env.example`) e passou a estar correcta em produção. Backend sem alterações.

**Critérios de entrega correspondentes:** `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 7 (nota de estado).

---

## Adendo v1.29

### Aviso de nova versão ao centro do ecrã, com data e resumo das novidades — só frontend (13/10/2026)

**Contexto:** o aviso do Adendo v1.20 era um pequeno toast com o botão «Actualizar» no topo, que quem deixa a app aberta raramente via, e sem dizer o que mudava ninguém tinha motivo para carregar nele. Pedido do utilizador: um aviso moderno **ao centro do ecrã**, com a data da actualização e um resumo do que foi implementado, **sem termos técnicos**.

**A. O aviso.** `AvisoDeNovaVersao` (montado em `App`): cartão centrado com fundo desfocado, título «Nova versão disponível», «Actualização de 13 de outubro de 2026», lista «O que há de novo» (até 4 itens) e dois botões: **Actualizar agora** e **Mais tarde**. Mantém a regra do Adendo v1.20: **nunca recarrega sozinho** (um formulário a meio perder-se-ia); o cartão avisa que a página vai recarregar. «Mais tarde», Escape ou clicar fora fecham-no sem actualizar; volta a aparecer da próxima vez que a app abrir. Acessível: `role="dialog"`, `aria-modal`, foco no botão principal ao abrir, Tab preso dentro do cartão, `motion-reduce` respeitado.

**B. De onde vêm as novidades — e porque não do código.** Quem vê o aviso está a correr a versão **antiga**, que não conhece as novidades da nova. Por isso o texto vem de `public/novidades.json`, lido da rede **sem cache** (`cache: "no-store"`) só quando o aviso aparece, e por isso reflecte a versão que acabou de ser publicada. Formato: `{ "atualizadoEm": "AAAA-MM-DD", "novidades": ["...", "..."] }`. Até 4 itens, 140 caracteres cada. Qualquer falha (rede, JSON inválido, ficheiro em falta) mostra o aviso na mesma, com «Melhorámos a aplicação», **sem data nem lista** — um texto nunca impede a actualização.

**C. Processo de publicação (novo).** `public/novidades.json` é **editado à mão em cada versão que o utilizador deva ver anunciada**, com frases curtas, em português, sem termos técnicos, e a data de publicação. Se ninguém o actualizar, o aviso mostra as novidades da versão anterior com a data antiga — visível, mas enganador. Não há automatismo para isto de propósito: um texto gerado a partir de commits seria técnico.

**D. Limite assumido.** O aviso novo só aparece a partir da versão **seguinte** à que o traz: a versão que o introduz é anunciada ainda pelo toast antigo (quem está a correr o código antigo mostra o aviso antigo). Para o ver, tem de haver dois deploys seguidos.

**Notas de deploy:** sem variáveis de ambiente nem alterações ao backend; `public/novidades.json` é um ficheiro estático novo (não entra no precache do service worker, de propósito). **Não verificado em browser real.**

**Critérios de entrega correspondentes:** `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 5 (item do aviso de nova versão).

---

## Adendo v1.30

### Fase 6 do frontend — code-splitting, ecrã de erro, bibliotecas em ficheiros próprios e medição Lighthouse — só frontend (13/10/2026)

**A. Medição (Lighthouse 12, Chrome, emulação móvel com rede 4G lenta, sobre o build local e sem sessão).** Login antes → depois: Performance 82 → **86**, Acessibilidade 96 → 96, TBT 220 → 150 ms, 348 → 316 KB. Início depois: Performance **89**, Acessibilidade **100**, CLS 0,011. **Limites:** só se mediram ecrãs sem sessão; os ecrãs autenticados (perfil, pedidos, admin, ...) não foram medidos; a medição é local, não a de produção (Vercel, rede real), e o Lighthouse varia entre corridas. O PWA já não é uma categoria do Lighthouse 12; o critério «PWA > 90» da Fase 5 não se pode medir assim.

**B. Code-splitting por rota.** Todos os ecrãs, excepto `Home`, `Login` e `AuthCallback` (as entradas), passam a `React.lazy` com um esqueleto de fallback (`PaginaACarregar`, `role="status"`). Antes, as ~30 páginas iam num só ficheiro (218 KB gzip); agora cada ecrã é descarregado ao entrar nele (o painel de admin, por exemplo, só custa a quem o abre). O precache do service worker continua a incluir todos os ficheiros, por isso offline os ecrãs já visitados e os que ainda não foram abertos continuam a funcionar.

**C. Bibliotecas em ficheiros próprios** (`manualChunks` em `vite.config.ts`): `vendor-react` (60 KB gzip) e `vendor-supabase` (59 KB gzip) separados do código da app (66 KB gzip). **Não encolhe o primeiro download** (o total é o mesmo, ~185 KB gzip); evita repeti-lo: o código da app muda a cada deploy e as bibliotecas quase nunca, por isso cada actualização deixa de custar ~120 KB.

**D. Falha ao carregar um ecrã.** Duas camadas, porque o code-splitting traz um modo de falha novo. (1) `vite:preloadError` (`lib/falhaDeCarregamento.ts`): depois de um deploy novo, um separador aberto aponta para ficheiros que já não existem; recarrega **uma vez por minuto**, no máximo — sem rede, recarregar em ciclo seria pior do que o erro. (2) `ErroDeEcra` (por rota, repõe-se ao navegar): em vez de uma página em branco, «Não foi possível abrir este ecrã», com «Tentar de novo» e «Voltar ao início».

**E. Acessibilidade.** A auditoria ao código encontrou pouco: rótulos, `focus-within`, `alt` e alvos de toque já estavam correctos. Corrigido o campo de telefone do perfil, que perdia o contorno de foco (`outline-none` sem o equivalente no contentor). **Não corrigido, por decisão pendente:** o «24» amarelo do logótipo sobre fundo branco tem contraste 1,56 e é a única falha do Lighthouse. Um logótipo é isento pelo WCAG e mudar a cor da marca é decisão do utilizador.

**F. Desvio ao plano — dois itens da Home já estavam cobertos.** «`width`/`height` nas imagens» serve para evitar saltos de layout; os cartões já reservam o espaço com `aspect-ratio` (CLS medido 0,011). «Esqueleto enquanto as categorias carregam»: a barra já mostra a lista por omissão enquanto a API responde, nunca fica vazia. Não se acrescentou código para os dois. **Continuam fora desta fase** (precisam de backend): trabalhos em destaque com dados reais e o ponto de «por ler» do sino.

**G. Não feito.** `framer-motion` continua nas dependências sem ser importado em lado nenhum (não entra no bundle, mas é lixo no `package.json`): fica para decisão. O `@supabase/supabase-js` traz `realtime`, `storage`, `postgrest` e `functions` e a app só usa autenticação e *storage*; reduzir isto exige trocar de cliente e é um refactor que não foi pedido.

**Notas de deploy:** sem variáveis de ambiente nem alterações ao backend. **Não verificado em browser real:** a navegação entre ecrãs com o esqueleto, e o ecrã de erro com um ficheiro realmente em falta.

**Critérios de entrega correspondentes:** `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 6.

---

## Adendo v1.31

### Lacunas do plano fechadas — testes, E2E, trabalhos em destaque reais, sino com contagem e fim do contrato legado do portfólio — frontend e backend (12/10/2026)

**A. Testes de componente (frontend).** Passam a ter teste os ecrãs que só tinham validação manual: `NewProjectForm` e `ProjectEditor` (Fase 11), `NewServiceRequest` (Fase 10), `OnboardingGate` e `CompletePhone` (Fase 1) e `Profile` (estados, painel de definições, regras da password, histórico de pedidos). Os componentes novos (A–E abaixo) nascem com teste. Os hooks e o Supabase são simulados — testa-se o que o ecrã deixa fazer e o que entrega ao pedido, não a rede. Suite do frontend: **325 testes**. Continuam sem teste de componente `CompleteLocation` (só compõe `LocationForm`) e o resto do painel de admin.

**B. Suite E2E (Playwright) — frontend.** `e2e/`, `playwright.config.ts`, `npm run test:e2e`. Corre contra o **build real** (`vite build` para `dist-e2e/`, servido por `vite preview`) com o backend e o Supabase **simulados no browser** (`page.route`) em domínios `.test` que não existem — qualquer chamada que escape aos mocks falha de forma visível. A sessão é injectada no `localStorage` (chave `sb-supabase-auth-token`), sem passar pelo Supabase. Browser: Pixel 5 (o público-alvo usa o telemóvel); `E2E_BROWSER=msedge` usa o browser já instalado numa máquina de desenvolvimento, o CI instala o Chromium. **15 testes:** cliente da pesquisa ao pedido enviado (3 escolhidos, local do perfil, `Idempotency-Key` UUID no pedido, recusa do servidor, pesquisa vazia e em erro com «Tentar de novo»), guardas de rota e onboarding, a Home, e **modo avião** (pedido criado offline fica em «Por enviar» e é enviado **uma só vez** quando a ligação volta). `service worker` bloqueado nos testes (interceptaria pedidos e escaparia aos mocks); por isso o teste do modo avião visita primeiro o ecrã de destino — em produção o precache cobre os ecrãs carregados a pedido. **Limites assumidos:** isto **não substitui** o E2E contra o staging (Fase 7, que continua por fazer: valida a integração real); não exercita o service worker, o Supabase Auth real nem o GPS.

**C. Defeito corrigido — `NewServiceRequest`.** Se o perfil não carregasse (erro de rede), o ecrã dizia «Ainda não tens uma localização no perfil», apontando ao cliente o problema errado. Agora distingue: o erro mostra «Não foi possível carregar o teu perfil…» com «Tentar de novo» e bloqueia o envio. **Encontrado e não corrigido (fora do âmbito pedido):** em `Profile.tsx` o histórico de pedidos não trata o erro (uma falha aparece como «Nenhum pedido realizado»), e `OnboardingGate`, `CompletePhone` e `CompleteLocation` mostram o erro de carregamento do perfil sem botão para tentar de novo.

**D. Sino da Home com contagem real — frontend.** O profissional vê um ponto com o número de **convites por responder** (`lib/convitesPorResponder.ts`): convite no estado `INVITED` **e** pedido ainda `OPEN` — a mesma regra com que `ReceivedInvitations` decide mostrar o formulário, para o sino não acender por um pedido já fechado. Reutiliza `GET /service_requests/invitations` (a mesma chave de cache de «Pedidos recebidos»): **sem endpoint novo**. Se o pedido falhar, o sino fica sem ponto. O número vai também no nome acessível («Notificações, 2 convites por responder»). Clientes não têm ponto: não há ainda nada por ler do lado deles (as propostas recebidas poderiam entrar aqui — não pedido).

**E. «Trabalhos em destaque» da Home com dados reais — backend e frontend.** Os 16 trabalhos fixos (`src/data/featuredWorks.ts`, nomes, notas e fotos do Unsplash inventados) foram **removidos**. Novo `GET /portfolio/featured?category=&limit=` (`featuredWorksService`, controller, rota, OpenAPI):
- **Fonte:** os trabalhos do portfólio (`professional_portfolio_projects`), só os **com serviço e com foto**, os 80 mais recentes como candidatos (tecto fixo). A capa é a foto de menor posição. Título: primeira linha da descrição (80 caracteres, com «…»), ou «Serviço por Nome» se não houver descrição.
- **Ordem:** melhor média de avaliações primeiro (sem avaliações no fim), depois mais avaliações, depois mais recente; **no máximo 2 trabalhos por profissional**; `limit` de 1 a 40 (por omissão 24).
- **Selos, só quando verdadeiros:** «Top Avaliado» = média ≥ 4,8 **e** ≥ 5 avaliações (uma só de 5 estrelas não faz um «top»); «Verificado» = KYC `APPROVED`; senão nenhum, e o cartão não desenha selo. Sem avaliações, o cartão diz «Sem avaliações» em vez de inventar uma nota. `completed_jobs_count` conta só pedidos `COMPLETED`.
- **Privacidade:** localização como «Província · Distrito» (o grão que o perfil do profissional já mostra), **nunca o bairro nem coordenadas** (Adendo v1.15, item C). Contas que já não são de profissional ficam de fora.
- **Decisão por confirmar — autenticado, não público.** A rota exige sessão, como o resto do catálogo (Adendo v1.17, item B: «sem link público»). Consequência: um **visitante sem sessão não vê trabalhos** — a Home mostra «Entra para ver trabalhos de profissionais» com o botão «Entrar», e não chama a API. Antes, o visitante via a montra (inventada). Tornar a montra pública é tirar `requireAuth` da rota e passar o rate limit a por IP; é uma decisão de produto/privacidade (expõe nome, foto, avaliação e província de profissionais a qualquer pessoa), por isso não foi tomada por omissão.
- **Frontend:** `services/featuredWorks.ts` (tipo em snake_case, igual à API), `hooks/useFeaturedWorks.ts` (`staleTime` 5 min), `useHomeFeed` devolve `estado` (`sem-sessao` | `a-carregar` | `erro` | `vazio` | `pronto`) e `components/home/EstadoDaMontra.tsx` dá texto próprio a cada um — um erro de rede não parece «ainda não há trabalhos». O cartão abre o **catálogo do profissional** (`/profissionais/:id`) em vez da pesquisa por serviço. Os sliders por tema continuam a repartir uma só lista pedida (40) por serviço. Favoritos guardados com os ids antigos (`work-1`…) ficam órfãos no `localStorage` — inofensivo.
- **Sem migration:** só lê tabelas existentes. Agregação em JS (volume pequeno, testável com o `fakeSupabase`), como `clientHistoryService`. 5 leituras por chamada → rate limit de 30/min por utilizador.

**F. Fim do contrato legado do portfólio — backend (Adendo v1.23, item D cumprido).** Removidos `POST /professionals/me/portfolio`, `DELETE /professionals/me/portfolio/:id` e o campo `portfolio` de `GET /professionals/:id/catalog` (service, controller, rotas, OpenAPI e testes). O frontend em `main` já não os usa (confirmado por pesquisa no código). **Risco assumido:** um separador/PWA ainda na versão antiga do frontend que tente acrescentar ou apagar uma foto solta recebe 404 (e o catálogo deixa de mostrar a lista antiga) até recarregar; o aviso de nova versão (Adendo v1.29) existe para isso. As acções de auditoria `PROFESSIONAL_CATALOG_PHOTO_ADD/REMOVE` mantêm-se (os projectos continuam a usá-las; as linhas antigas do `audit_log` não se alteram).

**G. Verificação.** Frontend: `tsc -b`, `eslint` (só o aviso pré-existente de `AuthContext.tsx`), `vite build`, 325 testes Vitest, 15 testes E2E (Microsoft Edge, local). Backend: `tsc`, `eslint`, 501 testes. **Não verificado:** nenhuma destas alterações foi vista num browser real com o backend real; o endpoint de trabalhos em destaque **não foi corrido contra o Supabase real** (só contra o `fakeSupabase`) — as colunas `users_profile.province/district`, `professional_kyc.status` e `service_reviews.rating` são as das migrations existentes; confirmar com um pedido autenticado depois do deploy.

**Notas de deploy:** **backend primeiro** (rota nova; rotas legadas removidas), depois o frontend. Sem migrations nem variáveis de ambiente novas. O CI do frontend passa a instalar o Chromium do Playwright (`npx playwright install --with-deps chromium`) e a correr `npm run test:e2e` — mais ~2 minutos por execução; em falha guarda os `traces` como artefacto. Dependência nova (dev): `@playwright/test`. Não afecta o bundle.

**Critérios de entrega correspondentes:** `docs/PLANO_IMPLEMENTACAO_FRONTEND.md` (Fases 1, 3, 5, 6, 10 e 11) e `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md` (Fase 12 e Fase 14).

---

## Adendo v1.32

### Montra de trabalhos em destaque pública — frontend e backend (12/10/2026)

**Contexto.** O Adendo v1.31 (item E) deixou `GET /portfolio/featured` autenticado, com a decisão por confirmar: um visitante sem sessão via «Entra para ver trabalhos» em vez da montra. Decisão do utilizador (12/10/2026): **tornar a montra pública**, com os cuidados abaixo. **Este adendo substitui o ponto «Decisão por confirmar» do item E do v1.31.**

**A. O que é público — e só isto.** A rota passa a não exigir sessão. É uma **excepção deliberada** à regra «sem rotas públicas sem necessidade» (Adendo v1.17, item B), limitada a esta lista de cartões: o catálogo completo (`/professionals/:id/catalog`), a pesquisa, os contactos e os pedidos continuam com sessão.

**B. Cuidados implementados.**
- **Resposta mínima:** sem `professional_id` e sem `professional_avatar`; o nome sai **abreviado** («Carlos M.», `nomePublico`; nome de uma só palavra fica como está). Mantém-se «Província · Distrito», nunca bairro nem coordenadas. O `id` do cartão é o do **trabalho**, não o do profissional.
- **Só profissionais com KYC aprovado:** quem não está verificado não aparece em público (nem como «Verificado», que seria falso). O tipo `badge` deixa de ser `null`: é «Top Avaliado» ou «Verificado».
- **Rate limit por IP, 20/min** (era por utilizador, 30/min); `trust proxy` já estava activo para o IP real atrás do Fly.
- **Cache:** 5 minutos em memória do processo (chave = serviço × limite, tecto de 200 entradas) e `Cache-Control: public, max-age=300`. Em várias máquinas cada uma tem a sua cópia: o pior caso é uma leitura à base por máquina e por janela.
- OpenAPI: `acesso: 'publico'`.

**C. Frontend.** `useFeaturedWorks` deixa de depender da sessão; o estado `sem-sessao` da montra deixou de existir (`EstadoDaMontra` só tem carregar, erro e vazio). Como a resposta já não traz o id do profissional, o cartão volta a levar à **pesquisa do serviço** (`/profissionais?category=`), que exige sessão: o visitante passa pelo login e regressa a ela (`?next=`). Perde-se o atalho directo ao catálogo do v1.31.

**D. Consequências a conhecer.** (1) Qualquer pessoa, sem conta, lê nome abreviado, província/distrito, avaliação e foto de trabalhos de profissionais verificados — as fotos do bucket `portfolio-photos` já eram URLs públicas, e o profissional publica-as para serem vistas. (2) Os profissionais são avisados nos termos de utilização (`data/termosDeUtilizacao.ts`, secções 4 e 7, actualizados a 12/10/2026): o que se mostra, o que nunca se mostra e como retirar um trabalho (apagá-lo ou eliminar a conta; até 5 minutos por causa da cache). **Rascunho a rever por um jurista**, como o resto dos termos; quem já aceitou os termos antigos não foi notificado da alteração. (3) O rate limit por IP atrás do NAT de um operador móvel agrupa muitos utilizadores num só IP: 20/min é folgado para uma Home que pede uma vez e guarda 5 minutos, mas vigiar se aparecerem 429 a utilizadores reais.

**Verificação.** Backend: `tsc`, `eslint`, 505 testes (rota sem sessão, nome abreviado, só KYC aprovado, ausência de ids no corpo, cache, 429 ao 21.º pedido). Frontend: `tsc -b`, `eslint`, 323 testes, 15 E2E (o do visitante confirma que o pedido sai **sem** `Authorization` e que o clique leva ao login com o destino guardado). **Não visto contra o Supabase real nem em browser real.**

**Notas de deploy:** **backend primeiro** (a rota passa a responder 200 sem sessão; o frontend antigo, que só a chamava com sessão, continua a funcionar), depois o frontend. Sem migrations nem variáveis novas. `public/novidades.json` não mudou.

**Critérios de entrega correspondentes:** `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`, Fase 14; `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 6.

---

## Adendo v1.33

### Estados de erro do perfil e do onboarding — só frontend (12/10/2026)

**Contexto.** A auditoria do Adendo v1.31 (item C) encontrou, fora dos três ecrãs críticos, dois sítios onde um erro de rede não tinha tratamento à altura. Corrigidos agora.

**A. Histórico de pedidos em `Profile.tsx`.** Uma falha ao carregar os pedidos caía no estado vazio e mostrava «Nenhum pedido realizado» a quem tem pedidos — um erro que parece um dado. Passa a mostrar «Não foi possível carregar os teus pedidos…» com «Tentar de novo» (`refetch` da própria consulta).

**B. Onboarding (`OnboardingGate`, `CompletePhone`, `CompleteLocation`).** O erro ao carregar o perfil dizia «tenta novamente» sem forma de o fazer: quem estava ali ficava preso até recarregar a página à mão. Os três usam agora `components/ErroAoCarregarPerfil.tsx` (`role="alert"` + «Tentar de novo», que repete só o pedido do perfil). O bloco estava copiado três vezes; ficou num só componente.

**C. Testes.** `CompleteLocation.test.tsx` (novo: formulário, ordem do onboarding, não fica preso, carregar, erro com repetição); casos de repetição em `OnboardingGate` e `CompletePhone`; caso de erro do histórico em `Profile`. Suite a 329 testes; os 5 E2E de acesso continuam a passar.

**Notas de deploy:** só frontend; sem variáveis, migrations nem alterações ao backend. **Não verificado em browser real.**

**Critérios de entrega correspondentes:** `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 6 (item de estados de carregamento/erro).

---

## Adendo v1.34

### Opção de montra de demonstração na Home — só frontend (12/10/2026)

**Contexto.** Com a montra pública (Adendo v1.32) e ainda sem profissionais verificados com trabalhos, a Home mostra «Ainda não há trabalhos publicados». O utilizador pediu os dados inventados de volta, para avaliar o aspecto final com a montra cheia.

**A. Como funciona.** `VITE_MONTRA_DE_DEMONSTRACAO=true` (opcional, **desligada por omissão**): quando a API não devolve trabalhos, a Home mostra os 8 trabalhos de `src/data/trabalhosDeDemonstracao.ts` (os dados fixos de antes do Adendo v1.31, convertidos para o formato da API pública). Regras: (1) **com trabalhos reais mostram-se sempre só os reais**; (2) enquanto a API responde mostra-se o esqueleto, nunca dados inventados a piscar; (3) a Home mostra sempre o aviso «Dados de demonstração: estes profissionais, notas e fotos são inventados…»; (4) só o valor exacto `true` liga a opção. Os selos antigos («Artesanal», «Mais Pedido»…) já não existem na API: o cartão só sabe «Top Avaliado» e «Verificado», e os dados de demonstração foram mapeados para um destes.

**B. Porque não está sempre ligada.** Os dados são inventados (nomes, notas, números, fotos do Unsplash). Mostrados a visitantes sem aviso seriam publicidade enganosa; o aviso mitiga mas não elimina: **não ligar em produção aberta ao público**. Foi para isso que o Adendo v1.31 os removeu.

**C. Como usar.** Local: `VITE_MONTRA_DE_DEMONSTRACAO=true` no `.env` e `npm run dev`. Vercel (só para avaliar, num ambiente que não seja o público): definir a variável e fazer novo deploy — as `VITE_*` são lidas no build, não em runtime. Para acabar a avaliação, retirar a variável e voltar a fazer deploy. Documentada no `.env.example` com o que acontece se faltar.

**D. Testes.** A suite fixa a opção a vazio em `vitest.config.ts`, para um `.env` local com ela ligada não mudar os resultados. 6 testes novos em `useHomeFeed.test.ts` (desligada, ligada sem reais, ligada com reais, ainda a carregar, só `true` liga, formato dos dados). Suite a 335 testes.

**Notas de deploy:** variável nova, opcional (`VITE_MONTRA_DE_DEMONSTRACAO`); sem ela nada muda. Sem alterações ao backend.

**Critérios de entrega correspondentes:** `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 6 (trabalhos em destaque da Home).

## Adendo v1.35

### Home sem barra de navegação no rodapé — só frontend (13/10/2026)

**Contexto.** Pedido do utilizador, a partir de uma captura da Home em telemóvel: a barra flutuante do rodapé (`BottomNav`, só visível abaixo de `md`) é desnecessária, porque o cabeçalho e os atalhos «Começa por aqui» já levam aos mesmos destinos. Abre a branch `refactor/refinamento-telas`, reservada a refinamentos de ecrãs.

**A. O que mudou.** `BottomNav` removido da `Home` e o componente apagado (era o único consumidor). A margem inferior do `<main>` desceu de `7rem` para `2rem` + área segura, já que deixou de haver barra a cobrir. Nenhuma alteração de API, rotas ou variáveis.

**B. Verificar.** Home em telemóvel e tablet: sem barra, último bloco sem folga excessiva. Confirmar que Pedidos, Histórico/Catálogo e Perfil continuam alcançáveis (atalhos e menu do avatar).

**Notas de deploy:** nenhuma. **Critérios de entrega correspondentes:** `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 6 (polimento de UI).

## Adendo v1.36

### Perfil do profissional: layout em duas variantes — só frontend (13/10/2026)

**Contexto.** Pedido do utilizador, com duas referências visuais: só o layout e a UX são reaproveitados, a identidade visual (cores, tipografia) continua a do sistema (`piquete-*`).

**A. O que mudou** (`src/pages/ProfessionalCatalog.tsx`, rota `/profissionais/:id`).
- **Telemóvel e tablet (< `lg`):** foto a toda a largura, sem margens laterais e com o rodapé arredondado; por baixo o nome e os serviços, depois descrição e estatísticas, os trabalhos (um carrossel por trabalho, em duas colunas a partir de `md`) e as avaliações.
- **Desktop (`lg`+):** duas colunas. À esquerda a foto fixa (`sticky`) com o nome e os serviços sobre ela; à direita, em cartões, descrição e estatísticas, trabalhos e avaliações.
- Uma só árvore de DOM nas duas variantes (o bloco do nome muda de posição por CSS), para não duplicar o `h1`.

**B. Sem alterações** a API, dados, rotas ou variáveis. O perfil da própria conta (`/perfil`, `Profile.tsx`) **não** foi tocado.

**C. Verificar.** Abrir `/profissionais/:id` a 390 px, 768 px e 1280 px; sem foto de perfil (cai para a primeira foto de um trabalho, ou a inicial); sem trabalhos e sem avaliações; com o filtro de serviços (2 ou mais); como dono (barra «Editar o meu catálogo»).

**Notas de deploy:** nenhuma. **Critérios de entrega correspondentes:** `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 9 (catálogo do profissional) e Fase 6 (polimento de UI).

## Adendo v1.37

### Divisão dos componentes grandes de Perfil, Busca e Catálogo — só frontend (13/10/2026)

**Contexto.** Pedido do utilizador: nenhum ecrã pode ser um «God Component». Três páginas misturavam estado, regras e markup de vários blocos: `Profile.tsx` (560 linhas), `FindProfessionals.tsx` (598) e `ProfessionalCatalog.tsx` (414). `LocationForm.tsx` (213) ficou como está: tem uma só responsabilidade.

**A. O que mudou — sem alterar comportamento.** Cada página passa a compor blocos e fica entre 100 e 125 linhas.
- `Profile.tsx` → `components/profile/`: `FotoDoPerfil`, `IdentidadeDoPerfil`, `EstatisticasDaConta`, `DefinicoesDaConta` (dono do estado dos rascunhos e das passwords: monta-se ao abrir, e é isso que os repõe), `TelefoneRegistado`, `AtalhoDoCatalogo`, `HistoricoDePedidos` + `PedidoDoHistorico`, `PhoneIcon`.
- `FindProfessionals.tsx` → `components/busca/` (`BarraDePesquisa`, `FiltroDeCategorias`, `OrientacaoDoPedido`, `AvisoDeLocalizacao`, `ResultadosDaBusca`, `CartaoDeProfissional`, `BarraDeEnvioDoPedido`, ícones) e três hooks: `useFiltrosDaBusca` (filtros no URL com debounce), `useLocalizarSePermitido`, `useSelecaoParaPedido` (serviço pedido, número de profissionais a escolher, envio).
- `ProfessionalCatalog.tsx` → `components/catalogo/`: `FotoDoCatalogo`, `ApresentacaoDoProfissional`, `TrabalhosRealizados` (dono do filtro por serviço), `AvaliacoesDoProfissional`, `ResumoDeAvaliacao`, `Estrelas`, `EsqueletoDoCatalogo`, `rotulos`.
- Partilhados em `components/ui/`: `Mosaico` (estatística em mosaico, antes duplicada em duas páginas) e `IconeDeVisto` (o «visto» da insígnia, antes copiado cinco vezes).

**B. Sem alterações** a API, rotas, dados ou variáveis. Testes: 335 a passar, incluindo os 19 de `Profile.test.tsx` e os 16 de `FindProfessionals.test.tsx`, que não precisaram de mudar. Os blocos novos não têm testes próprios; são cobertos pelos das páginas.

**Notas de deploy:** nenhuma. **Critérios de entrega correspondentes:** `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 6 (polimento de UI).

## Adendo v1.38

### Correcções e melhorias nos ecrãs Perfil, Catálogo e Busca — só frontend (13/10/2026)

**Contexto.** Revisão dos ecrãs refinados no Adendo v1.37, a pedido do utilizador («faz todas as melhorias»).

**A. Defeitos corrigidos.**
- **`<h1>` em desktop.** O título estava num bloco com `lg:hidden` e o nome sobre a foto era um `<p>`: em desktop o ecrã ficava sem título para leitores de ecrã. Há agora um só `<h1>`, na `IdentidadeDoPerfil` / `IdentidadeDoProfissional`, que muda de lugar por CSS (por baixo da foto em telemóvel, sobre ela em desktop).
- **Selo «Verificado» retirado** do Perfil e do Catálogo: aparecia a todos (no Perfil, a qualquer papel que não fosse cliente, administradores incluídos) e nenhum dos dois contratos (`UserProfile`, `ProfessionalCatalog`) traz dado de verificação. Volta quando o backend expuser o estado do KYC. O texto inventado «Profissional qualificado disponível…» (sem bio) também saiu; o dono vê uma dica a pedir a descrição.
- **Botão «Pedir serviço» do Catálogo.** Levava a `/profissionais` sem contexto, com um rótulo («a este profissional») que o fluxo não permite — o pedido segue para 3 profissionais escolhidos na busca. Agora, com um só serviço, leva a `/profissionais?category=<slug>` («Pedir Canalização»); com vários, à busca geral («Pedir um serviço»); e diz que o pedido segue para 3 profissionais.
- **Mosaico «Papel»** substituído por «Concluídos» (pedidos com estado `COMPLETED`); mostrava «Cliente» a um administrador e repetia o papel já escrito sob o nome.

**B. Melhorias.**
- A lupa da busca passou a submeter (e Enter também) e aplica o texto sem esperar pelo debounce. O `autoFocus` só se aplica onde há rato (`(hover: hover)`), para não abrir o teclado por cima dos resultados em telemóvel.
- Ícones de categoria: tabela por slug (`CAMINHOS_DOS_ICONES`) com aviso na consola em desenvolvimento quando falta um. **Continua a ser preciso acrescentar o ícone aqui quando uma categoria nova entra na base de dados.**
- Desktop: a página rola inteira e a foto fica presa (`sticky`); antes a coluna direita tinha scroll próprio e a roda do rato não fazia nada sobre a foto. Retirado o avatar duplicado do cabeçalho do Catálogo.
- Casca partilhada `components/layout/LayoutDividido` (`LayoutDividido` + `ColunaDaFoto`), usada pelo Perfil e pelo Catálogo, em vez de copiada.

**C. Testes novos.** `ProfessionalCatalog.test.tsx`, `useSelecaoParaPedido.test.tsx`, `useFiltrosDaBusca.test.tsx`, `BarraDePesquisa.test.tsx`, `IconeDaCategoria.test.tsx`; `Profile.test.tsx` ganhou o único `<h1>`, a ausência do selo e as estatísticas.

**D. Verificar manualmente.** `/perfil` e `/profissionais/:id` a 390, 768 e 1280 px: um só título, foto presa ao rolar em desktop, nome sobre a foto em desktop e por baixo em telemóvel. Busca em telemóvel: o teclado não abre sozinho.

**Notas de deploy:** nenhuma. **Critérios de entrega correspondentes:** `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 6 (polimento de UI) e Fase 9.

## Adendo v1.39

### Dashboard de entrada do Admin — só frontend (13/10/2026)

**Estado: implementado em `feat/dashboard-admin`; por validar no browser.**

**Contexto.** Revisão do painel de administração a pedido do utilizador. Não existe uma dashboard: o atalho «Painel Admin» da Home abre `/admin/kyc`; Métricas (`/admin/metricas`) e Registo de auditoria (`/admin/audit-log`) não têm ligação a partir da Home; não há contadores de pendentes; a navegação entre ecrãs de admin é só um botão de voltar; os alertas de segurança só aparecem dentro do Registo de auditoria. A verificação do role `ADMIN` está repetida em seis páginas. Verificado que o backend protege todas as rotas `/admin/*` com `requireAuth` + `requireRole('ADMIN')` (lê `users_profile.role`, não o JWT).

**Decisão.** Nova rota `/admin` com cartões de atenção (KYC em análise, pedidos abertos, alertas de segurança 24h) e atalhos para os ecrãs, sem endpoint novo: usa `GET /admin/metrics` e `GET /admin/security-alerts`. Sem gráficos, mantendo a decisão do Adendo v1.9 D. A UI esconde, não autoriza — a autorização continua a ser do backend.

**Implementação.** `RotaDeAdmin` (guard de role na rota, em lugar dos seis guards inline), `NavegacaoAdmin` + `destinos.ts` (barra de separadores partilhada), `CartaoDeAtencao` (distingue a carregar, erro e zero), `pages/AdminDashboard.tsx` em `/admin`. A Home passa a apontar o atalho «Painel Admin» para `/admin`. 10 testes novos.

**Verificar manualmente.** Entrar como ADMIN: Home → «Painel Admin» abre `/admin` com os três contadores; cada cartão leva ao ecrã certo; a barra de separadores funciona em 390 px (desliza na horizontal) e em desktop; como CLIENT/PROFESSIONAL, `/admin` e `/admin/kyc` redireccionam para a Home.

**Alternativa rejeitada.** Endpoint dedicado `/admin/dashboard`: duplicaria agregados que a RPC `admin_metrics()` já devolve.

**Notas de deploy:** nenhuma (sem migração, sem variáveis). **Critérios de entrega correspondentes:** `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 12.

## Adendo v1.40

### Selo «Identidade verificada» no catálogo, ícones de categoria vigiados e documentação replicada — backend e frontend (13/10/2026)

**Contexto.** O Adendo v1.38 retirou o selo «Verificado» porque nenhum contrato trazia dados de verificação, e deixou pendentes: o selo, a vigilância dos ícones de categoria e a replicação desta documentação no backend.

**A. Backend — `GET /professionals/:id/catalog` ganha `identity_verified: boolean`.** É `true` só quando existe uma linha em `professional_kyc` do profissional com `status = 'APPROVED'` (a mesma fonte da montra de trabalhos, `featuredWorksService`); `PENDING`, `REJECTED` ou sem KYC dão `false`. Sem migration: a tabela e o enum já existiam. Campo novo e aditivo, por isso um frontend antigo continua a funcionar. Uma falha a ler o KYC devolve 500 em vez de `false` (esconder o erro mostraria «não verificado» a quem o está). Teste novo em `routes/catalog.test.ts` (cinco casos).

**B. Frontend.** `ProfessionalCatalog.identity_verified` (`services/catalog.ts`); `IdentidadeDoProfissional` mostra «Identidade verificada» só quando é `true`. O Perfil da própria conta continua **sem** selo: `UserProfile` não traz este dado e o profissional vê o estado do seu KYC no ecrã de verificação.

**C. Ícones de categoria.** A tabela passou para `components/busca/caminhosDosIcones.ts` (o ficheiro do componente só exporta componentes). Novo teste que lê as migrations do backend, **quando o repositório está na pasta ao lado**, e falha se uma categoria inserida não tiver ícone; sozinho (CI do frontend) o teste é ignorado e fica o aviso na consola em desenvolvimento.

**D. Ordem de deploy.** Backend primeiro (o campo novo), frontend depois. Se o frontend sair antes, `identity_verified` vem `undefined` e o selo simplesmente não aparece — sem erro.

**E. Por verificar.** Contra o Supabase real: pedir o catálogo de um profissional com KYC aprovado e de outro sem. Os ecrãs continuam por ver num browser e num telemóvel.

**Notas de deploy:** nenhuma migration, nenhuma variável. **Critérios de entrega correspondentes:** `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 9 e Fase 6; `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`, Fase 9.

## Adendo v1.41

### Painel de admin: subscrições e pagamentos (13/10/2026)

**Contexto.** Na revisão do painel (Adendo v1.39) o financeiro parecia bloqueado pela «Fase 5 do backend, que não existe». Era um comentário desactualizado: a Fase 5 existe (subscrições, transacções, activação manual pelo admin). Faltava a visão global.

**Decisão.** Modelo de cobrança **manual** (o admin confirma o pagamento recebido por fora; sem gateway). Três endpoints novos, sem migration: `GET /admin/subscriptions`, `GET /admin/payments`, `POST /admin/users/:id/subscription/revoke` (motivo obrigatório, vai para o audit log). Frontend: `/admin/subscricoes` e um cartão «a expirar (7 dias)» no dashboard. A janela de 7 dias é mais larga do que o aviso por email (3 dias) de propósito: o admin precisa de tempo para contactar.

**Notas de deploy:** nenhuma migration nem variável. Backend primeiro. **Critérios de entrega correspondentes:** frontend Fase 13; backend Fase 15.

## Adendo v1.42

### Painel de admin: fila de KYC por antiguidade, espera e reabertura (14/10/2026)

**Contexto.** A fila de revisão de KYC não dizia há quanto tempo cada pessoa esperava, não tinha ordem por antiguidade (ordenava por `id`, que é um UUID aleatório) e uma rejeição por engano não tinha volta.

**Decisão.** Coluna `submitted_at` (migration `20261014090000_kyc_submitted_at.sql`), fila FIFO, indicador «em atraso» acima de 48 h, motivos de rejeição frequentes no ecrã, e `POST /admin/kyc/:id/reopen` (só a partir de `REJECTED`, volta ao fim da fila). O histórico de decisões por revisor não ganha tabela: o audit log já o regista.

**Notas de deploy:** **migration primeiro** (a aplicar à mão no SQL Editor), depois o backend, depois o frontend. Sem variáveis novas. **Critérios de entrega correspondentes:** backend Fase 16; frontend Fase 14.

## Adendo v1.43

### Painel de admin: denúncias e moderação de conteúdo (14/10/2026)

**Contexto.** O único instrumento de moderação era banir a conta inteira. Fotos de portfólio e comentários de avaliações abusivos não tinham remédio proporcional, e não havia canal para os utilizadores denunciarem.

**Decisão.** Tabela `reports` com um só formato para quatro tipos de alvo; o admin vê uma fila (abertas, mais antigas primeiro) e resolve ou rejeita com nota obrigatória, podendo ocultar o conteúdo na mesma acção. Ocultar não apaga: o profissional vê o trabalho com o motivo, o admin pode repor, a prova mantém-se. Numa avaliação oculta-se só o comentário (a nota continua a contar para a média). Contas e pedidos moderam-se pelas vias que já existem (banir, cancelar). Frontend: botão «Denunciar» no catálogo do profissional (conta, trabalhos, comentários) e ecrã `/admin/moderacao`.

**Notas de deploy:** **migration primeiro** (`20261014100000_denuncias_e_moderacao.sql`, à mão no SQL Editor), depois o backend, depois o frontend. Sem variáveis novas. **Critérios de entrega correspondentes:** backend Fase 17; frontend Fase 15.

## Adendo v1.44

### Painel de admin: notas internas e disputas de pedidos (14/10/2026)

**Contexto.** Perante um caso (um profissional que pede reembolso, um pedido em disputa) a equipa não tinha onde deixar contexto uns para os outros, e o cliente e o profissional não tinham como assinalar um problema com um pedido.

**Decisão.** Tabela `admin_notes` (texto livre, só ADMIN, em contas e pedidos). A disputa reaproveita as denúncias do Adendo v1.43 com alvo `SERVICE_REQUEST`, limitada às duas partes do pedido. Frontend: secção «Notas internas» na ficha do utilizador e nos pedidos do admin, e «Reportar um problema» nos pedidos do cliente e do profissional.

**Notas de deploy:** **migration primeiro** (`20261014110000_notas_internas_admin.sql`), depois backend, depois frontend. Sem variáveis. **Critérios de entrega correspondentes:** backend Fase 18; frontend Fase 16.

## Adendo v1.45

### Painel de admin: gestão do catálogo de serviços (14/10/2026)

**Contexto.** Os serviços (Canalização, Pintura…) só se criavam ou renomeavam por SQL. Uma categoria nova pedia um programador.

**Decisão.** CRUD de admin sobre `service_categories`, sem migration. O slug é imutável e derivado do nome; as palavras-chave são normalizadas para a pesquisa; apagar um serviço em uso é recusado pela chave estrangeira (409). Frontend: ecrã `/admin/servicos`. Preço da subscrição e outros parâmetros comerciais **ficam fora**: continuam variável de ambiente.

**Atenção:** um serviço novo não tem ícone até se acrescentar o slug a `components/busca/caminhosDosIcones.ts` (o ecrã avisa).

**Notas de deploy:** nenhuma migration nem variável. Backend primeiro. **Critérios de entrega correspondentes:** backend Fase 19; frontend Fase 17.

## Adendo v1.46

### Painel de admin: comunicados por email a grupos de utilizadores (14/10/2026)

**Contexto.** A equipa não tinha como avisar os utilizadores (manutenção, novidades, aviso de segurança) sem usar uma ferramenta externa e as listas à mão.

**Decisão.** Comunicado por **email** a um grupo (clientes, profissionais ou todos; opcionalmente uma província), com pré-visualização do número de destinatários e confirmação desse número no envio. Tecto de 500 por comunicado, 5 envios por hora por admin, histórico em `broadcasts`. Reaproveita o `EmailService` e o layout base; o texto do admin é escapado. Notificações dentro da app e SMS ficam de fora: não há infraestrutura. Envio em segundo plano no próprio processo, sem fila — um reinício a meio deixa o registo em `SENDING` (documentado na Fase 20 do backend).

**Notas de deploy:** **migration primeiro** (`20261014120000_comunicados_admin.sql`), depois backend, depois frontend. Depende do SMTP já configurado (`SMTP_*`); sem ele os envios contam como falha. Sem variáveis novas. **Critérios de entrega correspondentes:** backend Fase 20; frontend Fase 18.

## Adendo v1.47

### Painel de admin: exportações CSV e funil de profissionais (14/10/2026)

**Contexto.** As métricas do painel são um retrato do momento: não dizem onde os profissionais se perdem (registo, KYC, pagamento, primeiro trabalho) nem deixam levar os dados para uma folha de cálculo.

**Decisão.** Três exportações CSV (utilizadores, pedidos, pagamentos) com filtros de data, tecto de 5000 linhas e **sem contactos** (telefone e email ficam de fora da exportação de utilizadores); e um funil de cinco etapas que conta pessoas. As células são neutralizadas contra CSV injection e o ficheiro leva BOM para o Excel. Cada exportação fica no audit log. Frontend: secção «Relatórios» em `/admin/relatorios`.

**Notas de deploy:** nenhuma migration nem variável. Backend primeiro. **Critérios de entrega correspondentes:** backend Fase 21; frontend Fase 19.

## Adendo v1.48

### Painel de admin: verificação em dois passos (14/10/2026)

**Contexto.** Uma conta de admin entra com palavra-passe ou Google, e o painel permite banir contas, activar subscrições e (desde o Adendo v1.46) enviar comunicados a centenas de pessoas. Uma só palavra-passe roubada chega a tudo isso.

**Decisão.** TOTP do Supabase Auth como segundo factor, **exigido no backend** (variável `ADMIN_REQUIRE_MFA`, desligada por omissão) em todas as rotas `/admin/*`, e **pedido no frontend**: `/admin/seguranca` regista o factor (código QR + código de 6 dígitos) e um admin que já o tem mas entrou só com a palavra-passe vê o ecrã de verificação antes do painel. A exigência no backend é a que protege; o ecrã é conveniência. Fica de fora a divisão do ADMIN em papéis (revisor de KYC, financeiro…), que pede uma decisão sobre que acção pertence a quem.

**Variável nova:** `ADMIN_REQUIRE_MFA` (backend, `fly secrets`). Se faltar: desligada. **Pré-requisito:** TOTP activo no Supabase (Authentication → Multi-Factor).

**Notas de deploy:** sem migration. Ordem: backend, frontend, **registar o factor de cada admin**, e só depois ligar `ADMIN_REQUIRE_MFA=true`. Ligar antes tranca os admins fora (`fly secrets set ADMIN_REQUIRE_MFA=false` repõe). **Critérios de entrega correspondentes:** backend Fase 22; frontend Fase 20.

## Adendo v1.49

### Painel de admin: estado do sistema (14/10/2026)

**Contexto.** Para saber se a base de dados, a cache e o email estão a funcionar, e se há comunicados presos ou denúncias por tratar, o admin tinha de pedir a quem tem acesso aos logs do Fly.

**Decisão.** Um endpoint de admin (`GET /admin/system-status`) com o estado de cada peça e três contadores de pendentes, e um ecrã `/admin/sistema` que o mostra e actualiza de 30 em 30 segundos. Só estado, nunca segredos nem URLs. **Fora:** estado dos jobs, erros recentes e fila de emails — pedem instrumentação que ainda não existe.

**Notas de deploy:** nenhuma migration nem variável. Backend primeiro. **Critérios de entrega correspondentes:** backend Fase 23; frontend Fase 21.

## Adendo v1.50

### Painel de admin: gestão de administradores (14/10/2026)

**Contexto.** O Adendo v1.9 (item G) deixava deliberadamente a promoção a ADMIN fora da API: só por `UPDATE` directo na base de dados. Isso obrigava a mexer em SQL para cada novo admin e não deixava rasto na auditoria. O programador pediu poder adicionar administradores a partir do painel.

**Decisão.** Passa a existir **um único sítio** onde se cria um ADMIN: `POST /admin/admins`, só acessível a quem já é ADMIN, com auditoria (`ADMIN_CREATE`, `ADMIN_PROMOTE`, `ADMIN_REVOKE`) e salvaguardas:
- cria a conta com palavra-passe provisória (mostrada uma vez, nunca guardada nem registada) ou promove uma conta de **cliente** existente; **profissionais não se promovem**;
- **remover = rebaixar a cliente**, nunca apagar; ninguém se remove a si próprio e nunca se remove o último administrador;
- limite de 10 alterações por hora por admin;
- `PATCH /admin/users/:id/role` continua a recusar ADMIN.

A segurança destas contas reforça-se com a verificação em dois passos (Adendo v1.48). Fica de fora a divisão do ADMIN em papéis (revisor de KYC, financeiro…).

**Script de administração.** `npm run admins -- listar | criar | palavra-passe | apagar` (backend, `service_role` do `.env`): cria o primeiro admin e serve de recuperação se o último for removido. Só apaga contas que sejam ADMIN.

**Operação de 14/10/2026 (script, Supabase real):** apagada a conta ADMIN de teste `admin.teste@piquetepro24-teste.com` (4 KYC por ela revistos ficam sem revisor); definida palavra-passe na conta ADMIN do programador, que entrava só por Google (mantida para preservar a identidade Google e a auditoria). Estado final: um ADMIN. A palavra-passe provisória foi entregue ao programador e **não consta de nenhum documento**.

**Notas de deploy:** nenhuma migration nem variável. Backend primeiro. **Critérios de entrega correspondentes:** backend Fase 24; frontend Fase 22.

## Adendo v1.51

### Empresas e equipas de técnicos (14/10/2026)

**Estado: plano aprovado pelo utilizador; implementado em `feat/empresas-equipas` (15/10/2026), só local, por validar no browser e contra o Supabase real.**

**Contexto.** O Adendo v1.4, item F, introduziu `professional_type` (`SINGULAR` / `COMPANY`) deixando o desenho para depois («o onboarding de empresa deve ser mais complexo»). A 14/10/2026 a verificação no código mostrou que `COMPANY` era só uma etiqueta: a empresa passava pelo mesmo KYC, pagava a mesma subscrição e era convidada, escolhida e atribuída como uma pessoa. Não havia forma de registar os profissionais da empresa nem de dizer ao cliente quem ia a casa dele.

**Decisões do utilizador:**
1. O **técnico tem login próprio**, criado pelo administrador da empresa (que lhe entrega uma palavra-passe provisória).
2. **Subscrição igual para todos** (paga a empresa, uma só). **Máximo de 15 técnicos activos por empresa.**
3. **KYC da empresa e de cada técnico**, os dois com a lógica que já existe para o singular. Não se cria KYC novo de empresa.
4. O técnico é atribuído **só depois de a empresa ser escolhida** pelo cliente.
5. **Avaliação da empresa e do técnico.**
6. Um singular **não se converte** em empresa (o histórico ficaria inconsistente): cria-se outra conta.
7. Os **Termos de utilização** dizem que a empresa responde pelos técnicos.

**Desenho.** A empresa **continua a ser o profissional** perante o sistema: convites, propostas, subscrição, catálogo e a nota que alimenta a pesquisa. O técnico é uma **conta própria com um papel novo, `TECHNICIAN`**, ligada à empresa por `company_members`. Um papel novo, e não um `PROFESSIONAL` disfarçado, é seguro por omissão: todas as rotas de profissional exigem `requireRole('PROFESSIONAL')`, logo o técnico não acede a nenhuma, e a pesquisa de profissionais nunca o lista. A elegibilidade do técnico para trabalhar é a da **empresa** (KYC + subscrição) **e** o **seu próprio KYC** aprovado. O contacto do cliente só vai à empresa e ao técnico atribuído (Secção 5 do TRD).

**Alternativa rejeitada.** Cada técnico como um profissional independente associado a uma empresa: duplicava subscrição e catálogo por pessoa, fazia o técnico aparecer na pesquisa e obrigava a reescrever convites e elegibilidade.

**Fases:** backend 25 (modelo e gestão da equipa), 26 (atribuição e trabalho do técnico), 27 (equipa no catálogo e avaliação do técnico), 28 (termos e administração); frontend 23 a 26.

**Fora de âmbito, como sugestões futuras:** documentos de empresa (alvará, representante legal) no KYC; agenda por técnico; atribuição sugerida por serviço e zona; aviso por WhatsApp ao técnico; selo «Equipa verificada».

**Notas de deploy:** 4 migrations, **por esta ordem**, aplicadas à mão antes do backend: `20261015090000_papel_tecnico.sql` (**sozinha**: um valor novo de enum não se usa na transação que o cria), `20261015100000_equipas_de_empresa.sql`, `20261015110000_atribuicao_de_tecnico.sql` e `20261015120000_avaliacao_do_tecnico.sql`. As duas últimas usam `on delete set null` para um técnico poder eliminar a conta mesmo com trabalhos no histórico. Backend primeiro, frontend depois. Sem variáveis novas. **Critérios de entrega correspondentes:** backend Fases 25 a 28; frontend Fases 23 a 26.

## Adendo v1.52

### Pedido direto: o contacto do profissional aparece ao «Solicitar serviço» (16/10/2026)

**Estado: implementado em `feat/pedido-direto`; por validar no browser e contra o Supabase real.**

**Contexto.** A Secção 5 do TRD e o Adendo v1.18 (item D) só revelavam o telefone do profissional **depois de o cliente escolher** uma proposta entre as de 3 profissionais. O utilizador quer que o cliente possa ver o contacto de um profissional (singular ou empresa) e ligar-lhe, mas **só ao carregar em «Solicitar serviço»**, e que o profissional só veja os dados do cliente ao carregar em **«Ver pedido»**. A razão é de produto: se os contactos estiverem à vista, ninguém regista pedidos, estados, fotos nem avaliações, e **sem dados a plataforma não é nada**. Obriga-se o fluxo pelo próprio mecanismo: **o número só se obtém criando um pedido.**

**Decisão.** Um **pedido direto a 1 profissional**: `POST /service_requests/direct` cria o pedido já atribuído ao profissional (ou à empresa) e devolve o contacto dele ao cliente; o profissional é avisado por email e vê o cliente ao abrir o pedido (`GET /service_requests/:id/contact`, que passa a registar a primeira abertura). O pedido a 3 profissionais com propostas **continua** a existir, com as regras de sempre.

**Salvaguardas contra contornar a plataforma** (o contacto é o ativo que protege a subscrição):
- só se pode pedir a um profissional **com KYC aprovado e subscrição ativa**: sem isso o número não sai, e não há pedido;
- **um pedido direto em curso por cliente e profissional**: um clique por profissional não dá um directório de telefones;
- o limite de criação de pedidos por hora do cliente aplica-se também aqui;
- ~~o catálogo e a pesquisa continuam a não mostrar telefones~~ (o catálogo passou a mostrá-lo: Adendo v1.53);
- o contacto do cliente continua a exigir, ao profissional, KYC aprovado e subscrição ativa (Secção 5, inalterada).

**Efeito nos Termos de utilização.** A secção 3 dizia que os contactos «só se revelam depois da escolha»: passa a descrever os dois caminhos (frontend, Fase 27).

**Alternativa rejeitada** (depois revertida no Adendo v1.53): mostrar o telefone no catálogo, para toda a gente.

**Fora de âmbito (a decidir):** o profissional recusar um pedido direto; lembretes para atualizar o estado do trabalho; exigir fotos ou avaliação antes de um novo pedido.

**Notas de deploy:** **migration primeiro** (`20261016090000_pedido_direto.sql`, à mão), depois backend, depois frontend. Sem variáveis novas. **Critérios de entrega correspondentes:** backend Fase 29; frontend Fase 27.
## Adendo v1.53

### Contacto do profissional à vista no catálogo (16/10/2026)

**Estado: implementado em `feat/pedido-direto`; por validar no browser e contra o Supabase real.**

**Decisão.** Por decisão expressa do utilizador, o nome e o telefone do profissional (singular ou empresa) ficam **sempre visíveis no catálogo**, sem clicar. **Substitui** o que o Adendo v1.52 dizia sobre o catálogo («continuam a não mostrar telefones») e a «alternativa rejeitada» desse adendo: o catálogo passa a mostrar o contacto. A Secção 5 continua a valer para o contacto do **cliente**.

**Como funciona.** `GET /professionals/:id/catalog` devolve `contact_available` e `phone`. O número só sai quando o profissional pode atender (KYC aprovado e subscrição ativa); caso contrário `phone` é `null` e o frontend explica porquê. É o telefone da empresa, nunca o de um técnico. A **pesquisa** continua sem telefones, para não haver uma lista de números.

**Risco aceite.** O contacto é o ativo que protege a subscrição, e o cliente que liga diretamente deixa de ter motivo para registar o pedido (estado, fotos, avaliação, e a prova de que o trabalho existiu). O utilizador foi avisado e manteve a decisão. Atenuação: «Solicitar serviço» continua em destaque, com a razão para registar o pedido, e os Termos recomendam-no. A condição KYC + subscrição ativa mantém-se como único travão.

**Efeito nos Termos de utilização.** A secção 3 deixa de dizer que os contactos «nunca estão à vista no catálogo»: descreve o telefone à vista enquanto o profissional estiver verificado e subscrito (frontend, Fase 28).

**Notas de deploy:** sem migrations nem variáveis novas (a migration `20261016090000_pedido_direto.sql` da Fase 29 foi aplicada a 16/10/2026). Backend primeiro, depois frontend: um frontend novo contra o backend antigo mostraria «contacto indisponível» a todos. **Critérios de entrega correspondentes:** backend Fase 30; frontend Fase 28.

## Adendo v1.54

### Correcção: captar a localização (16/10/2026)

**Estado: corrigido em `fix/captar-localizacao` (só frontend); por validar em dispositivo real.**

**Causas tratadas** (o sintoma exato não foi descrito): GPS com 10 s e sem fallback (agora GPS 8 s, depois localização aproximada 15 s com `maximumAge` de 10 min; sem permissão não repete); página http não segura (mensagem própria, em vez de «permissão negada»); coordenadas fora de Moçambique (mensagem própria; o backend continua a recusar com 400 — Secção de perfil, inalterada); geocodificação inversa com retry por omissão a atrasar a gravação (agora 1 repetição); erro do servidor na gravação passa a ser mostrado.

**Inalterado:** o contrato do backend (`PATCH /profile/location`, `GET /geocode/reverse`), a ordem Nominatim → OpenRouteService → Google, e a regra de que uma posição antiga nunca é tratada como atual.

**Notas de deploy:** só frontend; sem migrations nem variáveis novas. **Critérios de entrega correspondentes:** frontend Fase 29.

## Adendo v1.55

### O aviso de nova versão mostra o que realmente muda (14/10/2026)

**Estado: implementado em `fix/novidades-do-aviso` (só frontend).** Substitui o item C do Adendo v1.29 (ficheiro editado à mão).

**Contexto.** O aviso mostrava novidades e uma data de uma versão antiga: `public/novidades.json` não tinha sido actualizado nas entregas seguintes, e dizia «a última versão» a todos. O utilizador exige que mostre sempre o que realmente está a ser actualizado.

**Decisão.** (1) Histórico por versão em `src/data/novidadesPorVersao.json` (`versao`, `data`, 1 a 4 frases); a versão do `package.json` é a identidade da app (`__APP_VERSION__`). (2) O `/novidades.json` é gerado no build por um plugin do Vite, a partir do histórico, e **o build falha** se a versão do `package.json` não tiver entrada ou se esta for inválida. (3) O cliente mostra só as entradas **posteriores à versão que tem instalada**, com a data da mais recente; sem entradas novas, ou com o ficheiro em falha, o aviso aparece sem lista. (4) O ficheiro mantém `atualizadoEm` e `novidades` da versão publicada, porque as apps já instaladas (anteriores a esta versão) só conhecem esse formato.

**Alternativa não adoptada:** gerar as frases a partir dos commits. As mensagens de commit são técnicas e o aviso é para o utilizador final; manteve-se texto escrito à mão, agora obrigatório por versão.

**Limite conhecido.** A obrigação cobre «publicar uma versão nova sem texto», não «mexer no código sem subir a versão»: essa fica na regra do `CLAUDE.md` do frontend (cada entrega visível sobe a versão).

**Notas de deploy:** só frontend; sem variáveis novas. A Vercel corre `npm run build`, que passa a falhar sem entrada para a versão. **Critérios de entrega correspondentes:** frontend Fase 30.
