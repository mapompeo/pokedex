import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import {
  EvolutionNode,
  PokemonDetail,
  PokemonExtras,
  PokemonListItem,
  PokemonListPage,
  PokemonStat,
  PokemonType,
} from '../models/pokemon.model';
import { getItemNamePt } from '../../shared/evolution-labels';

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
  abilities: { ability: { name: string } }[];
}

interface RawSpeciesResponse {
  evolution_chain: { url: string };
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
  genera: { genus: string; language: { name: string } }[];
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

  getPokemonExtras(nameOrId: string): Observable<PokemonExtras> {
    return this.http.get<RawSpeciesResponse>(`${BASE_URL}/pokemon-species/${nameOrId}`).pipe(
      switchMap((species) =>
        this.http.get<RawEvolutionChainResponse>(species.evolution_chain.url).pipe(
          map((chainRes) => ({
            description: this.pickFlavorText(species.flavor_text_entries),
            category: this.pickGenus(species.genera),
            evolutions: this.flattenEvolutionChain(chainRes.chain, null),
          }))
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

  private flattenEvolutionChain(node: RawEvolutionChainNode, method: string | null): EvolutionNode[] {
    const id = this.extractIdFromUrl(node.species.url);
    const current: EvolutionNode = {
      id,
      name: node.species.name,
      spriteUrl: `${SPRITE_BASE_URL}/${id}.png`,
      method,
    };
    const children = node.evolves_to.flatMap((child) =>
      this.flattenEvolutionChain(child, this.describeEvolutionDetail(child.evolution_details[0]))
    );
    return [current, ...children];
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
    return { id, name, spriteUrl: `${SPRITE_BASE_URL}/${id}.png` };
  }

  private toDetail(raw: RawPokemonDetail): PokemonDetail {
    const stats: PokemonStat[] = raw.stats.map((s) => ({ name: s.stat.name, baseStat: s.base_stat }));
    return {
      id: raw.id,
      name: raw.name,
      height: raw.height / 10,
      weight: raw.weight / 10,
      spriteUrl: raw.sprites.front_default ?? `${SPRITE_BASE_URL}/${raw.id}.png`,
      types: raw.types.map((t) => t.type.name),
      stats,
      abilities: raw.abilities.map((a) => a.ability.name),
    };
  }
}
