import { TrendingUp, Users, Star, DollarSign } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function EntrenadoresCards() {
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Entrenadores Totales</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">12</CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Users className="size-4" />
              Total
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Equipo completo de profesionales</div>
          <div className="text-muted-foreground">9 activos, 1 inactivo, 1 vacaciones, 1 pendiente</div>
        </CardFooter>
      </Card>

      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Entrenadores Activos</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">9</CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-green">
              <TrendingUp className="size-4" />
              75% disponibles
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Disponibles para asignación</div>
          <div className="text-muted-foreground">514 clientes activos</div>
        </CardFooter>
      </Card>

      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Rating Promedio</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">4.76</CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-orange">
              <Star className="size-4 fill-yellow-500" />
              Excelente
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Calificación de clientes</div>
          <div className="text-muted-foreground">Basado en 1,245 reseñas</div>
        </CardFooter>
      </Card>

      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Tarifa Promedio</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">€46.67</CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-orange">
              <DollarSign className="size-4" />
              /hora
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Tarifa promedio por hora</div>
          <div className="text-muted-foreground">Rango: €35 - €60 por hora</div>
        </CardFooter>
      </Card>
    </div>
  );
}
