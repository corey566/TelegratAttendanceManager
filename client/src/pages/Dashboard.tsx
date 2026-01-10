import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Layout } from "@/components/Layout";
import { StatCard } from "@/components/StatCard";
import { useStatsSummary } from "@/hooks/use-stats";
import { useActiveBreaks } from "@/hooks/use-breaks";
import { Users, Clock, Coffee, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useStatsSummary('daily');
  const { data: activeBreaks, isLoading: activeLoading } = useActiveBreaks();

  const chartData = stats?.weeklyActivity || [
    { name: "Mon", breaks: 0 },
    { name: "Tue", breaks: 0 },
    { name: "Wed", breaks: 0 },
    { name: "Thu", breaks: 0 },
    { name: "Fri", breaks: 0 },
    { name: "Sat", breaks: 0 },
    { name: "Sun", breaks: 0 },
  ];

  if (statsLoading || activeLoading) {
    return (
      <Layout title="Dashboard">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-2xl" />
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Active Users"
          value={stats?.activeUsers || 0}
          icon={Users}
          color="primary"
          trend="12%"
          trendUp={true}
        />
        <StatCard
          label="Currently on Break"
          value={activeBreaks?.length || 0}
          icon={Coffee}
          color="orange"
        />
        <StatCard
          label="Total Breaks Today"
          value={stats?.totalBreaks || 0}
          icon={Clock}
          color="accent"
        />
        <StatCard
          label="Total Duration (min)"
          value={stats?.totalDuration || 0}
          icon={AlertCircle}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
          <h3 className="font-display font-bold text-lg mb-6">Weekly Break Activity</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                  }}
                />
                <Bar dataKey="breaks" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary)/0.7)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-lg">Live Status</h3>
            <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold animate-pulse">
              LIVE
            </span>
          </div>

          <div className="space-y-4">
            {activeBreaks && activeBreaks.length > 0 ? (
              activeBreaks.map((item: any) => (
                <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-transparent hover:border-border transition-colors">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {item.userId}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.user?.fullName || item.user?.username || `User #${item.userId}`}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Started {formatInTimeZone(new Date(item.startTime), 'Asia/Colombo', "h:mm a")} • {item.type}
                    </p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Coffee className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">All hands on deck!</p>
                <p className="text-xs text-muted-foreground mt-1">No one is currently on break.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
