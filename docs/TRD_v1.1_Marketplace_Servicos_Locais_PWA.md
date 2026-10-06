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

**Estado de implementação (06/10/2026):** Bloco A (serviços e pesquisa) em produção. Bloco B (pedido a 3 profissionais, propostas, escolha e emails) em produção (migration aplicada ao Supabase e deploy v41 no Fly, 06/10/2026). Bloco C (histórico do cliente): backend implementado a 07/10/2026 — `GET /clients/me/professionals` (só `CLIENT`; profissionais de pedidos `COMPLETED` do próprio cliente, com nº de trabalhos, último trabalho e a avaliação que o cliente deu), sem migration nova; frontend por fazer. Ver `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`, Fase 11.

**Extensão da Secção 5 (implementada no Bloco B):** o dono do pedido vê o nome e o telefone do profissional escolhido (`GET /service_requests/:id/professional`), e só depois de o escolher — antes disso o endpoint responde `409`, e nunca a outro cliente (`403`). O contacto e a morada exacta do cliente continuam reservados ao profissional escolhido, com KYC aprovado e subscrição ativa. O convite recebido por um profissional (email e ecrã) só leva o título, a descrição e a hierarquia de localização escrita pelo cliente.

**Critérios de entrega correspondentes:** ver `Doc's/PLANO_IMPLEMENTACAO_BACKEND.md`, Fase 11, e `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`, Fase 10.
