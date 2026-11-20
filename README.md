# Niyojan Resto

A responsive restaurant website and staff management system. The customer-facing site includes the restaurant home page, menu, story, and contact pages. Staff can sign in to manage tables, menus, orders, kitchen tickets, billing, and daily activity.

Both the customer-facing website and the staff operations dashboard are part of this single **Niyojan Resto** website. Staff use `/login`; guests can browse the public pages without a separate restaurant site.

## Stack

| Part | Tech |
|------|------|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Backend | ASP.NET Core 10 Web API |
| Database | SQL Server LocalDB (`Niyojan`) by default; SQLite remains available |
| Authentication | JWT login restricted to Admin and Manager |
| Live updates | SignalR hub `/hubs/restaurant` |

## Run locally

### Backend secret

The JWT signing key is intentionally not stored in the repository. Set a local
development key with .NET User Secrets:

```powershell
dotnet user-secrets set "Jwt:Key" "<a random secret of at least 32 characters>" --project backend
```

For deployed environments, provide `Jwt__Key` through the hosting platform's secret
manager. Never commit JWT keys or production credentials.

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

The public website navigation includes `/` (Home), `/about`, and `/service`.
The menu and restaurant contact pages remain available at `/our-menu` and `/contact`.
Staff sign in at `/login`.

For a hosted frontend, set `NEXT_PUBLIC_API_URL` to the public API URL at frontend
build time. Add the exact frontend origin (scheme and host, without a trailing slash)
to the backend `Cors:AllowedOrigins` setting; for example, set
`Cors__AllowedOrigins__0` to `https://restaurant.example.com`. Local development
origins remain allowed. Do not use a wildcard origin when credentials are enabled.

## Database setup

The backend uses the separate SQL Server database `Niyojan` on
`(localdb)\MSSQLLocalDB` by default. On first startup, the API creates the database
and schema if they do not exist, then seeds the initial restaurant setup. Ensure
SQL Server LocalDB is installed and available to the Windows account running the API.
The frontend talks only to the API; database credentials and connections stay on the
backend.

The connection is configured in `backend/appsettings.json`. Override it for another
SQL Server instance using .NET User Secrets locally:

```powershell
dotnet user-secrets set "ConnectionStrings:Default" "Server=<server>;Database=Niyojan;Trusted_Connection=True;TrustServerCertificate=True" --project backend
```

For deployments, provide `ConnectionStrings__Default` from the hosting platform's
secret manager and set `Database__Provider` to `SqlServer`. Use a managed SQL Server
instance for a hosted client deployment; LocalDB is intended for a Windows machine
running the API locally and is not a shared production database.

The default configuration uses the SQL Server `Niyojan` database. SQLite is still
supported only when explicitly selected by setting `Database:Provider` to `Sqlite`
and `ConnectionStrings:Default` to `Data Source=bramhand.db`; that creates a fresh
SQLite database if the file does not exist. SQLite data is not copied into SQL
Server automatically. The API initializes a fresh database from the current EF
model; `EnsureCreated` does not apply schema changes to an already-created database.

Development seed logins (Admin and Manager only):

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Manager | `manager` | `manager123` |

These are development seed credentials. Change them before giving the application to
a client or using it with real data.

The login API only accepts active Admin and Manager accounts; PIN login is disabled.
Staff roles remain in the database for restaurant operations but cannot sign in.
Existing non-Admin/Manager accounts and their records are retained; they are denied
login without deleting or altering historical data.

To create the database schema manually, select the `Niyojan` database in SQL Server
Management Studio and run [`backend/sql/create-niyojan-schema.sql`](backend/sql/create-niyojan-schema.sql).
The script contains the SQL Server table, relationship, and index definitions
generated from the application's EF model. It creates schema only; API startup seeds
the initial records for a new empty database.

## Responsive access over Wi-Fi

Connect the phone and computer to the same Wi-Fi network, start the backend and
frontend, then open `http://<computer-wi-fi-ip>:3000` on the phone. Allow Node.js and
the API through Windows Firewall on the Private network if prompted. This setup is
for trusted local Wi-Fi; use HTTPS and secured hosting before exposing the application
outside the local network.

## Included staff workflows

- Admin and Manager staff sign-in using a password
- Floors, tables, and live table status
- Menu categories, availability, and dietary types
- Captain orders and kitchen order tickets (KOT)
- Running orders and billing/payment
- Dashboard statistics and audit history
