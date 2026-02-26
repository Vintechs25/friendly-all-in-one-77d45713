import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { UserPlus, Shield, Users, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  business_owner: "Business Owner",
  manager: "Manager",
  cashier: "Cashier",
  waiter: "Waiter",
  inventory_officer: "Inventory Officer",
};

const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: "bg-destructive/10 text-destructive",
  business_owner: "bg-primary/10 text-primary",
  manager: "bg-blue-500/10 text-blue-600",
  cashier: "bg-green-500/10 text-green-600",
  waiter: "bg-orange-500/10 text-orange-600",
  inventory_officer: "bg-purple-500/10 text-purple-600",
};

const ASSIGNABLE_ROLES: AppRole[] = ["manager", "cashier", "waiter", "inventory_officer"];

export default function TeamPage() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("cashier");

  const businessId = profile?.business_id;

  // Fetch team members: profiles + roles for this business
  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ["team", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("business_id", businessId!);
      if (error) throw error;

      const { data: allRoles } = await supabase
        .from("user_roles")
        .select("*")
        .eq("business_id", businessId!);

      return profiles.map((p) => ({
        ...p,
        roles: (allRoles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
      }));
    },
  });

  // Invite = sign up a new user, assign role, link to business
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("No business found");

      // Create user via sign-up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: inviteEmail,
        password: invitePassword,
        options: { data: { full_name: inviteName } },
      });
      if (signUpError) throw signUpError;
      const newUserId = signUpData.user?.id;
      if (!newUserId) throw new Error("Failed to create user");

      // Update profile with business_id
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ business_id: businessId, full_name: inviteName })
        .eq("id", newUserId);
      if (profileError) throw profileError;

      // Assign role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: newUserId,
        role: inviteRole,
        business_id: businessId,
      });
      if (roleError) throw roleError;
    },
    onSuccess: () => {
      toast.success("Team member added successfully");
      setInviteOpen(false);
      setInviteEmail("");
      setInvitePassword("");
      setInviteName("");
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Change role
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      if (!businessId) return;
      // Delete existing roles for this user+business
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("business_id", businessId);
      // Insert new role
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: newRole,
        business_id: businessId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Team Management</h1>
            <p className="text-muted-foreground">Manage your team members and their roles</p>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="h-4 w-4 mr-2" /> Add Member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} placeholder="Minimum 6 characters" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={() => inviteMutation.mutate()}
                  disabled={!inviteEmail || !invitePassword || !inviteName || inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? "Adding..." : "Add Member"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Members</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{teamMembers.length}</p></CardContent>
          </Card>
          {(["manager", "cashier", "inventory_officer"] as AppRole[]).map((role) => (
            <Card key={role}>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{ROLE_LABELS[role]}s</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{teamMembers.filter((m) => m.roles.includes(role)).length}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading team...</TableCell></TableRow>
                ) : teamMembers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No team members yet</TableCell></TableRow>
                ) : (
                  teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                            {member.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "??"}
                          </div>
                          <div>
                            <p className="font-medium">{member.full_name || "Unnamed"}</p>
                            {member.id === user?.id && <p className="text-xs text-muted-foreground">You</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{member.phone || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {member.roles.length > 0 ? member.roles.map((r) => (
                            <Badge key={r} variant="outline" className={ROLE_COLORS[r]}>{ROLE_LABELS[r]}</Badge>
                          )) : <Badge variant="outline">No role</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(member.created_at).toLocaleDateString("en-KE")}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.id !== user?.id && (
                          <Select
                            value={member.roles[0] ?? ""}
                            onValueChange={(v) => changeRoleMutation.mutate({ userId: member.id, newRole: v as AppRole })}
                          >
                            <SelectTrigger className="w-40 h-8 text-xs">
                              <SelectValue placeholder="Change role" />
                            </SelectTrigger>
                            <SelectContent>
                              {ASSIGNABLE_ROLES.map((r) => (
                                <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
