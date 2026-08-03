/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * DESFASE DE VERSIÓN TRAS UN DESPLIEGUE («skew»).
   *
   * El panel se despliega varias veces al día y el equipo lo tiene abierto todo
   * el día. Al publicar una build nueva, los ficheros JavaScript de la anterior
   * dejan de existir: la pestaña que sigue abierta los pide, recibe un error
   * (`net::ERR_ABORTED` sobre las peticiones `?_rsc=`) y se queda a medias —
   * clicas en el menú y no pasa nada, sin ningún aviso. La única salida era
   * recargar a mano, si se te ocurría que era eso.
   *
   * Con `deploymentId`, Next firma cada petición de recurso con la versión que
   * tiene la pestaña (`?dpl=…`). Cuando no coincide con la desplegada, la
   * petición falla de forma RECONOCIBLE y el router hace una navegación
   * completa (recarga de página) en vez de morirse en silencio. Se nota como
   * un parpadeo al cambiar de pantalla, y punto.
   *
   * Si además se activa «Skew Protection» en los ajustes del proyecto en
   * Vercel, la pestaña vieja sigue hablando con SU despliegue y ni siquiera
   * hay recarga. Eso es un interruptor del panel de Vercel, no código.
   *
   * En local `VERCEL_DEPLOYMENT_ID` no existe y el campo queda a `undefined`,
   * que es exactamente el comportamiento de antes.
   */
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/default",
        permanent: false,
      },
    ];
  },
}

export default nextConfig
