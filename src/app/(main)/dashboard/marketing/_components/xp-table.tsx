"use client";

import { useMemo, useState } from "react";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { Star, Trophy, Filter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { columnsXP, columnsCreditosMensuales } from "./columns.xp";
import { getMockTablaXP, getMockCreditosMensuales } from "./data";
import { CATEGORIAS_XP, FRECUENCIAS_XP } from "./schema";

function XPGeneralTable() {
  const data = useMemo(() => getMockTablaXP(), []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [categoriaFilter, setCategoriaFilter] = useState<string[]>([]);

  const table = useReactTable({
    data,
    columns: columnsXP,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const totalXP = data.reduce((acc, curr) => acc + curr.xp, 0);

  const handleCategoriaFilter = (categoria: string) => {
    const newFilter = categoriaFilter.includes(categoria)
      ? categoriaFilter.filter((c) => c !== categoria)
      : [...categoriaFilter, categoria];
    setCategoriaFilter(newFilter);
    table.getColumn("categoria")?.setFilterValue(newFilter.length ? newFilter : undefined);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-lg tabular-nums">
            <Star className="mr-1 size-4 text-amber-500" />
            {totalXP} XP totales disponibles
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 size-4" />
              Filtrar categoría
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Categorías</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {CATEGORIAS_XP.map((cat) => (
              <DropdownMenuCheckboxItem
                key={cat.value}
                checked={categoriaFilter.includes(cat.value)}
                onCheckedChange={() => handleCategoriaFilter(cat.value)}
              >
                {cat.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnsXP.length} className="h-24 text-center">
                  No se encontraron resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Mostrando {table.getRowModel().rows.length} de {data.length} acciones
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreditosMensualesTable() {
  const data = useMemo(() => getMockCreditosMensuales(), []);
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns: columnsCreditosMensuales,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  const totalXP = data.reduce((acc, curr) => acc + curr.xp, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-lg tabular-nums">
          <Trophy className="mr-1 size-4 text-amber-500" />
          {totalXP} XP mensuales máximos
        </Badge>
        <Badge variant="outline">Plan Tu Mejor Versión / Transfórmate</Badge>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnsCreditosMensuales.length} className="h-24 text-center">
                  No se encontraron resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function XPTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="size-5 text-amber-500" />
          Sistema de XP / Créditos Squad Fit
        </CardTitle>
        <CardDescription>Tabla de puntos por acciones y logros de los usuarios</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="general">XP General</TabsTrigger>
            <TabsTrigger value="mensuales">Créditos Mensuales</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <XPGeneralTable />
          </TabsContent>
          <TabsContent value="mensuales">
            <CreditosMensualesTable />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
