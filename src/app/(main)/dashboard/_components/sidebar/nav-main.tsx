"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRight } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
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
import { cn } from "@/lib/utils";
import { type NavGroup, type NavMainItem } from "@/navigation/sidebar/sidebar-items";

interface NavMainProps {
  readonly items: readonly NavGroup[];
}

// Estilo de item, al gusto del menú de WordPress: fila baja, poco aire y sin
// separación entre unas y otras, para que quepan muchas opciones sin que el menú
// se haga larguísimo. El item seleccionado va en naranja de marca (el icono
// hereda el color del texto).
const ITEM = "h-9 gap-2.5 rounded-md px-2.5 text-[13px] [&>svg]:size-5 data-[active=true]:text-[#FF690B]";

// Fondo del bloque desplegado: un pelín más oscuro que el resto del sidebar
// (estilo WordPress) para distinguir de un vistazo qué sección está abierta.
const OPEN_BLOCK =
  "data-[state=open]:rounded-lg data-[state=open]:bg-black/[0.05] dark:data-[state=open]:bg-white/[0.06]";

const IsComingSoon = () => (
  <span className="ml-auto rounded-md bg-gray-200 px-2 py-1 text-xs dark:text-gray-800">Soon</span>
);

// Icono del item: usa el PNG/SVG propio si está definido; si no, cae al icono
// lucide. Se pinta con `mask-image` + `bg-current`, así la silueta hereda el
// color del botón sin depender del color del archivo: índigo de marca en
// reposo y naranja al estar seleccionado, igual que el botón de menú de la web.
// Además, en activo se usa la versión rellena (`iconActive`).
// OJO menú colapsado: el botón de shadcn oculta TODOS los <span> hijos con
// `group-data-[collapsible=icon]:[&>span]:hidden` — y este icono es un <span>.
// El `!block` de abajo lo rescata para que el icono no desaparezca al colapsar.
const NavIcon = ({ item, active }: { item: NavMainItem; active: boolean }) => {
  if (item.iconNormal) {
    const src = active && item.iconActive ? item.iconActive : item.iconNormal;
    const maskUrl = `url(${src})`;
    return (
      <span
        aria-hidden
        className="size-5 shrink-0 bg-current group-data-[collapsible=icon]:!block"
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

// Vista previa flotante del submenú (estilo WordPress): al pasar el cursor por
// una sección con subitems aparece un flyout a la derecha con sus enlaces, sin
// necesidad de clic. Se usa tanto en el menú expandido (cuando el bloque está
// plegado) como en el colapsado.
const SubmenuPreview = ({
  item,
  isActive,
  children,
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
  children: React.ReactNode;
}) => (
  <HoverCard openDelay={150} closeDelay={120}>
    <HoverCardTrigger asChild>{children}</HoverCardTrigger>
    <HoverCardContent side="right" align="start" sideOffset={6} className="w-52 p-1.5">
      <p className="text-muted-foreground px-2 pt-1 pb-1.5 text-[11px] font-semibold tracking-wide uppercase">
        {item.title}
      </p>
      <div className="flex flex-col">
        {item.subItems?.map((subItem) => (
          <Link
            key={subItem.title}
            href={subItem.url}
            target={subItem.newTab ? "_blank" : undefined}
            className={cn(
              "hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px]",
              isActive(subItem.url) ? "font-semibold text-[#FF690B]" : "text-foreground",
            )}
          >
            {subItem.icon && <subItem.icon className="size-4 shrink-0" />}
            <span>{subItem.title}</span>
            {subItem.comingSoon && <IsComingSoon />}
          </Link>
        ))}
      </div>
    </HoverCardContent>
  </HoverCard>
);

const NavItemExpanded = ({
  item,
  isActive,
  isSubmenuOpen,
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
  isSubmenuOpen: (subItems?: NavMainItem["subItems"]) => boolean;
}) => {
  const [open, setOpen] = useState(isSubmenuOpen(item.subItems));

  // Si se navega a un subitem desde fuera (p. ej. desde el hover-preview),
  // el bloque se abre solo para reflejar dónde estamos.
  const shouldBeOpen = isSubmenuOpen(item.subItems);
  useEffect(() => {
    if (shouldBeOpen) setOpen(true);
  }, [shouldBeOpen]);

  if (!item.subItems) {
    return (
      <SidebarMenuItem>
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
      </SidebarMenuItem>
    );
  }

  // Con subitems. Si además tiene landing propia (Nutri), el clic navega y el
  // desplegable se abre igualmente; si no, el clic solo pliega/despliega.
  const button = item.landing ? (
    <SidebarMenuButton
      asChild
      className={ITEM}
      aria-disabled={item.comingSoon}
      isActive={isActive(item.url, item.subItems)}
      tooltip={item.title}
    >
      <Link href={item.url} onClick={() => setOpen(true)}>
        <NavIcon item={item} active={isActive(item.url, item.subItems)} />
        <span>{item.title}</span>
        <CollapsibleTrigger asChild>
          <span
            role="button"
            tabIndex={0}
            aria-label={`Desplegar ${item.title}`}
            onClick={(e) => {
              // El chevron solo pliega/despliega, sin navegar.
              e.preventDefault();
              e.stopPropagation();
            }}
            className="ml-auto flex size-5 items-center justify-center rounded-sm hover:bg-black/5 dark:hover:bg-white/10"
          >
            <ChevronRight className={cn("size-4 transition-transform duration-200", open && "rotate-90")} />
          </span>
        </CollapsibleTrigger>
      </Link>
    </SidebarMenuButton>
  ) : (
    <CollapsibleTrigger asChild>
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
    </CollapsibleTrigger>
  );

  return (
    <Collapsible key={item.title} asChild open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem className={OPEN_BLOCK}>
        {/* La vista previa solo hace falta con el bloque plegado; abierto ya se ve. */}
        {open ? (
          button
        ) : (
          <SubmenuPreview item={item} isActive={isActive}>
            {button}
          </SubmenuPreview>
        )}
        <CollapsibleContent>
          <SidebarMenuSub className="border-l-0">
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
  // Con subitems: flyout al pasar el cursor (como WordPress colapsado). El clic
  // navega a la landing si la hay; si no, al primer subitem.
  if (item.subItems && item.subItems.length > 0) {
    const clickUrl = item.landing ? item.url : (item.subItems[0]?.url ?? item.url);
    return (
      <SidebarMenuItem key={item.title}>
        <SubmenuPreview item={item} isActive={isActive}>
          <SidebarMenuButton
            asChild
            className={ITEM}
            aria-disabled={item.comingSoon}
            tooltip={item.title}
            isActive={isActive(item.url, item.subItems)}
          >
            <Link href={clickUrl}>
              <NavIcon item={item} active={isActive(item.url, item.subItems)} />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SubmenuPreview>
      </SidebarMenuItem>
    );
  }

  // Sin subitems: navegación normal. Sin chevron: colapsado solo se ve el
  // icono y el chevron era lo que lo descuadraba (quedaba como primer svg y el
  // botón lo pintaba en lugar del icono propio).
  return (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton
        asChild
        className={ITEM}
        aria-disabled={item.comingSoon}
        tooltip={item.title}
        isActive={isActive(item.url, item.subItems)}
      >
        <Link href={item.url} target={item.newTab ? "_blank" : undefined}>
          <NavIcon item={item} active={isActive(item.url, item.subItems)} />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export function NavMain({ items }: NavMainProps) {
  const path = usePathname();
  const { state, isMobile } = useSidebar();

  const isItemActive = (url: string, subItems?: NavMainItem["subItems"]) => {
    if (subItems?.length) {
      // La sección también cuenta como activa en su propia landing (Nutri).
      return path === url || subItems.some((sub) => path.startsWith(sub.url));
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
