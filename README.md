# Gastos Universitarios API

API REST en **NestJS** + **Prisma** + **Supabase** (PostgreSQL) para finanzas personales universitarias.

## 1. Proyecto en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **Project Settings → Database → Connection string**.
3. Copia:
   - **Transaction pooler** (puerto `6543`) → `DATABASE_URL` (+ `?pgbouncer=true`)
   - **Session pooler** (puerto `5432`) → `DIRECT_URL` (migraciones y seed)

> Si `db.[ref].supabase.co` (Direct) da error **P1001 / red inaccesible**, usa **Session pooler** en `DIRECT_URL` (misma región que el transaction pooler). Es habitual en redes solo IPv4.

## 2. Variables de entorno

```bash
cp .env.example .env
# Edita .env con tus URLs y contraseña de Supabase
```

## 3. Instalación y base de datos

```bash
npm install
npm run db:setup    # migrate + seed
npm run start:dev
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`

### Solo migraciones (CI / producción)

```bash
npx prisma migrate deploy
npx prisma db seed
```

## Usuario de prueba (seed)

| Campo    | Valor                     |
|----------|---------------------------|
| Email    | `daniela@universidad.edu` |
| Password | `daniela123`              |

## Seguridad

- Rate limiting: 100 req / 15 min (global); 5 req / 5 min en auth
- Helmet, CORS, JWT, bcrypt, ValidationPipe global

## Endpoints

| Módulo        | Rutas |
|---------------|-------|
| Auth          | `POST /auth/register`, `POST /auth/login` |
| Users         | `GET/PATCH /users/profile` |
| Categories    | `GET/POST /categories` |
| Transactions  | `GET/POST /transactions`, `GET /transactions/balance` |
| Savings Goals | `GET/POST /savings-goals`, `POST /savings-goals/:id/add-funds` |
| Metrics       | `GET /metrics/category-expenses`, `GET /metrics/savings-efficiency` |

## Supabase Dashboard

Tras el seed puedes revisar tablas en **Table Editor**: `User`, `Category`, `Transaction`, `SavingsGoal`.
