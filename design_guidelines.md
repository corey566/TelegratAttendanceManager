# Telegram Break Attendance Management System - Design Guidelines

## Design Approach
**System-Based Approach** drawing from Linear, Notion, and modern SaaS productivity tools. This utility-focused application prioritizes clarity, efficiency, and data visibility while maintaining visual polish through purposeful use of blue and slate tones with strategic whitespace.

## Typography System
- **Primary Font**: Inter (Google Fonts) for UI elements and data
- **Heading Hierarchy**:
  - Page Headers: text-4xl, font-semibold (36px)
  - Section Headers: text-2xl, font-semibold (24px)
  - Card Headers: text-lg, font-medium (18px)
  - Body Text: text-base, font-normal (16px)
  - Metadata/Labels: text-sm, font-medium (14px)
  - Timestamps: text-xs, font-normal (12px)

## Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, and 12 for consistent rhythm
- Component padding: p-4 to p-8
- Section spacing: py-8 to py-12
- Card spacing: p-6
- Gap between elements: gap-4 to gap-6

**Container Strategy**:
- Dashboard: Full-width with sidebar navigation (w-64 fixed sidebar)
- Content Area: max-w-7xl with px-6 to px-12
- Cards/Widgets: Grid-based layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)

## Component Library

### Navigation
**Top Bar**: Fixed header (h-16) with logo left, user profile/notifications right, search center. Subtle bottom border.

**Sidebar**: Fixed left sidebar (w-64) with:
- Navigation items with icon + label
- Active state: filled background rectangle (rounded-lg)
- Hover state: subtle background shift
- Sections: Dashboard, Team, Breaks, Reports, Settings

### Dashboard Widgets
**Stats Cards** (4-column grid on desktop):
- Elevated cards with subtle shadow
- Large number display (text-3xl, font-bold)
- Label below (text-sm, uppercase tracking)
- Small trend indicator (arrow + percentage)
- Icon in top-right corner (24px)

**Break Activity Feed**:
- Timeline-style list with avatar left
- Employee name (font-medium) + timestamp (text-sm, muted)
- Break status badge (rounded-full px-3 py-1)
- Dividing lines between entries

**Quick Actions Panel**:
- Prominent "Start Break" button (large, primary action)
- Secondary buttons for common tasks
- Grid of 2x2 action cards with icons

### Data Tables
**Employee List/Break History**:
- Alternating row backgrounds for readability
- Column headers: uppercase, text-xs, font-semibold, tracking-wide
- Row height: h-14 for comfortable scanning
- Avatar + name in first column
- Status indicators as colored badges
- Actions column (right-aligned): icon buttons for edit/view

### Form Elements
**Input Fields**: 
- Height: h-12
- Border: 1px subtle border, rounded-lg
- Focus state: border emphasis + subtle shadow
- Labels above inputs: text-sm, font-medium, mb-2

**Buttons**:
- Primary: Large click target (h-12), rounded-lg, font-medium
- Secondary: Same size, outlined style
- Icon buttons: Square (h-10 w-10), rounded-lg
- Hero buttons on images: Backdrop blur effect (backdrop-blur-md) with semi-transparent background

### Status Indicators
**Break Status Badges**:
- Rounded-full design (px-4 py-1.5)
- Text: text-xs, font-semibold, uppercase
- States: Active, On Break, Available, Offline
- Pulsing dot animation for "On Break" status

### Cards & Modals
**Content Cards**: Rounded-xl, subtle shadow (shadow-sm), border
**Modals**: Centered overlay with backdrop blur, max-w-2xl, rounded-2xl, generous padding (p-8)

## Images

### Hero Section Image
**Placement**: Top of dashboard/landing page (if public-facing)
**Description**: Modern office environment showing diverse team collaboration with subtle Telegram branding elements. Bright, professional atmosphere with natural lighting. Image should convey productivity and teamwork. Dimensions: 1920x600px, aspect ratio maintained across viewports.
**Implementation**: Full-width hero (h-96 to h-[28rem]) with gradient overlay (bottom to top, dark to transparent) for text readability.

### Dashboard Illustrations
**Empty States**: Minimalist line art illustrations (400x300px) for when no data exists (no breaks recorded, no team members, etc.)
**Onboarding Graphics**: Simple iconographic illustrations showing key features

## Animations
**Minimal and Purposeful**:
- Hover transitions: 150ms ease for all interactive elements
- Badge pulse: Subtle scale animation (2s infinite) for active status only
- Page transitions: None - instant for productivity focus
- Loading states: Simple spinner, no elaborate animations

## Key Design Principles
1. **Scanability First**: Information hierarchy optimized for quick data parsing
2. **Dense but Breathable**: Maximize data visibility while maintaining comfortable spacing
3. **Actionable Clarity**: Primary actions always prominent and within 1-2 clicks
4. **Consistent Patterns**: Reuse card layouts, table structures, and form patterns throughout
5. **Mobile Responsive**: Stack columns to single-column on mobile, collapsible sidebar to hamburger menu

This system creates a professional, efficient interface that respects users' time while providing comprehensive attendance management capabilities.