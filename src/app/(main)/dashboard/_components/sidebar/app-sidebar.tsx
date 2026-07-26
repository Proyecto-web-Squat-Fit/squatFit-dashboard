"use client";

import Image from "next/image";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { getSidebarItemsForRole } from "@/navigation/sidebar/sidebar-items";

import { NavMain } from "./nav-main";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const filteredItems = getSidebarItemsForRole(user?.role);

  return (
    <Sidebar {...props}>
      <SidebarHeader className="pt-6 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="!h-auto hover:bg-transparent active:bg-transparent data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                <Image
                  src="/logo-squadfit-azul.png"
                  width={52}
                  height={52}
                  alt="Squad Fit"
                  className="shrink-0 rounded-md"
                />
                <span className="text-secondary-foreground text-lg leading-tight font-bold group-data-[collapsible=icon]:hidden">
                  Squad Fit
                  <br />
                  Back Office
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      {/* `no-scrollbar`: si las opciones no caben, el menú sigue desplazándose
          por su cuenta, pero sin pintar la barra gris. */}
      <SidebarContent className="no-scrollbar">
        <NavMain items={filteredItems} />
        {/* <NavDocuments items={data.documents} /> */}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      {/* <SidebarFooter>
        <NavUser user={rootUser} />
      </SidebarFooter> */}
    </Sidebar>
  );
}
