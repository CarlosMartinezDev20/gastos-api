# Backups de la base de datos (Supabase, plan gratuito)

El plan gratuito de Supabase no ofrece backups descargables ni PITR. `backup.sh` hace uno con `pg_dump`, cifrado con una **clave pública GPG**: quien lo genera (un servidor, GitHub Actions) solo puede cifrar, y para descifrar hace falta tu clave privada, que nunca sale de tu equipo.

Cada backup (`appgastos-<fecha>.tar.gpg`) contiene:

- `app.dump`: el esquema `public` (tablas de Prisma y datos), en formato custom de `pg_restore`.
- `auth.dump`: los datos de `auth.users` y `auth.identities`, es decir, las cuentas con su id y el hash de la contraseña. Sin ellos, los perfiles restaurados no coincidirían con ninguna cuenta.

Se probó contra producción: el archivo se descifra y `pg_restore --list` muestra las 9 tablas y los datos de `auth`.

## 1. Preparación (una sola vez)

### Clave GPG de backups (en tu equipo)

```bash
gpg --quick-gen-key "AppGastos backups <TU_CORREO>" default default never
gpg --armor --export "TU_CORREO" > appgastos-backup-public.asc        # pública: va al servidor
gpg --armor --export-secret-keys "TU_CORREO" > appgastos-backup-PRIVADA.asc
```

Guarda `appgastos-backup-PRIVADA.asc` y su frase de paso **fuera del ordenador** (gestor de contraseñas o USB cifrado). Si la pierdes, ningún backup se puede abrir. Nunca la subas a git ni a GitHub.

### Usuario de solo lectura para backups (recomendado)

Así el secreto que vive en GitHub no permite modificar nada. Ejecútalo una vez en el SQL Editor de Supabase, con una contraseña larga generada por ti:

```sql
create role backup_reader login password 'GENERA_UNA_LARGA' bypassrls;
grant usage on schema public, auth to backup_reader;
grant select on all tables in schema public to backup_reader;
grant select on auth.users, auth.identities to backup_reader;
alter default privileges in schema public grant select on tables to backup_reader;
```

`bypassrls` hace falta porque todas las tablas tienen RLS sin políticas. La URL queda así (Session pooler, puerto 5432):

```
postgresql://backup_reader.gxgjbcywdsiguxfblyof:<contraseña>@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

> Este rol no está creado: es un paso manual opcional. Mientras no exista, se puede usar la `DIRECT_URL` de `~/.config/appgastos/supabase.env` (usuario `postgres`), pero esa tiene permisos de escritura.

## 2. Automatizar: GitHub Actions en un repositorio **privado** (gratis)

`gastos-api` es público: los artefactos de Actions de un repo público los puede descargar cualquiera con cuenta de GitHub. Aunque estén cifrados, conviene usar un repo **privado** aparte, por ejemplo `appgastos-backups` (2 000 minutos/mes gratis; cada backup tarda menos de un minuto).

1. Crea el repo privado y copia en él `backup.sh`.
2. En *Settings → Secrets and variables → Actions* añade:
   - `BACKUP_DB_URL`: la URL de `backup_reader`.
   - `BACKUP_GPG_PUBLIC_KEY`: el contenido de `appgastos-backup-public.asc`.
   - `BACKUP_GPG_RECIPIENT`: `TU_CORREO`.
3. Crea `.github/workflows/backup.yml`:

```yaml
name: Backup diario
on:
  schedule:
    - cron: '0 8 * * *'   # 02:00 en El Salvador (UTC-6)
  workflow_dispatch:
permissions:
  contents: read
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Cliente de PostgreSQL 17 (igual o más nuevo que el servidor)
        run: |
          sudo install -d /usr/share/postgresql-common/pgdg
          sudo curl -fsSo /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc
          echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list
          sudo apt-get update -qq && sudo apt-get install -y -qq postgresql-client-17
      - name: Clave pública
        run: echo "$KEY" | gpg --batch --import
        env:
          KEY: ${{ secrets.BACKUP_GPG_PUBLIC_KEY }}
      - name: Backup cifrado
        run: PATH=/usr/lib/postgresql/17/bin:$PATH ./backup.sh
        env:
          BACKUP_DB_URL: ${{ secrets.BACKUP_DB_URL }}
          BACKUP_GPG_RECIPIENT: ${{ secrets.BACKUP_GPG_RECIPIENT }}
          BACKUP_DIR: out
      - uses: actions/upload-artifact@v4
        with:
          name: appgastos-backup-${{ github.run_id }}
          path: out/*.tar.gpg
          retention-days: 30
```

Retención: 30 días de backups diarios en artefactos, gratis. Para guardar más tiempo, descarga uno al mes a tu equipo o súbelo a Google Drive o OneDrive con `rclone` (también gratis). Va cifrado, así que el proveedor no puede leerlo.

**Alternativa sin GitHub:** un `cron` o un timer de systemd en tu propio equipo que ejecute `backup.sh` y guarde en `~/backups/appgastos`. Solo funciona si el equipo está encendido.

## 3. Restaurar (probarlo al menos una vez)

```bash
gpg -d appgastos-<fecha>.tar.gpg | tar -xf -        # pide tu frase de paso
# En un proyecto Supabase NUEVO o vacío (nunca encima de producción sin pensarlo):
pg_restore --no-owner --no-privileges -d "<URL session pooler del destino>" app.dump
pg_restore --data-only --disable-triggers -d "<URL del destino>" auth.dump
```

Para la API, la vía más limpia es aplicar antes las migraciones de Prisma (`npx prisma migrate deploy`) en el proyecto nuevo y luego restaurar solo datos (`pg_restore --data-only`).

Una vez al trimestre, restaura el último backup en una base local (`createdb restore_test`) y comprueba que las filas cuadran. Un backup que nunca se probó no cuenta.
