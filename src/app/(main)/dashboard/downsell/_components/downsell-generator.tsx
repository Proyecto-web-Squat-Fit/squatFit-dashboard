"use client";

// Generador de downsell — la herramienta que usaba la hoja de cálculo, ya
// dentro del back office. El equipo (Karl / ZeroChats) puntúa lo que contestó
// el lead por chat (0-10, igual que el protocolo) y obtiene:
//   · el párrafo con el copy aprobado para pegar en la conversación,
//   · el enlace del quiz público ya etiquetado (via + UTM),
//   · la nota interna del audio.

import { useMemo, useState } from "react";

import { Check, Copy, Link2, MessageSquareText, StickyNote } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  AREAS,
  INTRO_CHAT,
  OBJETIVOS,
  PRODUCTOS,
  VENDEDORES,
  buildResultUrl,
  parrafoChat,
  resolve,
  type ObjetivoKey,
  type Scores,
} from "../_lib/downsell-engine";

const SCORES_VACIOS: Scores = { recetas: null, nutricion: null, entreno: null, guia: null };

function CopiarBtn({ texto, label }: { readonly texto: string; readonly label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Button
      size="sm"
      variant={ok ? "secondary" : "default"}
      onClick={() => {
        void navigator.clipboard?.writeText(texto).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        });
      }}
    >
      {ok ? <Check className="size-4" /> : <Copy className="size-4" />}
      {ok ? "Copiado" : label}
    </Button>
  );
}

export function DownsellGenerator() {
  const [via, setVia] = useState<string>(VENDEDORES[0].key);
  const [objetivo, setObjetivo] = useState<ObjetivoKey>("PG");
  const [scores, setScores] = useState<Scores>(SCORES_VACIOS);

  const listo = AREAS.every((a) => scores[a.key] !== null);
  const combo = useMemo(() => (listo ? resolve(scores, objetivo) : null), [listo, scores, objetivo]);

  const enlace = combo ? buildResultUrl({ clave: combo.clave, objetivo: combo.objetivo, via }) : "";
  const parrafo = combo ? parrafoChat(combo) : "";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Generador de downsell</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Puntúa lo que contestó el lead (0-10, cuenta como necesidad con 8 o más) y copia el
          párrafo + el enlace ya etiquetado.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Copy de apertura del chat</CardTitle>
        </CardHeader>
        <CardContent className="flex items-start justify-between gap-4">
          <p className="text-muted-foreground flex-1 text-sm">{INTRO_CHAT}</p>
          <CopiarBtn texto={INTRO_CHAT} label="Copiar" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">¿Quién lo envía?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {VENDEDORES.map((v) => (
            <Button
              key={v.key}
              variant={via === v.key ? "default" : "outline"}
              onClick={() => setVia(v.key)}
            >
              {v.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Objetivo del lead</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.values(OBJETIVOS).map((o) => (
            <Button
              key={o.key}
              variant={objetivo === o.key ? "default" : "outline"}
              onClick={() => setObjetivo(o.key as ObjetivoKey)}
            >
              {o.key === "PG" ? "🔥" : "💪"} {o.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Puntuaciones del lead (0-10)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {AREAS.map((area) => (
            <div key={area.key}>
              <p className="mb-2 text-sm font-medium">
                {area.letra}) {area.chat}
              </p>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 11 }, (_, n) => (
                  <Button
                    key={n}
                    size="sm"
                    className="h-8 w-8 p-0"
                    variant={scores[area.key] === n ? (n >= 8 ? "default" : "secondary") : "outline"}
                    onClick={() => setScores((s) => ({ ...s, [area.key]: n }))}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {combo && (
        <Card className="border-primary/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Hilo {combo.hilo} · {combo.necesidades}
            </CardTitle>
            <div className="flex gap-2">
              {combo.fallback && <Badge variant="outline">Sin 8+: usa la más alta</Badge>}
              <Badge>{combo.clave}|{combo.objetivo}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold uppercase">
                  <Link2 className="size-3.5" /> Enlace para el lead ({via})
                </p>
                <CopiarBtn texto={enlace} label="Copiar enlace" />
              </div>
              <p className="bg-muted rounded-md px-3 py-2 font-mono text-xs break-all">{enlace}</p>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold uppercase">
                  <MessageSquareText className="size-3.5" /> Párrafo para el chat
                </p>
                <CopiarBtn texto={parrafo} label="Copiar párrafo" />
              </div>
              <div className="bg-muted rounded-md px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
                {parrafo}
              </div>
            </div>

            <div className="bg-primary/5 text-foreground rounded-md px-3 py-2 text-sm">
              <p className="text-muted-foreground mb-0.5 flex items-center gap-1.5 text-xs font-semibold uppercase">
                <StickyNote className="size-3.5" /> Nota interna
              </p>
              {combo.notaInterna}
            </div>

            <div>
              <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                Productos recomendados
              </p>
              <ul className="text-sm">
                {combo.productos.map((p) => (
                  <li key={p}>
                    · {PRODUCTOS[p]?.nombre ?? p}
                    {PRODUCTOS[p]?.detalle ? (
                      <span className="text-muted-foreground"> — {PRODUCTOS[p].detalle}</span>
                    ) : (
                      <span className="text-muted-foreground"> — precio vigente en Catálogo</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
