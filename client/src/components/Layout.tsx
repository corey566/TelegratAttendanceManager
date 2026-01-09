import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}

export function Layout({ children, title, actions }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 lg:p-10 max-w-[1600px] w-full mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your team's schedule and performance.
            </p>
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </header>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
