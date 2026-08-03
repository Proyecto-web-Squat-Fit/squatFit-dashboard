import { CLASE_CELDA_AJUSTADA } from "@/lib/formato-de-tablas";
import { cn } from "@/lib/utils";

/**
 * Celda de texto de la norma «formato de tablas»: se ajusta al ancho de la
 * columna y salta de línea, en vez de cortarse detrás del borde.
 *
 * Existe como componente y no solo como clase suelta para que el «sin dato» se
 * resuelva siempre igual. La norma de tablas distingue **sin datos** de **cero**
 * (31-jul): aquí el equivalente es que una celda vacía diga «—» en tono apagado
 * en lugar de quedarse en blanco, que se lee como si la columna estuviera rota.
 */
export function CeldaTexto({
  children,
  apagado = false,
  className,
  /** Texto del tooltip. Por defecto no se pone: si el texto ya se ve entero, sobra. */
  title,
}: {
  children: React.ReactNode;
  /** Dato secundario (el email bajo el nombre, el origen…): en gris. */
  apagado?: boolean;
  className?: string;
  title?: string;
}) {
  const vacio = children === null || children === undefined || children === "";
  return (
    <span
      title={title}
      className={cn(
        "block",
        CLASE_CELDA_AJUSTADA,
        (apagado || vacio) && "text-muted-foreground",
        className,
      )}
    >
      {vacio ? "—" : children}
    </span>
  );
}
