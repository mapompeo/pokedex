/**
 * Efeito de "digitação" usado nos placeholders de busca (pokemon-list e
 * compare): digita um nome, apaga, passa pro próximo, em loop. Os timers
 * disparados são empilhados em `timers` para o chamador poder limpá-los
 * (clearTimeout) no ngOnDestroy.
 */
export function startTypewriter(
  names: string[],
  setText: (text: string) => void,
  timers: ReturnType<typeof setTimeout>[],
  initialDelay = 600
): void {
  const shuffled = [...names];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  let nameIdx = 0;
  let charIdx = 0;
  let deleting = false;

  const tick = () => {
    const name = shuffled[nameIdx % shuffled.length];
    if (!deleting) {
      charIdx++;
      setText(name.slice(0, charIdx));
      if (charIdx === name.length) {
        timers.push(setTimeout(tick, 1800));
        deleting = true;
        return;
      }
      timers.push(setTimeout(tick, 90 + Math.random() * 60));
    } else {
      charIdx--;
      setText(name.slice(0, charIdx));
      if (charIdx === 0) {
        deleting = false;
        nameIdx++;
        timers.push(setTimeout(tick, 500));
        return;
      }
      timers.push(setTimeout(tick, 50 + Math.random() * 30));
    }
  };
  timers.push(setTimeout(tick, initialDelay));
}
