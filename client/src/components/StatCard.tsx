import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: "primary" | "accent" | "orange" | "green";
}

export function StatCard({ label, value, icon: Icon, trend, trendUp, color = "primary" }: StatCardProps) {
  const colorMap = {
    primary: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    accent: "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400",
    green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  };

  return (
    <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <h3 className="text-3xl font-display font-bold mt-2 text-foreground">{value}</h3>
          {trend && (
            <p className={`text-xs mt-2 font-medium flex items-center gap-1 ${trendUp ? "text-emerald-500" : "text-destructive"}`}>
              {trendUp ? "↑" : "↓"} {trend}
              <span className="text-muted-foreground opacity-70 ml-1">vs last week</span>
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorMap[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
