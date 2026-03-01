# PostgreSQL en EC2 (RenovaEC2Stack)

La instancia EC2 creada por el stack **RenovaEC2Stack** tiene PostgreSQL 15 instalado por User Data. Para que la API Express use la base de datos, hay que crear la base y un usuario, y configurar `DATABASE_URL` en el servidor.

PostgreSQL está configurado para escuchar **solo en 127.0.0.1** (localhost) en la EC2. El puerto 5432 no está abierto en el Security Group, así que la base no es accesible desde internet. La API (PM2) y Postgres conviven en la misma máquina y se conectan por `localhost:5432`.

## 1. Conectarte por SSH a la EC2

```bash
ssh -i ~/.ssh/renova-ec2-deploy.pem ec2-user@<IP_EC2>
```

(La IP la ves en los outputs del stack o en la consola EC2.)

### Hacer que Postgres escuche solo en localhost (instancia ya existente)

Si la EC2 se creó antes de que el stack incluyera esta configuración, hay que aplicarla a mano. La ruta del data directory puede ser `/var/lib/pgsql/15/data` o `/var/lib/pgsql/data` según la instalación. Para obtener la ruta real, entrá a psql y consultá:

```bash
sudo -u postgres psql -c "SHOW data_directory;"
```

Copiá la ruta que muestre (ej. `/var/lib/pgsql/data`). Luego, en la EC2:

```bash
# Reemplazá <DATA_DIR> por la ruta que te dio SHOW data_directory (ej. /var/lib/pgsql/data)
sudo sed -i -E "s/^#?listen_addresses = .*/listen_addresses = 'localhost'/" <DATA_DIR>/postgresql.conf
sudo systemctl restart postgresql
```

O en un solo paso, usando la ruta que devuelve Postgres:

```bash
PGDATA=$(sudo -u postgres psql -t -c "SHOW data_directory;" | xargs)
sudo sed -i -E "s/^#?listen_addresses = .*/listen_addresses = 'localhost'/" "$PGDATA/postgresql.conf"
sudo systemctl restart postgresql
```

El mensaje "could not change directory to /home/ec2-user": Permission denied al usar `sudo -u postgres psql` es inofensivo; no afecta a Postgres.

### Trabajo local: túnel SSH a la base en EC2

Para usar la base de datos que está en la EC2 desde tu máquina (por ejemplo para `npm run db:push`, Drizzle Studio o un cliente SQL), abrí un túnel SSH que reenvía el puerto 5432:

```bash
ssh -i ~/.ssh/renova-ec2-deploy.pem -L 5432:127.0.0.1:5432 ec2-user@<IP_EC2>
```

Dejá esa sesión abierta. En tu máquina configurá:

```bash
export DATABASE_URL="postgresql://renova:tu_password_seguro@localhost:5432/renova"
```

Así, cuando tu app o Drizzle se conecten a `localhost:5432`, el tráfico va por el túnel a la EC2 y llega al Postgres que escucha en 127.0.0.1. No hace falta cambiar código; solo usar esa `DATABASE_URL` mientras el túnel está activo.

## 2. Crear la base y el usuario en PostgreSQL

En la EC2, ejecutá:

```bash
sudo -u postgres psql
```

Dentro de `psql`:

```sql
CREATE USER renova WITH PASSWORD 'tu_password_seguro';
CREATE DATABASE renova OWNER renova;
\q
```

### Permitir que el usuario `renova` use contraseña (evitar "Ident authentication failed")

Por defecto Postgres suele usar `peer` para conexiones locales y rechaza la contraseña. Para que la app y Drizzle (incluso por túnel) puedan conectarse como `renova` con contraseña, en la EC2 agregá una línea en `pg_hba.conf`:

```bash
# En la EC2; la ruta del data dir puede ser /var/lib/pgsql/data (ver SHOW data_directory; en psql)
echo "host renova renova 127.0.0.1/32 scram-sha-256" | sudo tee -a /var/lib/pgsql/data/pg_hba.conf
sudo systemctl restart postgresql
```

Si tu data directory es otro (ej. `/var/lib/pgsql/15/data`), usá esa ruta en lugar de `/var/lib/pgsql/data`.

## 3. Ejecutar migraciones (tablas) en la EC2

Desde tu máquina (o desde la EC2 si clonaste el repo):

- En la EC2, en el directorio del proyecto (`/var/app/renova-tu-ludoteca-back` después del deploy):

```bash
export DATABASE_URL="postgresql://renova:tu_password_seguro@localhost:5432/renova"
npm run db:push
```

Eso crea las tablas en la base `renova` usando Drizzle.

## 4. Configurar DATABASE_URL para PM2

La app lee `DATABASE_URL` del entorno. Opciones:

**A) Archivo `.env` en el servidor (no subir a git)**

En la EC2, en `/var/app/renova-tu-ludoteca-back`:

```bash
echo 'DATABASE_URL="postgresql://renova:tu_password_seguro@localhost:5432/renova"' > .env
echo '.env' >> .gitignore
```

Y arrancar PM2 cargando ese archivo (por ejemplo con `pm2 start dist/server.js --name renova-api`; si usás `dotenv`, la app carga `.env` al iniciar).

**B) Variables de entorno al arrancar PM2**

```bash
DATABASE_URL="postgresql://renova:..." pm2 start dist/server.js --name renova-api
# o
pm2 start dist/server.js --name renova-api --update-env -- DATABASE_URL="postgresql://..."
```

**C) ecosystem.config.js** (en el repo o solo en el servidor) con `env: { DATABASE_URL: "..." }`.

## 5. Cognito en el servidor

La app también necesita, para validar JWT:

- `COGNITO_USER_POOL_ID`: ID del User Pool (mismo que usa el front).
- `COGNITO_REGION` (opcional si ya tenés `AWS_REGION`).

Podés añadirlos al mismo `.env` o a las variables de PM2.

## Resumen

1. SSH a la EC2.
2. Crear usuario y base en PostgreSQL (`create user`, `create database`).
3. En el servidor, `export DATABASE_URL=...` y `npm run db:push`.
4. Configurar `DATABASE_URL` (y opcionalmente Cognito) para el proceso que corre la app (PM2 o ecosystem).
5. Reiniciar la app: `pm2 restart renova-api`.

Para trabajar desde tu máquina contra la base en EC2: usar el túnel SSH (`-L 5432:127.0.0.1:5432`) y `DATABASE_URL` con `localhost:5432`.
