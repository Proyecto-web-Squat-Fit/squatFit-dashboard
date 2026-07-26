import { cookies } from "next/headers";

export const allowedVariants = ["inset", "sidebar", "floating"] as const;
export type SidebarVariant = (typeof allowedVariants)[number];

export const allowedCollapsibles = ["icon", "offcanvas"] as const;
export type SidebarCollapsible = (typeof allowedCollapsibles)[number];

export const allowedContentLayouts = ["centered", "full-width"] as const;
export type ContentLayout = (typeof allowedContentLayouts)[number];

export async function getSidebarVariant(): Promise<SidebarVariant> {
  const cookieStore = await cookies();
  const value = cookieStore.get("sidebar_variant")?.value;
  // Por defecto "floating": el menú va como panel despegado y redondeado (diseño de María).
  return allowedVariants.includes(value as SidebarVariant) ? (value as SidebarVariant) : "floating";
}

export async function getSidebarCollapsible(): Promise<SidebarCollapsible> {
  const cookieStore = await cookies();
  const value = cookieStore.get("sidebar_collapsible")?.value;
  return allowedCollapsibles.includes(value as SidebarCollapsible) ? (value as SidebarCollapsible) : "icon";
}

export async function getContentLayout(): Promise<ContentLayout> {
  const cookieStore = await cookies();
  const value = cookieStore.get("content_layout")?.value;
  return allowedContentLayouts.includes(value as ContentLayout) ? (value as ContentLayout) : "centered";
}
