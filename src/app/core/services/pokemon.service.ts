import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';
import {
  EvolutionNode,
  PokemonDetail,
  PokemonExtras,
  PokemonListItem,
  PokemonListPage,
  PokemonMove,
  PokemonStat,
  PokemonType,
} from '../models/pokemon.model';
import { getItemNamePt } from '../../shared/evolution-labels';
import { formatSlug } from '../../shared/format-utils';
import { getCategoryOverride } from '../../shared/category-overrides';
import { TranslationService } from './translation.service';
import { environment } from '../../../environments/environment';

const PORTUGUESE_LANGUAGES = ['pt-br', 'pt'];

const LANGUAGE_PRIORITY = ['pt-br', 'pt', 'en'];

const BASE_URL = environment.apiBaseUrl;
const ARTWORK_BASE_URL = environment.artworkBaseUrl;
const CRIES_BASE_URL = environment.criesBaseUrl;

const TYPE_PRIORITY: Record<string, number> = {
  normal: 0, fire: 1, water: 2, grass: 3, electric: 4,
  ice: 5, fighting: 6, poison: 7, ground: 8, psychic: 9,
  bug: 10, rock: 11, ghost: 12, dragon: 13, dark: 14,
  steel: 15, fairy: 16, flying: 17,
};

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

interface RawMoveDetail {
  move: { name: string; url: string };
  version_group_details: {
    level_learned_at: number;
    move_learn_method: { name: string };
    version_group: { name: string };
  }[];
}

interface RawPokemonDetail {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  sprites: {
    front_default: string | null;
    front_shiny: string | null;
    other: {
      home: { front_default: string | null; front_shiny: string | null };
      'official-artwork': { front_default: string | null; front_shiny: string | null };
    };
  };
  types: { type: { name: string } }[];
  stats: { base_stat: number; effort: number; stat: { name: string } }[];
  abilities: { ability: { name: string } }[];
  moves: RawMoveDetail[];
}

interface RawLocalizedName {
  name: string;
  language: { name: string };
}

interface RawSpeciesResponse {
  evolution_chain: { url: string };
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
  genera: { genus: string; language: { name: string } }[];
  capture_rate: number;
  base_happiness: number;
  growth_rate: { name: string };
  egg_groups: { name: string }[];
  gender_rate: number;
  habitat: { name: string } | null;
  is_legendary: boolean;
  is_mythical: boolean;
  is_baby: boolean;
  generation: { name: string };
}

interface RawEvolutionDetail {
  min_level: number | null;
  item: { name: string } | null;
  trigger: { name: string } | null;
  min_happiness: number | null;
}

interface RawEvolutionChainNode {
  species: { name: string; url: string };
  evolution_details: RawEvolutionDetail[];
  evolves_to: RawEvolutionChainNode[];
}

interface RawEvolutionChainResponse {
  chain: RawEvolutionChainNode;
}

interface RawMoveDetailResponse {
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  damage_class: { name: string } | null;
  names: RawLocalizedName[];
}

interface RawAbilityResponse {
  names: RawLocalizedName[];
}

export interface MoveDetail {
  displayName: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  damageClass: string | null;
}

@Injectable({ providedIn: 'root' })
export class PokemonService {
  private http = inject(HttpClient);
  private translation = inject(TranslationService);
  private detailCache = new Map<string, PokemonDetail>();
  private allListItems$: Observable<PokemonListItem[]> | null = null;
  private idTypes$: Observable<Map<number, string[]>> | null = null;
  private moveCache = new Map<string, MoveDetail>();
  private abilityCache = new Map<string, string>();

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
    return this.http.get<RawPokemonDetail>(`${BASE_URL}/pokemon/${encodeURIComponent(nameOrId)}`).pipe(
      map((raw) => this.toDetail(raw)),
      map((detail) => {
        this.detailCache.set(nameOrId, detail);
        this.detailCache.set(String(detail.id), detail);
        return detail;
      })
    );
  }

  getAllPokemonListItems(): Observable<PokemonListItem[]> {
    // shareReplay (não só cachear o valor já resolvido) evita que dois
    // consumidores simultâneos com cache ainda frio (ex.: os dois
    // <app-pokemon-picker> do compare) disparem a mesma requisição em duplicidade.
    if (!this.allListItems$) {
      this.allListItems$ = this.http.get<RawListResponse>(`${BASE_URL}/pokemon?limit=100000`).pipe(
        map((res) => res.results.map((r) => this.toListItem(r.name, r.url))),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.allListItems$;
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

  getTypesByPokemonId(): Observable<Map<number, string[]>> {
    // Mesmo cuidado de getAllPokemonListItems(): shareReplay evita disparar
    // as ~18 chamadas /type/{nome} de novo por consumidor concorrente com
    // cache frio.
    if (!this.idTypes$) {
      this.idTypes$ = this.getTypes().pipe(
        switchMap((types) =>
          forkJoin(
            types.map((type) =>
              this.http.get<RawTypePokemonResponse>(`${BASE_URL}/type/${encodeURIComponent(type.name)}`).pipe(
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
          for (const [, types] of idToTypes) {
            types.sort((a, b) => (TYPE_PRIORITY[a] ?? 99) - (TYPE_PRIORITY[b] ?? 99));
          }
          return idToTypes;
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.idTypes$;
  }

  getPokemonExtras(nameOrId: string): Observable<PokemonExtras> {
    return this.http.get<RawSpeciesResponse>(`${BASE_URL}/pokemon-species/${encodeURIComponent(nameOrId)}`).pipe(
      switchMap((species) =>
        this.http.get<RawEvolutionChainResponse>(species.evolution_chain.url).pipe(
          switchMap((chainRes) => {
            const tree = this.buildEvolutionTree(chainRes.chain, null);
            const stages = this.flattenEvolutionStages(tree);
            const rawDescription = this.pickFlavorText(species.flavor_text_entries);
            const rawCategory = this.pickGenus(species.genera);
            const categoryOverride = getCategoryOverride(rawCategory);
            return forkJoin({
              description: this.translation.translate(rawDescription),
              category: categoryOverride ? of(categoryOverride) : this.translation.translate(rawCategory),
            }).pipe(
              map(({ description, category }) => ({
                description,
                category,
                evolutions: Array.from(stages.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([stage, pokemon]) => ({ stage, pokemon })),
                captureRate: species.capture_rate,
                baseHappiness: species.base_happiness,
                growthRate: species.growth_rate.name,
                eggGroups: species.egg_groups.map((g) => g.name),
                genderRate: species.gender_rate,
                habitat: species.habitat?.name ?? null,
                isLegendary: species.is_legendary,
                isMythical: species.is_mythical,
                isBaby: species.is_baby,
                generation: species.generation.name,
              }))
            );
          })
        )
      )
    );
  }

  private pickLocalized<T extends { language: { name: string } }>(entries: T[]): T | undefined {
    for (const lang of LANGUAGE_PRIORITY) {
      const found = entries.find((e) => e.language.name === lang);
      if (found) return found;
    }
    return entries[0];
  }

  private pickFlavorText(entries: { flavor_text: string; language: { name: string } }[]): string {
    const entry = this.pickLocalized(entries);
    return (entry?.flavor_text ?? '').replace(/[\n\f\r]+/g, ' ').trim();
  }

  private pickGenus(genera: { genus: string; language: { name: string } }[]): string {
    const entry = this.pickLocalized(genera);
    return entry?.genus ?? '';
  }

  private buildEvolutionTree(node: RawEvolutionChainNode, method: string | null): EvolutionNode {
    const id = this.extractIdFromUrl(node.species.url);
    return {
      id,
      name: node.species.name,
      spriteUrl: `${ARTWORK_BASE_URL}/${id}.png`,
      method,
      children: node.evolves_to.map((child) =>
        this.buildEvolutionTree(child, this.describeEvolutionDetail(child.evolution_details[0]))
      ),
    };
  }

  private flattenEvolutionStages(node: EvolutionNode, stage: number = 0): Map<number, EvolutionNode[]> {
    const map = new Map<number, EvolutionNode[]>();
    const arr = map.get(stage) ?? [];
    arr.push(node);
    map.set(stage, arr);
    for (const child of node.children) {
      const childMap = this.flattenEvolutionStages(child, stage + 1);
      for (const [k, v] of childMap) {
        const existing = map.get(k) ?? [];
        map.set(k, [...existing, ...v]);
      }
    }
    return map;
  }

  private describeEvolutionDetail(detail?: RawEvolutionDetail): string | null {
    if (!detail) {
      return null;
    }
    if (detail.min_level) {
      return `Nível ${detail.min_level}`;
    }
    if (detail.item) {
      return getItemNamePt(detail.item.name);
    }
    if (detail.trigger?.name === 'trade') {
      return 'Troca';
    }
    if (detail.min_happiness) {
      return 'Felicidade alta';
    }
    return 'Evolução especial';
  }

  getMoveDetail(moveName: string): Observable<MoveDetail> {
    const cached = this.moveCache.get(moveName);
    if (cached) return of(cached);
    return this.http.get<RawMoveDetailResponse>(`${BASE_URL}/move/${encodeURIComponent(moveName)}`).pipe(
      switchMap((raw) => {
        const localized = this.pickLocalized(raw.names ?? []);
        const resolvedName = localized?.name ?? formatSlug(moveName);
        const needsTranslation = !localized || !PORTUGUESE_LANGUAGES.includes(localized.language.name);
        const displayName$ = needsTranslation ? this.translation.translate(resolvedName) : of(resolvedName);
        return displayName$.pipe(
          map((displayName) => {
            const detail: MoveDetail = {
              displayName,
              power: raw.power,
              accuracy: raw.accuracy,
              pp: raw.pp,
              damageClass: raw.damage_class?.name ?? null,
            };
            this.moveCache.set(moveName, detail);
            return detail;
          })
        );
      }),
      catchError(() =>
        of({ displayName: formatSlug(moveName), power: null, accuracy: null, pp: null, damageClass: null })
      )
    );
  }

  getAbilityDisplayName(abilityName: string): Observable<string> {
    const cached = this.abilityCache.get(abilityName);
    if (cached) return of(cached);
    return this.http.get<RawAbilityResponse>(`${BASE_URL}/ability/${encodeURIComponent(abilityName)}`).pipe(
      switchMap((raw) => {
        const localized = this.pickLocalized(raw.names ?? []);
        const resolvedName = localized?.name ?? formatSlug(abilityName);
        const needsTranslation = !localized || !PORTUGUESE_LANGUAGES.includes(localized.language.name);
        const label$ = needsTranslation ? this.translation.translate(resolvedName) : of(resolvedName);
        return label$.pipe(
          map((label) => {
            this.abilityCache.set(abilityName, label);
            return label;
          })
        );
      }),
      catchError(() => of(formatSlug(abilityName)))
    );
  }

  private toListItem(name: string, url: string): PokemonListItem {
    const id = this.extractIdFromUrl(url);
    return { id, name, spriteUrl: `${ARTWORK_BASE_URL}/${id}.png` };
  }

  private toDetail(raw: RawPokemonDetail): PokemonDetail {
    const stats: PokemonStat[] = raw.stats.map((s) => ({ name: s.stat.name, baseStat: s.base_stat, effort: s.effort }));
    const types = raw.types.map((t) => t.type.name).sort((a, b) => (TYPE_PRIORITY[a] ?? 99) - (TYPE_PRIORITY[b] ?? 99));
    const moves: PokemonMove[] = raw.moves.map((m) => {
      const detail = m.version_group_details[0];
      return {
        name: m.move.name,
        learnMethod: detail?.move_learn_method.name ?? 'unknown',
        level: detail?.level_learned_at ?? 0,
        power: null,
        accuracy: null,
        pp: null,
        damageClass: null,
      };
    });
    moves.sort((a, b) => {
      if (a.learnMethod === 'level-up' && b.learnMethod !== 'level-up') return -1;
      if (a.learnMethod !== 'level-up' && b.learnMethod === 'level-up') return 1;
      if (a.learnMethod === 'level-up' && b.learnMethod === 'level-up') return a.level - b.level;
      return a.name.localeCompare(b.name);
    });
    return {
      id: raw.id,
      name: raw.name,
      height: raw.height / 10,
      weight: raw.weight / 10,
      spriteUrl: `${ARTWORK_BASE_URL}/${raw.id}.png`,
      shinyUrl: `${ARTWORK_BASE_URL}/shiny/${raw.id}.png`,
      cryUrl: `${CRIES_BASE_URL}/${raw.id}.ogg`,
      baseExperience: raw.base_experience,
      types,
      stats,
      abilities: raw.abilities.map((a) => a.ability.name),
      moves,
    };
  }
}
