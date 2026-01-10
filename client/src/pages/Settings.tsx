import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Bell, Bot, Users, Mail, MessageSquare, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Settings() {
  const { toast } = useToast();
  
  // Break Category State
  const [name, setName] = useState("");
  const [startCommand, setStartCommand] = useState("");
  const [endCommand, setEndCommand] = useState("");
  const [duration, setDuration] = useState("");
  const [notificationTime, setNotificationTime] = useState("");
  const [categoryCountry, setCategoryCountry] = useState("");

  // Bot Settings State
  const [botToken, setBotToken] = useState("");
  const [emails, setEmails] = useState("");
  const [telegramIds, setTelegramIds] = useState("");
  const [reportSchedule, setReportSchedule] = useState("");

  const { data: categories, isLoading: loadingCategories } = useQuery<any[]>({
    queryKey: [api.settings.categories.list.path],
  });

  const { data: botSettings, isLoading: loadingBot } = useQuery<any>({
    queryKey: ["/api/settings/bot"],
  });

  const { data: groups, isLoading: loadingGroups } = useQuery<any[]>({
    queryKey: ["/api/settings/groups"],
  });

  // Sync bot settings state
  useEffect(() => {
    if (botSettings) {
      setBotToken(botSettings.botToken || "");
      setEmails(botSettings.reportEmails?.join(", ") || "");
      setTelegramIds(botSettings.reportTelegramIds?.join(", ") || "");
      setReportSchedule(botSettings.reportSchedule || "");
    }
  }, [botSettings]);

  const createCategoryMutation = useMutation({
    mutationFn: async (newCategory: any) => {
      const res = await fetch(api.settings.categories.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });
      if (!res.ok) throw new Error("Failed to create category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.settings.categories.list.path] });
      setName("");
      setStartCommand("");
      setEndCommand("");
      setDuration("");
      setNotificationTime("");
      setCategoryCountry("");
      toast({ title: "Success", description: "Break category created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildUrl(api.settings.categories.delete.path, { id }), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete category");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.settings.categories.list.path] });
      toast({ title: "Success", description: "Category deleted" });
    },
  });

  const updateBotMutation = useMutation({
    mutationFn: async (updates: any) => {
      const res = await fetch("/api/settings/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update bot settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/bot"] });
      toast({ title: "Success", description: "Bot settings updated" });
    },
  });

  const toggleGroupMutation = useMutation({
    mutationFn: async ({ chatId, isActive }: { chatId: string; isActive: boolean }) => {
      const res = await fetch(`/api/settings/groups/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update group");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/groups"] });
      toast({ title: "Success", description: "Group updated" });
    },
  });

  const syncGroupsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings/groups/sync", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to sync groups");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/groups"] });
      toast({ title: "Success", description: "Synced recent Telegram activity" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startCommand || !endCommand || !duration) return;
    createCategoryMutation.mutate({
      name,
      startCommand,
      endCommand,
      duration: parseInt(duration),
      notificationTime: notificationTime || undefined,
      country: categoryCountry || undefined,
    });
  };

  const handleBotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBotMutation.mutate({
      botToken,
      reportEmails: emails.split(",").map(e => e.trim()).filter(Boolean),
      reportTelegramIds: telegramIds.split(",").map(id => id.trim()).filter(Boolean),
      reportSchedule,
    });
  };

  return (
    <Layout title="Settings">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>

        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Break Categories
            </TabsTrigger>
            <TabsTrigger value="bot" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Bot Configuration
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Telegram Groups
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Create Break Category</CardTitle>
                  <CardDescription>Add new break types with custom Telegram commands.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Category Name</Label>
                      <Input placeholder="e.g. Lunch Break" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Command</Label>
                      <Input placeholder="e.g. startlunch" value={startCommand} onChange={(e) => setStartCommand(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Command</Label>
                      <Input placeholder="e.g. endlunch" value={endCommand} onChange={(e) => setEndCommand(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <Input type="number" placeholder="e.g. 60" value={duration} onChange={(e) => setDuration(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Daily Notification Time (HH:mm)
                      </Label>
                      <Input placeholder="e.g. 13:00" value={notificationTime} onChange={(e) => setNotificationTime(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Country (for Timezone)</Label>
                      <Input placeholder="e.g. Sri Lanka" value={categoryCountry} onChange={(e) => setCategoryCountry(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={createCategoryMutation.isPending}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Category
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Existing Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingCategories ? (
                    <div>Loading...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Commands</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>Notify</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories?.map((cat) => (
                          <TableRow key={cat.id}>
                            <TableCell className="font-medium">{cat.name}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">/{cat.startCommand}</span>
                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">/{cat.endCommand}</span>
                              </div>
                            </TableCell>
                            <TableCell>{cat.duration}m</TableCell>
                            <TableCell>{cat.country || "Not Set"}</TableCell>
                            <TableCell>{cat.notificationTime || "None"}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cat.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {cat.isActive ? "YES" : "NO"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => deleteCategoryMutation.mutate(cat.id)}
                                disabled={deleteCategoryMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bot">
            <Card>
              <CardHeader>
                <CardTitle>Bot & Report Configuration</CardTitle>
                <CardDescription>Configure your Telegram bot and report distribution settings.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBotSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      Bot Token
                    </Label>
                    <Input 
                      type="password"
                      placeholder="Enter your Telegram Bot Token" 
                      value={botToken} 
                      onChange={(e) => setBotToken(e.target.value)} 
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Report Emails
                      </Label>
                      <Input 
                        placeholder="email1@example.com, email2@example.com" 
                        value={emails} 
                        onChange={(e) => setEmails(e.target.value)} 
                      />
                      <p className="text-xs text-muted-foreground">Comma-separated email addresses.</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Report Telegram IDs
                      </Label>
                      <Input 
                        placeholder="12345678, 87654321" 
                        value={telegramIds} 
                        onChange={(e) => setTelegramIds(e.target.value)} 
                      />
                      <p className="text-xs text-muted-foreground">Comma-separated Telegram user IDs.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Report Schedule (Cron Format)</Label>
                    <Input 
                      placeholder="0 9 * * *" 
                      value={reportSchedule} 
                      onChange={(e) => setReportSchedule(e.target.value)} 
                    />
                    <p className="text-xs text-muted-foreground">Example: 0 9 * * * (Daily at 9 AM)</p>
                  </div>

                  <Button type="submit" disabled={updateBotMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Configuration
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle>Tracked Groups</CardTitle>
                  <CardDescription>Manage Telegram groups where the bot is active.</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => syncGroupsMutation.mutate()}
                  disabled={syncGroupsMutation.isPending}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncGroupsMutation.isPending ? "animate-spin" : ""}`} />
                  Detect New Groups
                </Button>
              </CardHeader>
              <CardContent>
                {loadingGroups ? (
                  <div>Loading...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group Title</TableHead>
                        <TableHead>Chat ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Tracking</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups?.map((group) => (
                        <TableRow key={group.chatId}>
                          <TableCell className="font-medium">{group.title || "Unknown Chat"}</TableCell>
                          <TableCell className="font-mono text-xs">{group.chatId}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {categories?.filter(c => c.isActive).map(cat => (
                                <div key={cat.id} className="flex gap-1">
                                  <span className="text-[10px] bg-blue-50 text-blue-700 px-1 rounded">/{cat.startCommand}</span>
                                  <span className="text-[10px] bg-slate-50 text-slate-700 px-1 rounded">/{cat.endCommand}</span>
                                </div>
                              ))}
                              {(!categories || categories.filter(c => c.isActive).length === 0) && (
                                <span className="text-[10px] text-muted-foreground italic">No active commands</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${group.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {group.isActive ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Switch 
                              checked={group.isActive}
                              onCheckedChange={(checked) => toggleGroupMutation.mutate({ chatId: group.chatId, isActive: checked })}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!groups || groups.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No groups found. Invite the bot to a group to see it here.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
