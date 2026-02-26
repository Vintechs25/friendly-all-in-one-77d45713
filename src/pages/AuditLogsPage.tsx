import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Search } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  insert: "bg-green-500/10 text-green-600",
  update: "bg-blue-500/10 text-blue-600",
  delete: "bg-destructive/10 text-destructive",
  login: "bg-primary/10 text-primary",
  logout: "bg-muted text-muted-foreground",
  void: "bg-orange-500/10 text-orange-600",
  refund: "bg-purple-500/10 text-purple-600",
};

export default function AuditLogsPage() {
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const businessId = profile?.business_id;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit_logs", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const tables = [...new Set(logs.map((l) => l.table_name).filter(Boolean))];

  const filtered = logs.filter((l) => {
    if (tableFilter !== "all" && l.table_name !== tableFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        l.action.toLowerCase().includes(s) ||
        l.table_name?.toLowerCase().includes(s) ||
        l.record_id?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString("en-KE", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" /> Audit Logs
          </h1>
          <p className="text-muted-foreground">Track all changes and actions across your business</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search actions, tables, IDs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tables</SelectItem>
              {tables.map((t) => (
                <SelectItem key={t} value={t!}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Record</TableHead>
                    <TableHead className="hidden md:table-cell">IP</TableHead>
                    <TableHead className="hidden lg:table-cell">Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading logs...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No audit logs found</TableCell></TableRow>
                  ) : (
                    filtered.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {fmtTime(log.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ACTION_COLORS[log.action] ?? ""}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.table_name || "—"}</TableCell>
                        <TableCell className="font-mono text-xs truncate max-w-[120px]">{log.record_id?.slice(0, 8) || "—"}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{log.ip_address || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs max-w-[200px] truncate text-muted-foreground">
                          {log.new_data ? JSON.stringify(log.new_data).slice(0, 80) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
