/**
 * Host de la API, en un solo sitio.
 *
 * Hasta ahora cada servicio se lo declaraba por su cuenta y había DOS valores
 * por defecto distintos repartidos por el repo, 16 ficheros con cada uno:
 *
 *   https://squatfit-api-cyrc2g3zra-no.a.run.app
 *   https://squatfit-api-985835765452.europe-southwest1.run.app
 *
 * Los dos responden y son el MISMO servicio de Cloud Run (comprobado el 3-ago:
 * `/api/v1/catalog` da 200 en ambos), así que en producción nunca ha tenido
 * efecto porque `NEXT_PUBLIC_API_URL` los pisa a los dos. Pero cualquiera que
 * levante el back office en local sin esa variable acaba preguntándose cuál de
 * los dos es el bueno, y en una revisión de código las dos formas parecen dos
 * backends distintos.
 *
 * DESDE EL 8-ago-2026 el valor por defecto es api.squadfit.es, que es un Worker
 * de Cloudflare que reescribe la cabecera `Host` hacia Cloud Run. Hizo falta un
 * Worker y no una regla porque el «Host Header Override» no existe en el plan
 * Free — y sin reescribir el Host, Cloud Run devuelve 404 porque no reconoce el
 * dominio.
 *
 * La URL de run.app sigue funcionando igual; simplemente ya no se nombra aquí.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.squadfit.es";
