## Packages
recharts | For visualizing break trends and statistics
date-fns | For date formatting and manipulation
lucide-react | For beautiful icons (already in base, but listing for explicit usage)
clsx | For conditional class names
tailwind-merge | For merging tailwind classes

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["var(--font-display)"],
  body: ["var(--font-body)"],
}
API Endpoints are defined in shared/routes.ts.
Dashboard needs to handle empty states gracefully if no data exists.
Export to Excel triggers a browser download.
