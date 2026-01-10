import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useBreaks } from "@/hooks/use-breaks";
import { FileDown, Calendar as CalendarIcon, Filter, Clock } from "lucide-react";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { api } from "@shared/routes";

export default function ReportsPage() {
  const [dateFilter, setDateFilter] = useState(formatInTimeZone(new Date(), 'Asia/Colombo', "yyyy-MM-dd"));
  const { data: breaks, isLoading } = useBreaks({ date: dateFilter });

  const handleExport = () => {
    // Direct browser navigation to trigger download
    window.open(api.export.excel.path, '_blank');
  };

  return (
    <Layout 
      title="Activity Reports" 
      actions={
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 transition-all font-medium text-sm active:translate-y-0"
        >
          <FileDown className="h-4 w-4" />
          Export to Excel
        </button>
      }
    >
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-border/50 bg-muted/10 flex items-center gap-4">
          <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2 text-sm shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <input 
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-foreground w-32 font-medium"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors">
            <Filter className="h-4 w-4" />
            More Filters
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-12 w-12 bg-muted/20 rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/4 bg-muted/20 rounded animate-pulse" />
                    <div className="h-4 w-3/4 bg-muted/20 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : !breaks || breaks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-12">
              <div className="h-20 w-20 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="font-bold text-lg text-foreground">No records found</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                No break activity recorded for {formatInTimeZone(new Date(dateFilter), 'Asia/Colombo', "MMMM do, yyyy")}. Try selecting a different date.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/5 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50">User</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50">Type</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50">Start Time</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50">End Time</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {breaks.map((log) => {
                  const duration = log.duration || 
                    (log.endTime 
                      ? Math.round((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 60000) 
                      : null);

                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {log.userId}
                          </div>
                          <span className="font-medium text-sm">User #{log.userId}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${
                          log.type === 'lunch' 
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' 
                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatInTimeZone(new Date(log.startTime), 'Asia/Colombo', "h:mm a")}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {log.endTime ? formatInTimeZone(new Date(log.endTime), 'Asia/Colombo', "h:mm a") : <span className="text-orange-500 font-medium animate-pulse">Active</span>}
                      </td>
                      <td className="p-4 text-right">
                        {duration ? (
                          <span className="font-mono text-sm font-medium">{duration} min</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
