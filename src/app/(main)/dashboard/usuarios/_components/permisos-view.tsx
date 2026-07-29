"use client";

import { useEffect, useState } from "react";

import { RotateCcw, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FICHA_SECTIONS, FICHA_VISIBILITY, type FichaSectionId, type StaffRole } from "@/lib/ficha-visibility";

/**
 * PERMISOS (solo admin, dentro de Usuarios): dos matrices editables de
 * "quién ve/tiene qué". Es organización de interfaz — NO hay endpoint de
 * backend detrás, así que todo vive en localStorage del navegador. Ver el
 * aviso de la propia pantalla.
 */

// ─── Bloque A — Clientes ────────────────────────────────────────────────────

/** Segmentos de cliente (Doc 0), en el orden en que se documentan. */
const SEGMENTOS_CLIENTE = ["Lead", "Miembro", "Alumno", "Lector", "Suscrito", "Cocinilla"] as const;
type SegmentoCliente = (typeof SEGMENTOS_CLIENTE)[number];

type AccesoClienteId =
  | "cursos_nutricion"
  | "asesoria_tmv"
  | "plan_transformate"
  | "libros_recetas"
  | "suscripcion_premium"
  | "biblioteca_digital";

const ACCESOS_CLIENTE: { id: AccesoClienteId; label: string }[] = [
  { id: "cursos_nutricion", label: "Cursos de nutrición (compra individual)" },
  { id: "asesoria_tmv", label: "Asesoría Tu Mejor Versión (programa TMV)" },
  { id: "plan_transformate", label: "Plan Transfórmate con Squat Fit" },
  { id: "libros_recetas", label: "Libros de recetas" },
  { id: "suscripcion_premium", label: "Suscripción Premium (recetas mensuales, llamada grupal, descuentos)" },
  { id: "biblioteca_digital", label: "Biblioteca digital / contenido de cocina" },
];

type ClienteMatrix = Record<AccesoClienteId, Record<SegmentoCliente, boolean>>;

function segmentosVacios(): Record<SegmentoCliente, boolean> {
  return { Lead: false, Miembro: false, Alumno: false, Lector: false, Suscrito: false, Cocinilla: false };
}

/** Mapeos ya implementados hoy en el backend (users-directory): el resto lo rellena el admin a mano. */
const DEFAULT_CLIENTE_MATRIX: ClienteMatrix = {
  cursos_nutricion: { ...segmentosVacios(), Lector: true },
  asesoria_tmv: { ...segmentosVacios(), Miembro: true },
  plan_transformate: { ...segmentosVacios(), Alumno: true },
  libros_recetas: { ...segmentosVacios(), Cocinilla: true },
  suscripcion_premium: { ...segmentosVacios(), Suscrito: true },
  biblioteca_digital: segmentosVacios(),
};

// ─── Bloque B — Empleados ───────────────────────────────────────────────────

const STAFF_ROLE_COLUMNS: { id: StaffRole; label: string }[] = [
  { id: "admin", label: "Admin" },
  { id: "adviser", label: "Entrenador" },
  { id: "dietitian", label: "Nutricionista" },
  { id: "sales", label: "Ventas" },
  { id: "psychologist", label: "Psicólogo" },
  { id: "support_agent", label: "Soporte" },
];

type MenuRowId =
  | "pedidos"
  | "productos"
  | "usuarios"
  | "chat"
  | "crm"
  | "programas"
  | "cursos"
  | "nutri"
  | "cocina"
  | "integraciones"
  | "ajustes";

/** Copiado a mano de `roles` en sidebar-items.ts para cada item de primer nivel
 * (salvo Inicio, que es para todos). "all" = sin `roles` definido hoy. */
const MENU_ROW_ROLES: Record<MenuRowId, "all" | StaffRole[]> = {
  pedidos: "all",
  productos: "all",
  usuarios: ["admin"],
  chat: "all",
  crm: ["admin", "support_agent"],
  programas: "all",
  cursos: ["admin"],
  nutri: "all",
  cocina: ["admin"],
  integraciones: ["admin", "support_agent"],
  ajustes: ["admin"],
};

const MENU_ROWS: { id: MenuRowId; label: string }[] = [
  { id: "pedidos", label: "Pedidos" },
  { id: "productos", label: "Productos" },
  { id: "usuarios", label: "Usuarios" },
  { id: "chat", label: "Chat" },
  { id: "crm", label: "CRM" },
  { id: "programas", label: "Programas" },
  { id: "cursos", label: "Cursos" },
  { id: "nutri", label: "Nutri" },
  { id: "cocina", label: "Cocina" },
  { id: "integraciones", label: "Integraciones" },
  { id: "ajustes", label: "Ajustes" },
];

type EmpleadoRowId = FichaSectionId | MenuRowId;
type EmpleadoMatrix = Record<EmpleadoRowId, Record<StaffRole, boolean>>;

function rolesVacios(): Record<StaffRole, boolean> {
  return { admin: false, adviser: false, dietitian: false, sales: false, psychologist: false, support_agent: false };
}

function buildDefaultEmpleadoMatrix(): EmpleadoMatrix {
  const matrix = {} as EmpleadoMatrix;
  // Filas de la ficha del cliente: valores reales de FICHA_VISIBILITY (solo lectura, sin tocar ese módulo).
  for (const section of FICHA_SECTIONS) {
    const row = rolesVacios();
    for (const col of STAFF_ROLE_COLUMNS) {
      row[col.id] = FICHA_VISIBILITY[col.id].includes(section.id);
    }
    matrix[section.id] = row;
  }
  // Filas del menú nuevo del back office: lo que hoy tiene `roles` en sidebar-items.ts.
  for (const menuRow of MENU_ROWS) {
    const allowed = MENU_ROW_ROLES[menuRow.id];
    const row = rolesVacios();
    for (const col of STAFF_ROLE_COLUMNS) {
      row[col.id] = allowed === "all" || allowed.includes(col.id);
    }
    matrix[menuRow.id] = row;
  }
  return matrix;
}

const DEFAULT_EMPLEADO_MATRIX: EmpleadoMatrix = buildDefaultEmpleadoMatrix();

// ─── Persistencia en localStorage (sin backend) ─────────────────────────────

const CLIENTES_KEY = "sf_permisos_clientes_v1";
const EMPLEADOS_KEY = "sf_permisos_empleados_v1";

function useLocalStorageState<T>(key: string, defaultValue: T): [T, (value: T) => void, () => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      // localStorage inaccesible o JSON corrupto: seguimos con los valores por defecto.
    }
  }, [key]);

  const update = (next: T) => {
    setValue(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Cuota de localStorage llena o modo privado: el cambio queda solo en memoria de esta sesión.
    }
  };

  const reset = () => update(defaultValue);

  return [value, update, reset];
}

function toggleCell<TCol extends string>(
  matrix: Record<string, Record<TCol, boolean>>,
  rowId: string,
  colId: TCol,
): Record<string, Record<TCol, boolean>> {
  return {
    ...matrix,
    [rowId]: { ...matrix[rowId], [colId]: !matrix[rowId][colId] },
  };
}

export function PermisosView() {
  const [clienteMatrix, setClienteMatrix, resetClienteMatrix] = useLocalStorageState<ClienteMatrix>(
    CLIENTES_KEY,
    DEFAULT_CLIENTE_MATRIX,
  );
  const [empleadoMatrix, setEmpleadoMatrix, resetEmpleadoMatrix] = useLocalStorageState<EmpleadoMatrix>(
    EMPLEADOS_KEY,
    DEFAULT_EMPLEADO_MATRIX,
  );

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Alert variant="destructive">
        <ShieldAlert />
        <AlertTitle>Esto todavía no restringe el acceso de nadie</AlertTitle>
        <AlertDescription>
          <p>
            De momento esto solo organiza lo que se ve en el panel; el backend todavía no aplica estos permisos como
            restricción real — un cambio aquí no bloquea el acceso de nadie todavía.
          </p>
          <p className="text-xs">
            Pendiente de backend: aplicar esta matriz como restricción real en los endpoints del admin-panel (hoy son de
            solo-lectura de interfaz).
          </p>
        </AlertDescription>
      </Alert>

      {/* Bloque A — Clientes */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>Qué productos y accesos incluye cada segmento de cliente.</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={resetClienteMatrix}>
            <RotateCcw className="size-4" />
            Restaurar valores por defecto
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Acceso / producto</TableHead>
                {SEGMENTOS_CLIENTE.map((segmento) => (
                  <TableHead key={segmento} className="text-center">
                    {segmento}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ACCESOS_CLIENTE.map((acceso) => (
                <TableRow key={acceso.id}>
                  <TableCell className="font-medium whitespace-normal">{acceso.label}</TableCell>
                  {SEGMENTOS_CLIENTE.map((segmento) => (
                    <TableCell key={segmento} className="text-center">
                      <Checkbox
                        checked={clienteMatrix[acceso.id][segmento]}
                        onCheckedChange={() =>
                          setClienteMatrix(toggleCell(clienteMatrix, acceso.id, segmento) as ClienteMatrix)
                        }
                        aria-label={`${acceso.label} · ${segmento}`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bloque B — Empleados */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Empleados</CardTitle>
            <CardDescription>
              Qué ve cada rol de staff: secciones de la ficha del cliente y secciones del menú del back office.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={resetEmpleadoMatrix}>
            <RotateCcw className="size-4" />
            Restaurar valores por defecto
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sección</TableHead>
                {STAFF_ROLE_COLUMNS.map((col) => (
                  <TableHead key={col.id} className="text-center">
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={STAFF_ROLE_COLUMNS.length + 1} className="bg-muted/50 text-xs font-semibold">
                  Ficha del cliente
                </TableCell>
              </TableRow>
              {FICHA_SECTIONS.map((section) => (
                <TableRow key={section.id}>
                  <TableCell className="font-medium whitespace-normal">{section.label}</TableCell>
                  {STAFF_ROLE_COLUMNS.map((col) => (
                    <TableCell key={col.id} className="text-center">
                      <Checkbox
                        checked={empleadoMatrix[section.id][col.id]}
                        onCheckedChange={() =>
                          setEmpleadoMatrix(toggleCell(empleadoMatrix, section.id, col.id) as EmpleadoMatrix)
                        }
                        aria-label={`${section.label} · ${col.label}`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={STAFF_ROLE_COLUMNS.length + 1} className="bg-muted/50 text-xs font-semibold">
                  Menú del back office
                </TableCell>
              </TableRow>
              {MENU_ROWS.map((menuRow) => (
                <TableRow key={menuRow.id}>
                  <TableCell className="font-medium whitespace-normal">{menuRow.label}</TableCell>
                  {STAFF_ROLE_COLUMNS.map((col) => (
                    <TableCell key={col.id} className="text-center">
                      <Checkbox
                        checked={empleadoMatrix[menuRow.id][col.id]}
                        onCheckedChange={() =>
                          setEmpleadoMatrix(toggleCell(empleadoMatrix, menuRow.id, col.id) as EmpleadoMatrix)
                        }
                        aria-label={`${menuRow.label} · ${col.label}`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
