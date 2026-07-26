import {
  MessageSquare,
  Users,
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Package,
  Tags,
  ShoppingCart,
  UtensilsCrossed,
  Apple,
  ChefHat,
  FileText,
  TrendingUp,
  Dumbbell,
  BarChart3,
  Contact,
  BadgePercent,
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
  // creadas después del diseño (Catálogo, Leads, Downsell) aún no tienen SVG
  // propio y usan lucide como respaldo.
  iconNormal?: string;
  iconActive?: string;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Inicio",
    items: [
      {
        title: "Inicio",
        url: "/dashboard/default",
        icon: LayoutDashboard,
        iconNormal: "/menu-icons/inicio-normal.png",
        iconActive: "/menu-icons/inicio-active.png",
      },
      {
        title: "Equipo",
        url: "/dashboard/equipo",
        icon: Users,
        iconNormal: "/menu-icons/equipo-normal.svg",
        iconActive: "/menu-icons/equipo-active.svg",
      },
      {
        title: "Cursos",
        url: "/dashboard/cursos",
        icon: GraduationCap,
        iconNormal: "/menu-icons/cursos-normal.png",
        iconActive: "/menu-icons/cursos-active.png",
      },
      {
        title: "Libros",
        url: "/dashboard/libros",
        icon: BookOpen,
        iconNormal: "/menu-icons/libros-normal.png",
        iconActive: "/menu-icons/libros-active.png",
      },
      {
        title: "Packs",
        url: "/dashboard/packs",
        icon: Package,
        iconNormal: "/menu-icons/productos-normal.svg",
        iconActive: "/menu-icons/productos-active.svg",
      },
      {
        title: "Catálogo",
        url: "/dashboard/catalogo",
        icon: Tags,
        isNew: true,
      },
      {
        title: "Pedidos",
        url: "/dashboard/pedidos",
        icon: ShoppingCart,
        iconNormal: "/menu-icons/pedidos-normal.svg",
        iconActive: "/menu-icons/pedidos-active.svg",
        isNew: true,
      },
    ],
  },
  {
    id: 2,
    label: "Clientes",
    items: [
      {
        title: "Usuarios",
        url: "/dashboard/alumnos",
        icon: Users,
        iconNormal: "/menu-icons/usuarios-normal.svg",
        iconActive: "/menu-icons/usuarios-active.svg",
      },
      {
        title: "Chat",
        url: "/dashboard/chat",
        icon: MessageSquare,
        iconNormal: "/menu-icons/chat-normal.png",
        iconActive: "/menu-icons/chat-active.png",
      },
      // {
      //   title: "Soporte",
      //   url: "/dashboard/support",
      //   icon: Headphones,
      // },
    ],
  },
  {
    id: 6,
    label: "CRM",
    items: [
      {
        title: "Leads",
        url: "/dashboard/leads",
        icon: Contact,
        isNew: true,
      },
      {
        title: "Downsell",
        url: "/dashboard/downsell",
        icon: BadgePercent,
        isNew: true,
      },
    ],
  },
  {
    id: 3,
    label: "Nutrición",
    items: [
      {
        title: "Nutri",
        url: "/dashboard/nutri",
        icon: UtensilsCrossed,
        subItems: [
          {
            title: "Dieta",
            url: "/dashboard/dieta",
            icon: Apple,
          },
          {
            title: "Recetas",
            url: "/dashboard/recetas",
            icon: ChefHat,
            isNew: true,
          },
          {
            title: "Pautas",
            url: "/dashboard/pautas",
            icon: FileText,
          },
          {
            title: "Seguimiento",
            url: "/dashboard/seguimiento",
            icon: TrendingUp,
          },
        ],
      },
    ],
  },
  // {
  //   id: 4,
  //   label: "Operaciones",
  //   items: [
  //     {
  //       title: "Trainer",
  //       url: "/dashboard/trainer",
  //       icon: Dumbbell,
  //     },
  //     // {
  //     //   title: "Ventas",
  //     //   url: "/dashboard/ventas",
  //     //   icon: ShoppingCart,
  //     // },
  //   ],
  // },
  // {
  //   id: 5,
  //   label: "Marketing",
  //   items: [
  //     {
  //       title: "Marketing y KPIs",
  //       url: "/dashboard/marketing",
  //       icon: BarChart3,
  //       isNew: true,
  //     },
  //   ],
  // },
];

// Rutas que solo ve un admin. Ojo: la ruta de Equipo pasó de
// /dashboard/entrenadores a /dashboard/equipo con el rediseño.
const SOLO_ADMIN = ["/dashboard/equipo", "/dashboard/cursos", "/dashboard/libros", "/dashboard/packs"];

/**
 * Filtra los items del sidebar según el rol del usuario
 * - Solo "admin" ve Equipo, Cursos, Libros, Packs y Usuarios
 * - Solo "admin" y "support" ven Marketing (5) y CRM (6)
 * @param userRole - Rol del usuario actual
 * @returns Array de NavGroup filtrado según el rol
 */
export const getSidebarItemsForRole = (userRole: string | null | undefined): NavGroup[] => {
  const sinRestringidos = (grupos: NavGroup[]) =>
    grupos.map((group) => {
      if (group.id === 1) {
        return { ...group, items: group.items.filter((item) => !SOLO_ADMIN.includes(item.url)) };
      }
      if (group.id === 2) {
        return { ...group, items: group.items.filter((item) => item.url !== "/dashboard/alumnos") };
      }
      return group;
    });

  if (!userRole) {
    // Sin rol: además de los restringidos, se ocultan Marketing (5) y CRM (6)
    return sinRestringidos(sidebarItems.filter((group) => group.id !== 5 && group.id !== 6));
  }

  const role = userRole.toLowerCase();

  // Admin ve todos los items
  if (role === "admin") {
    return sidebarItems;
  }

  // Soporte ve Marketing y CRM, pero no las secciones de solo-admin
  if (role === "support" || role === "soporte") {
    return sinRestringidos(sidebarItems);
  }

  // Otros roles staff: sin restringidos, sin Marketing ni CRM
  return sinRestringidos(sidebarItems.filter((group) => group.id !== 5 && group.id !== 6));
};
