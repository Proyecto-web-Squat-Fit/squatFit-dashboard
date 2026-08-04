"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { AlertTriangle, Bell, CalendarClock, ClipboardList, CreditCard, ShoppingBag, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useMarkNotificationsRead, useNotifications } from "@/hooks/use-notifications";
import {
  AdminNotification,
  NOTIFICATION_TYPE_LABEL,
  NOTIFICATIONS_API_READY,
  NotificationType,
} from "@/lib/services/notifications-service";
import { cn } from "@/lib/utils";

// Preferencias de aviso (persistidas en localStorage; APAGADAS por defecto).
const SOUND_PREF_KEY = "sf-notifications-sound";
const BROWSER_PREF_KEY = "sf-notifications-browser";

// Un icono por tipo del backend. Antes había cuatro con nombres que el backend
// no usa nunca, así que TODO caía en el de lead nuevo: un pago, una renovación
// vencida y un lead se veían igual. `Record` completo a propósito — si mañana
// se añade un tipo, esto deja de compilar en vez de pintar un hueco.
const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  lead_nuevo: UserPlus,
  pago: CreditCard,
  form: ClipboardList,
  sequra: ShoppingBag,
  renovacion: CalendarClock,
  checkout_caido: AlertTriangle,
};

function readPref(key: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(key) === "1";
}

function relativeTime(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

/** «Ding» corto por WebAudio: sin ficheros de audio que servir. */
function playDing() {
  try {
    const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
    const ctx: AudioContext = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => void ctx.close();
  } catch {
    // Sin audio disponible (autoplay bloqueado, etc.): el aviso visual basta.
  }
}

export function NotificationsBell() {
  const router = useRouter();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationsRead();

  const [soundOn, setSoundOn] = useState(() => readPref(SOUND_PREF_KEY));
  const [browserOn, setBrowserOn] = useState(() => readPref(BROWSER_PREF_KEY));

  const unread = notifications.filter((n) => !n.read);

  // Avisa (ding / notificación del navegador) solo de lo que llega NUEVO entre
  // sondeos: la primera carga puebla el set sin avisar.
  const seenIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (notifications.length === 0) return;
    if (seenIds.current === null) {
      seenIds.current = new Set(notifications.map((n) => n.id));
      return;
    }
    const fresh = notifications.filter((n) => !n.read && !seenIds.current!.has(n.id));
    notifications.forEach((n) => seenIds.current!.add(n.id));
    if (fresh.length === 0) return;
    if (soundOn) playDing();
    if (browserOn && typeof Notification !== "undefined" && Notification.permission === "granted") {
      fresh.forEach((n) => new Notification(n.title, { body: n.body, tag: n.id }));
    }
  }, [notifications, soundOn, browserOn]);

  const toggleSound = (on: boolean) => {
    setSoundOn(on);
    localStorage.setItem(SOUND_PREF_KEY, on ? "1" : "0");
    if (on) playDing(); // confirmación audible al activarlo
  };

  const toggleBrowser = async (on: boolean) => {
    if (on && typeof Notification !== "undefined" && Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return; // sin permiso, el interruptor no se enciende
    }
    setBrowserOn(on);
    localStorage.setItem(BROWSER_PREF_KEY, on ? "1" : "0");
  };

  const handleOpenChange = (open: boolean) => {
    if (open && unread.length > 0) markRead.mutate(undefined);
  };

  const handleItemClick = (n: AdminNotification) => {
    if (!n.read) markRead.mutate([n.id]);
    router.push(n.href);
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="text-foreground/70 hover:text-foreground relative size-9"
          aria-label="Notificaciones"
        >
          <Bell className="size-5" />
          {unread.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF690B] px-1 text-[10px] font-semibold text-white">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
          <span>Notificaciones</span>
          {!NOTIFICATIONS_API_READY && (
            <span className="text-muted-foreground text-[10px] font-normal">Datos de ejemplo · Fase 9</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">No hay notificaciones</p>
          )}
          {notifications.map((n) => {
            const Icon = TYPE_ICON[n.type];
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleItemClick(n)}
                className={cn(
                  "hover:bg-accent flex w-full items-start gap-3 px-3 py-2.5 text-left",
                  !n.read && "bg-[#FFEDE0]/60 dark:bg-[#FF690B]/10",
                )}
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#EBEAF2] text-[#363C98] dark:bg-[#363C98]/30 dark:text-[#b9bce8]">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{n.title}</span>
                  {n.body && <span className="text-muted-foreground block truncate text-xs">{n.body}</span>}
                  <span className="text-muted-foreground block text-[10px]">
                    {NOTIFICATION_TYPE_LABEL[n.type]} · {relativeTime(n.created_at)}
                  </span>
                </span>
                {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#FF690B]" />}
              </button>
            );
          })}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="space-y-2 px-3 py-2.5">
          <label className="flex cursor-pointer items-center justify-between text-xs">
            <span>Sonido al llegar avisos</span>
            <Switch checked={soundOn} onCheckedChange={toggleSound} />
          </label>
          <label className="flex cursor-pointer items-center justify-between text-xs">
            <span>Notificaciones del navegador</span>
            <Switch checked={browserOn} onCheckedChange={(on) => void toggleBrowser(on)} />
          </label>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
