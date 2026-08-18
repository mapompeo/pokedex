# Pokédex - Tema Visual "Kanto Pokédex" - Design

**Data:** 2026-07-03
**Objetivo:** substituir o visual genérico (Material padrão) por uma identidade visual inspirada na Pokédex clássica da região de Kanto (jogos Red/Blue e anime) - carcaça vermelha, luzes decorativas, tipografia retrô nos títulos - mantendo a legibilidade e a estrutura de componentes já existente (Angular Material re-temado, sem reescrever componentes do zero).

## 1. Conceito geral

A aplicação ganha uma "moldura de dispositivo" que remete à Pokédex física, mas adaptada de forma responsiva - não é uma carcaça literal ocupando a tela toda, e sim um tratamento visual que muda de forma conforme o tamanho de tela:

- **Desktop/tablet:** o conteúdo de cada tela fica dentro de um "cartucho de tela" vermelho com cantos bem arredondados e luzes decorativas (azul, amarelo, verde) no canto superior esquerdo - como se estivesse olhando para a telinha do aparelho. Essa moldura fica **fixa** (viewport), e apenas o conteúdo interno (lista de cards, detalhes) rola dentro dela.
- **Mobile:** a moldura completa desaparece; vira uma **barra de topo vermelha temática** com as mesmas luzes decorativas, sem bordas laterais consumindo espaço da tela pequena. O conteúdo abaixo dela ocupa a largura toda e rola normalmente.

Esse tratamento se aplica de forma consistente nas 4 telas existentes: listagem, detalhes, favoritos e comparar.

## 2. Paleta de cores

Baseada nas cores oficiais da marca Pokémon (reconhecíveis, ligadas ao Kanto/gen 1):

| Token | Uso | Cor |
|---|---|---|
| `--pokedex-red` | Moldura, barra de topo, botão primário | `#CC0000` |
| `--pokedex-red-dark` | Sombra/borda da moldura | `#A00000` |
| `--pokedex-blue` | Luz decorativa grande, destaques secundários | `#3B4CCA` |
| `--pokedex-yellow` | Luz decorativa pequena, destaques de CTA | `#FFDE00` |
| `--pokedex-green` | Luz decorativa pequena | `#2ECC71` |
| Fundo do conteúdo | Área de cards/listas | Branco / cinza claro (mantém o que já existe hoje - sem mudança) |

Essas três cores (vermelho, azul, amarelo) são as cores oficiais da marca Pokémon - dá pra reconhecer a referência sem depender de assets licenciados.

**Badges de tipo:** cada card e a tela de detalhes ganham um badge colorido por tipo, usando a paleta convencional já usada pela comunidade/jogos:

| Tipo | Cor | Tipo | Cor |
|---|---|---|---|
| normal | `#A8A878` | fighting | `#C03028` |
| fire | `#F08030` | poison | `#A040A0` |
| water | `#6890F0` | ground | `#E0C068` |
| electric | `#F8D030` | flying | `#A890F0` |
| grass | `#78C850` | psychic | `#F85888` |
| ice | `#98D8D8` | bug | `#A8B820` |
| rock | `#B8A038` | ghost | `#705898` |
| dragon | `#7038F8` | dark | `#705848` |
| steel | `#B8B8D0` | fairy | `#EE99AC` |

## 3. Tipografia

- **Títulos/logo** (ex: "POKÉDEX" na barra de topo): fonte pixelada/retrô (ex: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P), via Google Fonts) - reforça o clima 8-bit sem comprometer a leitura, já que é usada só em textos curtos e grandes.
- **Todo o resto** (nomes de pokémon, stats, botões, labels, mensagens): mantém a fonte padrão do Material (Roboto), para preservar legibilidade em blocos de texto e listas.

## 4. Estilo dos componentes (Angular Material)

Abordagem de **retema, não substituição**: os componentes Material continuam sendo os mesmos (`mat-card`, `mat-button`, `mat-chip`, `mat-form-field`, `mat-autocomplete` etc.), só trocando:
- A paleta de cores do tema Angular Material (`primary` = vermelho Pokédex, `accent` = amarelo, cores de erro mantidas padrão)
- `border-radius` mais generoso nos cards e botões (visual mais "arredondado/gadget", menos "caixa quadrada corporativa")

Não há reformulação de sombras, formatos customizados ou substituição de componentes Material por elementos próprios - mantém o esforço de implementação baixo e o app usável.

## 5. Onde cada peça aparece

- **Moldura + barra de topo com luzes:** um novo componente compartilhado (`app-shell`/wrapper), usado uma vez no `app.html` (envolvendo o `<router-outlet>`), não duplicado em cada tela.
- **Badges de tipo coloridos:** no `pokemon-card` (listagem, favoritos) e na tela de detalhes - não existiam antes (hoje o tipo aparece só como texto/chip neutro).
- **Fonte pixelada:** aplicada via CSS global (`styles.scss`) num seletor específico para títulos (ex: `.pokedex-title`), usada no texto "Pokédex" da barra de topo/moldura.
- **Retema Material:** arquivo de tema (`styles.scss` ou um arquivo de tema dedicado) com a nova paleta.

## 6. Fora de escopo

- Nenhuma mudança de comportamento/funcionalidade - este design é puramente visual.
- Nenhum asset oficial licenciado da Pokémon Company (sprites já vêm da PokéAPI, que é de uso público estabelecido pela comunidade; não usar logos oficiais).
- Sem testes automatizados (mantém a decisão já tomada para o projeto); verificação é visual, manual, no navegador.
- Dark mode não faz parte deste escopo.

## 7. Critério de sucesso

- As 4 telas (lista, detalhe, favoritos, comparar) têm a mesma identidade visual (moldura/barra vermelha, luzes, tipografia, badges de tipo).
- No celular, a barra de topo tem os elementos temáticos sem quebrar o layout ou reduzir a área útil de forma perceptível.
- A legibilidade não piora em nenhuma tela (mantém contraste adequado no texto sobre fundo claro).
