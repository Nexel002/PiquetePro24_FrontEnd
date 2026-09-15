# CLAUDE.md — Diretrizes de Engenharia e Convenções do Projeto

## Contexto do Projeto

Marketplace de Serviços Locais PWA para Moçambique.

- **Frontend / PWA:** React + Vite + TypeScript + Tailwind CSS + Framer Motion (Vercel) — **este repositório**
- **Backend API:** Node.js + Express + TypeScript (Fly.io — região `fra`, Frankfurt; ver Adendo v1.3 do TRD do backend) — repositório separado (`PiquetePro24_Backend`)
- **Database:** Supabase PostgreSQL + PostGIS (via backend; o frontend só fala com Supabase para Auth)

Documentos de referência, nesta ordem de precedência:

1. [`docs/TRD_v1.1_Marketplace_Servicos_Locais_PWA.md`](./docs/TRD_v1.1_Marketplace_Servicos_Locais_PWA.md) — requisitos técnicos, **incluindo Adendos v1.2 e v1.3, que têm precedência sobre o corpo original do TRD**
2. [`docs/PLANO_IMPLEMENTACAO_FRONTEND.md`](./docs/PLANO_IMPLEMENTACAO_FRONTEND.md) — fases, escopo e critérios de entrega

> **Estado atual:** Fase 0 (esqueleto Vite + PWA) implementada — ver critérios de entrega em `docs/PLANO_IMPLEMENTACAO_FRONTEND.md`. Deploy Vercel e ícones PWA reais ainda pendentes.

---

## 0. O contexto de uso manda no design

O público-alvo usa maioritariamente telemóveis de gama baixa em rede 3G/4G instável. Isto não é um caso de borda a tratar no fim — condiciona escolhas desde o início:

- **Mobile-first, sempre.** O desktop é o caso secundário.
- **Peso do bundle é uma decisão de produto**, não um detalhe técnico. Antes de acrescentar uma dependência, perguntar se compensa o custo de download numa rede lenta.
- **Offline e rede instável são o caminho normal**, não a exceção (ver Secção 4).
- **Animações não podem custar fluidez.** Framer Motion serve para dar feedback e continuidade, não para enfeitar. Respeitar `prefers-reduced-motion`.

## 1. Stack e decisões fixadas

Estas escolhas estavam em aberto no plano de implementação e ficam decididas aqui. Não reabrir sem motivo explícito:

| Área | Escolha | Porquê |
|---|---|---|
| Linguagem | TypeScript (`strict: true`) | Contratos de API tipados; apanha erros antes do runtime |
| Estado de servidor | **TanStack Query** | Cache, refetch e `isLoading`/`isError` de raiz; scroll infinito na Fase 2 |
| Estado global (sessão, role) | **Context API** | Objeto pequeno que muda raramente; evita uma dependência |
| Cliente HTTP | **axios** | Interceptors para injetar JWT e desempacotar o envelope num só sítio |
| PWA | `vite-plugin-pwa` | Service Worker e manifest, conforme Secção 6 do TRD |

Regra de fronteira: **estado de servidor vive no TanStack Query, não em Context.** Copiar dados da API para Context duplica a fonte de verdade e gera ecrãs dessincronizados.

## 2. Estrutura e componentes

- Estrutura: `src/pages`, `src/components`, `src/hooks`, `src/services`, `src/lib`, `src/store`.
- Componentes funcionais tipados. Preferir tipar as props diretamente a usar `React.FC` (que dificulta genéricos e impõe `children` implícito).
- `src/services/` — chamadas à API e mapeamento das respostas. Um componente não chama `axios` diretamente.
- Tailwind para estilo. Evitar CSS solto paralelo ao Tailwind; quando um padrão se repete, extrair um componente, não uma classe global.

## 3. Consumo da API

- **Envelope do backend:** endpoints de negócio respondem `{ success: boolean, data?: T, error?: string }`. O wrapper axios desempacota isto num sítio só, para os componentes receberem `T` e não o envelope.
  - **Exceção:** `GET /health` responde `{ status, database }` sem envelope (é consumido pelo health-check do Fly.io). O frontend normalmente não o chama.
- **Toda a chamada de API trata três estados visuais:**
  1. `isLoading` — skeleton loader, não um spinner em ecrã vazio
  2. `isError` — mensagem compreensível para o utilizador, nunca o erro técnico cru
  3. `data` — o componente com dados
  E, onde se aplique, um quarto: **lista vazia** ("nenhum profissional encontrado nesta área") é diferente de erro e diferente de carregar.
- **Erros de negócio precisam de mensagem própria.** Um `409` ao aceitar um pedido já atribuído diz "Este pedido já foi aceite por outro profissional", não "Erro 409". A concorrência é esperada pelo desenho do backend (update condicional atómico), não é uma falha.
- **Nunca usar a `service_role` key do Supabase no frontend.** O frontend só usa a chave pública (`anon`/`publishable`), que respeita RLS. A `service_role` ignora RLS e vive apenas no backend.

## 4. Geolocalização, offline e resiliência

- **Fallback manual não é opcional.** Quando `navigator.geolocation` falha, é recusada ou demora, a seleção Província → Distrito → Bairro tem de estar disponível. Para boa parte dos utilizadores este é o caminho normal, não a exceção.
- Guardar a última localização conhecida (`localStorage`/IndexedDB) e usá-la enquanto o GPS não responde.
- Distâncias vêm do backend em **metros** (`distance_m`); a formatação para leitura ("1,2 km") é responsabilidade do frontend.
- **Ações críticas offline** (ex. criar um pedido) vão para fila local e sincronizam ao reconectar, com chave de idempotência para não duplicar se o retry coincidir com um sucesso anterior.
- Indicador visível de estado de conectividade.
- Estratégias de cache do Service Worker (Secção 6 do TRD): Stale-While-Revalidate para o shell, **Network-First para chamadas à API** — dados de proximidade e estado de pedidos não podem vir de cache desatualizada.

## 5. Acessibilidade

- WCAG AA como mínimo: contraste, labels em todos os campos de formulário, navegação por teclado, foco visível.
- Alvos de toque adequados a uso móvel.
- Estados comunicados por texto ou ícone, nunca só por cor.

## 6. Segredos e configuração

- **Tudo o que tem prefixo `VITE_` acaba no bundle e é público.** Nunca pôr aí um segredo.
- No frontend só entram: `VITE_API_URL`, `VITE_SUPABASE_URL` e a chave pública do Supabase.
- `.env` não vai para controlo de versão; `.env.example` documenta as variáveis necessárias.

## 7. Comandos Úteis do Repositório

A definir na Fase 0, quando o projeto Vite for inicializado. Previsão:

- `npm run dev` — servidor de desenvolvimento (Vite, porta 5173 por omissão)
- `npm run build` — compilação TypeScript + build de produção
- `npm run preview` — servir o build localmente (necessário para testar o Service Worker, que não corre igual em `dev`)
- `npm run lint` — ESLint + Prettier

**Nota sobre portas:** o backend local corre em `PORT=3000` (ou `3050`, se 3000 estiver ocupada por outro projeto nesta máquina). O `CORS_ORIGIN` do backend tem de corresponder à porta do Vite (`5173`).

## 8. Coordenação com o Backend

- O contrato de referência é a documentação OpenAPI publicada pelo backend. Enquanto um endpoint não existir, trabalhar contra um mock que siga esse schema — não inventar formatos.
- As fases deste repositório dependem das do backend: Fase 1 ↔ Backend Fase 2, Fases 2-3 ↔ Backend Fase 3, Fase 4 ↔ Backend Fases 4-5, Fase 7 ↔ Backend Fase 7.
- Regras de negócio com impacto visível no frontend (ver TRD Secção 5): o contacto e endereço exato de um cliente só são visíveis a profissionais com subscrição `ACTIVE` **e** KYC `APPROVED`. Quando faltar uma das condições, a UI explica **o que falta**, em vez de um botão desativado sem contexto.

---

## Convenções de Git

- Mensagens de commit em português, no imperativo ("Adiciona", "Corrige", "Implementa").
- Não commitar `.env`.
