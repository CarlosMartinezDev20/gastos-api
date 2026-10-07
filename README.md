# Gastos Universitarios API

API REST en **NestJS** + **Prisma** + **Supabase** (PostgreSQL) para finanzas personales universitarias.

## 1. Proyecto en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **Project Settings → Database → Connection string**.
3. Copia:
   - **Transaction pooler** (puerto `6543`) → `DATABASE_URL` (+ `?pgbouncer=true`)
   - **Session pooler** (puerto `5432`) → `DIRECT_URL` (migraciones y seed)

> También funciona con PostgreSQL local: usa la misma URL en ambas, p. ej. `postgresql://postgres:postgres@localhost:5432/gastos_db`.

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

- API: `http://localhost:3001` (puerto de `PORT`; es el que usa la app por defecto)
- Swagger: `http://localhost:3001/api/docs`

Para borrar los datos y volver a crear todo desde cero (solo desarrollo):

```bash
npx prisma migrate reset --force   # aplica migraciones + seed
```

### Tests

```bash
npm test            # unitarios
npm run test:e2e    # necesita la base de datos con el seed
```

### Solo migraciones (CI / producción)

```bash
npx prisma migrate deploy
npx prisma db seed
```

## Usuarios de prueba (seed)

| Email                     | Contraseña   | Datos                                  |
|---------------------------|--------------|----------------------------------------|
| `daniela@universidad.edu` | `daniela123` | Movimientos de 6 semanas y 3 metas (una cumplida) |
| `carlos@universidad.edu`  | `carlos123`  | Pocos movimientos, 1 meta, tema oscuro |
| `nuevo@universidad.edu`   | `nuevo123`   | Cuenta vacía (primer uso)              |

El seed solo rellena cuentas sin datos, así que volver a ejecutarlo no borra lo que hayas creado.

## Seguridad

- Rate limiting: 100 req / 15 min (global); 5 req / 5 min en auth
- Helmet, CORS, JWT, bcrypt, ValidationPipe global

## Endpoints

| Módulo        | Rutas |
|---------------|-------|
| Auth          | `POST /auth/register`, `POST /auth/login` |
| Users         | `GET/PATCH /users/profile` |
| Categories    | `GET/POST /categories` |
| Transactions  | `GET/POST /transactions`, `PATCH/DELETE /transactions/:id`, `GET /transactions/balance` |
| Savings Goals | `GET/POST /savings-goals`, `PATCH/DELETE /savings-goals/:id`, `POST /savings-goals/:id/add-funds` |

Los aportes a metas se guardan como gastos de la categoría reservada **Ahorro**, vinculados a la meta (`goalId`). No se pueden editar ni borrar como movimientos sueltos; al eliminar la meta se eliminan y el dinero vuelve al balance.
| Metrics       | `GET /metrics/category-expenses`, `GET /metrics/savings-efficiency` |

## Supabase Dashboard

Tras el seed puedes revisar tablas en **Table Editor**: `User`, `Category`, `Transaction`, `SavingsGoal`.
