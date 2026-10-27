# Niyojan Resto

A responsive restaurant website and staff management system. The customer-facing site includes the restaurant home page, menu, story, and contact pages. Staff can sign in to manage tables, menus, orders, kitchen tickets, billing, and daily activity.

Both the customer-facing website and the staff operations dashboard are part of this single **Niyojan Resto** website. Staff use `/login`; guests can browse the public pages without a separate restaurant site.

## Stack

| Part | Tech |
|------|------|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Backend | ASP.NET Core 10 Web API |
| Database | SQLite |
| Authentication | JWT with Admin / Manager / Captain roles |
| Live updates | SignalR hub `/hubs/restaurant` |

## Run locally

### Backend secret

The JWT signing key is intentionally not stored in the repository. Set a local
development key with .NET User Secrets:

```powershell
dotnet user-secrets set "Jwt:Key" "<a random secret of at least 32 characters>" --project backend
```

For deployed environments, provide `Jwt__Key` through the hosting platform's secret
manager. Never commit JWT keys, production credentials, or the local SQLite database.

### Backend

```powershell
cd backend
dotnet run --launch-profile http
```

API: http://localhost:5080

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Website: http://localhost:3000

The customer-facing menu is available at `/our-menu`. The public pages are `/`,
`/our-menu`, `/story`, and `/contact`. Staff sign in at `/login`.

## Fresh local database

The SQLite database is `backend/bramhand.db` (configured in `backend/appsettings.json`).
To create a fresh local database, stop the backend, remove that file, then start the
backend again. The application creates the schema and seeds a new Niyojan Resto setup
on startup.

Development seed logins:

| Role | Username | Password | PIN |
|------|----------|----------|-----|
| Admin | `admin` | `admin123` | `1234` |
| Manager | `manager` | `manager123` | `2222` |
| Captain | `captain` | `captain123` | `1111` |

Change these development credentials before using the application with real data.

## Responsive access over Wi-Fi

Connect the phone and computer to the same Wi-Fi network, start the backend and
frontend, then open `http://<computer-wi-fi-ip>:3000` on the phone. Allow Node.js and
the API through Windows Firewall on the Private network if prompted. This setup is
for trusted local Wi-Fi; use HTTPS and secured hosting before exposing the application
outside the local network.

## Included staff workflows

- Role-based staff sign-in using a password or PIN
- Floors, tables, and live table status
- Menu categories, availability, and dietary types
- Captain orders and kitchen order tickets (KOT)
- Running orders and billing/payment
- Dashboard statistics and audit history
