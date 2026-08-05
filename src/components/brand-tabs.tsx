"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

import { cn } from "@/lib/utils";

export interface BrandTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface BrandTabsProps {
  tabs: BrandTab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * SUBMENÚ DE MARCA — el único formato de submenú de Squad Fit.
 * Réplica del BrandTabs de la web pública (squat-fit-website).
 *
 * Pestañas ligeras con indicador inferior: la activa en naranja con su barra
 * debajo, el resto en azul.
 *
 * Si no caben todas, el submenú se desliza (con el táctil o arrastrando con el
 * ratón) y aparece un fade al fondo con una flecha gris a la derecha para avisar
 * de que hay más pestañas ocultas. Al deslizar, el fade salta al lado contrario.
 */
export function BrandTabs({ tabs, active, onChange, className }: BrandTabsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflowRight, setOverflowRight] = useState(false);
  const [overflowLeft, setOverflowLeft] = useState(false);
  const drag = useRef({ down: false, startX: 0, startScroll: 0, moved: false });

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setOverflowRight(el.scrollLeft < max - 2);
    setOverflowLeft(el.scrollLeft > 2);
  }, []);

  useEffect(() => {
    update();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update, tabs]);

  // Arrastrar con el ratón para deslizar el submenú (el táctil ya se desliza solo).
  const onMouseDown = (e: React.MouseEvent) => {
    const el = scrollerRef.current;
    if (!el) return;
    drag.current = { down: true, startX: e.pageX, startScroll: el.scrollLeft, moved: false };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const el = scrollerRef.current;
    if (!el || !drag.current.down) return;
    const dx = e.pageX - drag.current.startX;
    if (Math.abs(dx) > 3) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
  };
  const endDrag = () => {
    drag.current.down = false;
  };
  // Si el gesto fue un arrastre, no dispares el cambio de pestaña.
  const handleTab = (id: string) => () => {
    if (drag.current.moved) {
      drag.current.moved = false;
      return;
    }
    onChange(id);
  };

  return (
    <nav
      className={cn("relative w-full border-b border-slate-200 dark:border-slate-700", className)}
      aria-label="Submenú"
    >
      <div
        ref={scrollerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        className="no-scrollbar -mb-px flex cursor-grab gap-0 overflow-x-auto select-none active:cursor-grabbing sm:gap-6"
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={handleTab(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                // `sm:text-sm`, no `text-base`: en el back office las pestañas
                // llevan contador («Pendiente · 12») y son hasta siete, así que
                // a 16 px se comían el ancho y saltaba el deslizador con la
                // ventana entera disponible. En móvil se queda en `text-xs`,
                // que ya era el mínimo legible.
                "flex items-center gap-2 border-b-[3px] px-2 py-2.5 text-xs whitespace-nowrap transition-colors sm:px-4 sm:py-3 sm:text-sm",
                isActive
                  ? "border-[#FF690B] font-bold text-[#FF690B]"
                  : "border-transparent font-semibold text-[#3932C0] hover:text-[#FF690B] dark:text-indigo-300",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Fade al fondo + flecha gris: avisa de que hay más pestañas a la derecha */}
      {overflowRight && (
        <div className="from-background via-background pointer-events-none absolute top-0 right-0 bottom-[1px] flex items-center bg-gradient-to-l to-transparent pr-1 pl-10">
          <svg
            className="h-5 w-5 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </div>
      )}
      {/* Al deslizar, un fade suave a la izquierda */}
      {overflowLeft && (
        <div className="from-background pointer-events-none absolute top-0 bottom-[1px] left-0 w-8 bg-gradient-to-r to-transparent" />
      )}
    </nav>
  );
}
