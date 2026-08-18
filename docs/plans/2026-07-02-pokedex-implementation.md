# Pokédex Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Pokédex web app in Angular + TypeScript (Material UI, Signals for state) consuming the public PokéAPI, with infinite-scroll listing, search, multi-select type filter, favorites (localStorage), and a 2-pokémon comparison screen.

**Architecture:** Standalone Angular components organized into `core` (models + services), `shared` (reusable presentational components), and `features` (one folder per screen: list, detail, favorites, compare). State lives in two root-provided services (`PokemonService`, `FavoritesService`) built on Signals; no NgRx, no manual RxJS Subjects.

**Tech Stack:** Angular (latest stable, standalone components), TypeScript, Angular Material, SCSS, PokéAPI (`https://pokeapi.co/api/v2`), `localStorage` for favorites persistence.

## Global Constraints

- No automated tests in this v1 (per explicit user decision) - verification is done via `ng build` (compile correctness) and manual checks in the browser via `ng serve`.
- Project lives at `C:\repositories\pokedex` (Windows path; from WSL this is `/mnt/c/repositories/pokedex`).
- Data source is exclusively the public PokéAPI base URL `https://pokeapi.co/api/v2` - no API key, no backend of our own.
- State management is Services + Signals only - no NgRx, no RxJS `Subject`/`BehaviorSubject` for app state (RxJS is fine for one-shot HTTP calls).
- UI components come from Angular Material - avoid hand-rolled buttons/inputs/cards where a Material equivalent exists.
- Sprite images use `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png` for list items (avoids an extra detail fetch per card); the detail screen uses the sprite returned by the detail endpoint.
- Run all `node`/`npm`/`ng` commands with whichever Node.js installation is actually available. Check first with `node -v` in the current shell; if not found, prefix commands with `cmd.exe /c` (Windows Node install), matching how other projects on this machine run Node from WSL.

---

### Task 0: Scaffold the Angular project, Material, and folder skeleton

**Files:**
- Create: `C:\repositories\pokedex\` (entire Angular CLI-generated project)
- Modify: `C:\repositories\pokedex\angular.json` (schematics defaults)
- Create: `src/app/core/models/`, `src/app/core/services/`, `src/app/core/interceptors/`, `src/app/shared/components/`, `src/app/features/` (empty folders, populated in later tasks)

**Interfaces:**
- Produces: a runnable Angular shell (`ng serve` shows the default Angular page) with Material installed and theming configured, ready for feature code in later tasks.

- [ ] **Step 1: Check available Node/Angular CLI**

Run: `node -v && npm -v`
Expected: version numbers printed (e.g. `v20.x.x`, `10.x.x`). If this fails in the current shell, use `cmd.exe /c "node -v && npm -v"` instead for every command in this task.

- [ ] **Step 2: Install Angular CLI globally if missing**

Run: `npm list -g @angular/cli || npm install -g @angular/cli`
Expected: prints an existing version, or installs the latest `@angular/cli`.

- [ ] **Step 3: Generate the project**

Run (from `C:\repositories`):
```bash
cd /mnt/c/repositories
ng new pokedex --routing --style=scss --ssr=false --skip-git=false
```
(Or, if `ng` is only available on Windows: `cmd.exe /c "cd C:\repositories && ng new pokedex --routing --style=scss --ssr=false --skip-git=false"`)

When prompted "Which stylesheet format would you like to use?" it's already set by `--style=scss`. When prompted about SSR/SSG, answer No (already set by `--ssr=false`). When prompted about zoneless/experimental features, accept the default.

Expected: a new `pokedex/` folder is created under `C:\repositories` with a working Angular app and its own git repo initialized.

- [ ] **Step 4: Add Angular Material**

Run (from inside `C:\repositories\pokedex`):
```bash
cd /mnt/c/repositories/pokedex
ng add @angular/material
```
When prompted, choose: a prebuilt theme (e.g. "Azure/Blue"), set up global Angular Material typography styles: Yes, include the Animations module: Yes (`provideAnimationsAsync` or `provideAnimations`).

Expected: `@angular/material`, `@angular/cdk` added to `package.json`; `styles.scss` updated with the Material theme import; `app.config.ts` updated with an animations provider.

- [ ] **Step 5: Set schematics defaults to skip test files**

Open `angular.json`, find the `"schematics"` key under the `pokedex` project (or add it at the project or top level if absent), and set:

```json
"schematics": {
  "@schematics/angular:component": {
    "skipTests": true,
    "style": "scss"
  },
  "@schematics/angular:service": {
    "skipTests": true
  }
}
```

This matches the "no automated tests in v1" constraint so `ng generate` doesn't create `.spec.ts` files we won't use.

- [ ] **Step 6: Create the folder skeleton**

Run:
```bash
cd /mnt/c/repositories/pokedex/src/app
mkdir -p core/models core/services core/interceptors
mkdir -p shared/components/pokemon-card shared/components/type-chip shared/components/loading-spinner
mkdir -p features/pokemon-list features/pokemon-detail features/favorites features/compare
```

- [ ] **Step 7: Verify the app builds and serves**

Run: `cd /mnt/c/repositories/pokedex && ng build`
Expected: `Application bundle generation complete.` with no errors.

Run: `ng serve` and open `http://localhost:4200` in a browser.
Expected: the default Angular welcome page loads without console errors.

- [ ] **Step 8: Commit**

```bash
cd /mnt/c/repositories/pokedex
git add -A
git commit -m "chore: scaffold Angular project with Material and folder skeleton"
```

---

### Task 1: Core domain models

**Files:**
- Create: `src/app/core/models/pokemon.model.ts`

**Interfaces:**
- Produces: `PokemonListItem`, `PokemonListPage`, `PokemonStat`, `PokemonDetail`, `PokemonType` - used by every service and component in later tasks.

- [ ] **Step 1: Write the models file**

```typescript
// src/app/core/models/pokemon.model.ts

export interface PokemonListItem {
  id: number;
  name: string;
  spriteUrl: string;
}

export interface PokemonListPage {
  items: PokemonListItem[];
  total: number;
  nextOffset: number | null;
}

export interface PokemonStat {
  name: string;
  baseStat: number;
}

export interface PokemonDetail {
  id: number;
  name: string;
  height: number;
  weight: number;
  spriteUrl: string;
  types: string[];
  stats: PokemonStat[];
}

export interface PokemonType {
  id: number;
  name: string;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /mnt/c/repositories/pokedex && ng build`
Expected: `Application bundle generation complete.` with no errors (the file isn't imported anywhere yet, but `tsc` still type-checks it).

- [ ] **Step 3: Commit**

```bash
git add src/app/core/models/pokemon.model.ts
git commit -m "feat: add core Pokemon domain models"
```

---

### Task 2: PokemonService (HTTP + cache)

**Files:**
- Create: `src/app/core/services/pokemon.service.ts`
- Modify: `src/app/app.config.ts` (add `provideHttpClient`)

**Interfaces:**
- Consumes: `PokemonListItem`, `PokemonListPage`, `PokemonDetail`, `PokemonStat`, `PokemonType` from `core/models/pokemon.model.ts` (Task 1)
- Produces: `PokemonService` with methods `getPokemonPage(offset: number, limit: number): Observable<PokemonListPage>`, `getPokemonDetail(nameOrId: string): Observable<PokemonDetail>`, `getTypes(): Observable<PokemonType[]>`, `getPokemonIdsByTypes(typeNames: string[]): Observable<Set<number>>`, `extractIdFromUrl(url: string): number` - consumed by every feature component in later tasks.

- [ ] **Step 1: Add HttpClient provider**

Open `src/app/app.config.ts`. If `ng add @angular/material` didn't already add HTTP, add `provideHttpClient` to the providers array:

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync(),
  ],
};
```

(Keep whatever animations provider `ng add @angular/material` already set up - only ensure `provideHttpClient()` is present in the list.)

- [ ] **Step 2: Write the service**

```typescript
// src/app/core/services/pokemon.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of } from 'rxjs';
import {
  PokemonDetail,
  PokemonListItem,
  PokemonListPage,
  PokemonStat,
  PokemonType,
} from '../models/pokemon.model';

const BASE_URL = 'https://pokeapi.co/api/v2';
const SPRITE_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

interface RawListResponse {
  count: number;
  next: string | null;
  results: { name: string; url: string }[];
}

interface RawTypeListResponse {
  results: { name: string; url: string }[];
}

interface RawTypePokemonResponse {
  pokemon: { pokemon: { name: string; url: string } }[];
}

interface RawPokemonDetail {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites: { front_default: string | null };
  types: { type: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
}

@Injectable({ providedIn: 'root' })
export class PokemonService {
  private http = inject(HttpClient);
  private detailCache = new Map<string, PokemonDetail>();

  extractIdFromUrl(url: string): number {
    const match = url.match(/\/(\d+)\/?$/);
    if (!match) {
      throw new Error(`Cannot extract id from url: ${url}`);
    }
    return Number(match[1]);
  }

  getPokemonPage(offset: number, limit: number): Observable<PokemonListPage> {
    return this.http
      .get<RawListResponse>(`${BASE_URL}/pokemon?offset=${offset}&limit=${limit}`)
      .pipe(
        map((res) => ({
          items: res.results.map((r) => this.toListItem(r.name, r.url)),
          total: res.count,
          nextOffset: res.next ? offset + limit : null,
        }))
      );
  }

  getPokemonDetail(nameOrId: string): Observable<PokemonDetail> {
    const cached = this.detailCache.get(nameOrId);
    if (cached) {
      return of(cached);
    }
    return this.http.get<RawPokemonDetail>(`${BASE_URL}/pokemon/${nameOrId}`).pipe(
      map((raw) => this.toDetail(raw)),
      map((detail) => {
        this.detailCache.set(nameOrId, detail);
        this.detailCache.set(String(detail.id), detail);
        return detail;
      })
    );
  }

  getTypes(): Observable<PokemonType[]> {
    return this.http.get<RawTypeListResponse>(`${BASE_URL}/type`).pipe(
      map((res) =>
        res.results
          .map((r) => ({ id: this.extractIdFromUrl(r.url), name: r.name }))
          .filter((t) => t.id <= 18)
          .sort((a, b) => a.id - b.id)
      )
    );
  }

  getPokemonIdsByTypes(typeNames: string[]): Observable<Set<number>> {
    if (typeNames.length === 0) {
      return of(new Set<number>());
    }
    const requests = typeNames.map((name) =>
      this.http.get<RawTypePokemonResponse>(`${BASE_URL}/type/${name}`).pipe(
        map((res) => new Set(res.pokemon.map((p) => this.extractIdFromUrl(p.pokemon.url))))
      )
    );
    return forkJoin(requests).pipe(
      map((sets) => sets.reduce((acc, s) => new Set([...acc].filter((id) => s.has(id)))))
    );
  }

  private toListItem(name: string, url: string): PokemonListItem {
    const id = this.extractIdFromUrl(url);
    return { id, name, spriteUrl: `${SPRITE_BASE_URL}/${id}.png` };
  }

  private toDetail(raw: RawPokemonDetail): PokemonDetail {
    const stats: PokemonStat[] = raw.stats.map((s) => ({ name: s.stat.name, baseStat: s.base_stat }));
    return {
      id: raw.id,
      name: raw.name,
      height: raw.height,
      weight: raw.weight,
      spriteUrl: raw.sprites.front_default ?? `${SPRITE_BASE_URL}/${raw.id}.png`,
      types: raw.types.map((t) => t.type.name),
      stats,
    };
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `ng build`
Expected: `Application bundle generation complete.` with no errors. (End-to-end verification that this service actually returns correct data happens in Task 6, once the list screen calls it.)

- [ ] **Step 4: Commit**

```bash
git add src/app/core/services/pokemon.service.ts src/app/app.config.ts
git commit -m "feat: add PokemonService with list, detail, types and type-filter methods"
```

---

### Task 3: FavoritesService (Signals + localStorage)

**Files:**
- Create: `src/app/core/services/favorites.service.ts`

**Interfaces:**
- Produces: `FavoritesService` with `favoriteIds: Signal<Set<number>>`, `isFavorite(id: number): boolean`, `toggleFavorite(id: number): void` - consumed by `pokemon-card`, `pokemon-detail`, and `favorites` feature in later tasks.

- [ ] **Step 1: Write the service**

```typescript
// src/app/core/services/favorites.service.ts
import { Injectable, effect, signal } from '@angular/core';

const STORAGE_KEY = 'pokedex-favorites';

function loadFromStorage(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: number[] = JSON.parse(raw);
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveToStorage(ids: Set<number>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage indisponível (ex: modo privado) - favorito não persiste, app segue funcional
  }
}

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  readonly favoriteIds = signal<Set<number>>(loadFromStorage());

  constructor() {
    effect(() => saveToStorage(this.favoriteIds()));
  }

  isFavorite(id: number): boolean {
    return this.favoriteIds().has(id);
  }

  toggleFavorite(id: number): void {
    const current = new Set(this.favoriteIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.favoriteIds.set(current);
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `ng build`
Expected: `Application bundle generation complete.` with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/core/services/favorites.service.ts
git commit -m "feat: add FavoritesService with localStorage persistence"
```

---

### Task 4: HTTP error interceptor

**Files:**
- Create: `src/app/core/interceptors/error.interceptor.ts`
- Modify: `src/app/app.config.ts` (register the interceptor)

**Interfaces:**
- Consumes: `MatSnackBar` from `@angular/material/snack-bar`
- Produces: `errorInterceptor: HttpInterceptorFn`, wired globally so every HTTP failure in the app shows a snackbar without any feature code needing to handle it explicitly.

- [ ] **Step 1: Write the interceptor**

```typescript
// src/app/core/interceptors/error.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  return next(req).pipe(
    catchError((error) => {
      snackBar.open('Não foi possível carregar os dados. Tente novamente.', 'Fechar', {
        duration: 4000,
      });
      return throwError(() => error);
    })
  );
};
```

- [ ] **Step 2: Register the interceptor**

Update `src/app/app.config.ts` to use `withInterceptors`:

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([errorInterceptor])),
    provideAnimationsAsync(),
  ],
};
```

- [ ] **Step 3: Verify it compiles**

Run: `ng build`
Expected: `Application bundle generation complete.` with no errors. (The error path is exercised manually as part of Task 6 Step 6, using DevTools Network throttling set to "Offline" while the list screen is loading pokémons.)

- [ ] **Step 4: Commit**

```bash
git add src/app/core/interceptors/error.interceptor.ts src/app/app.config.ts
git commit -m "feat: add global HTTP error interceptor with snackbar feedback"
```

---

### Task 5: Shared presentational components (loading-spinner, pokemon-card, type-chip)

**Files:**
- Create: `src/app/shared/components/loading-spinner/loading-spinner.component.ts`
- Create: `src/app/shared/components/pokemon-card/pokemon-card.component.ts`
- Create: `src/app/shared/components/pokemon-card/pokemon-card.component.html`
- Create: `src/app/shared/components/pokemon-card/pokemon-card.component.scss`
- Create: `src/app/shared/components/type-chip/type-chip.component.ts`
- Create: `src/app/shared/components/type-chip/type-chip.component.html`

**Interfaces:**
- Consumes: `PokemonListItem`, `PokemonType` from `core/models/pokemon.model.ts` (Task 1)
- Produces:
  - `LoadingSpinnerComponent` (selector `app-loading-spinner`, no inputs/outputs)
  - `PokemonCardComponent` (selector `app-pokemon-card`) - inputs `pokemon: PokemonListItem` (required), `isFavorite: boolean`, `isSelectedForCompare: boolean`, `compareDisabled: boolean`; outputs `favoriteToggled: EventEmitter<number>`, `compareToggled: EventEmitter<number>`
  - `TypeChipComponent` (selector `app-type-chip-filter`) - inputs `types: PokemonType[]` (required), `selectedTypeNames: string[]`; output `selectionChanged: EventEmitter<string[]>`
  - All three consumed by `features/pokemon-list`, `features/pokemon-detail`, `features/favorites` in later tasks.

- [ ] **Step 1: Write the loading spinner**

```typescript
// src/app/shared/components/loading-spinner/loading-spinner.component.ts
import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `<div class="loading-spinner"><mat-spinner diameter="40"></mat-spinner></div>`,
  styles: [`.loading-spinner { display: flex; justify-content: center; padding: 24px; }`],
})
export class LoadingSpinnerComponent {}
```

- [ ] **Step 2: Write the pokemon card component class**

```typescript
// src/app/shared/components/pokemon-card/pokemon-card.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { PokemonListItem } from '../../../core/models/pokemon.model';

@Component({
  selector: 'app-pokemon-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatCheckboxModule],
  templateUrl: './pokemon-card.component.html',
  styleUrl: './pokemon-card.component.scss',
})
export class PokemonCardComponent {
  @Input({ required: true }) pokemon!: PokemonListItem;
  @Input() isFavorite = false;
  @Input() isSelectedForCompare = false;
  @Input() compareDisabled = false;

  @Output() favoriteToggled = new EventEmitter<number>();
  @Output() compareToggled = new EventEmitter<number>();
}
```

- [ ] **Step 3: Write the pokemon card template**

```html
<!-- src/app/shared/components/pokemon-card/pokemon-card.component.html -->
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
    <mat-checkbox
      [checked]="isSelectedForCompare"
      [disabled]="compareDisabled && !isSelectedForCompare"
      (change)="compareToggled.emit(pokemon.id)"
    >
      Comparar
    </mat-checkbox>
  </div>
</mat-card>
```

- [ ] **Step 4: Write the pokemon card styles**

```scss
// src/app/shared/components/pokemon-card/pokemon-card.component.scss
.pokemon-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;

  &__link {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-decoration: none;
    color: inherit;
  }

  &__sprite {
    width: 96px;
    height: 96px;
    object-fit: contain;
  }

  &__name {
    text-transform: capitalize;
    font-weight: 500;
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
}
```

- [ ] **Step 5: Write the type-chip filter component**

```typescript
// src/app/shared/components/type-chip/type-chip.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { PokemonType } from '../../../core/models/pokemon.model';

@Component({
  selector: 'app-type-chip-filter',
  standalone: true,
  imports: [CommonModule, MatChipsModule],
  templateUrl: './type-chip.component.html',
})
export class TypeChipComponent {
  @Input({ required: true }) types: PokemonType[] = [];
  @Input() selectedTypeNames: string[] = [];
  @Output() selectionChanged = new EventEmitter<string[]>();

  isSelected(name: string): boolean {
    return this.selectedTypeNames.includes(name);
  }

  toggle(name: string): void {
    const next = this.isSelected(name)
      ? this.selectedTypeNames.filter((n) => n !== name)
      : [...this.selectedTypeNames, name];
    this.selectionChanged.emit(next);
  }
}
```

```html
<!-- src/app/shared/components/type-chip/type-chip.component.html -->
<mat-chip-listbox multiple aria-label="Filtro por tipo">
  @for (type of types; track type.id) {
    <mat-chip-option [selected]="isSelected(type.name)" (click)="toggle(type.name)">
      {{ type.name }}
    </mat-chip-option>
  }
</mat-chip-listbox>
```

- [ ] **Step 6: Verify it compiles**

Run: `ng build`
Expected: `Application bundle generation complete.` with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/shared
git commit -m "feat: add shared loading-spinner, pokemon-card and type-chip components"
```

---

### Task 6: Pokémon list feature (search, infinite scroll, type filter, compare selection)

**Files:**
- Create: `src/app/features/pokemon-list/pokemon-list.component.ts`
- Create: `src/app/features/pokemon-list/pokemon-list.component.html`
- Create: `src/app/features/pokemon-list/pokemon-list.component.scss`
- Modify: `src/app/app.routes.ts` (add `''` route pointing to this component)

**Interfaces:**
- Consumes: `PokemonService` (Task 2), `FavoritesService` (Task 3), `PokemonCardComponent`/`TypeChipComponent`/`LoadingSpinnerComponent` (Task 5), `PokemonListItem`/`PokemonType` (Task 1)
- Produces: `PokemonListComponent`, routed at `/` - the app's home screen. No other task consumes this component directly (it's a route leaf), but Task 9's compare button navigates to `/comparar?a=ID&b=ID`, which Task 9 must accept as query params.

- [ ] **Step 1: Write the component class**

```typescript
// src/app/features/pokemon-list/pokemon-list.component.ts
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { PokemonService } from '../../core/services/pokemon.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { PokemonListItem, PokemonType } from '../../core/models/pokemon.model';
import { PokemonCardComponent } from '../../shared/components/pokemon-card/pokemon-card.component';
import { TypeChipComponent } from '../../shared/components/type-chip/type-chip.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    PokemonCardComponent,
    TypeChipComponent,
    LoadingSpinnerComponent,
  ],
  templateUrl: './pokemon-list.component.html',
  styleUrl: './pokemon-list.component.scss',
})
export class PokemonListComponent implements OnInit, AfterViewInit, OnDestroy {
  private pokemonService = inject(PokemonService);
  favoritesService = inject(FavoritesService);
  private router = inject(Router);

  @ViewChild('sentinel') sentinel?: ElementRef<HTMLDivElement>;
  private observer?: IntersectionObserver;

  allItems = signal<PokemonListItem[]>([]);
  loading = signal(false);
  offset = signal(0);
  total = signal<number | null>(null);
  searchTerm = signal('');
  types = signal<PokemonType[]>([]);
  selectedTypeNames = signal<string[]>([]);
  typeFilteredIds = signal<Set<number> | null>(null);
  compareSelection = signal<number[]>([]);

  filteredItems = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const typeIds = this.typeFilteredIds();
    return this.allItems().filter((item) => {
      const matchesSearch = !term || item.name.toLowerCase().includes(term);
      const matchesType = !typeIds || typeIds.has(item.id);
      return matchesSearch && matchesType;
    });
  });

  hasMore = computed(() => this.total() === null || this.allItems().length < (this.total() ?? 0));

  ngOnInit(): void {
    this.pokemonService.getTypes().subscribe((types) => this.types.set(types));
    this.loadNextPage();
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !this.loading() && this.hasMore()) {
        this.loadNextPage();
      }
    });
    if (this.sentinel) {
      this.observer.observe(this.sentinel.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  loadNextPage(): void {
    this.loading.set(true);
    this.pokemonService.getPokemonPage(this.offset(), PAGE_SIZE).subscribe({
      next: (page) => {
        this.allItems.update((items) => [...items, ...page.items]);
        this.total.set(page.total);
        this.offset.update((o) => o + PAGE_SIZE);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  onTypeSelectionChanged(typeNames: string[]): void {
    this.selectedTypeNames.set(typeNames);
    if (typeNames.length === 0) {
      this.typeFilteredIds.set(null);
      return;
    }
    this.pokemonService.getPokemonIdsByTypes(typeNames).subscribe((ids) => this.typeFilteredIds.set(ids));
  }

  onFavoriteToggled(id: number): void {
    this.favoritesService.toggleFavorite(id);
  }

  onCompareToggled(id: number): void {
    const current = this.compareSelection();
    if (current.includes(id)) {
      this.compareSelection.set(current.filter((i) => i !== id));
    } else if (current.length < 2) {
      this.compareSelection.set([...current, id]);
    }
  }

  isCompareDisabled(): boolean {
    return this.compareSelection().length >= 2;
  }

  goToCompare(): void {
    const [a, b] = this.compareSelection();
    this.router.navigate(['/comparar'], { queryParams: { a, b } });
  }
}
```

- [ ] **Step 2: Write the template**

```html
<!-- src/app/features/pokemon-list/pokemon-list.component.html -->
<mat-toolbar color="primary">
  <span>Pokédex</span>
  <span class="spacer"></span>
  <a routerLink="/favoritos" mat-button>Favoritos</a>
</mat-toolbar>

<div class="pokemon-list__filters">
  <mat-form-field appearance="outline">
    <mat-label>Buscar por nome</mat-label>
    <input matInput [value]="searchTerm()" (input)="onSearchChange($any($event.target).value)" />
  </mat-form-field>

  <app-type-chip-filter
    [types]="types()"
    [selectedTypeNames]="selectedTypeNames()"
    (selectionChanged)="onTypeSelectionChanged($event)"
  ></app-type-chip-filter>
</div>

@if (compareSelection().length === 2) {
  <div class="pokemon-list__compare-bar">
    <button mat-raised-button color="accent" (click)="goToCompare()">Comparar selecionados</button>
  </div>
}

<div class="pokemon-list__grid">
  @for (item of filteredItems(); track item.id) {
    <app-pokemon-card
      [pokemon]="item"
      [isFavorite]="favoritesService.isFavorite(item.id)"
      [isSelectedForCompare]="compareSelection().includes(item.id)"
      [compareDisabled]="isCompareDisabled()"
      (favoriteToggled)="onFavoriteToggled($event)"
      (compareToggled)="onCompareToggled($event)"
    ></app-pokemon-card>
  } @empty {
    <p>Nenhum pokémon encontrado.</p>
  }
</div>

@if (loading()) {
  <app-loading-spinner></app-loading-spinner>
}

<div #sentinel class="pokemon-list__sentinel"></div>
```

- [ ] **Step 3: Write the styles**

```scss
// src/app/features/pokemon-list/pokemon-list.component.scss
.spacer {
  flex: 1 1 auto;
}

.pokemon-list__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px;
  align-items: center;
}

.pokemon-list__compare-bar {
  padding: 0 16px 16px;
}

.pokemon-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  padding: 16px;
}

.pokemon-list__sentinel {
  height: 1px;
}
```

- [ ] **Step 4: Wire the route**

Open `src/app/app.routes.ts` and set:

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/pokemon-list/pokemon-list.component').then((m) => m.PokemonListComponent),
  },
];
```

- [ ] **Step 5: Verify it compiles**

Run: `ng build`
Expected: `Application bundle generation complete.` with no errors.

- [ ] **Step 6: Manual verification in the browser**

Run: `ng serve`, open `http://localhost:4200`. Verify:
1. The first 20 pokémons load automatically.
2. Scrolling down loads more (scroll to the bottom repeatedly and confirm the count keeps growing past 20, 40, 60...).
3. Typing a name in the search box filters the visible cards live.
4. Clicking a type chip (e.g. "fire") filters the list to only that type; selecting a second type narrows it further (intersection).
5. Clicking the heart icon on a card toggles it, and refreshing the page keeps the favorite (check DevTools → Application → Local Storage → `pokedex-favorites`).
6. Checking "Comparar" on exactly 2 cards shows the "Comparar selecionados" button; a 3rd card's checkbox is disabled until one of the first two is unchecked.
7. Open DevTools → Network, set throttling to "Offline", then reload the page: the "Não foi possível carregar os dados. Tente novamente." snackbar appears (confirms Task 4's interceptor works end-to-end). Set throttling back to "No throttling" afterwards.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/pokemon-list src/app/app.routes.ts
git commit -m "feat: add pokemon list screen with infinite scroll, search, type filter and compare selection"
```

---

### Task 7: Pokémon detail feature

**Files:**
- Create: `src/app/features/pokemon-detail/pokemon-detail.component.ts`
- Create: `src/app/features/pokemon-detail/pokemon-detail.component.html`
- Create: `src/app/features/pokemon-detail/pokemon-detail.component.scss`
- Modify: `src/app/app.routes.ts` (add `pokemon/:id` route)

**Interfaces:**
- Consumes: `PokemonService.getPokemonDetail` (Task 2), `FavoritesService` (Task 3), `LoadingSpinnerComponent` (Task 5), `PokemonDetail` (Task 1)
- Produces: `PokemonDetailComponent`, routed at `/pokemon/:id` - reached by clicking a card's link in Task 6.

- [ ] **Step 1: Write the component class**

```typescript
// src/app/features/pokemon-detail/pokemon-detail.component.ts
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, RouterLink, MatButtonModule, MatChipsModule, LoadingSpinnerComponent],
  templateUrl: './pokemon-detail.component.html',
  styleUrl: './pokemon-detail.component.scss',
})
export class PokemonDetailComponent {
  private route = inject(ActivatedRoute);
  private pokemonService = inject(PokemonService);
  favoritesService = inject(FavoritesService);

  pokemon = signal<PokemonDetail | null>(null);
  loading = signal(true);

  isFavorite = computed(() => {
    const p = this.pokemon();
    return p ? this.favoritesService.isFavorite(p.id) : false;
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.pokemonService.getPokemonDetail(id).subscribe({
      next: (detail) => {
        this.pokemon.set(detail);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleFavorite(): void {
    const p = this.pokemon();
    if (p) {
      this.favoritesService.toggleFavorite(p.id);
    }
  }
}
```

- [ ] **Step 2: Write the template**

```html
<!-- src/app/features/pokemon-detail/pokemon-detail.component.html -->
<a routerLink="/" mat-button>← Voltar</a>

@if (loading()) {
  <app-loading-spinner></app-loading-spinner>
} @else if (pokemon(); as p) {
  <div class="pokemon-detail">
    <img [src]="p.spriteUrl" [alt]="p.name" class="pokemon-detail__sprite" />
    <h1>#{{ p.id }} {{ p.name }}</h1>
    <button mat-raised-button color="primary" (click)="toggleFavorite()">
      {{ isFavorite() ? 'Remover dos favoritos' : 'Adicionar aos favoritos' }}
    </button>

    <mat-chip-set>
      @for (type of p.types; track type) {
        <mat-chip>{{ type }}</mat-chip>
      }
    </mat-chip-set>

    <p>Altura: {{ p.height }} | Peso: {{ p.weight }}</p>

    <h2>Stats</h2>
    <ul>
      @for (stat of p.stats; track stat.name) {
        <li>{{ stat.name }}: {{ stat.baseStat }}</li>
      }
    </ul>
  </div>
} @else {
  <p>Pokémon não encontrado.</p>
}
```

- [ ] **Step 3: Write the styles**

```scss
// src/app/features/pokemon-detail/pokemon-detail.component.scss
.pokemon-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  text-align: center;

  &__sprite {
    width: 160px;
    height: 160px;
    object-fit: contain;
  }
}
```

- [ ] **Step 4: Wire the route**

Update `src/app/app.routes.ts`:

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/pokemon-list/pokemon-list.component').then((m) => m.PokemonListComponent),
  },
  {
    path: 'pokemon/:id',
    loadComponent: () =>
      import('./features/pokemon-detail/pokemon-detail.component').then((m) => m.PokemonDetailComponent),
  },
];
```

- [ ] **Step 5: Verify it compiles**

Run: `ng build`
Expected: `Application bundle generation complete.` with no errors.

- [ ] **Step 6: Manual verification in the browser**

Run: `ng serve`, open `http://localhost:4200`, click any pokémon card. Verify:
1. The detail screen shows sprite, name, types, height/weight, and stats.
2. The favorite button toggles the label and updates `localStorage`.
3. "← Voltar" returns to the list, and any previous favorite/compare state on the list is preserved.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/pokemon-detail src/app/app.routes.ts
git commit -m "feat: add pokemon detail screen"
```

---

### Task 8: Favorites feature

**Files:**
- Create: `src/app/features/favorites/favorites.component.ts`
- Create: `src/app/features/favorites/favorites.component.html`
- Create: `src/app/features/favorites/favorites.component.scss`
- Modify: `src/app/app.routes.ts` (add `favoritos` route)

**Interfaces:**
- Consumes: `FavoritesService.favoriteIds` (Task 3), `PokemonService.getPokemonDetail` (Task 2), `PokemonCardComponent`/`LoadingSpinnerComponent` (Task 5)
- Produces: `FavoritesComponent`, routed at `/favoritos` - reached from the "Favoritos" link in Task 6's toolbar.

- [ ] **Step 1: Write the component class**

```typescript
// src/app/features/favorites/favorites.component.ts
import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { forkJoin } from 'rxjs';
import { FavoritesService } from '../../core/services/favorites.service';
import { PokemonService } from '../../core/services/pokemon.service';
import { PokemonListItem } from '../../core/models/pokemon.model';
import { PokemonCardComponent } from '../../shared/components/pokemon-card/pokemon-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, PokemonCardComponent, LoadingSpinnerComponent],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.scss',
})
export class FavoritesComponent {
  favoritesService = inject(FavoritesService);
  private pokemonService = inject(PokemonService);

  items = signal<PokemonListItem[]>([]);
  loading = signal(false);

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

  onFavoriteToggled(id: number): void {
    this.favoritesService.toggleFavorite(id);
  }
}
```

- [ ] **Step 2: Write the template**

```html
<!-- src/app/features/favorites/favorites.component.html -->
<a routerLink="/" mat-button>← Voltar</a>
<h1>Favoritos</h1>

@if (loading()) {
  <app-loading-spinner></app-loading-spinner>
}

@if (!loading() && items().length === 0) {
  <p>Você ainda não tem favoritos.</p>
}

<div class="favorites__grid">
  @for (item of items(); track item.id) {
    <app-pokemon-card [pokemon]="item" [isFavorite]="true" (favoriteToggled)="onFavoriteToggled($event)">
    </app-pokemon-card>
  }
</div>
```

- [ ] **Step 3: Write the styles**

```scss
// src/app/features/favorites/favorites.component.scss
.favorites__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  padding: 16px;
}
```

- [ ] **Step 4: Wire the route**

Update `src/app/app.routes.ts`:

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/pokemon-list/pokemon-list.component').then((m) => m.PokemonListComponent),
  },
  {
    path: 'pokemon/:id',
    loadComponent: () =>
      import('./features/pokemon-detail/pokemon-detail.component').then((m) => m.PokemonDetailComponent),
  },
  {
    path: 'favoritos',
    loadComponent: () =>
      import('./features/favorites/favorites.component').then((m) => m.FavoritesComponent),
  },
];
```

- [ ] **Step 5: Verify it compiles**

Run: `ng build`
Expected: `Application bundle generation complete.` with no errors.

- [ ] **Step 6: Manual verification in the browser**

Run: `ng serve`. Favorite 2-3 pokémons from the list, click "Favoritos" in the toolbar. Verify:
1. Only the favorited pokémons appear.
2. Un-favoriting one from this screen removes it from the grid immediately.
3. With zero favorites, the empty-state message shows.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/favorites src/app/app.routes.ts
git commit -m "feat: add favorites screen"
```

---

### Task 9: Compare feature

**Files:**
- Create: `src/app/features/compare/compare.component.ts`
- Create: `src/app/features/compare/compare.component.html`
- Create: `src/app/features/compare/compare.component.scss`
- Modify: `src/app/app.routes.ts` (add `comparar` route and wildcard fallback)

**Interfaces:**
- Consumes: `PokemonService.getPokemonDetail` (Task 2), `LoadingSpinnerComponent` (Task 5); query params `a` and `b` produced by Task 6's `goToCompare()`
- Produces: `CompareComponent`, routed at `/comparar` - the last route; also adds the `**` wildcard redirect to `/`.

- [ ] **Step 1: Write the component class**

```typescript
// src/app/features/compare/compare.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { forkJoin } from 'rxjs';
import { PokemonService } from '../../core/services/pokemon.service';
import { PokemonDetail } from '../../core/models/pokemon.model';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, LoadingSpinnerComponent],
  templateUrl: './compare.component.html',
  styleUrl: './compare.component.scss',
})
export class CompareComponent {
  private route = inject(ActivatedRoute);
  private pokemonService = inject(PokemonService);
  private router = inject(Router);

  pokemonA = signal<PokemonDetail | null>(null);
  pokemonB = signal<PokemonDetail | null>(null);
  loading = signal(true);

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    const idA = params.get('a');
    const idB = params.get('b');
    if (!idA || !idB) {
      this.router.navigate(['/']);
      return;
    }
    forkJoin([this.pokemonService.getPokemonDetail(idA), this.pokemonService.getPokemonDetail(idB)]).subscribe({
      next: ([a, b]) => {
        this.pokemonA.set(a);
        this.pokemonB.set(b);
        this.loading.set(false);
      },
      error: () => this.router.navigate(['/']),
    });
  }
}
```

- [ ] **Step 2: Write the template**

```html
<!-- src/app/features/compare/compare.component.html -->
<a routerLink="/" mat-button>← Voltar</a>
<h1>Comparar</h1>

@if (loading()) {
  <app-loading-spinner></app-loading-spinner>
} @else if (pokemonA(); as a) {
  @if (pokemonB(); as b) {
    <div class="compare__grid">
      <div class="compare__column">
        <h2>#{{ a.id }} {{ a.name }}</h2>
        <img [src]="a.spriteUrl" [alt]="a.name" />
        <p>Altura: {{ a.height }} | Peso: {{ a.weight }}</p>
        <ul>
          @for (stat of a.stats; track stat.name) {
            <li>{{ stat.name }}: {{ stat.baseStat }}</li>
          }
        </ul>
      </div>
      <div class="compare__column">
        <h2>#{{ b.id }} {{ b.name }}</h2>
        <img [src]="b.spriteUrl" [alt]="b.name" />
        <p>Altura: {{ b.height }} | Peso: {{ b.weight }}</p>
        <ul>
          @for (stat of b.stats; track stat.name) {
            <li>{{ stat.name }}: {{ stat.baseStat }}</li>
          }
        </ul>
      </div>
    </div>
  }
}
```

- [ ] **Step 3: Write the styles**

```scss
// src/app/features/compare/compare.component.scss
.compare__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  justify-content: center;
  padding: 16px;
}

.compare__column {
  text-align: center;
}
```

- [ ] **Step 4: Wire the route and wildcard fallback**

Update `src/app/app.routes.ts` to its final version:

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/pokemon-list/pokemon-list.component').then((m) => m.PokemonListComponent),
  },
  {
    path: 'pokemon/:id',
    loadComponent: () =>
      import('./features/pokemon-detail/pokemon-detail.component').then((m) => m.PokemonDetailComponent),
  },
  {
    path: 'favoritos',
    loadComponent: () =>
      import('./features/favorites/favorites.component').then((m) => m.FavoritesComponent),
  },
  {
    path: 'comparar',
    loadComponent: () =>
      import('./features/compare/compare.component').then((m) => m.CompareComponent),
  },
  { path: '**', redirectTo: '' },
];
```

- [ ] **Step 5: Verify it compiles**

Run: `ng build`
Expected: `Application bundle generation complete.` with no errors.

- [ ] **Step 6: Manual verification in the browser**

Run: `ng serve`. From the list, select exactly 2 pokémons via the "Comparar" checkbox, click "Comparar selecionados". Verify:
1. Both pokémons render side by side with sprite, height/weight, and stats.
2. Manually visiting `/comparar` with no query params (or an invalid id) redirects back to `/` without a crash.
3. Visiting a random unknown URL (e.g. `/xyz`) redirects to `/`.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/compare src/app/app.routes.ts
git commit -m "feat: add compare screen and wildcard route fallback"
```

---

### Task 10: Final wiring, README, and end-to-end smoke pass

**Files:**
- Modify: `src/app/app.component.ts` / `src/app/app.component.html` (ensure it's just a `<router-outlet>` shell - Angular CLI scaffolds this by default, confirm no leftover boilerplate content)
- Create: `README.md` at the project root

**Interfaces:**
- Produces: nothing new for other tasks to consume - this is the final integration checkpoint for the whole app.

- [ ] **Step 1: Clean up the app shell**

Open `src/app/app.component.html`. Replace any CLI-generated placeholder markup with just:

```html
<router-outlet></router-outlet>
```

Open `src/app/app.component.ts` and remove any now-unused imports/properties the CLI scaffolded (e.g. a `title` property with no consumer), keeping only what `RouterOutlet` needs:

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {}
```

- [ ] **Step 2: Write the README**

```markdown
<!-- README.md -->
# Pokédex

Projeto de estudo em Angular + TypeScript consumindo a [PokéAPI](https://pokeapi.co/).

## Funcionalidades

- Listagem de pokémons com scroll infinito
- Busca por nome
- Filtro por tipo (multi-seleção)
- Favoritos persistidos em `localStorage`
- Comparação lado a lado entre 2 pokémons

## Rodando localmente

\`\`\`bash
npm install
ng serve
\`\`\`

Acesse `http://localhost:4200`.

## Stack

- Angular (standalone components) + TypeScript
- Angular Material
- Signals para estado (sem NgRx)
- PokéAPI (sem chave de API)
```

- [ ] **Step 3: Full build check**

Run: `ng build`
Expected: `Application bundle generation complete.` with no errors or warnings about unused imports.

- [ ] **Step 4: Full manual end-to-end pass**

Run: `ng serve`, open `http://localhost:4200`, and walk through the entire flow once, start to finish:
1. List loads, scroll triggers more pages.
2. Search + type filter combine correctly (e.g. search "char" with type "fire" selected shows only matching results).
3. Favorite 2 pokémons, visit `/favoritos`, confirm they're there, un-favorite one.
4. Go back to the list, select 2 for comparison, compare, confirm both render correctly.
5. Click into a detail page directly, favorite/unfavorite from there, confirm it reflects back on the list.
6. Refresh the browser at each of these screens and confirm nothing crashes and favorites persist.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: clean up app shell, add README, final smoke pass"
```
