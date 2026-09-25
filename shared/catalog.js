// Gemeinsamer Katalog für Server und App: Blumensorten und Farben.

// g = grammatisches Geschlecht (f/n) für „eine Rose" vs. „ein Gänseblümchen"
export const FLOWER_TYPES = [
  { id: 'rose', name: 'Rose', g: 'f', withArticle: 'eine Rose' },
  { id: 'tulip', name: 'Tulpe', g: 'f', withArticle: 'eine Tulpe' },
  { id: 'daisy', name: 'Gänseblümchen', g: 'n', withArticle: 'ein Gänseblümchen' },
  { id: 'lily', name: 'Lilie', g: 'f', withArticle: 'eine Lilie' },
  { id: 'peony', name: 'Pfingstrose', g: 'f', withArticle: 'eine Pfingstrose' },
  { id: 'forgetmenot', name: 'Vergissmeinnicht', g: 'n', withArticle: 'ein Vergissmeinnicht' },
];

export const unopenedLabel = (t) => `${t.g === 'n' ? 'Ungeöffnetes' : 'Ungeöffnete'} ${t.name}`;
export const yourLabel = (t) => `${t.g === 'n' ? 'Dein' : 'Deine'} ${t.name}`;
export const aLabel = (t) => t.withArticle.charAt(0).toUpperCase() + t.withArticle.slice(1);

// base = Grundton, light = Glanzlicht, dark = Schatten
export const COLORS = [
  { id: 'rosa', name: 'Rosé', base: '#F4A7B9', light: '#FBD5DE', dark: '#D97890' },
  { id: 'rot', name: 'Rot', base: '#E0566C', light: '#F29AA8', dark: '#AE3149' },
  { id: 'pfirsich', name: 'Pfirsich', base: '#F7B290', light: '#FCD7C3', dark: '#DE8760' },
  { id: 'butter', name: 'Butter', base: '#F4D46C', light: '#FBEBB0', dark: '#D6AB3C' },
  { id: 'lavendel', name: 'Lavendel', base: '#B8A1E1', light: '#DDD0F4', dark: '#8A6DC3' },
  { id: 'himmel', name: 'Himmelblau', base: '#9DC4EC', light: '#D0E4F8', dark: '#6897CA' },
  { id: 'creme', name: 'Weiß', base: '#FFF5EA', light: '#FFFFFF', dark: '#E3CCB5' },
  { id: 'beere', name: 'Beere', base: '#C75B90', light: '#E79ABF', dark: '#963A69' },
];

export const TYPE_IDS = FLOWER_TYPES.map((t) => t.id);
export const COLOR_IDS = COLORS.map((c) => c.id);

export const typeById = (id) => FLOWER_TYPES.find((t) => t.id === id) ?? FLOWER_TYPES[0];
export const colorById = (id) => COLORS.find((c) => c.id === id) ?? COLORS[0];

export const MAX_TEXT = 500;
