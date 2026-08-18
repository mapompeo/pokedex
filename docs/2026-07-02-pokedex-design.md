# Pokédex - Design

**Data:** 2026-07-02
**Objetivo:** projeto de aprendizado/portfólio (nível júnior/estagiário) para praticar Angular + TypeScript com uma API pública real.

## 1. Stack

- Angular (standalone components, versão atual estável) + TypeScript
- Angular Material (UI: cards, chips, toolbar, dialog, spinner, snackbar)
- Gerenciamento de estado: Services + Signals (sem NgRx, sem RxJS Subjects manuais)
- Fonte de dados: [PokéAPI](https://pokeapi.co/api/v2/) (pública, sem autenticação)
- Sem testes automatizados nesta v1
- Repositório local: `C:\repositories\pokedex`

## 2. Escopo v1 (features)

- Listagem de pokémons com **scroll infinito**
- Busca por nome
- Filtro por tipo com **multi-seleção (chips)** - interseção quando mais de um tipo selecionado
- Tela de detalhes ao clicar em um pokémon (stats, sprites, tipos, altura/peso)
- **Favoritos**: marcar/desmarcar na lista e nos detalhes, persistidos em `localStorage`; tela dedicada listando só favoritos
- **Comparação**: selecionar até 2 pokémons na lista (checkbox/botão "comparar"), navegar para tela de comparação lado a lado

## 3. Estrutura de pastas

```
src/app/
├── core/
│   ├── models/          # interfaces: Pokemon, PokemonListItem, PokemonType...
│   ├── services/
│   │   ├── pokemon.service.ts      # chamadas HTTP à PokeAPI + cache em memória
│   │   └── favorites.service.ts    # signal com favoritos + persistência em localStorage
├── features/
│   ├── pokemon-list/     # lista com scroll infinito, busca, filtro por tipo (chips)
│   ├── pokemon-detail/   # tela de detalhes
│   ├── favorites/        # tela listando só os favoritos
│   └── compare/          # tela de comparação lado a lado (2 pokémons)
├── shared/
│   ├── components/       # pokemon-card, type-chip, loading-spinner (reutilizáveis)
└── app.routes.ts         # rotas: /, /pokemon/:id, /favoritos, /comparar
```

Cada feature é standalone e só se comunica com as demais via `PokemonService` / `FavoritesService` e roteamento - sem acoplamento direto entre features.

## 4. Fluxo de dados e estado

### `PokemonService`
- `getPokemonPage(offset, limit)`: lista paginada (`/pokemon?offset=X&limit=20`) - alimenta o scroll infinito
- `getPokemonDetail(nameOrId)`: detalhes completos de 1 pokémon, com cache em `Map` para evitar rebuscar
- `getTypes()`: lista de tipos disponíveis, popula os chips do filtro
- Filtro por tipo: a PokeAPI não permite filtrar a lista paginada por tipo diretamente. Ao selecionar tipo(s), o service busca `/type/{tipo}` (retorna todos os pokémons daquele tipo) e faz o cruzamento client-side. Com múltiplos tipos, faz interseção dos conjuntos.

### `FavoritesService`
- `signal<Set<number>>` com IDs favoritados, sincronizado com `localStorage` via `effect()`
- `toggleFavorite(id)`, `isFavorite(id)`

### Comparação
- `pokemon-list` mantém `signal<number[]>` local com até 2 IDs selecionados; ao atingir 2, libera botão "Comparar" → navega para `/comparar?a=ID1&b=ID2`
- Tela de comparação lê os query params, busca os 2 detalhes via `PokemonService`, renderiza lado a lado (stats, tipos, altura/peso)

## 5. Tratamento de erros e edge cases

- Erro de rede/API fora do ar: interceptor HTTP captura falhas e emite `MatSnackBar` amigável, sem quebrar a tela
- Busca sem resultado: estado vazio "Nenhum pokémon encontrado"
- Scroll infinito: para de disparar requisições ao ultrapassar o total de pokémons (~1300)
- Favoritos: se `localStorage` falhar (ex: modo privado), falha silenciosamente sem quebrar a navegação
- Comparação com ID inválido na URL: redireciona para a lista com mensagem de erro

## 6. Fora de escopo (v1)

- Testes automatizados (fica para uma v2)
- Autenticação/backend próprio
- Cadeia de evolução completa (ideia de v2 - a API oferece, mas exige chamadas extras)
