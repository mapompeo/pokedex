import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

const STORAGE_KEY = 'pokedex.translations.en-ptbr';
const TRANSLATE_URL = 'https://api.mymemory.translated.net/get';

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
        const result = isValid ? translated : text;
        this.cache[trimmed] = result;
        this.saveCache();
        return result;
      }),
      catchError(() => of(text))
    );
  }

  private loadCache(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    } catch {
      return {};
    }
  }

  private saveCache(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    } catch {
      // localStorage indisponível ou quota excedida — cache segue só em memória.
    }
  }
}
