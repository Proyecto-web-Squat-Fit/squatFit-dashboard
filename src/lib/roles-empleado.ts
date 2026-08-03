/**
 * ROLES DE EMPLEADO — la lista cerrada, en un solo sitio.
 *
 * La norma «formato de tablas» (punto 3) obliga a que las opciones de una
 * píldora editable salgan de un único módulo compartido y nunca se escriban a
 * mano en el componente; hasta ahora vivían duplicadas en la tabla de Empleados
 * y en el selector de asignación de Clientes, y ya se habían desincronizado.
 *
 * UNA PERSONA PUEDE TENER VARIOS ROLES. En un equipo pequeño lo normal es que
 * alguien sea Trainer y Nutri a la vez, así que el valor que viaja al backend es
 * la lista separada por comas dentro de la misma columna `user.staff_role`
 * (varchar(50); los seis roles juntos ocupan 44 caracteres, así que caben).
 * Se eligió esa forma en vez de una tabla nueva porque el endpoint que ya existe
 * —PUT /api/v1/admin-panel/users/edit— acepta el campo tal cual y no hace falta
 * desplegar el backend para que esto funcione (verificado contra producción).
 */

/** Roles formales del staff (Doc 0, cap. 1.1). El orden es el de la píldora. */
export const ROLES_EMPLEADO = ["Nutri", "Trainer", "Psicólogo", "Soporte", "Ventas", "Admin"] as const;

export type RolEmpleado = (typeof ROLES_EMPLEADO)[number];

/** Sin acentos y en minúsculas, para comparar lo que venga de la BD. */
const plano = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

// De cualquier forma escrita al valor canónico. Incluye los nombres viejos que
// pueden seguir guardados en filas antiguas: «Psicóloga» se renombró a
// «Psicólogo» el 3-ago y la columna guarda texto libre, así que las filas que ya
// tuvieran el nombre anterior tienen que seguir leyéndose.
const CANONICO = new Map<string, RolEmpleado>(ROLES_EMPLEADO.map((rol) => [plano(rol), rol]));
CANONICO.set("psicologa", "Psicólogo");

/** Posición en la lista, para que las píldoras salgan siempre en el mismo orden. */
const posicion = (rol: RolEmpleado) => ROLES_EMPLEADO.indexOf(rol);

/**
 * Lee la columna `staff_role` y devuelve los roles reconocidos, sin repetidos y
 * en el orden de la lista. Lo que no esté en la lista cerrada se descarta: si un
 * día alguien mete texto a mano en la BD, la píldora no debe ofrecer un valor
 * que luego no se puede volver a elegir.
 */
export function parseRolesEmpleado(bruto?: string | null): RolEmpleado[] {
  if (!bruto) return [];
  const vistos = new Set<RolEmpleado>();
  for (const trozo of bruto.split(",")) {
    const rol = CANONICO.get(plano(trozo));
    if (rol) vistos.add(rol);
  }
  return [...vistos].sort((a, b) => posicion(a) - posicion(b));
}

/** Lo que se guarda en `staff_role`. Cadena vacía = sin ningún rol. */
export function serializaRolesEmpleado(roles: readonly RolEmpleado[]): string {
  return [...new Set(roles)].sort((a, b) => posicion(a) - posicion(b)).join(",");
}

/**
 * Roles de un miembro del equipo: manda la columna `staff_role` y, solo si está
 * vacía, se deduce del texto libre de `description` como se hacía antes de que
 * existiera la columna (julio 2026). Si no hay ni una cosa ni la otra devuelve
 * la lista vacía, que la píldora pinta como «Sin rol»: no tener rol asignado no
 * es lo mismo que tener uno, y antes se inventaba un «Preparador» que además no
 * se podía elegir en el desplegable.
 */
export function rolesDeEmpleado(empleado: { staff_role?: string | null; description?: string | null }): RolEmpleado[] {
  const guardados = parseRolesEmpleado(empleado.staff_role);
  if (guardados.length) return guardados;

  const texto = (empleado.description ?? "").toLowerCase();
  const deducidos: RolEmpleado[] = [];
  if (/nutri|dietista|dieta/.test(texto)) deducidos.push("Nutri");
  if (/trainer|entrena|entreno/.test(texto)) deducidos.push("Trainer");
  if (/psic/.test(texto)) deducidos.push("Psicólogo");
  if (/venta|closer|setter/.test(texto)) deducidos.push("Ventas");
  if (/soporte|support/.test(texto)) deducidos.push("Soporte");
  return deducidos.sort((a, b) => posicion(a) - posicion(b));
}

/** Opciones tal y como las esperan `CeldaEditable` y `CeldaEditableMultiple`. */
export const OPCIONES_ROL_EMPLEADO = ROLES_EMPLEADO.map((rol) => ({
  valor: rol,
  etiqueta: rol,
  clase: "sqf-badge-indigo",
}));
