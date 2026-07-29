/**
 * Avatar de reserva: qué imagen enseñar cuando la persona no ha subido foto.
 *
 * Hasta ahora el panel pasaba `src={undefined}` a `<AvatarImage>`, así que
 * SIEMPRE caía en las iniciales (y el único fichero de `public/avatars/` era
 * `arhamkhnz.png`, el avatar de ejemplo del autor de la plantilla en la que se
 * basó el back office). Ahora hay tres ilustraciones propias:
 *
 *   hombre.png  gender = 'male'      (fondo azul)
 *   mujer.png   gender = 'female'    (fondo naranja)
 *   neutro.png  cualquier otra cosa  (fondo gris lavanda)
 *
 * `gender` es un `varchar(10)` NULLABLE en la tabla `user` y el backend solo
 * reconoce 'male' y 'female' (ver calculator.service.ts). O sea que la mayoría
 * de las filas están a null: el neutro no es un caso raro, es el caso normal, y
 * por eso es el que se devuelve ante cualquier valor que no reconozcamos —
 * incluido 'other'— en vez de escoger uno de los dos por defecto.
 */

export const AVATAR_NEUTRO = "/avatars/neutro.png";
export const AVATAR_HOMBRE = "/avatars/hombre.png";
export const AVATAR_MUJER = "/avatars/mujer.png";

/**
 * Ruta del avatar de reserva que le toca a alguien según su sexo.
 * No decide si hay que usarlo o no: eso lo hace `avatarSrc`.
 */
export function avatarPorSexo(gender?: string | null): string {
  switch (gender?.trim().toLowerCase()) {
    case "male":
      return AVATAR_HOMBRE;
    case "female":
      return AVATAR_MUJER;
    default:
      return AVATAR_NEUTRO;
  }
}

/**
 * Qué poner en `<AvatarImage src={...}>`: la foto de la persona si la tiene, y
 * si no, el avatar de reserva que le corresponda.
 *
 * Se comprueba que la foto no sea cadena vacía además de no ser null porque la
 * columna guarda `''` en algunas filas antiguas, y un `src=""` hace que el
 * navegador pida la propia página como si fuera una imagen.
 */
export function avatarSrc(foto?: string | null, gender?: string | null): string {
  const propia = foto?.trim();
  // Ojo: aquí NO vale `propia ?? avatarPorSexo(gender)`. `??` solo cubre null y
  // undefined, y el caso que hay que atajar es justo el otro: la cadena vacía
  // que dejan las filas antiguas, que con `??` se colaría tal cual.
  if (propia) return propia;
  return avatarPorSexo(gender);
}
