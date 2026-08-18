import { WritableSignal } from '@angular/core';
import { Observable } from 'rxjs';

export interface DataPart<T = unknown> {
  obs: Observable<T>;
  apply: (value: T) => void;
}

/**
 * Carrega várias partes de dados independentes em paralelo, agregando o
 * resultado em signals de loading/error: loading só vira false quando todas
 * as partes finalizarem, e error vira true se qualquer uma falhar (sem
 * cancelar as demais).
 */
export function loadDataParts(
  parts: DataPart<any>[],
  loading: WritableSignal<boolean>,
  error: WritableSignal<boolean>
): void {
  loading.set(true);
  error.set(false);
  if (parts.length === 0) {
    loading.set(false);
    return;
  }
  let pending = parts.length;
  for (const { obs, apply } of parts) {
    obs.subscribe({
      next: apply,
      error: () => {
        pending--;
        error.set(true);
        if (pending <= 0) loading.set(false);
      },
      complete: () => {
        pending--;
        if (pending <= 0) loading.set(false);
      },
    });
  }
}
