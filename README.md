# Pokédex

Projeto de estudo em **Angular + TypeScript**, construído para praticar arquitetura de componentes standalone, gerenciamento de estado com Signals e consumo de uma API REST pública ([PokéAPI](https://pokeapi.co/)).

## Funcionalidades

- **Listagem de pokémons** com scroll infinito
- **Busca por nome** sobre a lista completa (~1300 pokémons), não só os já carregados na tela
- **Filtro por tipo** com múltipla seleção (ex: fogo + voador)
- **Detalhes do pokémon**: sprite, tipos, altura, peso e stats
- **Favoritos** persistidos em `localStorage`, com tela dedicada
- **Comparação** lado a lado entre 2 pokémons, escolhidos por busca com autocomplete

## Stack

- [Angular](https://angular.dev/) (standalone components, sem NgModules)
- TypeScript
- [Angular Material](https://material.angular.io/)
- Signals para estado da aplicação (sem NgRx, sem RxJS `Subject`/`BehaviorSubject`)
- [PokéAPI](https://pokeapi.co/) — API pública, sem necessidade de chave

## Como rodar localmente

Pré-requisitos: [Node.js](https://nodejs.org/) e [Angular CLI](https://angular.dev/tools/cli) instalados.

```bash
npm install
ng serve
```

Acesse `http://localhost:4200`.

## Estrutura do projeto

```
src/app/
├── core/
│   ├── models/          # Interfaces de domínio (Pokemon, PokemonType, ...)
│   ├── services/        # PokemonService (PokéAPI) e FavoritesService (localStorage)
│   └── interceptors/     # Interceptor global de erros HTTP
├── shared/
│   └── components/       # Componentes reutilizáveis (card, filtro de tipo, spinner)
├── features/
│   ├── pokemon-list/      # Tela principal: listagem, busca e filtro
│   ├── pokemon-detail/    # Tela de detalhes de um pokémon
│   ├── favorites/         # Tela de favoritos
│   └── compare/           # Tela de comparação entre 2 pokémons
└── app.routes.ts
```

Cada feature é isolada e se comunica com as demais apenas através dos services e do roteamento — sem acoplamento direto entre telas.

## Decisões de arquitetura

- **Sem gerenciador de estado externo (NgRx):** o estado da aplicação vive em dois services (`PokemonService`, `FavoritesService`) usando Signals. Para o tamanho deste projeto, é suficiente e evita boilerplate desnecessário.
- **Sprites sem chamadas extras:** a URL do sprite de cada pokémon na listagem é construída diretamente a partir do ID (`raw.githubusercontent.com/PokeAPI/sprites`), sem precisar buscar o detalhe completo de cada item só para exibir uma imagem.
- **Busca com dataset completo:** como a PokéAPI não oferece busca textual parcial, a busca por nome carrega uma única vez a lista completa de nomes (uma chamada leve, sem sprites/detalhes) e filtra localmente — assim encontra qualquer pokémon, mesmo sem ele já ter sido carregado pelo scroll infinito.
- **Sem testes automatizados nesta versão:** decisão consciente para focar no aprendizado de Angular em si; validação é feita manualmente via `ng build` e testes no navegador.

## Possíveis melhorias futuras

- Testes automatizados (unitários e e2e)
- Refinar UI/UX (layout, responsividade, identidade visual)
- Cadeia de evolução na tela de detalhes
- Paginação/scroll infinito também no filtro por tipo combinado com busca

## Autor

Matheus Pompeo
