# Telegram Break Attendance Management System

## Overview

A full-featured Telegram-based break management system with a web admin dashboard. The system allows team members to manage their breaks via Telegram bot commands, while administrators can monitor activity, generate reports, and configure settings through a React-based web interface.

The application tracks employee breaks, sends scheduled notifications, and provides comprehensive reporting capabilities including Excel exports.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system (Inter font, blue-gray palette)
- **Charts**: Recharts for data visualization
- **Build Tool**: Vite with path aliases (@/ for client/src, @shared for shared)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **Bot Integration**: node-telegram-bot-api with polling mode
- **Session Management**: express-session with memory store
- **Scheduled Tasks**: node-cron for scheduled notifications

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: shared/schema.ts (users, breaks, breakCategories, botSettings, telegramGroups)

### Authentication
- **Method**: Session-based authentication
- **Access Control**: Environment variable ACCESS_USERS defines authorized users in format `(user,pass),(user2,pass2)`
- **Middleware**: Custom requireAuth middleware protects API routes

### API Structure
- **Route Definitions**: Centralized in shared/routes.ts with Zod schemas
- **Pattern**: RESTful endpoints under /api prefix
- **Key Endpoints**: Users, breaks, stats, settings, export functionality

### Build Process
- **Development**: tsx for TypeScript execution, Vite dev server with HMR
- **Production**: esbuild bundles server code, Vite builds client to dist/public
- **Database Migrations**: drizzle-kit push command

## External Dependencies

### Telegram Bot
- Requires BOT_TOKEN environment variable
- Uses polling mode for receiving updates
- Tracks groups automatically when bot is added
- Supports custom break commands defined in breakCategories table

### Database
- PostgreSQL via DATABASE_URL environment variable
- Connection pooling through pg Pool

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `BOT_TOKEN`: Telegram bot API token
- `ACCESS_USERS`: Authorized admin users for web dashboard
- `SESSION_SECRET`: Express session encryption key

### Third-Party Services
- Telegram Bot API for messaging and notifications
- xlsx library for Excel report generation