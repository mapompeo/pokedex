# 🔴 Pokédex

<div align="center">

![Angular](https://img.shields.io/badge/Angular-20-DD0031?style=for-the-badge&logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript)
![Angular Material](https://img.shields.io/badge/Angular_Material-20-757575?style=for-the-badge&logo=angular)
![RxJS](https://img.shields.io/badge/RxJS-7.8-B7178C?style=for-the-badge&logo=reactivex)

**Pokédex completa em Angular, consumindo a PokéAPI em tempo real - sem backend próprio**

[Sobre](#sobre) • [Stack](#stack) • [Como Usar](#-como-usar) • [Arquitetura](#-arquitetura) • [Decisões](#-decisões-de-arquitetura)

</div>

---

## Sobre

Pokédex é um projeto de estudo em **Angular 20 + TypeScript**, construído para praticar arquitetura de componentes standalone, gerenciamento de estado com **Signals** (sem NgRx) e consumo de uma API REST pública, a [PokéAPI](https://pokeapi.co/).

### O que a aplicação entrega

- **Listagem de pokémons** com scroll infinito sobre os ~1300 pokémons da PokéAPI
- **Busca por nome** sobre a lista completa, não só os já carregados na tela
- **Filtro por tipo** com múltipla seleção (ex: fogo + voador)
- **Detalhes do pokémon**: sprite, tipos, altura, peso, stats, habilidades, movimentos e cadeia de evolução
- **Favoritos** persistidos em `localStorage`, com tela dedicada
- **Comparação** lado a lado entre 2 pokémons, escolhidos por busca com autocomplete
- **Meu Time**: monte um time de até 6 pokémons (drag-and-drop pra reordenar), com análise de cobertura de tipos - fraquezas, resistências e sugestão de contra-picks
- **Traduções pt-BR sob demanda**: nomes de habilidades e movimentos sem tradução oficial na PokéAPI são traduzidos via [MyMemory](https://mymemory.translated.net/) e cacheados em `localStorage`
- **Instalável como PWA** (service worker + manifest), com tema claro/escuro persistido localmente

---

## Stack

- [Angular 20](https://angular.dev/) - standalone components, sem NgModules
- TypeScript 5.8 (modo `strict`)
- [Angular Material](https://material.angular.io/) - ícones e componentes de UI
- **Signals** para todo o estado da aplicação (sem NgRx, sem `Subject`/`BehaviorSubject`)
- **RxJS** apenas para orquestrar chamadas HTTP (`switchMap`, `forkJoin`, `takeUntilDestroyed`)
- [PokéAPI](https://pokeapi.co/) - API pública, sem necessidade de chave/autenticação

---

## 🏗️ Arquitetura

```
HTTP (PokéAPI)
    ↓
PokemonService (cache em memória + mapeamento DTO → modelo de domínio)
    ↓
Componentes standalone (Signals: pokemon, extras, loading, activeTab, ...)
    ↓
Template (Angular control flow: @if / @for / @switch)
```

### Camadas

- **`core/services`** - `PokemonService` (toda a integração com a PokéAPI, incluindo cache e montagem da cadeia de evolução), `FavoritesService` e `TeamService` (persistidos em `localStorage`) e `TranslationService` (traduções sob demanda, com cache)
- **`core/models`** - interfaces de domínio (`PokemonDetail`, `PokemonExtras`, `PokemonListItem`, ...), desacopladas do formato bruto da API
- **`core/interceptors`** - interceptor HTTP global de erros
- **`shared/components`** - componentes reutilizáveis (card, skeleton do card, badge de tipo, spinner, seletor de pokémon, gráfico de radar de stats)
- **`shared/*.ts`** - helpers puros reutilizados entre features (formatação, cores/tradução de tipos, cálculo de efetividade, storage JSON, efeito de digitação do placeholder)
- **`features`** - uma pasta por tela (`pokemon-list`, `pokemon-detail`, `favorites`, `compare`, `team`), cada uma isolada e lazy-loaded via rotas

### Por que Signals em vez de NgRx?

Para o tamanho deste projeto, um gerenciador de estado externo seria over-engineering: o estado inteiro cabe em dois services (`PokemonService`, `FavoritesService`) usando Signals nativos do Angular, sem o boilerplate de actions/reducers/selectors. Se a aplicação crescesse (múltiplas fontes de estado compartilhado, undo/redo, dev tools de time-travel), aí valeria reavaliar.

---

## 🚀 Como Usar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [Angular CLI](https://angular.dev/tools/cli) (`npm install -g @angular/cli`, opcional - o `npx ng` também funciona)

### Instalação local

```bash
# Clone o repositório
git clone https://github.com/mapompeo/pokedex.git
cd pokedex

# Instale as dependências
npm install

# Rode a aplicação
npm start
```

Acesse **http://localhost:4200**.

### Build de produção

```bash
npm run build
```

Os artefatos ficam em `dist/pokedex`. As URLs da PokéAPI usadas em cada ambiente vêm de `src/environments/environment.ts` (dev) e `environment.prod.ts` (produção), trocados automaticamente pelo Angular CLI via `fileReplacements`.

---

## Estrutura do Projeto

```
src/app/
├── core/
│   ├── models/           # Interfaces de domínio (PokemonDetail, PokemonExtras, ...)
│   ├── services/         # PokemonService (PokéAPI), FavoritesService/TeamService
│   │                     # (localStorage) e TranslationService (MyMemory, com cache)
│   └── interceptors/     # Interceptor global de erros HTTP
├── shared/
│   ├── components/       # Componentes reutilizáveis (card, skeleton-card, type-badge, spinner, picker, radar-chart)
│   └── *.ts              # Helpers de formatação, tradução (pt-BR) e storage
├── features/
│   ├── pokemon-list/     # Tela principal: listagem, busca e filtro por tipo
│   ├── pokemon-detail/   # Detalhes, stats, evolução e movimentos
│   ├── favorites/        # Tela de favoritos
│   ├── compare/          # Comparação entre 2 pokémons
│   └── team/             # Monte seu time (drag-and-drop) e análise de cobertura
└── app.routes.ts         # Rotas lazy-loaded por feature
```

Cada feature é isolada e se comunica com as demais apenas através dos services e do roteamento - sem acoplamento direto entre telas.

---

## 💡 Decisões de Arquitetura

- **Sem gerenciador de estado externo (NgRx):** estado vive em Signals dentro de `PokemonService`/`FavoritesService`. Suficiente para o tamanho do projeto, evita boilerplate.
- **Sprites sem chamadas extras:** a URL do sprite de cada pokémon na listagem é construída direto a partir do ID (`raw.githubusercontent.com/PokeAPI/sprites`), sem buscar o detalhe completo só para exibir uma imagem.
- **Busca com dataset completo:** como a PokéAPI não oferece busca textual parcial, a busca por nome carrega uma vez a lista completa (uma chamada leve, sem sprites/detalhes) e filtra localmente - encontra qualquer pokémon, mesmo sem ele já ter sido carregado pelo scroll infinito.
- **Cancelamento de requisições em cascata:** navegação entre pokémons e alternância de favoritos usam `switchMap`, cancelando automaticamente uma requisição em andamento se uma nova começar antes dela responder - evita que uma resposta lenta e antiga sobrescreva dados mais recentes na tela.
- **Sem testes automatizados nesta versão:** decisão consciente para focar no aprendizado de Angular em si; validação é feita via `ng build` e testes manuais no navegador.

## 🔭 Possíveis Melhorias Futuras

- Testes automatizados (unitários e e2e)
- Cache com invalidação/expiração no `PokemonService`
- Paginação/scroll infinito também no filtro por tipo combinado com busca

---

## 👨‍💻 Autor

**Matheus Pompeo**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/matheuspompeo/)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/mapompeo)

---

<div align="center">

**⭐ Se este projeto te ajudou, considere dar uma estrela!**

Made with ❤️ and Angular

</div>
