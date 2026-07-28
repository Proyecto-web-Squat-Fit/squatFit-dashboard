import {
  MessageSquare,
  Users,
  LayoutDashboard,
  GraduationCap,
  ShoppingCart,
  Package,
  UtensilsCrossed,
  Apple,
  ChefHat,
  FileText,
  TrendingUp,
  Dumbbell,
  Contact,
  BadgePercent,
  ArrowLeftRight,
  TicketPercent,
  Megaphone,
  CalendarCheck,
  FolderOpen,
  Plug,
  Settings,
  CookingPot,
  Link2,
  type LucideIcon,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  // Iconos propios del diseño (PNG/SVG): normal (índigo) y activo (naranja).
  // Si están presentes, tienen prioridad sobre `icon` (lucide). Las secciones
  // creadas después del diseño aún no tienen SVG propio y usan lucide.
  iconNormal?: string;
  iconActive?: string;
  subItems?: NavSubItem[];
  /**
   * Si es true, el item CON subItems también navega a `url` al clicarlo
   * (p. ej. Nutri, que tiene página landing propia). El desplegable se abre
   * con el chevron o con el hover-preview.
   */
  landing?: boolean;
  /**
   * Roles que ven este item. Sin definir = todos los roles de staff.
   * "admin" siempre lo ve todo.
   */
  roles?: string[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

const ADMIN = ["admin"];
const ADMIN_SOPORTE = ["admin", "support", "soporte"];

// ============================================================================
// REESTRUCTURA DEL MENÚ (spec de Hamlet, 27-jul-2026)
// - Catálogo → Productos (absorbe Packs como pestaña interna)
// - Libros → Cocina · Equipo → pestaña Empleados dentro de Usuarios
// - Dieta desglosada en Lista de Alimentos / Banco de Recetas / Sustituciones
// - Pautas → sección nueva Programas · Nutri con página landing
// - Grupo CRM (Leads · Downsell · Cupones) · Integraciones (salud) · Ajustes
// Las rutas viejas redirigen a las nuevas (ver redirects y pages con redirect()).
// ============================================================================
export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Principal",
    items: [
      {
        title: "Inicio",
        url: "/dashboard/default",
        icon: LayoutDashboard,
        iconNormal: "/menu-icons/inicio-normal.png",
        iconActive: "/menu-icons/inicio-active.png",
      },
      {
        title: "Pedidos",
        url: "/dashboard/pedidos",
        icon: ShoppingCart,
        iconNormal: "/menu-icons/pedidos-normal.svg",
        iconActive: "/menu-icons/pedidos-active.svg",
      },
      {
        title: "Productos",
        url: "/dashboard/productos",
        icon: Package,
        iconNormal: "/menu-icons/productos-normal.svg",
        iconActive: "/menu-icons/productos-active.svg",
      },
      {
        title: "Usuarios",
        url: "/dashboard/usuarios",
        icon: Users,
        iconNormal: "/menu-icons/usuarios-normal.svg",
        iconActive: "/menu-icons/usuarios-active.svg",
        roles: ADMIN,
      },
      {
        title: "Chat",
        url: "/dashboard/chat",
        icon: MessageSquare,
        iconNormal: "/menu-icons/chat-normal.png",
        iconActive: "/menu-icons/chat-active.png",
      },
    ],
  },
  {
    id: 2,
    label: "Marketing",
    items: [
      {
        title: "CRM",
        url: "/dashboard/leads",
        icon: Megaphone,
        roles: ADMIN_SOPORTE,
        subItems: [
          { title: "Leads", url: "/dashboard/leads", icon: Contact },
          { title: "Downsell", url: "/dashboard/downsell", icon: BadgePercent },
          { title: "Cupones", url: "/dashboard/cupones", icon: TicketPercent, isNew: true },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "Entrenamiento",
    items: [
      {
        title: "Programas",
        url: "/dashboard/pautas",
        icon: Dumbbell,
        subItems: [
          { title: "Pautas", url: "/dashboard/pautas", icon: FileText },
          { title: "Mi plan", url: "/dashboard/programas/plan", icon: CalendarCheck },
          { title: "Recursos", url: "/dashboard/programas/recursos", icon: FolderOpen },
          { title: "Progreso de clientes", url: "/dashboard/seguimiento", icon: TrendingUp },
        ],
      },
      {
        title: "Cursos",
        url: "/dashboard/cursos",
        icon: GraduationCap,
        iconNormal: "/menu-icons/cursos-normal.png",
        iconActive: "/menu-icons/cursos-active.png",
        roles: ADMIN,
      },
    ],
  },
  {
    id: 4,
    label: "Nutrición",
    items: [
      {
        title: "Nutri",
        url: "/dashboard/nutri",
        icon: UtensilsCrossed,
        landing: true,
        subItems: [
          { title: "Lista de Alimentos", url: "/dashboard/nutri/alimentos", icon: Apple },
          { title: "Banco de Recetas", url: "/dashboard/recetas", icon: ChefHat },
          { title: "Sustituciones", url: "/dashboard/nutri/sustituciones", icon: ArrowLeftRight },
        ],
      },
      {
        title: "Cocina",
        url: "/dashboard/cocina",
        icon: CookingPot,
        iconNormal: "/menu-icons/libros-normal.png",
        iconActive: "/menu-icons/libros-active.png",
        roles: ADMIN,
      },
    ],
  },
  {
    id: 5,
    label: "Sistema",
    items: [
      {
        title: "Integraciones",
        url: "/dashboard/integraciones",
        icon: Plug,
        roles: ADMIN_SOPORTE,
        isNew: true,
      },
      {
        title: "Redirecciones",
        url: "/dashboard/redirects",
        icon: Link2,
        // Permiso `redirects` clonado en la migración a los mismos roles que
        // ya tenían `users` en `put` (histórico: solo admin en este back office).
        roles: ADMIN,
        isNew: true,
      },
      {
        title: "Ajustes",
        url: "/dashboard/ajustes",
        icon: Settings,
        roles: ADMIN,
      },
    ],
  },
];

/**
 * Filtra los items del sidebar según el rol del usuario.
 * - `roles` sin definir en el item → lo ve todo el staff.
 * - "admin" lo ve todo.
 * - "support"/"soporte" ve además lo marcado ADMIN_SOPORTE (CRM, Integraciones).
 * @param userRole - Rol del usuario actual
 * @returns Array de NavGroup filtrado según el rol
 */
export const getSidebarItemsForRole = (userRole: string | null | undefined): NavGroup[] => {
  const role = userRole?.toLowerCase();

  if (role === "admin") {
    return sidebarItems;
  }

  return sidebarItems
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || (role && item.roles.includes(role))),
    }))
    .filter((group) => group.items.length > 0);
};
