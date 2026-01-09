import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import UsersPage from "@/pages/Users";
import ReportsPage from "@/pages/Reports";
import SettingsPage from "@/pages/Settings";
import LoginPage from "@/pages/Login";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useLocation } from "wouter";
import { useEffect } from "react";

function Router() {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useQuery<any>({
    queryKey: [api.users.me.path],
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && !user && location !== "/login") {
      setLocation("/login");
    }
    // If logged in and on login page, redirect to home
    if (!isLoading && user && location === "/login") {
      setLocation("/");
    }
  }, [user, isLoading, location, setLocation]);

  // Only show loading if we are still fetching auth AND not on the login page
  // If we are on the login page, we can show the login form even while checking auth (it will redirect if found)
  if (isLoading && location !== "/login") return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={Dashboard} />
      <Route path="/users" component={UsersPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
