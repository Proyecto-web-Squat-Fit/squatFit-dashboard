import { ReactNode } from "react";

import { cookies } from "next/headers";

import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
// WebSocketSimple eliminado - La funcionalidad se maneja en los contextos específicos
import { ChatProvider } from "@/contexts/chat-context";
import { users } from "@/data/users";
import { getSidebarVariant, getSidebarCollapsible, getContentLayout } from "@/lib/layout-preferences";
import { cn } from "@/lib/utils";

import { AccountSwitcher } from "./_components/sidebar/account-switcher";
import { LayoutControls } from "./_components/sidebar/layout-controls";
import { NotificationsBell } from "./_components/sidebar/notifications-bell";
import { ThemeSwitcher } from "./_components/sidebar/theme-switcher";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  // Sin cookie el menú arranca ABIERTO; solo se colapsa si el usuario lo dejó
  // así explícitamente (la cookie se escribe al pulsar el botón de menú).
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  const sidebarVariant = await getSidebarVariant();
  const sidebarCollapsible = await getSidebarCollapsible();
  const contentLayout = await getContentLayout();

  return (
    <ChatProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar variant={sidebarVariant} collapsible={sidebarCollapsible} />
        <SidebarInset
          className={cn(
            contentLayout === "centered" && "!mx-auto max-w-screen-2xl",
            // Adds right margin for inset sidebar in centered layout up to 113rem.
            // On wider screens with collapsed sidebar, removes margin and sets margin auto for alignment.
            "max-[113rem]:peer-data-[variant=inset]:!mr-2 min-[101rem]:peer-data-[variant=inset]:peer-data-[state=collapsed]:!mr-auto",
          )}
        >
          <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex w-full items-center justify-between px-4 lg:px-6">
              <div className="flex items-center gap-1 lg:gap-2">
                <SidebarTrigger className="-ml-1" />
              </div>
              <div className="bg-sidebar-accent/80 flex items-center gap-2 rounded-lg border border-[#C2C0FC] px-2 py-1.5">
                {/* <LayoutControls contentLayout={contentLayout} variant={sidebarVariant} collapsible={sidebarCollapsible} /> */}
                <NotificationsBell />
                <ThemeSwitcher />
                <AccountSwitcher users={users} />
              </div>
            </div>
          </header>
          <div className="p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </ChatProvider>
  );
}
