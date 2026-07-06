# Pokédex Kanto Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the "Kanto Pokédex" visual theme approved in `docs/2026-07-03-pokedex-ui-kanto-theme-design.md` — a red device-inspired frame/top-bar, colored type badges, a pixel-font title, and a red/yellow Material color retint — across all 4 existing screens, with zero behavior changes.

**Architecture:** Two independent visual layers are added on top of the existing app, neither touching feature logic: (1) an app-level "frame" wrapping `<router-outlet>` in `app.html`/`app.ts`/`app.scss`, fixed on desktop with an internal scrolling region, collapsing to a slim top bar on mobile; (2) a small shared `TypeBadgeComponent` + color-lookup table, wired into the 3 places that already have type data available (`PokemonCardComponent` for list/favorites, `PokemonDetailComponent` for the detail screen) via one new cheap-but-cached `PokemonService` method for the list screen (favorites/detail already have full `PokemonDetail.types` on hand, so they need no new network calls). A single edit to `styles.scss` swaps the Angular Material theme's `primary`/`tertiary` palettes to red/yellow, re-coloring every existing Material component (buttons, toolbars, chips) with no per-component changes.

**Tech Stack:** Same as the rest of the project — Angular standalone components, TypeScript, Angular Material's M3 `mat.theme()` mixin, SCSS, one new Google Font (`Press Start 2P`) loaded via `index.html`.

## Global Constraints

- No automated tests — verification is `ng build` (compile correctness) plus manual checks in the browser via `ng serve`, including a check at a mobile viewport width (DevTools device toolbar, ≤768px).
- This is a purely visual change — no feature/behavior change to any screen. Do not alter routes, service method signatures used by existing callers, or component `@Input`/`@Output` contracts beyond the additive ones this plan defines.
- No officially licensed Pokémon Company assets (logos, official fonts) — colors/typography here are either generic (hex values) or freely-licensed (Google Fonts).
- Color palette (from the design doc, copied verbatim):
  - `--pokedex-red: #CC0000` (frame, primary Material color)
  - `--pokedex-red-dark: #A00000` (frame border/shadow)
  - `--pokedex-blue: #3B4CCA` (large decorative light)
  - `--pokedex-yellow: #FFDE00` (small decorative light, tertiary Material color)
  - `--pokedex-green: #2ECC71` (small decorative light)
- Type badge colors (from the design doc, copied verbatim — exact hex per type):
  normal `#A8A878`, fire `#F08030`, water `#6890F0`, electric `#F8D030`, grass `#78C850`, ice `#98D8D8`, fighting `#C03028`, poison `#A040A0`, ground `#E0C068`, flying `#A890F0`, psychic `#F85888`, bug `#A8B820`, rock `#B8A038`, ghost `#705898`, dragon `#7038F8`, dark `#705848`, steel `#B8B8D0`, fairy `#EE99AC`.
- Type badges appear on: pokemon list cards, favorites cards, and the detail screen. They do **not** appear on the compare screen — out of scope per the approved design.
- Mobile breakpoint: `max-width: 768px` (matches this project's existing convention — no other breakpoint is defined anywhere else in the codebase, so this plan establishes it).
- Angular Material 3's default component shapes are already rounded (buttons are fully pill-shaped, cards use a medium corner radius, by default, verified in the installed `@angular/material` version) — this plan does **not** add custom Material shape-token overrides; the "cantos arredondados" requirement from the design doc is satisfied by M3's defaults for Material components, plus explicit `border-radius` on the new custom elements this plan authors directly (frame, type badges).

---

### Task 14: Type color palette + shared TypeBadgeComponent

**Files:**
- Create: `src/app/shared/type-colors.ts`
- Create: `src/app/shared/components/type-badge/type-badge.component.ts`

**Interfaces:**
- Produces: `getTypeColor(type: string): string` — consumed by `TypeBadgeComponent` internally only (no other task calls it directly).
- Produces: `TypeBadgeComponent` (selector `app-type-badge`), `@Input({required: true}) type!: string` — consumed by Task 16 (`PokemonCardComponent`, `PokemonDetailComponent`).

- [ ] **Step 1: Write the type color lookup table**

```typescript
// src/app/shared/type-colors.ts
export const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  electric: '#F8D030',
  grass: '#78C850',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC',
};

const DEFAULT_TYPE_COLOR = '#68A090';

export function getTypeColor(type: string): string {
  return TYPE_COLORS[type] ?? DEFAULT_TYPE_COLOR;
}
```

- [ ] **Step 2: Write the TypeBadgeComponent**

```typescript
// src/app/shared/components/type-badge/type-badge.component.ts
import { Component, Input } from '@angular/core';
import { getTypeColor } from '../../type-colors';

@Component({
  selector: 'app-type-badge',
  standalone: true,
  template: `<span class="type-badge" [style.background-color]="color">{{ type }}</span>`,
  styles: [
    `
      .type-badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 12px;
        color: #fff;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: capitalize;
        line-height: 1.6;
      }
    `,
  ],
})
export class TypeBadgeComponent {
  @Input({ required: true }) type!: string;

  get color(): string {
    return getTypeColor(this.type);
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `ng build` from `/mnt/c/repositories/pokedex` (use `cmd.exe /c "cd C:\repositories\pokedex && ng build"` if `ng` isn't in your WSL shell). Expected: `Application bundle generation complete.` with zero errors (neither new file is imported anywhere yet, but both still type-check).

- [ ] **Step 4: Commit**

```bash
git add src/app/shared/type-colors.ts src/app/shared/components/type-badge
git commit -m "feat: adiciona paleta de cores por tipo e componente TypeBadgeComponent"
```

---

### Task 15: PokemonService — cached id→types lookup for the list screen

**Files:**
- Modify: `src/app/core/services/pokemon.service.ts`

**Interfaces:**
- Consumes: existing `getTypes()`, existing `RawTypePokemonResponse` interface, existing `extractIdFromUrl()` — all already defined in this same file.
- Produces: `PokemonService.getTypesByPokemonId(): Observable<Map<number, string[]>>` — cached after first call. Consumed by Task 16 (`PokemonListComponent` only — `FavoritesComponent`, `PokemonDetailComponent`, and `CompareComponent` already have full `PokemonDetail.types` from `getPokemonDetail()` and do not need this method).

- [ ] **Step 1: Add the `switchMap` import**

Open `src/app/core/services/pokemon.service.ts`. The current import line is:

```typescript
import { Observable, forkJoin, map, of } from 'rxjs';
```

Change it to:

```typescript
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
```

- [ ] **Step 2: Add the cache field**

Add this alongside the existing `private allListItemsCache: PokemonListItem[] | null = null;` field:

```typescript
private idTypesCache: Map<number, string[]> | null = null;
```

- [ ] **Step 3: Add the `getTypesByPokemonId()` method**

Add this as a new public method, after `getPokemonIdsByTypes()`:

```typescript
getTypesByPokemonId(): Observable<Map<number, string[]>> {
  if (this.idTypesCache) {
    return of(this.idTypesCache);
  }
  return this.getTypes().pipe(
    switchMap((types) =>
      forkJoin(
        types.map((type) =>
          this.http.get<RawTypePokemonResponse>(`${BASE_URL}/type/${type.name}`).pipe(
            map((res) => ({
              typeName: type.name,
              ids: res.pokemon.map((p) => this.extractIdFromUrl(p.pokemon.url)),
            }))
          )
        )
      )
    ),
    map((typeGroups) => {
      const idToTypes = new Map<number, string[]>();
      for (const group of typeGroups) {
        for (const id of group.ids) {
          const existing = idToTypes.get(id) ?? [];
          existing.push(group.typeName);
          idToTypes.set(id, existing);
        }
      }
      this.idTypesCache = idToTypes;
      return idToTypes;
    })
  );
}
```

This reuses `getTypes()` (18 types today) to fan out 18 parallel `GET /type/{name}` calls via `forkJoin`, then inverts the type→ids mapping into an id→types mapping. The result is cached in `idTypesCache`, so this network cost is paid once per page load, not once per card.

- [ ] **Step 4: Verify it compiles**

Run: `ng build`. Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/pokemon.service.ts
git commit -m "feat: adiciona PokemonService.getTypesByPokemonId com cache para badges de tipo na listagem"
```

---

### Task 16: Wire type badges into cards and the detail screen

**Files:**
- Modify: `src/app/shared/components/pokemon-card/pokemon-card.component.ts`
- Modify: `src/app/shared/components/pokemon-card/pokemon-card.component.html`
- Modify: `src/app/shared/components/pokemon-card/pokemon-card.component.scss`
- Modify: `src/app/features/pokemon-list/pokemon-list.component.ts`
- Modify: `src/app/features/pokemon-list/pokemon-list.component.html`
- Modify: `src/app/features/favorites/favorites.component.ts`
- Modify: `src/app/features/favorites/favorites.component.html`
- Modify: `src/app/features/pokemon-detail/pokemon-detail.component.ts`
- Modify: `src/app/features/pokemon-detail/pokemon-detail.component.html`

**Interfaces:**
- Consumes: `TypeBadgeComponent` (Task 14), `PokemonService.getTypesByPokemonId()` (Task 15), existing `PokemonDetail.types: string[]` (already defined in `core/models/pokemon.model.ts`, unchanged).
- Produces: `PokemonCardComponent` gains `@Input() types: string[] = []` (additive, defaults to `[]` so existing usages that don't pass it still compile and simply show no badges). No other task depends on this component beyond what's already established.

- [ ] **Step 1: Add the `types` input to PokemonCardComponent**

Open `src/app/shared/components/pokemon-card/pokemon-card.component.ts`. Its current full content is:

```typescript
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { PokemonListItem } from '../../../core/models/pokemon.model';

@Component({
  selector: 'app-pokemon-card',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule],
  templateUrl: './pokemon-card.component.html',
  styleUrl: './pokemon-card.component.scss',
})
export class PokemonCardComponent {
  @Input({ required: true }) pokemon!: PokemonListItem;
  @Input() isFavorite = false;

  @Output() favoriteToggled = new EventEmitter<number>();
}
```

Replace it with:

```typescript
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { PokemonListItem } from '../../../core/models/pokemon.model';
import { TypeBadgeComponent } from '../type-badge/type-badge.component';

@Component({
  selector: 'app-pokemon-card',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule, TypeBadgeComponent],
  templateUrl: './pokemon-card.component.html',
  styleUrl: './pokemon-card.component.scss',
})
export class PokemonCardComponent {
  @Input({ required: true }) pokemon!: PokemonListItem;
  @Input() isFavorite = false;
  @Input() types: string[] = [];

  @Output() favoriteToggled = new EventEmitter<number>();
}
```

- [ ] **Step 2: Add the badges to the card template**

Open `src/app/shared/components/pokemon-card/pokemon-card.component.html`. Its current full content is:

```html
<mat-card class="pokemon-card">
  <a [routerLink]="['/pokemon', pokemon.id]" class="pokemon-card__link">
    <img [src]="pokemon.spriteUrl" [alt]="pokemon.name" class="pokemon-card__sprite" />
    <span class="pokemon-card__name">#{{ pokemon.id }} {{ pokemon.name }}</span>
  </a>
  <div class="pokemon-card__actions">
    <button
      mat-icon-button
      (click)="favoriteToggled.emit(pokemon.id)"
      [attr.aria-label]="isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'"
    >
      <mat-icon>{{ isFavorite ? 'favorite' : 'favorite_border' }}</mat-icon>
    </button>
  </div>
</mat-card>
```

Replace it with:

```html
<mat-card class="pokemon-card">
  <a [routerLink]="['/pokemon', pokemon.id]" class="pokemon-card__link">
    <img [src]="pokemon.spriteUrl" [alt]="pokemon.name" class="pokemon-card__sprite" />
    <span class="pokemon-card__name">#{{ pokemon.id }} {{ pokemon.name }}</span>
    @if (types.length) {
      <div class="pokemon-card__types">
        @for (type of types; track type) {
          <app-type-badge [type]="type"></app-type-badge>
        }
      </div>
    }
  </a>
  <div class="pokemon-card__actions">
    <button
      mat-icon-button
      (click)="favoriteToggled.emit(pokemon.id)"
      [attr.aria-label]="isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'"
    >
      <mat-icon>{{ isFavorite ? 'favorite' : 'favorite_border' }}</mat-icon>
    </button>
  </div>
</mat-card>
```

- [ ] **Step 3: Add spacing for the badges row**

Open `src/app/shared/components/pokemon-card/pokemon-card.component.scss`. Add this new nested rule inside the existing `.pokemon-card { ... }` block (alongside `&__link`, `&__sprite`, etc.):

```scss
  &__types {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 4px;
  }
```

- [ ] **Step 4: Wire the type map into PokemonListComponent**

Open `src/app/features/pokemon-list/pokemon-list.component.ts`. Add a new signal and populate it in `ngOnInit`. The current `ngOnInit` is:

```typescript
  ngOnInit(): void {
    this.pokemonService.getTypes().subscribe((types) => this.types.set(types));
    this.pokemonService.getAllPokemonListItems().subscribe((items) => this.allNames.set(items));
    this.loadNextPage();
  }
```

Change it to:

```typescript
  ngOnInit(): void {
    this.pokemonService.getTypes().subscribe((types) => this.types.set(types));
    this.pokemonService.getAllPokemonListItems().subscribe((items) => this.allNames.set(items));
    this.pokemonService.getTypesByPokemonId().subscribe((idToTypes) => this.typesById.set(idToTypes));
    this.loadNextPage();
  }
```

And add the new signal declaration alongside the other signals (e.g. right after `typeFilteredIds = signal<Set<number> | null>(null);`):

```typescript
  typesById = signal<Map<number, string[]>>(new Map());
```

- [ ] **Step 5: Pass types to the card in the list template**

Open `src/app/features/pokemon-list/pokemon-list.component.html`. The current card usage is:

```html
    <app-pokemon-card
      [pokemon]="item"
      [isFavorite]="favoritesService.isFavorite(item.id)"
      (favoriteToggled)="onFavoriteToggled($event)"
    ></app-pokemon-card>
```

Change it to:

```html
    <app-pokemon-card
      [pokemon]="item"
      [isFavorite]="favoritesService.isFavorite(item.id)"
      [types]="typesById().get(item.id) ?? []"
      (favoriteToggled)="onFavoriteToggled($event)"
    ></app-pokemon-card>
```

- [ ] **Step 6: Wire types into FavoritesComponent (no new network calls needed)**

Open `src/app/features/favorites/favorites.component.ts`. `FavoritesComponent` already fetches full `PokemonDetail` (which includes `.types`) for every favorite via `getPokemonDetail`, so this reuses data already in memory instead of calling `getTypesByPokemonId()`. The current constructor is:

```typescript
  constructor() {
    effect(() => {
      const ids = [...this.favoritesService.favoriteIds()];
      if (ids.length === 0) {
        this.items.set([]);
        return;
      }
      this.loading.set(true);
      const requests = ids.map((id) => this.pokemonService.getPokemonDetail(String(id)));
      forkJoin(requests).subscribe({
        next: (details) => {
          this.items.set(details.map((d) => ({ id: d.id, name: d.name, spriteUrl: d.spriteUrl })));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }
```

Change it to:

```typescript
  constructor() {
    effect(() => {
      const ids = [...this.favoritesService.favoriteIds()];
      if (ids.length === 0) {
        this.items.set([]);
        this.typesById.set(new Map());
        return;
      }
      this.loading.set(true);
      const requests = ids.map((id) => this.pokemonService.getPokemonDetail(String(id)));
      forkJoin(requests).subscribe({
        next: (details) => {
          this.items.set(details.map((d) => ({ id: d.id, name: d.name, spriteUrl: d.spriteUrl })));
          this.typesById.set(new Map(details.map((d) => [d.id, d.types])));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }
```

And add the new signal declaration next to `items`/`loading`:

```typescript
  typesById = signal<Map<number, string[]>>(new Map());
```

- [ ] **Step 7: Pass types to the card in the favorites template**

Open `src/app/features/favorites/favorites.component.html`. The current card usage is:

```html
    <app-pokemon-card [pokemon]="item" [isFavorite]="true" (favoriteToggled)="onFavoriteToggled($event)">
    </app-pokemon-card>
```

Change it to:

```html
    <app-pokemon-card
      [pokemon]="item"
      [isFavorite]="true"
      [types]="typesById().get(item.id) ?? []"
      (favoriteToggled)="onFavoriteToggled($event)"
    ></app-pokemon-card>
```

- [ ] **Step 8: Replace the plain chip list with type badges on the detail screen**

Open `src/app/features/pokemon-detail/pokemon-detail.component.ts`. Remove the now-unused `MatChipsModule` import and add `TypeBadgeComponent`. The current full content is:

```typescript
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { PokemonService } from '../../core/services/pokemon.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { PokemonDetail } from '../../core/models/pokemon.model';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-pokemon-detail',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatChipsModule, LoadingSpinnerComponent],
  templateUrl: './pokemon-detail.component.html',
  styleUrl: './pokemon-detail.component.scss',
})
export class PokemonDetailComponent {
```

Change the imports and the `@Component` decorator's `imports` array to:

```typescript
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { PokemonService } from '../../core/services/pokemon.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { PokemonDetail } from '../../core/models/pokemon.model';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { TypeBadgeComponent } from '../../shared/components/type-badge/type-badge.component';

@Component({
  selector: 'app-pokemon-detail',
  standalone: true,
  imports: [RouterLink, MatButtonModule, LoadingSpinnerComponent, TypeBadgeComponent],
  templateUrl: './pokemon-detail.component.html',
  styleUrl: './pokemon-detail.component.scss',
})
export class PokemonDetailComponent {
```

The rest of the class body (`pokemon`, `loading`, `isFavorite`, the constructor, `toggleFavorite()`) is unchanged.

- [ ] **Step 9: Update the detail template**

Open `src/app/features/pokemon-detail/pokemon-detail.component.html`. The current `mat-chip-set` block is:

```html
    <mat-chip-set>
      @for (type of p.types; track type) {
        <mat-chip>{{ type }}</mat-chip>
      }
    </mat-chip-set>
```

Replace it with:

```html
    <div class="pokemon-detail__types">
      @for (type of p.types; track type) {
        <app-type-badge [type]="type"></app-type-badge>
      }
    </div>
```

- [ ] **Step 10: Add spacing for the detail screen's badge row**

Open `src/app/features/pokemon-detail/pokemon-detail.component.scss`. Its current content wraps everything in a `.pokemon-detail { ... }` block — add this new nested rule inside it:

```scss
  &__types {
    display: flex;
    gap: 4px;
    justify-content: center;
    margin: 8px 0;
  }
```

- [ ] **Step 11: Verify it compiles**

Run: `ng build`. Expected: zero errors. In particular, confirm there's no leftover reference to `MatChipsModule`/`mat-chip-set`/`mat-chip` anywhere in `pokemon-detail.component.ts`/`.html` (an unused import would still compile in this Angular version, but a template still referencing `mat-chip-set` after removing the module from `imports` would fail to compile — treat that as a real error to fix, not something to leave broken).

- [ ] **Step 12: Manual verification in the browser**

Run: `ng serve`. Verify:
1. Cards in the main list and in favorites show colored type badges under the name (e.g. Charizard shows "fire" in orange and "flying" in light purple).
2. The detail screen shows the same colored badges instead of plain gray chips.
3. A pokémon with only one type shows only one badge (no empty second badge).
4. The compare screen is unchanged (no badges) — confirms scope was respected.

- [ ] **Step 13: Commit**

```bash
git add src/app/shared/components/pokemon-card src/app/features/pokemon-list src/app/features/favorites src/app/features/pokemon-detail
git commit -m "feat: adiciona badges coloridos de tipo na listagem, favoritos e tela de detalhes"
```

---

### Task 17: Global Material theme retint + Kanto color variables + pixel font

**Files:**
- Modify: `src/styles.scss`
- Modify: `src/index.html`

**Interfaces:**
- Produces: CSS custom properties `--pokedex-red`, `--pokedex-red-dark`, `--pokedex-blue`, `--pokedex-yellow`, `--pokedex-green` available globally (any component's SCSS can reference them via `var(--pokedex-red)`, since Angular's default view encapsulation does not block CSS custom property inheritance). Produces the `Press Start 2P` web font loaded and ready to use via `font-family: 'Press Start 2P', monospace;`. Consumed by Task 18 (`app.scss`).

- [ ] **Step 1: Swap the Material theme palette to red/yellow**

Open `src/styles.scss`. The current theme block is:

```scss
html {
  @include mat.theme((
    color: (
      primary: mat.$azure-palette,
      tertiary: mat.$blue-palette,
    ),
    typography: Roboto,
    density: 0,
  ));
}
```

Change it to:

```scss
html {
  @include mat.theme((
    color: (
      primary: mat.$red-palette,
      tertiary: mat.$yellow-palette,
    ),
    typography: Roboto,
    density: 0,
  ));
}
```

This alone re-colors every existing `color="primary"` Material component (the list screen's `mat-toolbar`, the detail screen's favorite button, chip selections, etc.) to red, with no per-component changes needed.

- [ ] **Step 2: Add the Kanto color variables**

In the same file, add this new block right after the `html { @include mat.theme(...); }` block (before the `body { ... }` rule):

```scss
:root {
  --pokedex-red: #CC0000;
  --pokedex-red-dark: #A00000;
  --pokedex-blue: #3B4CCA;
  --pokedex-yellow: #FFDE00;
  --pokedex-green: #2ECC71;
}
```

- [ ] **Step 3: Load the pixel font**

Open `src/index.html`. The current font links are:

```html
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
```

Add a third link right after them:

```html
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
```

- [ ] **Step 4: Verify it compiles**

Run: `ng build`. Expected: zero errors (a Sass palette-name typo would fail the build here — if `mat.$red-palette` or `mat.$yellow-palette` don't exist in the installed Material version, the build fails with a clear Sass error naming the missing variable; if that happens, stop and report BLOCKED rather than guessing a replacement name).

- [ ] **Step 5: Manual verification in the browser**

Run: `ng serve`. Verify:
1. The list screen's top toolbar is now red instead of the previous blue/azure.
2. Raised/filled buttons (e.g. the favorite button on the detail screen) are red.
3. No visual regression in text contrast (white text should still be clearly readable on the new red toolbar/buttons — Material's M3 theming automatically picks a contrasting "on-primary" text color from the palette, so this should hold, but confirm visually).

- [ ] **Step 6: Commit**

```bash
git add src/styles.scss src/index.html
git commit -m "feat: retema Material para paleta vermelho/amarelo e carrega fonte pixelada Press Start 2P"
```

---

### Task 18: App shell — Pokédex frame (desktop) / themed top bar (mobile)

**Files:**
- Modify: `src/app/app.html`
- Modify: `src/app/app.ts`
- Modify: `src/app/app.scss`

**Interfaces:**
- Consumes: `--pokedex-red`, `--pokedex-red-dark`, `--pokedex-blue`, `--pokedex-yellow`, `--pokedex-green` CSS variables and the `Press Start 2P` font (Task 17).
- Produces: nothing further tasks depend on — this is the final visual layer, wrapping every routed screen without changing any of them.

- [ ] **Step 1: Add the frame markup**

Open `src/app/app.html`. Its current full content is:

```html
<router-outlet></router-outlet>
```

Replace it with:

```html
<div class="pokedex-frame">
  <header class="pokedex-frame__header">
    <span class="pokedex-frame__light pokedex-frame__light--blue"></span>
    <span class="pokedex-frame__light pokedex-frame__light--yellow"></span>
    <span class="pokedex-frame__light pokedex-frame__light--green"></span>
    <span class="pokedex-frame__title">POKÉDEX</span>
  </header>
  <div class="pokedex-frame__screen">
    <router-outlet></router-outlet>
  </div>
</div>
```

Because `<router-outlet>` inserts the routed component as a sibling within its own parent element, nesting it inside `.pokedex-frame__screen` means every routed screen's content ends up inside that scrollable div — no changes to any routed component are needed for this to work.

- [ ] **Step 2: Confirm the root component has no extra state**

Open `src/app/app.ts`. Its current full content is:

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
```

No changes needed here — the new markup in Step 1 only uses `RouterOutlet`, which is already imported. Leave this file as-is.

- [ ] **Step 3: Write the frame styles**

Open `src/app/app.scss` (currently empty). Write:

```scss
:host {
  display: block;
}

.pokedex-frame {
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
  background: var(--pokedex-red);
  border: 4px solid var(--pokedex-red-dark);
  padding: 16px;

  @media (max-width: 768px) {
    border: none;
    padding: 0;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
    padding: 8px 16px;
  }

  &__light {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;

    &--blue {
      background: var(--pokedex-blue);
      width: 20px;
      height: 20px;
    }

    &--yellow {
      background: var(--pokedex-yellow);
    }

    &--green {
      background: var(--pokedex-green);
    }
  }

  &__title {
    font-family: 'Press Start 2P', monospace;
    color: #fff;
    font-size: 0.9rem;
    letter-spacing: 1px;
    margin-left: 8px;

    @media (max-width: 768px) {
      font-size: 0.7rem;
    }
  }

  &__screen {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    background: #fff;
    border-radius: 12px;

    @media (max-width: 768px) {
      border-radius: 0;
    }
  }
}
```

The `min-height: 0` on `&__screen` is required — without it, a flex child with `overflow-y: auto` won't actually scroll internally inside a fixed-height flex column; it'll grow past its container instead.

- [ ] **Step 4: Verify it compiles**

Run: `ng build`. Expected: zero errors.

- [ ] **Step 5: Manual verification in the browser — desktop**

Run: `ng serve`, open at a normal desktop width. Verify:
1. A red frame with rounded-ish white inner "screen" wraps the whole app, with 3 colored dots and "POKÉDEX" in a pixelated font in the top-left.
2. Scrolling the pokémon list scrolls only the inner white area — the red frame and the "POKÉDEX" header stay fixed in place.
3. The existing per-screen toolbar (the one with "Favoritos"/"Comparar" links) still appears at the top of the inner scrollable area, now red-tinted from Task 17, sitting just below the frame's "POKÉDEX" header.
4. Infinite scroll (Task 6's `IntersectionObserver`) still works — this is important to check explicitly, since the scrolling container changed from the page body to this new inner div. If it stops working, do not attempt to guess a fix — report DONE_WITH_CONCERNS with exactly what you observed, since `IntersectionObserver`'s default root is the browser viewport regardless of DOM nesting and should keep working, but this needs an actual visual confirmation, not just code reasoning.

- [ ] **Step 6: Manual verification in the browser — mobile**

Using DevTools' device toolbar (or resizing the window below 768px width), verify:
1. The red frame's side/bottom borders disappear — only a slim red top bar with the dots and "POKÉDEX" title remains.
2. The app content fills the rest of the screen width with no wasted horizontal space.
3. Scrolling still works the same way as desktop (inner content scrolls, top bar stays in place).

- [ ] **Step 7: Commit**

```bash
git add src/app/app.html src/app/app.ts src/app/app.scss
git commit -m "feat: adiciona moldura tematica da Pokedex (fixa no desktop, barra de topo no mobile)"
```

---

### Task 19: Final full-theme smoke pass

**Files:** None — verification only.

**Interfaces:** None.

- [ ] **Step 1: Full build check**

Run: `ng build` from `/mnt/c/repositories/pokedex`. Expected: `Application bundle generation complete.` with zero errors and no new warnings.

- [ ] **Step 2: Full manual walkthrough — desktop**

Run: `ng serve`, open `http://localhost:4200` at a normal desktop width, and walk through all 4 screens:
1. **Lista:** red frame + pixel "POKÉDEX" title visible and fixed; scrolling the list only scrolls the inner area; cards show colored type badges; search and type-filter chips still work (now red/yellow-tinted); favoriting still works.
2. **Detalhes:** click into a pokémon — colored type badges appear instead of the old plain chips; favorite button is red; "← Voltar" still works.
3. **Favoritos:** favorited pokémon show colored type badges; un-favoriting still works.
4. **Comparar:** autocomplete search still works for both fields; this screen intentionally has no type badges (confirms scope was respected) but does pick up the red/yellow Material retint on its buttons.

- [ ] **Step 3: Full manual walkthrough — mobile**

Using DevTools' device toolbar at a width ≤768px, repeat the same walkthrough from Step 2, paying attention to:
1. The frame reduces to a top bar (no side/bottom borders).
2. No horizontal scrollbar appears on any of the 4 screens (a sign of unaccounted-for width from the old frame's padding leaking through).
3. Autocomplete panels (compare screen) and dropdown chips (type filter) remain usable/tappable at this width — these existed before this plan and shouldn't regress, but confirm since the surrounding layout changed.

- [ ] **Step 4: Report findings**

This task has no code to commit. If Steps 1-3 all pass cleanly, report DONE summarizing what was checked. If anything looks broken, report DONE_WITH_CONCERNS with a precise description (which screen, which viewport width, what you saw vs. expected) — do not attempt to fix issues found here; that's a follow-up task decision for the controller/human, since this task's job is verification, not further changes.
