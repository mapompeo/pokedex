import { animate, query, stagger, style, transition, trigger } from '@angular/animations';

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function animTrigger(name: string, defs: Parameters<typeof trigger>[1]): ReturnType<typeof trigger> {
  if (reducedMotion) return trigger(name, []);
  return trigger(name, defs);
}

export const routeFade = animTrigger('routeFade', [
  transition('* <=> *', [
    query(':enter', [
      style({ opacity: 0 }),
      animate('250ms ease-in', style({ opacity: 1 })),
    ], { optional: true }),
  ]),
]);

export const listStagger = animTrigger('listStagger', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(12px)' }),
      stagger(60, [
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ], { optional: true }),
  ]),
]);

export const tabFade = animTrigger('tabFade', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(8px)' }),
    animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
  ]),
]);
