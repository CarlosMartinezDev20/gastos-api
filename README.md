# Gastos Universitarios API

API REST en **NestJS** + **Prisma** sobre **Supabase** (PostgreSQL + Auth), desplegada en **Render**.

```
Flutter ──(email/contraseña)──▶ Supabase Auth
   │                                │ access token (JWT ES256)
   └──── Authorization: Bearer ────▶ NestJS (Render) ──Prisma──▶ Supabase Postgres
```

- **Cuentas:** Supabase Auth (registro, inicio de sesión, cambio de contraseña desde la app). La API verifica cada token con las claves públicas del proyecto (JWKS: firma, emisor, audiencia `authenticated`, expiración) y no guarda contraseñas. La fila `User` es el perfil: su `id` es el id de Supabase (`sub`) y se crea en la primera llamada de una cuenta nueva.
- **Datos:** la app solo los lee y escribe a través de la API, que filtra cada consulta por el usuario del token. El esquema `public` no se expone en el Data API de Supabase y todas las tablas tienen RLS activado sin políticas, sin privilegios para `anon`/`authenticated`.

## Decisiones de infraestructura

- **Una sola fuente de verdad del esquema: las migraciones de Prisma** (`prisma/migrations`). `supabase/` solo guarda la configuración del proyecto (`config.toml`: Auth, Data API), que se aplica con `supabase config push`; no hay migraciones en `supabase/migrations`. Toda tabla nueva debe activar RLS en su migración.
- **Conexión:** Supavisor en **modo sesión** (puerto 5432) para `DATABASE_URL` y `DIRECT_URL`. Render solo sale por IPv4 y el host directo `db.<ref>.supabase.co` es solo IPv6 en el plan gratuito; el modo sesión admite las sentencias preparadas de Prisma y encaja con un servidor persistente (el modo transacción, 6543, es para serverless). `connection_limit=5` deja margen en el pool del plan gratuito.
- **Migraciones en Render:** el build ejecuta `prisma migrate deploy` (el pre-deploy command no existe en el plan gratuito).
- **Confirmación de correo desactivada** en Supabase Auth: el SMTP integrado del plan gratuito solo envía a miembros del equipo. Al configurar un SMTP propio se puede activar en `supabase/config.toml` (`[auth.email] enable_confirmations`).

## Desarrollo local

```bash
npm install
cp .env.example .env   # PostgreSQL local o Supabase; SUPABASE_URL del proyecto
npm run db:setup       # migrate + seed (categorías del sistema)
npm run start:dev
```

- API: `http://localhost:3001`; Swagger: `http://localhost:3001/api/docs` (no en producción).
- Para iniciar sesión hace falta una cuenta de Supabase Auth del proyecto de `SUPABASE_URL` (regístrate desde la app).
- Usuarios demo (crean cuentas reales en Supabase Auth, solo fuera de producción): `SEED_DEMO_USERS=true` y `SUPABASE_SECRET_KEY` en `.env`, y `npx prisma db seed`. Crea `daniela@universidad.edu` / `daniela123`, `carlos@universidad.edu` / `carlos123` y `nuevo@universidad.edu` / `nuevo123`.

```bash
npm test            # unitarios
npm run test:e2e    # base de datos con migraciones y seed; firman sus propios tokens
npx prisma migrate reset --force   # solo desarrollo: borra y recrea todo
```

## Producción (Render)

| | |
|---|---|
| Build | `npm ci --include=dev && npx prisma generate && npx prisma migrate deploy && npm run build` |
| Start | `npm run start:prod` |
| Health check | `GET /health` (sin base de datos); `GET /health/db` comprueba la conexión |
| Variables | `NODE_ENV=production`, `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `CORS_ORIGIN` |

La API valida las variables al arrancar y se detiene con un mensaje claro si falta alguna. Los secretos solo viven en las variables de entorno de Render y en `.env` local (ignorado por git).

## Seguridad

- Rate limiting: 100 req / 15 min (global); 5 req / 5 min al eliminar la cuenta.
- Helmet, CORS por lista (`CORS_ORIGIN`), ValidationPipe global (`whitelist` + `forbidNonWhitelisted`).
- Tokens de Supabase verificados con JWKS; ningún secreto de firma en la API. La clave secreta de Supabase solo se usa en el servidor (eliminar cuentas).

## Endpoints

| Módulo        | Rutas |
|---------------|-------|
| Health        | `GET /health`, `GET /health/db` |
| Users         | `GET/PATCH/DELETE /users/profile` |
| Categories    | `GET/POST /categories`, `PATCH/DELETE /categories/:id` |
| Transactions  | `GET/POST /transactions`, `GET /transactions/page`, `PATCH/DELETE /transactions/:id`, `GET /transactions/balance` |
| Savings Goals | `GET/POST /savings-goals`, `PATCH/DELETE /savings-goals/:id`, `POST /savings-goals/:id/add-funds`, `POST /savings-goals/:id/withdraw` |
| Budgets       | `GET /budgets`, `PUT/DELETE /budgets/:categoryId` |
| Recurring     | `GET/POST /recurring`, `PATCH/DELETE /recurring/:id` |
| Wallet        | `GET/POST /payment-methods`, `PATCH/DELETE /payment-methods/:id`, pagos de tarjeta |
| Metrics       | `GET /metrics/category-expenses`, `GET /metrics/savings-efficiency` |

Los aportes a metas se guardan como gastos de la categoría reservada **Ahorro**, vinculados a la meta (`goalId`). No se pueden editar ni borrar como movimientos sueltos; al eliminar la meta se eliminan y el dinero vuelve al balance.
