"use client";

import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { Search } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { FilterChips } from "@/components/filter-chips";
import { EditUserModal } from "@/components/modals/edit-user-modal";
import { GrantProductDialog } from "@/components/modals/grant-product-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAlumnos } from "@/hooks/use-alumnos";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { useEncargados } from "@/hooks/use-encargados";

import { getAlumnosColumns } from "./columns.alumnos";
import { AlumnoUI } from "./schema";

// Etiquetas legibles de los roles/segmentos conocidos (Doc 0); el resto se
// muestra capitalizado tal y como llega del backend.
const ROLE_LABEL: Record<string, string> = {
  user: "Usuario",
  admin: "Admin",
  coach: "Coach",
  lead: "Lead",
  miembro: "Miembro",
  alumno: "Alumno",
  lector: "Lector",
  suscrito: "Suscrito",
  cocinilla: "Cocinilla",
};

function roleLabel(role: string): string {
  const key = role.toLowerCase();
  return ROLE_LABEL[key] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

export function AlumnosTable() {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState("");
  const [editingUser, setEditingUser] = useState<AlumnoUI | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [grantingUser, setGrantingUser] = useState<AlumnoUI | null>(null);
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  // Filtros multi-selección (pastillas). Vacío = «Todos».
  const [rolesSel, setRolesSel] = useState<string[]>([]);
  const [encargadosSel, setEncargadosSel] = useState<string[]>([]);

  // Obtener alumnos del API
  const { data: alumnosData, isLoading, error } = useAlumnos({ page: 1, limit: 1000 });

  // Encargado (staff asignado vía asesorías) — mismo filtro que en Pedidos.
  const { options: encargadoOptions, matchesUser } = useEncargados();

  // Handlers del modal
  const handleEditUser = (alumno: AlumnoUI) => {
    setEditingUser(alumno);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
  };

  const handleGrantProduct = (alumno: AlumnoUI) => {
    setGrantingUser(alumno);
    setIsGrantModalOpen(true);
  };

  // Transformar datos del API a formato UI
  const alumnos = useMemo<AlumnoUI[]>(() => {
    // Validar que alumnosData exista y sea un array
    if (!alumnosData || !Array.isArray(alumnosData)) return [];

    return alumnosData.map((alumno) => ({
      ...alumno,
      fullName: `${alumno.firstName} ${alumno.lastName ?? ""}`.trim() || "Sin nombre",
      statusDisplay: alumno.status?.toLowerCase() === "active" ? ("Activo" as const) : ("Inactivo" as const),
    }));
  }, [alumnosData]);

  // Opciones de «Categoría» (rol/segmento) según los datos cargados.
  const roleOptions = useMemo(() => {
    const roles = [...new Set(alumnos.map((a) => (a.role ?? "").toLowerCase()).filter(Boolean))].sort();
    return roles.map((r) => ({ id: r, label: roleLabel(r) }));
  }, [alumnos]);

  // El GET /admin-panel/users solo acepta UN `role`/`status`, así que las
  // pastillas multi-selección filtran EN CLIENTE sobre la página cargada.
  const visibleAlumnos = useMemo(() => {
    let out = alumnos;
    if (rolesSel.length > 0) out = out.filter((a) => rolesSel.includes((a.role ?? "").toLowerCase()));
    if (encargadosSel.length > 0) out = out.filter((a) => matchesUser(a.id, encargadosSel));
    return out;
  }, [alumnos, rolesSel, encargadosSel, matchesUser]);

  // Generar columnas con handlers
  const columns = useMemo(
    () =>
      getAlumnosColumns({
        onEdit: handleEditUser,
        onGrantProduct: handleGrantProduct,
        onViewProfile: (alumno) => {
          router.push(`/dashboard/alumnos/${alumno.id}`);
        },
        onDelete: (alumno) => {
          console.log("Eliminar alumno:", alumno);
          // Aquí puedes implementar la confirmación de eliminación
        },
      }),
    [],
  );

  const table = useDataTableInstance({
    data: visibleAlumnos,
    columns,
    getRowId: (row) => row.id,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Clientes</CardTitle>
        <CardDescription>Administra la base de alumnos registrados en la plataforma</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra de búsqueda y controles */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
            <Input
              placeholder="Buscar alumnos por nombre, email, usuario..."
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="pl-8"
            />
          </div>
          <DataTableViewOptions table={table} />
        </div>

        {/* Pastillas multi-selección: varias categorías/encargados a la vez; «Todos» limpia. */}
        <div className="flex flex-col gap-2">
          <FilterChips label="Categoría" options={roleOptions} selected={rolesSel} onChange={setRolesSel} />
          <FilterChips
            label="Encargado"
            options={encargadoOptions}
            selected={encargadosSel}
            onChange={setEncargadosSel}
          />
        </div>

        {/* Manejo de estados de carga y error */}
        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <p className="text-muted-foreground">Cargando alumnos...</p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-10">
            <p className="text-destructive">Error: {error.message}</p>
          </div>
        )}

        {/* Tabla */}
        {!isLoading && !error && (
          <>
            <div className="overflow-hidden rounded-lg border">
              <DataTable table={table} columns={columns} />
            </div>

            {/* Paginación */}
            <DataTablePagination table={table} />
          </>
        )}
      </CardContent>

      {/* Modal de Edición */}
      {editingUser && (
        <EditUserModal
          open={isEditModalOpen}
          onOpenChange={handleCloseEditModal}
          userId={editingUser.id}
          userType="alumno"
          defaultValues={{
            firstName: editingUser.firstName,
            lastName: editingUser.lastName ?? undefined,
            email: editingUser.email,
            birth: editingUser.birth ?? undefined,
          }}
        />
      )}

      {/* Diálogo: Añadir producto al usuario */}
      {grantingUser && (
        <GrantProductDialog
          open={isGrantModalOpen}
          onOpenChange={(open) => {
            setIsGrantModalOpen(open);
            if (!open) setGrantingUser(null);
          }}
          userId={grantingUser.id}
          userName={grantingUser.fullName}
        />
      )}
    </Card>
  );
}
