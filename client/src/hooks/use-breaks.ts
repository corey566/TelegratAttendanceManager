import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

interface BreakFilters {
  userId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}

export function useBreaks(filters?: BreakFilters) {
  return useQuery({
    queryKey: [api.breaks.list.path, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.userId) params.append("userId", filters.userId);
      if (filters?.date) params.append("date", filters.date);
      if (filters?.startDate) params.append("startDate", filters.startDate);
      if (filters?.endDate) params.append("endDate", filters.endDate);

      const url = `${api.breaks.list.path}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch breaks");
      return api.breaks.list.responses[200].parse(await res.json());
    },
  });
}

export function useActiveBreaks() {
  return useQuery({
    queryKey: [api.breaks.active.path],
    queryFn: async () => {
      const res = await fetch(api.breaks.active.path);
      if (!res.ok) throw new Error("Failed to fetch active breaks");
      return api.breaks.active.responses[200].parse(await res.json());
    },
    refetchInterval: 30000, // Refresh every 30s to keep live status
  });
}
