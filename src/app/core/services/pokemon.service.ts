import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
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
import { environment } from '../../../environments/environment';

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
  sprites: { front_default: string | null };
  types: { type: { name: string } }[];
  stats: { base_stat: number; effort: number; stat: { name: string } }[];
  abilities: { ability: { name: string } }[];
  moves: RawMoveDetail[];
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

@Injectable({ providedIn: 'root' })
export class PokemonService {
  private http = inject(HttpClient);
  private detailCache = new Map<string, PokemonDetail>();
  private allListItemsCache: PokemonListItem[] | null = null;
  private idTypesCache: Map<number, string[]> | null = null;

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

  getAllPokemonListItems(): Observable<PokemonListItem[]> {
    if (this.allListItemsCache) {
      return of(this.allListItemsCache);
    }
    return this.http.get<RawListResponse>(`${BASE_URL}/pokemon?limit=100000`).pipe(
      map((res) => res.results.map((r) => this.toListItem(r.name, r.url))),
      map((items) => {
        this.allListItemsCache = items;
        return items;
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
        for (const [, types] of idToTypes) {
          types.sort((a, b) => (TYPE_PRIORITY[a] ?? 99) - (TYPE_PRIORITY[b] ?? 99));
        }
        this.idTypesCache = idToTypes;
        return idToTypes;
      })
    );
  }

  getPokemonExtras(nameOrId: string): Observable<PokemonExtras> {
    return this.http.get<RawSpeciesResponse>(`${BASE_URL}/pokemon-species/${nameOrId}`).pipe(
      switchMap((species) =>
        this.http.get<RawEvolutionChainResponse>(species.evolution_chain.url).pipe(
          map((chainRes) => {
            const tree = this.buildEvolutionTree(chainRes.chain, null);
            const stages = this.flattenEvolutionStages(tree);
            return {
              description: this.pickFlavorText(species.flavor_text_entries),
              category: this.pickGenus(species.genera),
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
            };
          })
        )
      )
    );
  }

  private pickFlavorText(entries: { flavor_text: string; language: { name: string } }[]): string {
    const entry = entries.find((e) => e.language.name === 'en') ?? entries[0];
    return (entry?.flavor_text ?? '').replace(/[\n\f\r]+/g, ' ').trim();
  }

  private pickGenus(genera: { genus: string; language: { name: string } }[]): string {
    const entry = genera.find((g) => g.language.name === 'en') ?? genera[0];
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
      cryUrl: `${CRIES_BASE_URL}/${raw.id}.ogg`,
      baseExperience: raw.base_experience,
      types,
      stats,
      abilities: raw.abilities.map((a) => a.ability.name),
      moves,
    };
  }
}
