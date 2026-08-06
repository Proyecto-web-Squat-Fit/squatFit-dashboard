import {
  Apple,
  ArrowLeftRight,
  BadgeCheck,
  BadgePercent,
  CalendarCheck,
  ChefHat,
  Contact,
  CookingPot,
  Dumbbell,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  Link2,
  Megaphone,
  MessageSquare,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  TicketPercent,
  TrendingUp,
  type LucideIcon,
  Users,
  UtensilsCrossed,
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
//
// SEGUNDA PASADA (spec de Hamlet, 29-jul-2026):
// - Usuarios gana landing propia con subItems Clientes/Empleados (y, solo
//   para admin, una pestaña Permisos dentro de la vista).
// - CRM gana landing propia (antes iba directo a Leads).
// - Integraciones deja de ser item de primer nivel y pasa a ser una pestaña
//   dentro de Ajustes ("la casa"); su gating admin+soporte ahora vive dentro
//   del propio componente, ya no en `roles` del sidebar.
// - Chat sube justo después de Pedidos en el grupo Principal.
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
        title: "Chat",
        url: "/dashboard/chat",
        icon: MessageSquare,
        iconNormal: "/menu-icons/chat-normal.png",
        iconActive: "/menu-icons/chat-active.png",
      },
      {
        title: "Productos",
        url: "/dashboard/productos",
        icon: Package,
        iconNormal: "/menu-icons/productos-normal.svg",
        iconActive: "/menu-icons/productos-active.svg",
      },
      {
        // Los closers cerraban por llamada buscando el enlace correcto entre
        // sitios distintos. Va aquí, junto a Pedidos y Usuarios, porque las
        // tres pantallas se usan seguidas: se manda el enlace, entra el cobro
        // y —mientras los enlaces no lleven metadata— hay que dar de alta al
        // cliente a mano.
        title: "Enlaces de pago",
        url: "/dashboard/enlaces-pago",
        icon: Link2,
      },
      {
        title: "Usuarios",
        url: "/dashboard/usuarios",
        icon: Users,
        iconNormal: "/menu-icons/usuarios-normal.svg",
        iconActive: "/menu-icons/usuarios-active.svg",
        roles: ADMIN,
        landing: true,
        subItems: [
          { title: "Clientes", url: "/dashboard/usuarios?tab=clientes", icon: Users },
          { title: "Empleados", url: "/dashboard/usuarios?tab=empleados", icon: BadgeCheck },
          // Permisos existía como pestaña dentro de la vista, pero no en el
          // menú: solo se llegaba entrando a Usuarios y mirando las pestañas de
          // arriba. No hace falta gating propio — el item Usuarios ya es
          // `roles: ADMIN`, y la vista vuelve a comprobarlo por su cuenta.
          { title: "Permisos", url: "/dashboard/usuarios?tab=permisos", icon: ShieldCheck },
        ],
      },
    ],
  },
  {
    id: 2,
    label: "Marketing",
    items: [
      {
        title: "CRM",
        url: "/dashboard/crm",
        icon: Megaphone,
        roles: ADMIN_SOPORTE,
        landing: true,
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
          { title: "Ranking de recetas", url: "/dashboard/recetas/ranking", icon: TrendingUp },
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
 * - "support"/"soporte" ve además lo marcado ADMIN_SOPORTE (hoy solo CRM).
 *   Integraciones ya no es item de primer nivel: vive como pestaña dentro de
 *   Ajustes (roles: admin), así que soporte pierde el enlace del menú aunque
 *   su propio componente lo siga admitiendo si llega por URL directa.
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
