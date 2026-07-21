const CATEGORY_OVERRIDES_PT: Record<string, string> = {
  'Tiny Turtle Pokémon': 'Pokémon Tartaruguinha',
};

export function getCategoryOverride(rawEnglish: string): string | undefined {
  return CATEGORY_OVERRIDES_PT[rawEnglish];
}
