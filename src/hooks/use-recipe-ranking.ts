"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  RecetasAdminService,
  recipeToInput,
  type RecipeRankingParams,
  type RecipeRankingRow,
} from "@/lib/services/recetas-admin-service";

// ============================================================================
// Ranking de recetas por uso real (F5, 31-jul) — pantalla para elegir muestras
// gratuitas con datos en vez de a mano. El endpoint (`admin-panel/recipes/ranking`)
// es del PR #90 de SquatFit, ABIERTO Y SIN DESPLEGAR: contra el API real de
// hoy responde 404/401, que el servicio traduce a `RecipeRankingUnavailableError`
// para que la pantalla lo diga en vez de romperse o parecer que no hay recetas.
// ============================================================================

const RANKING_KEY = ["recipe-ranking"] as const;
// Comparte namespace con `RecetasAdminService.getRecipes()` (usada también
// por la pantalla de edición de recetas): un cambio aquí debe verse allí y
// viceversa, así que se invalida la MISMA query key.
const RECIPES_KEY = ["admin-recipes"] as const;

export function useRecipeRanking(params: RecipeRankingParams) {
  return useQuery({
    queryKey: [...RANKING_KEY, params],
    queryFn: () => RecetasAdminService.getRanking(params),
    staleTime: 30_000,
    // Un 404/401 (backend sin desplegar) no se arregla reintentando.
    retry: false,
  });
}

/** Lista completa de recetas (con ingredientes/pasos/materiales) — hace falta
 * para reconstruir el `RecipeInput` completo al marcar/desmarcar «gratuita»,
 * porque el PUT del backend reemplaza el recurso entero (no hay PATCH). */
export function useAdminRecipesForToggle() {
  return useQuery({
    queryKey: RECIPES_KEY,
    queryFn: () => RecetasAdminService.getRecipes(),
    staleTime: 60_000,
  });
}

export function useToggleFreeSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ recipeId, nextValue }: { recipeId: string; nextValue: boolean }) => {
      // Se relee la lista completa en vez de fiarse de una copia en caché
      // potencialmente vieja: el PUT reemplaza TODO el recurso, así que
      // mandar datos obsoletos de ingredientes/pasos los borraría de verdad.
      const recipes = await RecetasAdminService.getRecipes();
      const recipe = recipes.find((r) => r.id === recipeId);
      if (!recipe) throw new Error("No se ha encontrado la receta (¿se borró en otra pestaña?).");
      const input = recipeToInput(recipe, { is_free_sample: nextValue });
      return RecetasAdminService.updateRecipe(recipeId, input);
    },
    // El `retry: 1` por defecto de mutations (query-provider.tsx) retrasaba
    // ~1s el aviso de error al staff sin cambiar el resultado (lección del
    // PR de facturas: ver commit de `useGenerateInvoice`). Aquí, además, el
    // switch de la fila ya deja reintentar con un solo clic si de verdad fue
    // un fallo transitorio.
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RANKING_KEY });
      queryClient.invalidateQueries({ queryKey: RECIPES_KEY });
    },
  });
}

export type { RecipeRankingRow };
