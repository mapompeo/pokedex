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
  {
    path: 'time',
    loadComponent: () =>
      import('./features/team/team.component').then((m) => m.TeamComponent),
  },
  { path: '**', redirectTo: '' },
];
