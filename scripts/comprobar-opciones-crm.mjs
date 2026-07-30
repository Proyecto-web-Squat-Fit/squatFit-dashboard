/**
 * Comprueba que las listas de opciones del CRM en el front (src/lib/opciones-crm.ts)
 * digan EXACTAMENTE lo mismo que las del backend (LEAD_* en el DTO de leads).
 *
 * Existe porque el front es un espejo del backend y un espejo se desincroniza
 * solo: alguien añade un closer en un sitio, el desplegable lo ofrece, el PUT lo
 * rechaza con 400 y el equipo ve «no se pudo guardar» sin entender por qué. Esto
 * lo caza antes.
 *
 * Uso:  node scripts/comprobar-opciones-crm.mjs [ruta-al-repo-del-backend]
 * Por defecto busca el backend en ../SquatFit y en ~/Development/SquatFit.
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const candidatos = [
  process.argv[2],
  join(process.cwd(), "..", "SquatFit"),
  join(homedir(), "Development", "SquatFit"),
].filter(Boolean);

const backend = candidatos.find((p) => existsSync(join(p, "src/squat-fit/leads/dto/lead.dto.ts")));
if (!backend) {
  console.error("No encuentro el repo del backend. Pásalo como argumento.");
  process.exit(2);
}

const dto = readFileSync(join(backend, "src/squat-fit/leads/dto/lead.dto.ts"), "utf8");
const front = readFileSync(join(process.cwd(), "src/lib/opciones-crm.ts"), "utf8");

/** Saca las cadenas de un `export const NOMBRE = [ ... ] as const;`. */
function listaBackend(nombre) {
  const m = dto.match(new RegExp(`export const ${nombre}\\s*=\\s*\\[([^\\]]*)\\]`, "s"));
  if (!m) return null;
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

/** Saca los `valor: "..."` de un `export const NOMBRE: readonly OpcionCelda[] = [ ... ]`. */
function listaFront(nombre) {
  const m = front.match(new RegExp(`export const ${nombre}[^=]*=\\s*\\[(.*?)\\n\\];`, "s"));
  if (!m) return null;
  return [...m[1].matchAll(/valor:\s*"([^"]+)"/g)].map((x) => x[1]);
}

const PARES = [
  ["LEAD_FOLLOW_UPS", "OPCIONES_SEGUIMIENTO"],
  ["LEAD_CLOSERS", "OPCIONES_CLOSER"],
  ["LEAD_SETTERS", "OPCIONES_SETTER"],
  ["LEAD_CALL_RESULTS", "OPCIONES_RESULTADO"],
  ["LEAD_ORIGIN_DETAILS", "OPCIONES_ORIGEN"],
];

let fallos = 0;
for (const [atras, delante] of PARES) {
  const b = listaBackend(atras);
  const f = listaFront(delante);
  if (!b || !f) {
    console.log(`✗ ${delante}: no pude leer ${!b ? atras + " (backend)" : delante + " (front)"}`);
    fallos++;
    continue;
  }
  const soloBackend = b.filter((v) => !f.includes(v));
  const soloFront = f.filter((v) => !b.includes(v));
  if (soloBackend.length || soloFront.length) {
    fallos++;
    console.log(`✗ ${delante} vs ${atras}`);
    if (soloBackend.length) console.log(`    solo en backend: ${soloBackend.join(", ")}`);
    if (soloFront.length) console.log(`    solo en front:   ${soloFront.join(", ")}`);
  } else {
    console.log(`✓ ${delante} — ${b.length} opciones, idénticas`);
  }
}

// «Llamada» es un caso aparte: el front ofrece 3 de los 8 valores de `status` a
// propósito, así que solo se comprueba que esos 3 existan de verdad en el backend.
const estados = listaBackend("LEAD_STATUSES");
const llamada = listaFront("OPCIONES_LLAMADA");
if (estados && llamada) {
  const inventados = llamada.filter((v) => !estados.includes(v));
  if (inventados.length) {
    fallos++;
    console.log(`✗ OPCIONES_LLAMADA ofrece estados que no existen: ${inventados.join(", ")}`);
  } else {
    console.log(`✓ OPCIONES_LLAMADA — los ${llamada.length} son estados válidos de LEAD_STATUSES`);
  }
}

console.log(fallos === 0 ? "\nTodo sincronizado." : `\n${fallos} lista(s) desincronizada(s).`);
process.exit(fallos ? 1 : 0);
