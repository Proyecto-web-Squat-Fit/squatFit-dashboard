// Motor del downsell (lado back office) — sustituye a la hoja "Generador
// Downsell Squad Fit.xlsx". El quiz público vive en la web (/recomendador);
// aquí solo se genera el enlace etiquetado + el párrafo del chat.
//
// Flujo: el lead puntúa 4 áreas de 0 a 10 por chat; 8 o más = necesidad. Eso
// da una clave binaria (orden a-b-c-d) que junto al objetivo (PG/GM) resuelve
// una de las 30 combinaciones con copy aprobado (downsell-data.ts).

import { COMBOS, type Combo } from "./downsell-data";

export { COMBOS, type Combo };

export const UMBRAL = 8;

export const AREAS = [
  { key: "recetas", letra: "a", nombre: "Recetas", chat: "recetas / variedad / sabor" },
  { key: "nutricion", letra: "b", nombre: "Nutrición", chat: "nutrición / dietas / menú" },
  { key: "entreno", letra: "c", nombre: "Entreno", chat: "entrenamiento / planificación" },
  { key: "guia", letra: "d", nombre: "Guía", chat: "consulta / sesión diagnóstica" },
] as const;

export type AreaKey = (typeof AREAS)[number]["key"];
export type Scores = Record<AreaKey, number | null>;

// Copy exacto con el que se abre el downsell en el chat (doc "1 Flujo
// Downsell Latam"), por si el setter lo quiere pegar tal cual.
export const INTRO_CHAT =
  "Para decirte qué te encaja mejor, te voy a dejar una lista para que me digas " +
  "del 0 al 10 en cuáles de estos te hace falta profundizar más ahora, siendo 0 " +
  "que no te hace falta y 10 que lo necesitas muchísimo…";

export const OBJETIVOS = {
  PG: { key: "PG", label: "Perder grasa" },
  GM: { key: "GM", label: "Ganar músculo" },
} as const;

export type ObjetivoKey = keyof typeof OBJETIVOS;

// Quién envía el enlace: viaja como utm_source (GA4 atribuye la venta sin
// enlaces cortos por persona). Añadir a alguien = una línea.
export const VENDEDORES = [
  { key: "karl", label: "Karl" },
  { key: "zerochats", label: "ZeroChats" },
] as const;

// Nombre visible de cada producto recomendable (para la lista de la ficha).
// Los precios se muestran aparte: el catálogo es la fuente de la verdad.
export const PRODUCTOS: Record<string, { nombre: string; detalle?: string }> = {
  biblioteca: { nombre: "Biblioteca de recetas" },
  fyd: { nombre: "Curso Fuerte y Definid@" },
  cursoPG: { nombre: "Curso de Pérdida de Grasa" },
  cursoGM: { nombre: "Curso de Ganar Músculo" },
  vc_avanzada: { nombre: "Videoconsulta avanzada · 1 h", detalle: "99,97 € (antes 160 €)" },
  vc_estrategica: { nombre: "Videoconsulta estratégica · 30 min", detalle: "79,99 €" },
};

export function claveFromScores(scores: Scores): string {
  return AREAS.map((a) => (Number(scores[a.key]) >= UMBRAL ? "1" : "0")).join("");
}

export function findCombo(clave: string, objetivo: ObjetivoKey): Combo | null {
  return COMBOS.find((c) => c.clave === clave && c.objetivo === objetivo) ?? null;
}

// Si ninguna área llega a 8 (la hoja no tiene fila 0000), cae al área con
// mayor puntuación para no dejar al lead sin recomendación.
export function resolve(
  scores: Scores,
  objetivo: ObjetivoKey,
): (Combo & { fallback: boolean }) | null {
  let clave = claveFromScores(scores);
  let fallback = false;
  if (clave === "0000") {
    const top = [...AREAS].sort(
      (a, b) => Number(scores[b.key] ?? 0) - Number(scores[a.key] ?? 0),
    )[0];
    clave = AREAS.map((a) => (a.key === top.key ? "1" : "0")).join("");
    fallback = true;
  }
  const combo = findCombo(clave, objetivo);
  return combo ? { ...combo, fallback } : null;
}

// Enlace del quiz público con la combinación y la atribución dentro.
export function buildResultUrl(opts: { clave: string; objetivo: string; via: string }): string {
  const p = new URLSearchParams({ c: opts.clave, o: opts.objetivo });
  p.set("via", opts.via);
  p.set("utm_source", opts.via);
  p.set("utm_medium", "chat");
  p.set("utm_campaign", "downsell");
  return `https://squadfit.es/recomendador?${p.toString()}`;
}

export function parrafoChat(combo: Combo | null): string {
  return (combo?.bloques ?? []).join("\n\n");
}
