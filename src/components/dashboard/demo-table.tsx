"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Search } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DemoTableRow {
  id: string;
  cells: Record<string, string>;
  status?: string;
  href?: string;
}

export interface DemoTableColumn {
  key: string;
  label: string;
  className?: string;
}

export function DemoTable({
  columns,
  rows,
  searchPlaceholder = "Rechercher...",
  showStatusFilter = false,
}: {
  columns: DemoTableColumn[];
  rows: DemoTableRow[];
  searchPlaceholder?: string;
  showStatusFilter?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const statuses = useMemo(
    () => Array.from(new Set(rows.map((row) => row.status).filter(Boolean))) as string[],
    [rows],
  );
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");
    return rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        Object.values(row.cells).some((value) => value.toLocaleLowerCase("fr").includes(normalizedQuery));
      return matchesQuery && (status === "ALL" || row.status === status);
    });
  }, [query, rows, status]);

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
        {showStatusFilter && (
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              {statuses.map((item) => (
                <SelectItem value={item} key={item}>
                  <StatusBadge status={item} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key} className={column.className}>{column.label}</TableHead>
                ))}
                {rows.some((row) => row.href) && <TableHead className="w-16 text-right">Voir</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.key === "status" && row.status ? (
                        <StatusBadge status={row.status} />
                      ) : (
                        row.cells[column.key] ?? "—"
                      )}
                    </TableCell>
                  ))}
                  {rows.some((item) => item.href) && (
                    <TableCell className="text-right">
                      {row.href && (
                        <Button asChild variant="ghost" size="icon-sm">
                          <Link href={row.href} aria-label={`Voir ${row.cells.name ?? row.id}`}>
                            <Eye />
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
