"use client";

import Link from "next/link";

import { BadgeCheck, Mail, Phone } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Lead } from "@/lib/services/leads-service";

import { LeadObjectionBadge, LeadSourceBadge, LeadStateBadge } from "./lead-badges";

interface LeadsTableProps {
  leads: Lead[];
  onOpen: (lead: Lead) => void;
}

export function LeadsTable({ leads, onOpen }: LeadsTableProps) {
  if (leads.length === 0) {
    return <p className="text-muted-foreground py-10 text-center text-sm">No hay leads que coincidan con el filtro.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Interés</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Objeción</TableHead>
            <TableHead className="text-right">Alta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} className="cursor-pointer" onClick={() => onOpen(lead)}>
              <TableCell className="font-medium">
                <span className="flex items-center gap-1.5">
                  {lead.name}
                  {lead.is_customer &&
                    (lead.converted_user_id ? (
                      // Auditoría julio, "ficha del cliente accesible desde más
                      // sitios": antes solo se llegaba a la ficha abriendo el
                      // panel lateral del lead. stopPropagation porque la fila
                      // entera también abre ese panel al hacer click.
                      <Link
                        href={`/dashboard/alumnos/${lead.converted_user_id}`}
                        onClick={(e) => e.stopPropagation()}
                        title="Ver ficha del cliente"
                      >
                        <BadgeCheck className="size-4 shrink-0 text-green-600 hover:text-green-700" />
                      </Link>
                    ) : (
                      <BadgeCheck className="size-4 shrink-0 text-green-600" aria-label="Ya es cliente" />
                    ))}
                </span>
              </TableCell>
              <TableCell>
                <div className="text-muted-foreground flex flex-col gap-0.5 text-xs">
                  {lead.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="size-3" />
                      {lead.email}
                    </span>
                  )}
                  {lead.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="size-3" />
                      {lead.phone}
                    </span>
                  )}
                  {!lead.email && !lead.phone && <span>—</span>}
                </div>
              </TableCell>
              <TableCell>
                <LeadSourceBadge source={lead.source} />
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{lead.interest ?? "—"}</TableCell>
              <TableCell>
                <LeadStateBadge state={lead.state} />
              </TableCell>
              <TableCell>
                {lead.objection ? (
                  <LeadObjectionBadge objection={lead.objection} />
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-right text-xs">
                {new Date(lead.intake_date).toLocaleDateString("es-ES")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
