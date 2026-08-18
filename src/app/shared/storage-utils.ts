/**
 * Lê e faz parse de JSON do localStorage com fallback seguro - localStorage
 * pode estar indisponível (modo privado, política do navegador) ou conter
 * um valor corrompido/de formato antigo, e nenhum dos dois deve quebrar o app.
 * `validate` decide o que fazer com o valor já parseado (filtrar itens
 * inválidos, converter pra Set, etc.) antes de aceitá-lo.
 */
export function loadJsonFromStorage<T>(key: string, fallback: T, validate?: (parsed: unknown) => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return validate ? validate(parsed) : (parsed as T);
  } catch {
    return fallback;
  }
}

export function saveJsonToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage indisponível ou quota excedida - segue só em memória.
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage indisponível - nada a limpar.
  }
}
