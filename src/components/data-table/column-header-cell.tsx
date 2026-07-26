"use client";

import * as React from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flexRender, type Header } from "@tanstack/react-table";
import { GripVertical } from "lucide-react";

import { TableHead } from "@/components/ui/table";

// Cabecera de columna opcionalmente arrastrable (reorder) y redimensionable (resize).
export function ColumnHeaderCell<TData>({
  header,
  reorder,
  resize,
}: {
  header: Header<TData, unknown>;
  reorder: boolean;
  resize: boolean;
}) {
  const sortable = useSortable({ id: header.column.id, disabled: !reorder });

  const style: React.CSSProperties = {
    position: "relative",
    width: resize ? header.getSize() : undefined,
    transform: reorder ? CSS.Translate.toString(sortable.transform) : undefined,
    transition: reorder ? sortable.transition : undefined,
    opacity: reorder && sortable.isDragging ? 0.7 : 1,
    whiteSpace: "nowrap",
    // Permite encoger la columna por debajo del ancho de su contenido
    overflow: "hidden",
  };

  return (
    <TableHead
      ref={reorder ? sortable.setNodeRef : undefined}
      colSpan={header.colSpan}
      style={style}
      className="group/th"
    >
      <div className="flex items-center gap-1">
        {reorder && (
          <button
            type="button"
            className="cursor-grab opacity-0 transition-opacity group-hover/th:opacity-60"
            aria-label="Mover columna"
            {...sortable.attributes}
            {...sortable.listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
        </div>
      </div>
      {resize && header.column.getCanResize() && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className="absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none select-none hover:bg-[#363C98]/50"
        />
      )}
    </TableHead>
  );
}
