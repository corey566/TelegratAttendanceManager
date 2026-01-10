import { Layout } from "@/components/Layout";
import { useUsers } from "@/hooks/use-users";
import { BadgeCheck, BadgeAlert, Search, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();

  return (
    <Layout title="Team Members">
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/10">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              placeholder="Search users..." 
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-bold text-foreground">{users?.length || 0}</span> members
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 bg-muted/5">
          <div className="col-span-3">User Details</div>
          <div className="col-span-2">Telegram ID</div>
          <div className="col-span-2">Country</div>
          <div className="col-span-2">Timezone</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Admin</div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-8 text-center space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/20 animate-pulse rounded-lg w-full" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!users || users.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-muted/30 p-4 rounded-full mb-4">
              <UserIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-lg">No users found</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
              Connect the Telegram bot to start syncing users automatically.
            </p>
          </div>
        )}

        {/* Users List */}
        {!isLoading && users?.map((user) => (
          <div 
            key={user.id} 
            className="grid grid-cols-12 gap-4 p-4 items-center border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors group"
          >
            <div className="col-span-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary/80 to-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
                {user.fullName?.[0] || user.username?.[0] || "?"}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{user.fullName || "Unknown Name"}</p>
                <p className="text-xs text-muted-foreground truncate">@{user.username || "no_username"}</p>
              </div>
            </div>
            
            <div className="col-span-2 text-sm font-mono text-muted-foreground">
              {user.telegramId}
            </div>

            <div className="col-span-2 text-sm text-muted-foreground">
              {user.country || "Not set"}
            </div>
            
            <div className="col-span-2 text-sm text-muted-foreground">
              {user.timezone || "UTC"}
            </div>
            
            <div className="col-span-2">
              {user.isActive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  Inactive
                </span>
              )}
            </div>

            <div className="col-span-1 text-right">
              {user.isAdmin && (
                <BadgeCheck className="h-5 w-5 text-primary ml-auto" />
              )}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
