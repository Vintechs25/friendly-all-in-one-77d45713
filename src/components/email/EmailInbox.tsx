import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Inbox, Mail, MailOpen, Star, Archive, Search, ArrowLeft, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function EmailInbox() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "starred">("all");

  const { data: emails = [], isLoading, refetch } = useQuery({
    queryKey: ["inbound-emails", profile?.business_id],
    queryFn: async () => {
      if (!profile?.business_id) return [];
      const { data, error } = await supabase
        .from("inbound_emails")
        .select("*")
        .eq("business_id", profile.business_id)
        .eq("is_archived", false)
        .order("received_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.business_id,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("inbound_emails").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbound-emails"] }),
  });

  const toggleStarMutation = useMutation({
    mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => {
      await supabase.from("inbound_emails").update({ is_starred: !starred }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbound-emails"] }),
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("inbound_emails").update({ is_archived: true }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbound-emails"] });
      setSelectedEmail(null);
    },
  });

  const filteredEmails = emails.filter((e: any) => {
    if (filter === "unread" && e.is_read) return false;
    if (filter === "starred" && !e.is_starred) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        e.subject?.toLowerCase().includes(term) ||
        e.from_email?.toLowerCase().includes(term) ||
        e.from_name?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const openEmail = (email: any) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      markReadMutation.mutate(email.id);
    }
  };

  if (selectedEmail) {
    return (
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleStarMutation.mutate({ id: selectedEmail.id, starred: selectedEmail.is_starred })}
            >
              <Star className={cn("h-4 w-4", selectedEmail.is_starred && "fill-current text-yellow-500")} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => archiveMutation.mutate(selectedEmail.id)}>
              <Archive className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">{selectedEmail.subject || "(No Subject)"}</h2>
            <p className="text-sm text-muted-foreground">
              From: {selectedEmail.from_name ? `${selectedEmail.from_name} <${selectedEmail.from_email}>` : selectedEmail.from_email}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(selectedEmail.received_at), "PPpp")}
            </p>
          </div>

          <div className="border rounded-md p-4 bg-background min-h-[300px]">
            {selectedEmail.body_html ? (
              <div dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} />
            ) : (
              <pre className="whitespace-pre-wrap text-sm">{selectedEmail.body_text || "No content"}</pre>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "unread", "starred"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground">Loading...</div>
        ) : filteredEmails.length === 0 ? (
          <div className="text-center py-10">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">No emails found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Set up Resend inbound webhook to receive emails here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-md border">
            {filteredEmails.map((email: any) => (
              <div
                key={email.id}
                onClick={() => openEmail(email)}
                className={cn(
                  "flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors",
                  !email.is_read && "bg-primary/5 font-medium"
                )}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStarMutation.mutate({ id: email.id, starred: email.is_starred });
                  }}
                  className="shrink-0"
                >
                  <Star
                    className={cn(
                      "h-4 w-4",
                      email.is_starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    )}
                  />
                </button>
                {email.is_read ? (
                  <MailOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm truncate">
                      {email.from_name || email.from_email}
                    </span>
                    {!email.is_read && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">New</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {email.subject || "(No Subject)"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(email.received_at), "MMM d")}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
