# Publishing LaundryHub to Windows Server IIS

This document contains the full deployment instructions for publishing the LaundryHub system to a Windows Server using IIS.

## 1. Architecture

LaundryHub is a full-stack app:
- Frontend: React + Vite (static files)
- Backend: Node.js + Express (API)
- Database: PostgreSQL

Recommended production layout:
- IIS serves the frontend static build
- Node backend runs as a Windows service on port `5000`
- IIS proxies `/api/*` to `http://localhost:5000`

## 2. Prerequisites

Install these on the Windows Server:
- IIS (Web Server)
- IIS URL Rewrite Module
- Node.js LTS (18+ or newer)
- PostgreSQL (12+)
- Optional but recommended: NSSM (to run Node as a Windows service)

Verify tools:

```powershell
node -v
npm -v
```

## 3. Build the Projects

### Frontend

```powershell
cd C:\Projects\laundryhub
npm install
npm run build
```

Output: `C:\Projects\laundryhub\dist`

### Backend

```powershell
cd C:\Projects\laundryhubbackend
npm install
npm run build
```

Output: `C:\Projects\laundryhubbackend\dist`

## 4. Backend Environment (.env)

Create `C:\Projects\laundryhubbackend\.env`:

```env
PORT=5000
NODE_ENV=production
API_PREFIX=/api

DB_HOST=localhost
DB_PORT=5432
DB_NAME=laundryhub
DB_USER=laundryhub_user
DB_PASSWORD=your_secure_password
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000
DB_CONNECT_TIMEOUT=10000

JWT_SECRET=your_long_random_secret_at_least_32_chars
JWT_EXPIRY=7d
ADMIN_PASSWORD=change_me

BACKUP_FOLDER=C:\Backups\LaundryHub
CORS_ORIGIN=https://your-domain.com
```

Notes:
- `app.config.ts` validates required env values at startup.
- Ensure all required keys are present, or backend will fail to boot.

## 5. PostgreSQL Setup

Create DB and user:

```sql
CREATE DATABASE laundryhub;
CREATE USER laundryhub_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE laundryhub TO laundryhub_user;
```

Then initialize schema from backend project:

```powershell
cd C:\Projects\laundryhubbackend
npm run init:schema
npm run seed
```

If you use migrations/snapshot scripts:

```powershell
npm run migrate:transaction-snapshots
npm run backfill:transaction-snapshots
```

## 6. Run Backend as Windows Service (Recommended)

Use NSSM so backend auto-starts and restarts on crash.

### Install service

```powershell
# Run PowerShell as Administrator
cd C:\nssm\win64
nssm install LaundryHubBackend "C:\Program Files\nodejs\node.exe" "C:\Projects\laundryhubbackend\dist\app.js"
```

Configure:

```powershell
nssm set LaundryHubBackend AppDirectory "C:\Projects\laundryhubbackend"
nssm set LaundryHubBackend Start SERVICE_AUTO_START
nssm set LaundryHubBackend AppStdout "C:\Logs\laundryhub-stdout.log"
nssm set LaundryHubBackend AppStderr "C:\Logs\laundryhub-stderr.log"
```

Start and verify:

```powershell
nssm start LaundryHubBackend
Get-Service LaundryHubBackend
netstat -ano | findstr :5000
```

## 7. IIS Setup

Open IIS Manager (`inetmgr`).

### Application Pools

Create 2 pools:
1. `LaundryHubFrontend`
2. `LaundryHubBackendProxy`

For both:
- .NET CLR Version: `No Managed Code`
- Pipeline: `Integrated`
- Start Automatically: `True`

### Frontend App

- Site: Default Web Site (or your own site)
- Physical path: `C:\Projects\laundryhub\dist`
- App pool: `LaundryHubFrontend`

### API Proxy App

- Alias: `api`
- Physical path: `C:\Projects\laundryhubbackend\dist`
- App pool: `LaundryHubBackendProxy`

## 8. web.config Files

## 8.1 Frontend web.config (React SPA)

Place in `C:\Projects\laundryhub\dist\web.config`.

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React SPA" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>

    <staticContent>
      <mimeType fileExtension=".js" type="application/javascript" />
      <mimeType fileExtension=".mjs" type="application/javascript" />
      <mimeType fileExtension=".json" type="application/json" />
      <mimeType fileExtension=".woff" type="font/woff" />
      <mimeType fileExtension=".woff2" type="font/woff2" />
    </staticContent>
  </system.webServer>
</configuration>
```

## 8.2 API Proxy web.config

Place in `C:\Projects\laundryhubbackend\dist\web.config`.

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="API Reverse Proxy" stopProcessing="true">
          <match url=".*" />
          <action type="Rewrite" url="http://localhost:5000/{R:0}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

## 9. Frontend API URL

Ensure frontend uses your IIS `/api` path in production.

In your axios client config, prefer:
- Relative base path: `/api`

Or if environment-based:
- `VITE_API_BASE_URL=/api`

Then rebuild frontend:

```powershell
cd C:\Projects\laundryhub
npm run build
```

## 10. Bindings, DNS, SSL

In IIS Site Bindings:
- HTTP on port `80`
- HTTPS on port `443` with valid SSL certificate
- Hostname set to your domain

Recommended:
- Force HTTPS redirect
- Keep backend private (`localhost:5000`) and only expose through IIS

## 11. Firewall

Open inbound rules:
- TCP 80 (HTTP)
- TCP 443 (HTTPS)

Do not expose backend port `5000` publicly.

## 12. Validation Checklist

After deployment, validate:
1. Frontend loads from IIS
2. Login works
3. API calls succeed through `/api`
4. Transactions/Customers/Reports load correctly
5. Backup create/upload/restore works
6. Role-based access works (Employee restrictions)

Quick tests:

```powershell
curl http://localhost/api/health
Get-Service LaundryHubBackend
```

## 13. Troubleshooting

### App shows blank page or 404 on refresh
- Frontend `web.config` SPA rewrite missing/wrong
- Dist path in IIS points to wrong folder

### API 502/500 from IIS
- Node service not running
- Wrong proxy target in API `web.config`
- `.env` missing required variables

### Database connection errors
- Wrong DB credentials in `.env`
- PostgreSQL service down
- DB user lacks permissions

### CORS errors
- Set `CORS_ORIGIN` to your frontend domain
- If multiple, configure backend to parse allowed origins list

### Service starts then exits
- Check logs: `C:\Logs\laundryhub-stderr.log`
- Validate `.env` keys and values

## 14. Post-Deployment Operations

Recommended:
- Schedule daily PostgreSQL backups
- Monitor IIS logs and Node logs
- Add restart policy for backend service
- Keep Node and server patched
- Rotate JWT secret and admin credentials securely

## 15. Release Procedure (Future Updates)

For each new release:
1. Build frontend and backend
2. Copy new `dist` files to server
3. Keep `.env` unchanged
4. Restart backend service
5. Recycle IIS app pools
6. Smoke test main flows

Commands:

```powershell
# Backend restart
nssm restart LaundryHubBackend

# IIS recycle
Import-Module WebAdministration
Restart-WebAppPool -Name "LaundryHubFrontend"
Restart-WebAppPool -Name "LaundryHubBackendProxy"
```

## 16. Security Recommendations

- Use strong DB and JWT secrets
- Use HTTPS only in production
- Restrict file/folder permissions
- Keep `.env` outside public web paths
- Do not commit production `.env` to source control
- Keep backup folder writeable only by service account

---

If you want, next I can also generate:
1. A production-ready `web.config` pair tailored exactly to your domain and IIS site structure.
2. A one-click `publish.ps1` script that rebuilds, copies files, and restarts services automatically.
