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
 * El valor por defecto es el que `gcloud run services describe` da como URL
 * oficial del servicio.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://squatfit-api-cyrc2g3zra-no.a.run.app";
