"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRight } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { type NavGroup, type NavMainItem } from "@/navigation/sidebar/sidebar-items";

interface NavMainProps {
  readonly items: readonly NavGroup[];
}

// Estilo de item, al gusto del menú de WordPress: fila baja, poco aire y sin
// separación entre unas y otras, para que quepan muchas opciones sin que el menú
// se haga larguísimo. El item seleccionado va en naranja de marca (el icono
// hereda el color del texto).
const ITEM = "h-9 gap-2.5 rounded-md px-2.5 text-[13px] [&>svg]:size-5 data-[active=true]:text-[#FF690B]";

const IsComingSoon = () => (
  <span className="ml-auto rounded-md bg-gray-200 px-2 py-1 text-xs dark:text-gray-800">Soon</span>
);

// Icono del item: usa el PNG/SVG propio si está definido; si no, cae al icono
// lucide. Se pinta con `mask-image` + `bg-current`, así la silueta hereda el
// color del botón sin depender del color del archivo: índigo de marca en
// reposo y naranja al estar seleccionado, igual que el botón de menú de la web.
// Además, en activo se usa la versión rellena (`iconActive`).
const NavIcon = ({ item, active }: { item: NavMainItem; active: boolean }) => {
  if (item.iconNormal) {
    const src = active && item.iconActive ? item.iconActive : item.iconNormal;
    const maskUrl = `url(${src})`;
    return (
      <span
        aria-hidden
        className="size-5 shrink-0 bg-current"
        style={{
          maskImage: maskUrl,
          WebkitMaskImage: maskUrl,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskSize: "contain",
          WebkitMaskSize: "contain",
        }}
      />
    );
  }
  return item.icon ? <item.icon /> : null;
};

const NavItemExpanded = ({
  item,
  isActive,
  isSubmenuOpen,
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
  isSubmenuOpen: (subItems?: NavMainItem["subItems"]) => boolean;
}) => {
  return (
    <Collapsible key={item.title} asChild defaultOpen={isSubmenuOpen(item.subItems)} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          {item.subItems ? (
            <SidebarMenuButton
              className={ITEM}
              disabled={item.comingSoon}
              isActive={isActive(item.url, item.subItems)}
              tooltip={item.title}
            >
              <NavIcon item={item} active={isActive(item.url, item.subItems)} />
              <span>{item.title}</span>
              {item.comingSoon && <IsComingSoon />}
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          ) : (
            <SidebarMenuButton
              asChild
              className={ITEM}
              aria-disabled={item.comingSoon}
              isActive={isActive(item.url)}
              tooltip={item.title}
            >
              <Link href={item.url} target={item.newTab ? "_blank" : undefined}>
                <NavIcon item={item} active={isActive(item.url)} />
                <span>{item.title}</span>
                {item.comingSoon && <IsComingSoon />}
              </Link>
            </SidebarMenuButton>
          )}
        </CollapsibleTrigger>
        {item.subItems && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.subItems.map((subItem) => (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton
                    className="h-8 text-[13px] data-[active=true]:text-[#FF690B] [&>svg]:size-4"
                    aria-disabled={subItem.comingSoon}
                    isActive={isActive(subItem.url)}
                    asChild
                  >
                    <Link href={subItem.url} target={subItem.newTab ? "_blank" : undefined}>
                      {subItem.icon && <subItem.icon />}
                      <span>{subItem.title}</span>
                      {subItem.comingSoon && <IsComingSoon />}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
};

const NavItemCollapsed = ({
  item,
  isActive,
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
}) => {
  // Si tiene subItems, mostrar un dropdown menu
  if (item.subItems && item.subItems.length > 0) {
    return (
      <SidebarMenuItem key={item.title}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className={ITEM}
              disabled={item.comingSoon}
              tooltip={item.title}
              isActive={isActive(item.url, item.subItems)}
            >
              <NavIcon item={item} active={isActive(item.url, item.subItems)} />
              <span>{item.title}</span>
              <ChevronRight />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-48">
            {item.subItems.map((subItem) => (
              <DropdownMenuItem key={subItem.title} asChild>
                <Link href={subItem.url} target={subItem.newTab ? "_blank" : undefined}>
                  {subItem.icon && <subItem.icon className="mr-2 size-6" />}
                  <span>{subItem.title}</span>
                  {subItem.comingSoon && <IsComingSoon />}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  // Si no tiene subItems, navegar normalmente
  return (
    <SidebarMenuItem key={item.title}>
      <Link href={item.url}>
        <SidebarMenuButton
          className={ITEM}
          disabled={item.comingSoon}
          tooltip={item.title}
          isActive={isActive(item.url, item.subItems)}
        >
          <NavIcon item={item} active={isActive(item.url, item.subItems)} />
          <span>{item.title}</span>
          <ChevronRight />
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  );
};

export function NavMain({ items }: NavMainProps) {
  const path = usePathname();
  const { state, isMobile } = useSidebar();

  const isItemActive = (url: string, subItems?: NavMainItem["subItems"]) => {
    if (subItems?.length) {
      return subItems.some((sub) => path.startsWith(sub.url));
    }
    return path === url;
  };

  const isSubmenuOpen = (subItems?: NavMainItem["subItems"]) => {
    return subItems?.some((sub) => path.startsWith(sub.url)) ?? false;
  };

  // Los grupos siguen existiendo para el filtrado por rol, pero se pintan como
  // una única lista corrida: sin cabeceras de zona ("Clientes", "CRM"…) y sin
  // hueco entre ellas, que es lo que alargaba el menú.
  const todos = items.flatMap((group) => group.items);

  return (
    <SidebarGroup className="px-2 py-0">
      <SidebarGroupContent>
        <SidebarMenu className="gap-0">
          {todos.map((item) =>
            state === "collapsed" && !isMobile ? (
              <NavItemCollapsed key={item.title} item={item} isActive={isItemActive} />
            ) : (
              <NavItemExpanded key={item.title} item={item} isActive={isItemActive} isSubmenuOpen={isSubmenuOpen} />
            ),
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
