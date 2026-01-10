# Deployment Guide for BreakTime

To deploy BreakTime on a separate server, follow these steps:

## 1. Environment Variables
Ensure the following environment variables are set on your server:

- `DATABASE_URL`: Your PostgreSQL connection string (e.g., `postgres://user:password@host:port/database`).
- `BOT_TOKEN`: Your Telegram Bot API token obtained from @BotFather.
- `ACCESS_USERS`: Admin credentials in the format `(username,password),(username2,password2)`.
- `SESSION_SECRET`: A long, random string for session encryption.
- `PORT`: The port the server should listen on (defaults to 3000).
- `SMTP_HOST`: Your SMTP server host.
- `SMTP_PORT`: Your SMTP server port (usually 587 or 465).
- `SMTP_USER`: Your SMTP username.
- `SMTP_PASS`: Your SMTP password.
- `SMTP_FROM`: The email address to send reports from.

## 2. Prerequisites
- Node.js (v20 or higher recommended)
- PostgreSQL database

## 3. Installation & Build
1. Clone the repository to your server.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the application:
   ```bash
   npm run build
   ```
   This will generate a `dist` folder with the server bundle and client assets.

## 4. Running the Application
1. Run the database migrations (this happens automatically on startup if `NODE_ENV=production` is set, but can be run manually):
   ```bash
   npx drizzle-kit push
   ```
2. Start the production server:
   ```bash
   npm start
   ```

## 5. Deployment with PM2 (Recommended)
To keep the application running in the background:
```bash
npm install -g pm2
pm2 start dist/index.cjs --name breaktime
```
