# WorkFlow HR

WorkFlow HR is a small HR, attendance and leave application. It now includes the existing browser frontend, an Express API and a MySQL schema. The API is the only component that talks to MySQL. Authentication uses a server-side MySQL session and password hashes. The API uses mysql2 prepared queries and an idempotent SQL schema migration.

## Requirements

- Node.js 20 or newer and npm
- MySQL 8.x running locally or reachable on your network
- A MySQL administrator account for the initial database setup (or Docker Desktop for the included local database)

## First-time setup

1. Start MySQL. To use the included local MySQL container, copy `.env.mysql.example` to `.env.mysql`, set two strong passwords, then run `docker compose --env-file .env.mysql up -d mysql`. If you already have MySQL, create a database and a least-privilege application user instead (replace the sample password):

   ```sql
   CREATE DATABASE workflow_hr CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
   CREATE USER 'workflow_hr_app'@'127.0.0.1' IDENTIFIED BY 'replace-with-a-long-secret';
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON workflow_hr.* TO 'workflow_hr_app'@'127.0.0.1';
   FLUSH PRIVILEGES;
   ```

2. Copy `server/.env.example` to `server/.env`. For the included container, use `DB_HOST=127.0.0.1`, `DB_USER=workflow_hr_app`, `DB_PASSWORD` equal to `MYSQL_APP_PASSWORD`, and `DB_ADMIN_USER=root`, `DB_ADMIN_PASSWORD` equal to `MYSQL_ROOT_PASSWORD`. For an existing database, use the matching credentials. Change `SESSION_SECRET` to a long random value. Keep this file private; it is ignored by Git.

3. From the project folder, install packages and create the schema:

   ```powershell
   npm install
   npm run db:migrate
   ```

4. Create the first administrator. The seed command takes an employee code, name, and email; it prompts for a password without echoing it. Use a unique password of at least 12 characters. Do not reuse a real account password.

   ```powershell
   npm run db:seed-admin -- EMP001 "Admin Name" admin@example.com Administration
   ```

5. Start the application and open `http://localhost:3000`:

   ```powershell
   npm start
   ```

The first administrator can add employees and create their accounts from Employee Management. Use passwords of at least 12 characters.

## Database and application behavior

- `server/schema.sql` defines departments, employees, users, persistent web sessions, attendance, leave requests, holidays, payslips and audit logs.
- All SQL values are parameterized. API request payloads are validated before writes. Authorization is checked in the API on every protected route.
- Role scope: employees see their own records; managers see their department; admins manage the company.
- Attendance currently allows one check-in per employee per India-local date. The API records the check-in timestamp in UTC and applies a 09:45 India-local late threshold.
- Leave days exclude weekends and configured holidays. Approved paid days decrement the employee balance transactionally. Supporting sick-leave documents are saved in the private uploads folder.
- Payslip PDFs are stored under `server/uploads/payslips`; MySQL stores metadata and access is checked before download.
- Do not serve the uploads directory publicly or put real secrets in frontend files. Production needs HTTPS, a durable private file store, backups, log monitoring and a tested restore procedure.

## Useful commands

```powershell
npm start
npm run db:migrate
npm run db:seed-admin -- EMP001 "Admin Name" admin@example.com Administration
npm run check
```

The migration SQL uses `CREATE TABLE IF NOT EXISTS`, so it is safe to rerun for this initial schema. For future schema evolution, add numbered SQL migrations rather than editing a schema already deployed to production.

## Current scope and next decisions

Tickets and policies are still placeholder pages in the existing UI. Before production, decide leave accrual and carryover rules, approval policy, attendance correction process, time zone for each location, retention requirements and whether managers may edit employee profiles. Configure an HTTPS origin and private object storage before exposing real payroll documents.
