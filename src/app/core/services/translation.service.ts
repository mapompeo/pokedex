import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { loadJsonFromStorage, saveJsonToStorage } from '../../shared/storage-utils';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'pokedex.translations.en-ptbr';
const TRANSLATE_URL = environment.translationBaseUrl;

interface MyMemoryResponse {
  responseData: { translatedText: string };
  responseStatus: number;
}

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private http = inject(HttpClient);
  private cache = this.loadCache();

  translate(text: string): Observable<string> {
    const trimmed = text.trim();
    if (!trimmed) {
      return of(text);
    }
    const cached = this.cache[trimmed];
    if (cached) {
      return of(cached);
    }
    const url = `${TRANSLATE_URL}?q=${encodeURIComponent(trimmed)}&langpair=en|pt-br`;
    return this.http.get<MyMemoryResponse>(url).pipe(
      map((res) => {
        const translated = res?.responseData?.translatedText;
        const isValid = res?.responseStatus === 200 && !!translated && !translated.toUpperCase().includes('MYMEMORY WARNING');
        // Só cacheia traduções válidas — uma falha/aviso (ex.: rate limit do
        // MyMemory) é transitória e não deve virar permanente no localStorage,
        // senão o texto nunca mais é re-traduzido mesmo após o limite resetar.
        if (isValid) {
          this.cache[trimmed] = translated;
          this.saveCache();
        }
        return isValid ? translated : text;
      }),
      catchError(() => of(text))
    );
  }

  private loadCache(): Record<string, string> {
    return loadJsonFromStorage<Record<string, string>>(STORAGE_KEY, {});
  }

  private saveCache(): void {
    saveJsonToStorage(STORAGE_KEY, this.cache);
  }
}
