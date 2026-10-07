# Bramhand — Restaurant Order & Billing (POS)

Petpooja-style hotel/restaurant POS: tables, captain orders, KOT, billing, reports.

## Stack

| Part | Tech |
|------|------|
| Frontend | Next.js (PWA-ready), TypeScript, Tailwind |
| Backend | ASP.NET Core 10 Web API |
| Database | SQLite (dev) — easy to switch to SQL Server/PostgreSQL |
| Auth | JWT + Role-based access (Admin / Manager / Captain) |
| Live updates | SignalR hub `/hubs/restaurant` |

## Demo logins

| Role | Username | Password | PIN |
|------|----------|----------|-----|
| Admin | `admin` | `admin123` | `1234` |
| Manager | `manager` | `manager123` | `2222` |
| Captain | `captain` | `captain123` | `1111` |

## Run locally

### One-time backend development secret setup

The JWT signing key is intentionally not stored in this repository. Set a local
development key once with .NET User Secrets before starting the API:

```powershell
dotnet user-secrets set "Jwt:Key" "<a random secret of at least 32 characters>" --project backend
```

For deployed environments, provide `Jwt__Key` through the hosting platform's secret
manager. Never commit JWT keys, production credentials, or the local SQLite database.

### Backend

```bash
cd backend
dotnet run --launch-profile http
```

API: http://localhost:5080
OpenAPI: http://localhost:5080/openapi/v1.json

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

## Open on a phone over Wi-Fi

1. Connect the phone and the computer running Bramhand to the same Wi-Fi network.
2. Start the backend and frontend using the commands above. The backend listens on the
   computer's network interfaces, and the frontend's dev/start scripts are configured
   for network access.
3. Find the computer's Wi-Fi IPv4 address with `ipconfig` (for example, `192.168.1.26`).
4. On the phone, open `http://<computer-wi-fi-ip>:3000` (for example,
   `http://192.168.1.26:3000`).
5. If Windows Firewall prompts, allow Node.js and Bramhand API on the Private network.
   If the page does not load, allow inbound TCP ports 3000 and 5080 on the Private
   network and try again.

The browser automatically connects to the API on the same computer address at port
5080. This setup is for trusted local Wi-Fi; use HTTPS and a secured hosting setup
before exposing the application outside the local network.

## Phase 1 (MVP) included

- Login (password or PIN)
- Roles & server-side RBAC
- Floors / tables with live status colors
- Menu (categories, veg/non-veg, half-full, stock)
- Captain order → Send to Kitchen (KOT)
- Add items to running order (new KOT each round)
- Running order check
- Billing + payment (Manager/Admin)
- Dashboard today stats (Manager/Admin)
- Audit log on key actions

## Next phases

- Kitchen Display Screen, thermal ESC/POS print
- Full sales reports & charts
- Table transfer/merge, bill split
- Offline sync, WhatsApp bill, QR customer menu
