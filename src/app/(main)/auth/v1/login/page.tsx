import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth";
import { isAuthenticatedServer } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * `?redirect=…` significa «he llegado aquí REBOTADO»: lo pone el middleware
 * cuando no hay sesión, y `handleUnauthorized` cuando el API contesta 401.
 *
 * En ese caso NO se redirige al panel aunque la cookie parezca válida. Ese
 * rebote era la segunda mitad del bucle que dejaba el back office encallado
 * tras cada despliegue: el API rechazaba el token, el cliente mandaba al login,
 * y el login —mirando solo si el JWT ha caducado, cosa que no pasa hasta los 90
 * días— devolvía al panel. Aquí solo se comprueba la FORMA del token, no si el
 * backend lo sigue aceptando; por eso no puede ser la última palabra.
 *
 * Sin el parámetro se mantiene el atajo de siempre: quien entra a mano en
 * /auth/v1/login teniendo sesión, al panel.
 */
export default async function LoginV1({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { redirect: destino } = await searchParams;
  const llegaRebotado = typeof destino === "string" && destino.length > 0;
  const isAuthenticated = await isAuthenticatedServer();

  if (isAuthenticated && !llegaRebotado) {
    redirect("/dashboard");
  }
  // Auth
  return (
    <div className="flex h-dvh">
      <div className="bg-primary hidden lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            {/* <Command className="text-primary-foreground mx-auto size-12" /> */}
            <div className="flex w-full justify-center">
              <Image src="/logos/Logotipo-Squat-fit-blanco.png" width={150} height={150} alt="Logo Squat Fit" />
            </div>
            <div className="space-y-2">
              <h1 className="text-primary-foreground text-5xl font-light">Hola!</h1>
              <p className="text-primary-foreground/80 text-xl">Inicia sesión para continuar</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background flex w-full items-center justify-center p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <div className="text-foreground font-medium tracking-tight">Iniciar Sesión</div>
            <div className="text-muted-foreground mx-auto max-w-xl">
              Bienvenido. Ingresa tu correo electrónico y contraseña.
            </div>
          </div>
          <div className="space-y-4">
            <LoginForm />
            {/* <Button className="w-full" variant="outline">
              Continue with Google
            </Button> */}
          </div>
        </div>
      </div>
    </div>
  );
}
