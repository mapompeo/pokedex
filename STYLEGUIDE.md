# 🎨 Guia de Estilo

Referência rápida do design system do projeto: tokens, breakpoints e os
componentes compartilhados que existem pra evitar CSS reinventado tela a
tela. Se você está prestes a escrever uma cor, tamanho ou botão-ícone do
zero, comece aqui.

## Tokens (`src/styles/_tokens.scss`)

Nenhuma cor, tamanho de fonte, espaçamento, radius, sombra ou duração de
transição deve ser escrito literal num componente — sempre via
`var(--dex-*)` (ou `--pokedex-*` para cor de marca). Definidos em `:root`
(tema claro) e redeclarados em `.dark-mode` onde o valor muda com o tema.

| Categoria | Tokens | Exemplo |
|---|---|---|
| Marca | `--pokedex-red`, `--pokedex-red-dark`, `--pokedex-blue`, `--pokedex-yellow`, `--pokedex-green` | `color: var(--pokedex-red);` |
| Superfície/tema | `--dex-ink`, `--dex-bg`, `--dex-bg-card`, `--dex-text`, `--dex-text-muted`, `--dex-gold`, `--dex-cream`, `--dex-nav-active`, `--dex-badge-*` | `color: var(--dex-ink);` |
| On-image | `--dex-white`, `--dex-black`, `--dex-scrim`, `--dex-icon-on-photo`, `--dex-icon-on-photo-muted` | uso sobre foto/artwork, não muda com o tema |
| Tipografia | `--dex-font-3xs` → `--dex-font-3xl` (10px → 32px), `--dex-weight-regular/semibold/bold/black`, `--dex-leading-*` | `font-size: var(--dex-font-sm); font-weight: var(--dex-weight-bold);` |
| Espaçamento | `--dex-space-1` → `--dex-space-12` (2px → 64px, base 2/4) | `gap: var(--dex-space-5);` |
| Radius | `--dex-radius-sm/md/lg/xl/sheet/pill/circle` | `border-radius: var(--dex-radius-pill);` |
| Sombra | `--dex-shadow-sm/md/lg/xl`, `--dex-shadow-type` | `box-shadow: var(--dex-shadow-lg);` |
| Transição | `--dex-duration-fast/base/slow`, `--dex-ease-standard/linear` | `transition: background var(--dex-duration-fast) var(--dex-ease-standard);` |

**Estado atual da migração:** cor, radius, peso/tamanho de fonte e
duração/easing de transição já estão 100% tokenizados nas telas de
feature. Espaçamento (`padding`/`margin`/`gap`/`width`/`height`) ficou de
fora de propósito — muitos desses números são tamanho de ícone ou offset
decorativo, não ritmo de espaçamento, e migrar sem revisar caso a caso
criaria tokens sem sentido semântico.

## Breakpoints (`src/styles/_breakpoints.scss`)

Só existem 3, deliberadamente: `sm` (480px), `md` (768px), `lg` (1200px).
Vivem em Sass (não em custom property, porque `@media` não aceita `var()`).
Nunca escreva `@media (min-width: ...)` literal num componente — sempre os
mixins:

```scss
@use '../../styles/breakpoints' as bp; // ajuste o caminho relativo

.card {
  padding: var(--dex-space-5);

  @include bp.up(md) {
    padding: var(--dex-space-7);
  }
}
```

`bp.down($name)` existe pros poucos casos que precisam de um teto (ex.:
esconder algo só abaixo de um breakpoint) — `down($x)` é sempre o
complemento exato de `up($x)` (`$x - 1px`), nunca se sobrepõem.

Exceções literais existem em 2 lugares (documentadas com comentário no
próprio arquivo) onde o valor original não batia exatamente com um dos 3
breakpoints e a prioridade foi não mudar comportamento existente:
`pokemon-list.component.scss` (480px) e `compare.component.scss` (340px,
limiar específico daquela tela, não reaproveitado em outro lugar).

## `IconButtonComponent` (`shared/components/icon-button`)

Botão-ícone circular compartilhado. Existe porque o mesmo padrão (círculo
translúcido, ícone Material, área de toque expandida pra ~44px) estava
reinventado com pequenas variações em pelo menos 6 lugares (picker, team,
pokemon-detail, pokemon-list, compare, app.scss).

```html
<app-icon-button icon="close" ariaLabel="Fechar" (clicked)="dismiss()" />
<app-icon-button icon="close" ariaLabel="Limpar busca" size="xs" (clicked)="clear()" />
<app-icon-button icon="favorite" ariaLabel="Favoritar" tone="on-photo" size="lg" (clicked)="toggle()" />
<app-icon-button icon="group_add" ariaLabel="Adicionar ao time" tone="on-photo" [active]="isInTeam()" (clicked)="toggle()" />
<app-icon-button icon="close" ariaLabel="Remover" tone="on-photo" size="xxs" [dangerHover]="true" (clicked)="remove()" />
```

**Tamanhos** (`size`): `xxs` (28px, par compacto de card) · `xs` (24px) ·
`sm` (32px, padrão) · `md` (40px) · `lg` (44px, alvo de toque mínimo puro).

**Tons** (`tone`): `ghost` (padrão, sobre fundo do app) · `on-photo`
(sobre foto/artwork, suporta `active`) · `transparent` (hit-area sem
fundo, ícone branco sobre hero) · `solid-accent` (ação primária,
vermelho sólido) · `soft-accent` (ação de destaque, tom suave).

**Modificador `dangerHover`**: ortogonal ao tom — deixa o hover vermelho
independente da cor base, pra ações destrutivas (ex.: remover do time).
Não é um tom novo porque a cor-base continua a do tom escolhido; só o
estado de hover muda.

**Não cobre:** botões de navegação que precisam ser `<a routerLink>`
(semântica de link importa — abrir em nova aba, meio-clique) e FABs de
verdade com elevação/scale própria (ex.: `scroll-top-fab`), que são uma
categoria visual diferente de botão de toolbar.

## Diálogos (`PokemonPickerDialogComponent` como referência)

Diálogo modal usa `MatDialog`, não overlay hand-rolled — ganha de graça
focus trap, Escape/clique-fora nativos, `role="dialog"` + `aria-modal` e
restauração de foco ao fechar. O card visual continua 100% controlado
pelo componente (não pelo tema padrão do Material): use um `panelClass`
próprio e neutralize o container do Material nele, em `styles.scss`
(mesmo padrão já usado pro `.app-snackbar`):

```scss
.meu-dialog-panel {
  .mat-mdc-dialog-container,
  .mdc-dialog__surface,
  .mat-mdc-dialog-surface {
    background: transparent !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    padding: 0 !important;
    overflow: visible;
  }
}
```
