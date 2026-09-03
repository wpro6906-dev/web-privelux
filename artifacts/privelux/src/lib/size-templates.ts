/**
 * Size templates for PRIVELUX products.
 * Add new templates here to extend the system without redesigning the admin panel.
 */

export const SIZE_TEMPLATES: Record<string, string[]> = {
  camisetas:      ["S", "M", "L", "XL", "2XL"],
  tenis_colombia: ["36", "37", "38", "39", "40", "41", "42", "43", "44"],
  tenis_us:       ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11"],
  tenis_eu:       ["39", "40", "41", "42", "43", "44", "45", "46"],
  pantalones:     ["28", "30", "32", "34", "36", "38", "40", "42"],
};

export const TEMPLATE_LABELS: Record<string, string> = {
  camisetas:      "Camisetas",
  tenis_colombia: "Tenis Colombia",
  tenis_us:       "Tenis US",
  tenis_eu:       "Tenis EU",
  pantalones:     "Pantalones",
};
