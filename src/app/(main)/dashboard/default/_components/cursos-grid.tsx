"use client";

/**
 * Grid de cursos para el HOME
 * Muestra los últimos 3 cursos disponibles
 */

import Link from "next/link";

import { ArrowRight, BookOpen, Clock, User } from "lucide-react";

import type { Curso } from "@/app/(main)/dashboard/cursos/_components/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCursos } from "@/hooks/use-cursos";

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Formatea el precio con el símbolo de moneda
 */
function formatPrice(price: number, currency?: string): string {
  const symbol = currency === "USD" ? "$" : "€";
  return `${symbol}${price.toFixed(2)}`;
}

/**
 * Obtiene el color del badge según el nivel
 */
function getLevelBadgeVariant(level: string): "default" | "secondary" | "outline" {
  switch (level.toLowerCase()) {
    case "principiante":
      return "secondary";
    case "intermedio":
      return "default";
    case "avanzado":
      return "outline";
    default:
      return "default";
  }
}

// ============================================================================
// COMPONENTE: CARD DE CURSO
// ============================================================================

function CursoCard({ curso }: { curso: Curso }) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      {/* Imagen del curso */}
      <div className="bg-muted relative h-40 w-full overflow-hidden">
        {curso.thumbnail ? (
          <img src={curso.thumbnail} alt={curso.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="text-muted-foreground h-12 w-12" />
          </div>
        )}

        {/* Badge de nivel */}
        {curso.level && (
          <div className="absolute top-2 right-2">
            <Badge variant={getLevelBadgeVariant(curso.level)}>{curso.level}</Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="line-clamp-1 text-base">{curso.name}</CardTitle>
        {curso.description && <CardDescription className="line-clamp-2 text-xs">{curso.description}</CardDescription>}
      </CardHeader>

      <CardContent className="pb-3">
        <div className="space-y-2">
          {/* Instructor */}
          {curso.instructor && (
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <User className="h-3 w-3" />
              <span className="truncate">{curso.instructor}</span>
            </div>
          )}

          {/* Duración */}
          {curso.duration && (
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Clock className="h-3 w-3" />
              <span>{curso.duration}</span>
            </div>
          )}

          {/* Precio y Estado */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-lg font-bold">{formatPrice(curso.price, curso.currency)}</span>
            {curso.status && (
              <Badge variant={curso.status === "Activo" ? "default" : "secondary"}>{curso.status}</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function CursosGrid() {
  const { data, isLoading, error } = useCursos();

  // Obtener solo los primeros 3 cursos
  const cursosArray = Array.isArray(data) ? data.slice(0, 3) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Cursos Disponibles
        </CardTitle>
        <CardDescription>Últimos cursos agregados al catálogo</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex h-32 items-center justify-center">
            <p className="text-muted-foreground text-sm">No se obtuvieron datos</p>
          </div>
        )}

        {isLoading && (
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && (
          <>
            {cursosArray.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2">
                <BookOpen className="text-muted-foreground h-8 w-8" />
                <p className="text-muted-foreground text-sm">No hay cursos disponibles</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {cursosArray.map((curso) => (
                  <CursoCard key={curso.id} curso={curso} />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
      {cursosArray.length > 0 && (
        <CardFooter>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/cursos">
              Ver todos los cursos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
