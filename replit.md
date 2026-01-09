# BreakTime - Telegram Break & Attendance Management System

## Overview

BreakTime is a full-featured Telegram-based break management system that allows team members to track their breaks, receive automatic notifications, and provides administrators with a web dashboard for monitoring and reporting. The system consists of a Telegram bot for user interaction and a React-based admin portal for management.

The application enables:
- Telegram bot integration for break start/end commands
- Scheduled break notifications via private messages
- Real-time dashboard with statistics and activity monitoring
- User management with Telegram ID linking
- Excel export functionality for reporting
- Configurable break categories with custom commands

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **Charts**: Recharts for data visualization on the dashboard

The frontend follows a page-based structure with shared components:
- `client/src/pages/` - Page components (Dashboard, Users, Reports, Settings, Login)
- `client/src/components/` - Reusable components including Layout and Sidebar
- `client/src/components/ui/` - Shadcn UI primitives
- `client/src/hooks/` - Custom hooks for data fetching (useBreaks, useUsers, useStats)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod validation
- **Bot Integration**: node-telegram-bot-api for Telegram bot functionality
- **Session Management**: Express sessions with MemoryStore
- **Scheduling**: node-cron for scheduled break notifications and reports

Key backend files:
- `server/index.ts` - Express server setup and middleware
- `server/routes.ts` - API route definitions and handlers
- `server/bot.ts` - Telegram bot setup and command handling
- `server/storage.ts` - Database abstraction layer

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Managed via `drizzle-kit push`

Database tables:
- `users` - Team members with Telegram ID, username, timezone, admin status
- `breaks` - Break records with start/end times, duration, category
- `break_categories` - Configurable break types with custom commands
- `bot_settings` - Bot configuration including token and notification settings
- `telegram_groups` - Tracked Telegram groups where bot is active

### Authentication
- Session-based authentication using express-session
- Credentials stored in environment variable `ACCESS_USERS` in format: `(username,password),(username2,password2)`
- Protected routes use `requireAuth` middleware
- Login state managed via React Query on the frontend

### Build System
- **Development**: `tsx` for TypeScript execution with hot reload
- **Production Build**: Custom build script using esbuild for server bundling and Vite for client
- **Output**: Server bundle to `dist/index.cjs`, client assets to `dist/public`

## External Dependencies

### Database
- PostgreSQL database (connection via `DATABASE_URL` environment variable)
- Drizzle ORM for type-safe database operations

### Telegram Integration
- Telegram Bot API via `node-telegram-bot-api`
- Bot token configured via `BOT_TOKEN` environment variable
- Supports both polling mode and webhook-based updates

### Third-Party Libraries
- `xlsx` - Excel file generation for report exports
- `date-fns` - Date formatting and manipulation
- `zod` - Runtime type validation for API inputs/outputs
- `recharts` - Dashboard charting and visualization

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `BOT_TOKEN` - Telegram bot API token
- `ACCESS_USERS` - Admin credentials in format `(user,pass)`
- `SESSION_SECRET` - Secret for session encryption (optional, defaults to dev-secret)