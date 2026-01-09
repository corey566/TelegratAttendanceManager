import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";

export default function Settings() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [startCommand, setStartCommand] = useState("");
  const [endCommand, setEndCommand] = useState("");
  const [duration, setDuration] = useState("");
  const [notificationTime, setNotificationTime] = useState("");

  const { data: categories, isLoading } = useQuery<any[]>({
    queryKey: [api.settings.categories.list.path],
  });

  const createMutation = useMutation({
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
      toast({ title: "Success", description: "Break category created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startCommand || !endCommand || !duration) return;
    createMutation.mutate({
      name,
      startCommand,
      endCommand,
      duration: parseInt(duration),
      notificationTime: notificationTime || undefined,
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Create Break Category</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category Name</label>
                  <Input 
                    placeholder="e.g. Lunch Break" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    data-testid="input-category-name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Command</label>
                  <Input 
                    placeholder="e.g. startlunch" 
                    value={startCommand} 
                    onChange={(e) => setStartCommand(e.target.value)} 
                    data-testid="input-start-command"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Command</label>
                  <Input 
                    placeholder="e.g. endlunch" 
                    value={endCommand} 
                    onChange={(e) => setEndCommand(e.target.value)} 
                    data-testid="input-end-command"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration (minutes)</label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 60" 
                    value={duration} 
                    onChange={(e) => setDuration(e.target.value)} 
                    data-testid="input-duration"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Daily Notification Time (HH:mm)
                  </label>
                  <Input 
                    placeholder="e.g. 13:00" 
                    value={notificationTime} 
                    onChange={(e) => setNotificationTime(e.target.value)} 
                    data-testid="input-notification-time"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={createMutation.isPending}
                  data-testid="button-create-category"
                >
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
              {isLoading ? (
                <div>Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Commands</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Notify</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories?.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell>
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">/{cat.startCommand}</span>
                          <span className="mx-1 text-muted-foreground">/</span>
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">/{cat.endCommand}</span>
                        </TableCell>
                        <TableCell>{cat.duration}m</TableCell>
                        <TableCell>{cat.notificationTime || "None"}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteMutation.mutate(cat.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-category-${cat.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!categories || categories.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          No categories defined yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
