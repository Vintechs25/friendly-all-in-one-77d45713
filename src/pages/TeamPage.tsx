import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions, ROLE_HIERARCHY } from "@/hooks/usePermissions";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { UserPlus, Shield, Users, Lock, Unlock, Clock } from "lucide-react";
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

export default function TeamPage() {
  const { profile, user, roles: currentUserRoles } = useAuth();
  const { userHierarchyLevel, hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("cashier");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const businessId = profile?.business_id;

  // Roles the current user can assign (only lower hierarchy)
  const ASSIGNABLE_ROLES = (Object.keys(ROLE_HIERARCHY) as AppRole[]).filter(
    (r) => ROLE_HIERARCHY[r] > userHierarchyLevel && r !== "super_admin"
  );

  // Fetch team members
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
        hierarchyLevel: Math.min(
          ...(allRoles ?? [])
            .filter((r) => r.user_id === p.id)
            .map((r) => ROLE_HIERARCHY[r.role] ?? 99)
        ),
      }));
    },
  });

  // Fetch permissions catalog
  const { data: allPermissions = [] } = useQuery({
    queryKey: ["permissions-catalog"],
    queryFn: async () => {
      const { data } = await supabase.from("permissions").select("*").order("module");
      return data ?? [];
    },
  });

  // Fetch overrides for selected user
  const { data: userOverrides = [] } = useQuery({
    queryKey: ["user-overrides", selectedUserId, businessId],
    enabled: !!selectedUserId && !!businessId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_permission_overrides")
        .select("*, permissions(module, action, description)")
        .eq("user_id", selectedUserId!)
        .eq("business_id", businessId!);
      return data ?? [];
    },
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("No business found");

      // Hierarchy check
      const targetLevel = ROLE_HIERARCHY[inviteRole] ?? 99;
      if (targetLevel <= userHierarchyLevel) {
        throw new Error("Cannot assign a role at or above your hierarchy level");
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: inviteEmail,
        password: invitePassword,
        options: { data: { full_name: inviteName } },
      });
      if (signUpError) throw signUpError;
      const newUserId = signUpData.user?.id;
      if (!newUserId) throw new Error("Failed to create user");

      await new Promise((r) => setTimeout(r, 500));

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ business_id: businessId, full_name: inviteName })
        .eq("id", newUserId);
      if (profileError) throw profileError;

      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: newUserId,
        role: inviteRole,
        business_id: businessId,
        hierarchy_level: ROLE_HIERARCHY[inviteRole] ?? 5,
      });
      if (roleError) throw roleError;

      // Audit log
      await supabase.from("audit_logs").insert({
        action: "user_created",
        table_name: "profiles",
        record_id: newUserId,
        business_id: businessId,
        user_id: user?.id,
        new_data: { email: inviteEmail, role: inviteRole, name: inviteName } as any,
      });
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
      const targetLevel = ROLE_HIERARCHY[newRole] ?? 99;
      if (targetLevel <= userHierarchyLevel) {
        throw new Error("Cannot assign a role at or above your hierarchy level");
      }
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("business_id", businessId);
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: newRole,
        business_id: businessId,
        hierarchy_level: targetLevel,
      });
      if (error) throw error;

      await supabase.from("audit_logs").insert({
        action: "role_changed",
        table_name: "user_roles",
        record_id: userId,
        business_id: businessId,
        user_id: user?.id,
        new_data: { new_role: newRole } as any,
      });
    },
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Toggle permission override
  const toggleOverride = async (permissionId: string, currentlyGranted: boolean) => {
    if (!selectedUserId || !businessId) return;
    try {
      if (currentlyGranted) {
        // Remove override
        await supabase
          .from("user_permission_overrides")
          .delete()
          .eq("user_id", selectedUserId)
          .eq("permission_id", permissionId)
          .eq("business_id", businessId);
      } else {
        // Add grant override
        await supabase.from("user_permission_overrides").insert({
          user_id: selectedUserId,
          permission_id: permissionId,
          business_id: businessId,
          override_type: "grant",
          granted_by: user?.id,
        });
      }

      await supabase.from("audit_logs").insert({
        action: currentlyGranted ? "permission_revoked" : "permission_granted",
        table_name: "user_permission_overrides",
        record_id: selectedUserId,
        business_id: businessId,
        user_id: user?.id,
        new_data: { permission_id: permissionId, action: currentlyGranted ? "revoke" : "grant" } as any,
      });

      queryClient.invalidateQueries({ queryKey: ["user-overrides", selectedUserId] });
      toast.success(currentlyGranted ? "Permission override removed" : "Permission granted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const selectedMember = teamMembers.find((m) => m.id === selectedUserId);
  const overridePermIds = new Set(userOverrides.map((o: any) => o.permission_id));

  // Group permissions by module
  const permissionsByModule = allPermissions.reduce((acc: Record<string, any[]>, p: any) => {
    (acc[p.module] = acc[p.module] || []).push(p);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Team Management</h1>
            <p className="text-muted-foreground">Manage users, roles, and granular permissions</p>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="h-4 w-4 mr-2" /> Add Member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
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

        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members"><Users className="h-4 w-4 mr-1" /> Members</TabsTrigger>
            <TabsTrigger value="permissions"><Shield className="h-4 w-4 mr-1" /> Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading team...</TableCell></TableRow>
                    ) : teamMembers.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No team members yet</TableCell></TableRow>
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
                          <TableCell>
                            <span className="text-xs text-muted-foreground">L{member.hierarchyLevel}</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(member.created_at).toLocaleDateString("en-KE")}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {member.id !== user?.id && member.hierarchyLevel > userHierarchyLevel && (
                              <>
                                <Select
                                  value={member.roles[0] ?? ""}
                                  onValueChange={(v) => changeRoleMutation.mutate({ userId: member.id, newRole: v as AppRole })}
                                >
                                  <SelectTrigger className="w-36 h-8 text-xs inline-flex">
                                    <SelectValue placeholder="Change role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ASSIGNABLE_ROLES.map((r) => (
                                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => setSelectedUserId(member.id)}
                                >
                                  <Lock className="h-3 w-3 mr-1" /> Permissions
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedMember
                    ? `Permission Overrides: ${selectedMember.full_name}`
                    : "Select a team member to manage permissions"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedMember ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Click the "Permissions" button next to a team member in the Members tab.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(permissionsByModule).map(([module, perms]) => (
                      <div key={module}>
                        <h4 className="text-sm font-semibold capitalize mb-2 text-foreground">{module.replace(/_/g, " ")}</h4>
                        <div className="space-y-2">
                          {(perms as any[]).map((perm) => {
                            const isOverridden = overridePermIds.has(perm.id);
                            return (
                              <div key={perm.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-muted/50">
                                <div>
                                  <p className="text-sm font-medium">{perm.action.replace(/_/g, " ")}</p>
                                  <p className="text-xs text-muted-foreground">{perm.description}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isOverridden && (
                                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
                                      <Unlock className="h-3 w-3 mr-1" /> Override
                                    </Badge>
                                  )}
                                  <Switch
                                    checked={isOverridden}
                                    onCheckedChange={() => toggleOverride(perm.id, isOverridden)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
