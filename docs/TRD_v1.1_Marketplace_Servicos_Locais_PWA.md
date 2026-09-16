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

Três funcionalidades adicionadas durante a implementação da Fase 2 (Autenticação & Perfis) que não estavam previstas no corpo original do TRD nem nos Adendos anteriores — registadas aqui como requisito formal, não apenas como decisão de implementação.

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
