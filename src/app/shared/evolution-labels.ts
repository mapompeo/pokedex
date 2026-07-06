const ITEM_NAMES_PT: Record<string, string> = {
  'thunder-stone': 'Pedra do Trovão',
  'water-stone': 'Pedra da Água',
  'fire-stone': 'Pedra do Fogo',
  'leaf-stone': 'Pedra da Folha',
  'moon-stone': 'Pedra da Lua',
  'sun-stone': 'Pedra do Sol',
  'shiny-stone': 'Pedra Brilhante',
  'dusk-stone': 'Pedra do Crepúsculo',
  'dawn-stone': 'Pedra da Aurora',
  'ice-stone': 'Pedra do Gelo',
  'oval-stone': 'Pedra Oval',
  "king's-rock": 'Rocha do Rei',
  'metal-coat': 'Revestimento Metálico',
  'dragon-scale': 'Escama de Dragão',
  upgrade: 'Upgrade',
  protector: 'Protetor',
  electirizer: 'Electrizador',
  magmarizer: 'Magmarizador',
  'reaper-cloth': 'Pano do Ceifador',
  'prism-scale': 'Escama Prisma',
  'razor-claw': 'Garra Afiada',
  'razor-fang': 'Presa Afiada',
  'deep-sea-tooth': 'Dente do Mar Profundo',
  'deep-sea-scale': 'Escama do Mar Profundo',
  'whipped-dream': 'Sonho Batido',
  sachet: 'Sachê',
  'cracked-pot': 'Bule Rachado',
  'chipped-pot': 'Bule Lascado',
  'galarica-cuff': 'Bracelete Galarica',
  'galarica-wreath': 'Grinalda Galarica',
  'sweet-apple': 'Maçã Doce',
  'tart-apple': 'Maçã Azeda',
  'strawberry-sweet': 'Doce de Morango',
  'peat-block': 'Bloco de Turfa',
  'black-augurite': 'Augurita Negra',
};

function formatFallbackItemName(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getItemNamePt(name: string): string {
  return ITEM_NAMES_PT[name] ?? formatFallbackItemName(name);
}
