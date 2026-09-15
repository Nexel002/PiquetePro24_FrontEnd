# TRD v1.1 — Documento de Requisitos Técnicos

| Campo | Detalhe |
|---|---|
| Projeto | Marketplace de Serviços Locais PWA (Moçambique) |
| Versão | 1.1 (+ [Adendo v1.2](#adendo-v12)) |
| Autor | Engenheiro de Software Lead |
| Estado | Aprovado para Desenvolvimento (Sprint 0) — Adendo v1.2 em revisão de engenharia |

## 1. Visão Geral da Arquitetura & Stack Tecnológica

| Camada | Tecnologia Escolhida | Justificação Técnica |
|---|---|---|
| Frontend / PWA | React + Vite + Tailwind CSS + Framer Motion | Alta performance, suporte offline nativo (Service Workers), suporte a HTML5 Geolocation. |
| Backend & API | Node.js | Deployed no Fly.io (Região jnb - Joanesburgo), responsável pela lógica de negócio e queries espaciais. |
| Backend & DB | Supabase (PostgreSQL + PostgREST + Auth + PostGIS) | Autenticação pronta, Row Level Security (RLS) e extensão espacial nativa PostGIS. |
| Alojamento & CDN | Vercel (Frontend) + Supabase Cloud (Cape Town af-south-1) | Latência de banco < 15ms para o backend no Fly.io e CDN com PoPs na África Austral. |
| Armazenamento | Supabase Storage (Buckets Privados/Públicos) | Gestão segura para documentos KYC (BI/NUIT) e galeria pública de portfólios. |

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
- `phone` (VARCHAR, UNIQUE, NOT NULL)
- `role` (user_role, DEFAULT 'CLIENT')
- `province` (TEXT) — ex: "Cidade de Maputo"
- `district` (TEXT) — ex: "KaLhamanculo"
- `neighborhood` (TEXT) — ex: "Xipamanine"
- `location` (GEOGRAPHY(POINT, 4326)) — Coordenadas GPS (Lng, Lat)
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
Regra de negócio: a atribuição (`OPEN` → `ASSIGNED`) deve ser atómica (ex. `UPDATE ... WHERE status = 'OPEN'` com verificação de `rowcount`) para evitar condições de corrida entre profissionais concorrentes.

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
