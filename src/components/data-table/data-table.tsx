import * as React from "react";

import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DndContext,
  closestCenter,
  type UniqueIdentifier,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { ColumnDef, flexRender, type Table as TanStackTable } from "@tanstack/react-table";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { ColumnHeaderCell } from "./column-header-cell";
import { DraggableRow } from "./draggable-row";

interface DataTableProps<TData, TValue> {
  table: TanStackTable<TData>;
  columns: ColumnDef<TData, TValue>[];
  dndEnabled?: boolean;
  onReorder?: (newData: TData[]) => void;
  /** Permite redimensionar columnas (arrastrar el borde de la cabecera). */
  enableColumnResize?: boolean;
  /** Permite reordenar columnas (arrastrar la cabecera por el asa). */
  enableColumnReorder?: boolean;
}

function renderTableBody<TData, TValue>({
  table,
  columns,
  dndEnabled,
  dataIds,
  sizedCells,
}: {
  table: TanStackTable<TData>;
  columns: ColumnDef<TData, TValue>[];
  dndEnabled: boolean;
  dataIds: UniqueIdentifier[];
  /** true cuando el resize de columnas está activo: fija el ancho de cada celda */
  sizedCells?: boolean;
}) {
  if (!table.getRowModel().rows.length) {
    return (
      <TableRow>
        <TableCell colSpan={columns.length} className="h-24 text-center">
          No results.
        </TableCell>
      </TableRow>
    );
  }
  if (dndEnabled) {
    return (
      <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
        {table.getRowModel().rows.map((row) => (
          <DraggableRow key={row.id} row={row} />
        ))}
      </SortableContext>
    );
  }
  return table.getRowModel().rows.map((row) => (
    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          // Con table-layout fixed, el ancho de la celda debe acompañar al de
          // su columna para que el redimensionado no tenga tope de contenido.
          style={sizedCells ? { width: cell.column.getSize(), overflow: "hidden" } : undefined}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  ));
}

export function DataTable<TData, TValue>({
  table,
  columns,
  dndEnabled = false,
  onReorder,
  enableColumnResize = false,
  enableColumnReorder = false,
}: DataTableProps<TData, TValue>) {
  const dataIds: UniqueIdentifier[] = table.getRowModel().rows.map((row) => Number(row.id) as UniqueIdentifier);
  const sortableId = React.useId();
  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}));
  const columnFeatures = enableColumnResize || enableColumnReorder;
  const columnIds = table.getVisibleLeafColumns().map((c) => c.id);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id && onReorder) {
      const oldIndex = dataIds.indexOf(active.id);
      const newIndex = dataIds.indexOf(over.id);

      // Call parent with new data order (parent manages state)
      const newData = arrayMove(table.options.data, oldIndex, newIndex);
      onReorder(newData);
    }
  }

  function handleColumnDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const order = columnIds;
      const oldIndex = order.indexOf(active.id as string);
      const newIndex = order.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        table.setColumnOrder(arrayMove(order, oldIndex, newIndex));
      }
    }
  }

  const headerCells = (headers: ReturnType<typeof table.getHeaderGroups>[number]["headers"]) => {
    if (!columnFeatures) {
      return headers.map((header) => (
        <TableHead key={header.id} colSpan={header.colSpan}>
          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
        </TableHead>
      ));
    }
    const cells = headers.map((header) => (
      <ColumnHeaderCell key={header.id} header={header} reorder={enableColumnReorder} resize={enableColumnResize} />
    ));
    return enableColumnReorder ? (
      <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
        {cells}
      </SortableContext>
    ) : (
      cells
    );
  };

  const tableContent = (
    <Table
      // table-layout fixed permite encoger columnas por debajo del ancho de su
      // contenido (sin esto el navegador impone un mínimo y el resize "se atasca").
      style={enableColumnResize ? { tableLayout: "fixed", width: table.getTotalSize(), minWidth: "100%" } : undefined}
    >
      <TableHeader className="bg-muted sticky top-0 z-10">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>{headerCells(headerGroup.headers)}</TableRow>
        ))}
      </TableHeader>
      <TableBody className="**:data-[slot=table-cell]:first:w-8">
        {renderTableBody({ table, columns, dndEnabled, dataIds, sizedCells: enableColumnResize })}
      </TableBody>
    </Table>
  );

  if (dndEnabled) {
    return (
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
        sensors={sensors}
        id={sortableId}
      >
        {tableContent}
      </DndContext>
    );
  }

  if (enableColumnReorder) {
    return (
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragEnd={handleColumnDragEnd}
        sensors={sensors}
        id={sortableId}
      >
        {tableContent}
      </DndContext>
    );
  }

  return tableContent;
}
