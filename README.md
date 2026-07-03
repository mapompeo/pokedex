# Pokédex

Projeto de estudo em Angular + TypeScript consumindo a [PokéAPI](https://pokeapi.co/).

## Funcionalidades

- Listagem de pokémons com scroll infinito
- Busca por nome
- Filtro por tipo (multi-seleção)
- Favoritos persistidos em `localStorage`
- Comparação lado a lado entre 2 pokémons

## Rodando localmente

```bash
npm install
ng serve
```

Acesse `http://localhost:4200`.

## Stack

- Angular (standalone components) + TypeScript
- Angular Material
- Signals para estado (sem NgRx)
- PokéAPI (sem chave de API)
