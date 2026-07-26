"use client";

import { useEffect, useMemo, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Download, Eye, Pencil, Search } from "lucide-react";
import { toast } from "sonner";

import { BulkActionsBar } from "@/components/data-table/bulk-actions-bar";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { EditUserModal } from "@/components/modals/edit-user-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { useUsuariosDirectory, usuariosDirectoryKeys } from "@/hooks/use-usuarios-directory";
import { exportCSV, exportPDF, exportXLSX, type ExportColumn } from "@/lib/export/table-export";
import { UsuariosDirectoryService } from "@/lib/services/usuarios-directory-service";
import type { UsuarioDirectorio, UsuariosTab, StaffMember } from "@/lib/services/usuarios-directory-service";

/** Pestañas del diseño con su recuento. */
const TABS: { key: UsuariosTab; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "admin", label: "Admin" },
  { key: "subscriber", label: "Suscriptores" },
  { key: "student", label: "Alumnos" },
  { key: "trash", label: "Papelera" },
];

/** Roles asignables (etiqueta, tipo que se guarda, y staff_role del equipo). */
const ASSIGN_ROLES = [
  { label: "Admin", type: "admin", staffRole: "Admin" },
  { label: "Nutri", type: "nutritionist", staffRole: "Nutri" },
  { label: "Trainer", type: "trainer", staffRole: "Trainer" },
  { label: "Ventas", type: "sales", staffRole: "Ventas" },
] as const;

/** Etiqueta de los profesionales asignados según su tipo. */
const ASSIGNED_LABEL: Record<string, string> = {
  coach: "Trainer",
  trainer: "Trainer",
  dietitian: "Nutri",
  nutritionist: "Nutri",
  admin: "Admin",
  sales: "Ventas",
  support: "Soporte",
};

const EXPORT_COLUMNS: ExportColumn<UsuarioDirectorio>[] = [
  { key: "name", label: "Nombre" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Teléfono" },
  { key: "roleName", label: "Rol" },
  { key: "assigned", label: "Asignados", value: (u) => u.assigned.map((a) => a.name).join(", ") },
  { key: "segments", label: "Segmentos", value: (u) => u.segments.join(", ") },
];

export function UsuariosDirectoryTable() {
  const [tab, setTab] = useState<UsuariosTab>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [detailUser, setDetailUser] = useState<UsuarioDirectorio | null>(null);
  const [editUser, setEditUser] = useState<UsuarioDirectorio | null>(null);

  // Debounce sencillo de la búsqueda (server-side)
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError, error } = useUsuariosDirectory({ tab, search, limit: 50 });
  const usuarios = useMemo(() => data?.usuarios ?? [], [data]);
  const counts = data?.counts;

  const columns = useMemo<ColumnDef<UsuarioDirectorio>[]>(
    () => [
      {
        id: "select",
        size: 44,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Seleccionar todo"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Seleccionar fila"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "name",
        header: "Nombre",
        meta: { label: "Nombre" },
        size: 190,
        cell: ({ row }) => <span className="font-medium text-[#FF690B]">{row.original.name}</span>,
        enableHiding: false,
      },
      {
        accessorKey: "email",
        header: "Email",
        meta: { label: "Email" },
        size: 210,
        cell: ({ row }) => <span className="text-sm">{row.original.email}</span>,
      },
      {
        accessorKey: "phone",
        meta: { label: "Teléfono" },
        header: "Teléfono",
        size: 130,
        cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.original.phone}</span>,
      },
      {
        accessorKey: "address",
        meta: { label: "Dirección" },
        header: "Dirección",
        size: 220,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm" title={row.original.address}>
            {row.original.address}
          </span>
        ),
      },
      {
        id: "assigned",
        meta: { label: "Asignados" },
        header: "Asignados",
        size: 180,
        cell: ({ row }) => {
          const list = row.original.assigned;
          if (!list.length) return <span className="text-muted-foreground text-sm">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {list.map((a, i) => (
                <Badge key={i} variant="outline" className="sqf-badge-muted" title={a.name}>
                  {ASSIGNED_LABEL[a.type?.toLowerCase()] ?? a.type}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        id: "segments",
        meta: { label: "Roles" },
        header: "Roles",
        size: 190,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roleName !== "—" && row.original.roleName !== "user" && (
              <Badge variant="outline" className="sqf-badge-indigo">
                {row.original.roleName}
              </Badge>
            )}
            {row.original.segments.map((s) => (
              <Badge key={s} variant="outline" className="sqf-badge-orange">
                {s}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: "accion",
        meta: { label: "Acción" },
        header: "Acción",
        size: 100,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:bg-[#EBEAF2]"
              title="Ver ficha"
              onClick={() => setDetailUser(row.original)}
            >
              <Eye className="h-4 w-4 text-[#363C98]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:bg-[#EBEAF2]"
              title="Editar usuario"
              onClick={() => setEditUser(row.original)}
            >
              <Pencil className="h-4 w-4 text-[#363C98]" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useDataTableInstance({
    data: usuarios,
    columns,
    persistKey: "usuarios-directory",
    enableColumnResizing: true,
    getRowId: (row) => row.id,
  });

  const selected = table.getSelectedRowModel().rows.map((r) => r.original);
  const selectedIds = selected.map((u) => u.id);

  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: usuariosDirectoryKeys.all });
    table.resetRowSelection();
  };

  // Equipo (para el selector al asignar). Se carga una vez.
  const { data: staff = [] } = useQuery({
    queryKey: ["staff-list"],
    queryFn: () => UsuariosDirectoryService.getStaff(),
    staleTime: 5 * 60 * 1000,
  });

  // Diálogo del selector de persona al "Añadir asignado: X"
  const [assignPicker, setAssignPicker] = useState<(typeof ASSIGN_ROLES)[number] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const doExport = (fmt: "csv" | "xlsx" | "pdf") => {
    const rows = selected.length ? selected : usuarios;
    const name = `usuarios-${rows.length}`;
    if (fmt === "csv") exportCSV(name, EXPORT_COLUMNS, rows);
    else if (fmt === "xlsx") void exportXLSX(name, EXPORT_COLUMNS, rows);
    else void exportPDF(name, EXPORT_COLUMNS, rows, "Usuarios");
  };

  /** Ficha de envío en texto plano de los usuarios seleccionados. */
  const downloadShipping = () => {
    const rows = selected.length ? selected : usuarios;
    const lines = rows.map(
      (u) =>
        `${u.name}\t${u.email}\t${u.phone !== "—" ? u.phone : ""}\t${u.address !== "—" ? u.address : "(sin dirección)"}`,
    );
    const content = ["Nombre\tEmail\tTeléfono\tDirección de envío", ...lines].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `envio-usuarios-${rows.length}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const runMutation = async (fn: () => Promise<unknown>, okMsg: string) => {
    try {
      await fn();
      toast.success(okMsg);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar la acción");
    }
  };

  const onApplyBulk = (a: string) => {
    if (a === "exportar-xlsx") return doExport("xlsx");
    if (a === "exportar-csv") return doExport("csv");
    if (a === "envio") return downloadShipping();
    if (a === "trash")
      return void runMutation(() => UsuariosDirectoryService.bulkTrash(selectedIds), "Movidos a la papelera");
    if (a === "restore")
      return void runMutation(() => UsuariosDirectoryService.bulkRestore(selectedIds), "Restaurados");
    if (a === "delete-forever") return setConfirmDelete(true);
    if (a.startsWith("assign:")) {
      const role = ASSIGN_ROLES.find((r) => r.type === a.slice(7));
      if (role) setAssignPicker(role);
      return;
    }
    if (a.startsWith("unassign:")) {
      const type = a.slice(9);
      const role = ASSIGN_ROLES.find((r) => r.type === type);
      return void runMutation(
        () => UsuariosDirectoryService.bulkUnassign(selectedIds, type),
        `Quitado el asignado ${role?.label ?? ""}`.trim(),
      );
    }
  };

  // Acciones del desplegable según la pestaña (normal vs papelera)
  const bulkActions =
    tab === "trash"
      ? [
          { value: "restore", label: "♻️ Restaurar" },
          { value: "delete-forever", label: "🗑️ Borrar definitivamente" },
          { value: "exportar-xlsx", label: "⬇️ Exportar como XLSX" },
        ]
      : [
          ...ASSIGN_ROLES.map((r) => ({ value: `assign:${r.type}`, label: `✅ Añadir asignado: ${r.label}` })),
          ...ASSIGN_ROLES.map((r) => ({ value: `unassign:${r.type}`, label: `❌ Eliminar asignado: ${r.label}` })),
          { value: "exportar-xlsx", label: "⬇️ Exportar como XLSX" },
          { value: "envio", label: "🚚 Descargar info de envío" },
          { value: "trash", label: "🗑️ Mover a la papelera" },
        ];

  const tabCount = (key: UsuariosTab): number | null => {
    if (!counts) return null;
    if (key === "all") return counts.all;
    if (key === "admin") return counts.admins;
    if (key === "subscriber") return counts.subscribers;
    if (key === "trash") return counts.trash;
    return counts.students;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl text-[#363C98]">Usuarios</CardTitle>
          <CardDescription>
            <span className="flex flex-wrap items-center gap-1 pt-1 text-sm">
              {TABS.map((t, idx) => (
                <span key={t.key} className="flex items-center gap-1">
                  {idx > 0 && <span className="text-muted-foreground px-1">|</span>}
                  <button
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={
                      tab === t.key ? "font-semibold text-[#FF690B]" : "font-medium text-[#363C98] hover:underline"
                    }
                  >
                    {t.label}
                    {tabCount(t.key) !== null && ` (${tabCount(t.key)})`}
                  </button>
                </span>
              ))}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BulkActionsBar selectedCount={selected.length} onApply={onApplyBulk} actions={bulkActions} />

          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
              <Input
                placeholder="Buscar clientes por nombre, email o usuario..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => doExport("csv")}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => doExport("xlsx")}>Excel (XLSX)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => doExport("pdf")}>PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DataTableViewOptions table={table} />
          </div>

          <div className="sqf-table overflow-hidden rounded-lg border">
            {isLoading ? (
              <div className="flex h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                  <p className="text-muted-foreground text-sm">Cargando usuarios...</p>
                </div>
              </div>
            ) : isError ? (
              <div className="flex h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-sm font-medium text-[#9f4e63]">Error al cargar los usuarios</p>
                  <p className="text-muted-foreground text-xs">
                    {error instanceof Error ? error.message : "Error desconocido"}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-2">
                    Reintentar
                  </Button>
                </div>
              </div>
            ) : usuarios.length === 0 ? (
              <div className="flex h-[400px] items-center justify-center">
                <p className="text-muted-foreground text-sm">No hay usuarios en esta vista</p>
              </div>
            ) : (
              <DataTable table={table} columns={columns} enableColumnResize enableColumnReorder />
            )}
          </div>

          {!isLoading && !isError && usuarios.length > 0 && <DataTablePagination table={table} />}
        </CardContent>
      </Card>

      {/* Ficha rápida del usuario */}
      <Dialog open={!!detailUser} onOpenChange={(o) => !o && setDetailUser(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{detailUser?.name}</DialogTitle>
            <DialogDescription>{detailUser?.email}</DialogDescription>
          </DialogHeader>
          {detailUser && (
            <div className="grid gap-2 text-sm">
              <p>
                <span className="text-muted-foreground">Usuario:</span> {detailUser.username}
              </p>
              <p>
                <span className="text-muted-foreground">Teléfono:</span> {detailUser.phone}
              </p>
              <p>
                <span className="text-muted-foreground">Rol:</span> {detailUser.roleName}
              </p>
              <p>
                <span className="text-muted-foreground">Dirección:</span> {detailUser.address}
              </p>
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-muted-foreground">Asignados:</span>
                {detailUser.assigned.length
                  ? detailUser.assigned.map((a, i) => (
                      <Badge key={i} variant="outline" className="sqf-badge-muted">
                        {a.name} ({ASSIGNED_LABEL[a.type?.toLowerCase()] ?? a.type})
                      </Badge>
                    ))
                  : "—"}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-muted-foreground">Segmentos:</span>
                {detailUser.segments.map((s) => (
                  <Badge key={s} variant="outline" className="sqf-badge-orange">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edición de usuario (endpoint admin users/edit) */}
      {editUser && (
        <EditUserModal
          open={!!editUser}
          onOpenChange={(o) => !o && setEditUser(null)}
          userId={editUser.id}
          userType="usuario"
          defaultValues={{
            firstName: editUser.name.split(" ")[0] ?? "",
            lastName: editUser.name.split(" ").slice(1).join(" ") || "",
            email: editUser.email,
            phone_number: editUser.phone !== "—" ? editUser.phone : undefined,
          }}
        />
      )}

      {/* Selector de persona al "Añadir asignado: X" */}
      <Dialog open={!!assignPicker} onOpenChange={(o) => !o && setAssignPicker(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Añadir asignado: {assignPicker?.label}</DialogTitle>
            <DialogDescription>
              Se asignará a {selectedIds.length} usuario(s). Elige a la persona del equipo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            {(() => {
              const people = staff.filter(
                (s) => (s.staff_role ?? "").toLowerCase() === assignPicker?.staffRole.toLowerCase(),
              );
              if (!people.length)
                return (
                  <p className="text-muted-foreground text-sm">
                    No hay nadie del equipo con el rol {assignPicker?.label}. Asígnalo primero en la pestaña Equipo.
                  </p>
                );
              return people.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    const role = assignPicker!;
                    setAssignPicker(null);
                    void runMutation(
                      () => UsuariosDirectoryService.bulkAssign(selectedIds, p.id, role.type),
                      `${p.name} asignado como ${role.label}`,
                    );
                  }}
                  className="hover:bg-muted flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm"
                >
                  <span className="font-medium text-[#363C98]">{p.name}</span>
                  <Badge variant="outline" className="sqf-badge-indigo">
                    {assignPicker?.label}
                  </Badge>
                </button>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmación de borrado definitivo */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-[#9f4e63]">Borrar definitivamente</DialogTitle>
            <DialogDescription>
              Vas a borrar {selectedIds.length} usuario(s) de forma permanente. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#9f4e63] hover:bg-[#8a4356]"
              onClick={() => {
                setConfirmDelete(false);
                void runMutation(() => UsuariosDirectoryService.bulkDelete(selectedIds), "Borrados definitivamente");
              }}
            >
              Borrar definitivamente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
