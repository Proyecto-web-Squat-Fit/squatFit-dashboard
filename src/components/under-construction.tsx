import { Card, CardContent } from "@/components/ui/card";

interface UnderConstructionProps {
  /** Título de la página (misma cabecera que el resto del panel). */
  title: string;
  /** Subtítulo: qué habrá aquí cuando se construya. */
  description: string;
  /** Detalle opcional bajo el aviso (lista de lo previsto, notas…). */
  children?: React.ReactNode;
}

/**
 * Placeholder único de «Página en construcción» (spec reestructura 27-jul).
 * Mismo layout/cabecera que las páginas reales para poder enseñar la
 * organización final del menú aunque la sección aún no esté construida.
 */
export function UnderConstruction({ title, description, children }: UnderConstructionProps) {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <span aria-hidden className="text-5xl">
            🚧
          </span>
          <p className="text-lg font-semibold">Página en construcción</p>
          <p className="text-muted-foreground max-w-md text-sm">{description}</p>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
