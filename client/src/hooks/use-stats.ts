import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useStatsSummary(period: 'daily' | 'weekly' | 'monthly' = 'daily') {
  return useQuery({
    queryKey: [api.stats.summary.path, period],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      const url = `${api.stats.summary.path}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch stats summary");
      return api.stats.summary.responses[200].parse(await res.json());
    },
  });
}
