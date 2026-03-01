# renova-tu-ludoteca-back

Backend para la web Renova tu Ludoteca. Incluye:

- **Stack CDK (RenovaTuLudotecaBackStack)**: gestiona solo **Cognito** (User Pool y App Client). La API en Express y el frontend usan estos valores para autenticación.
- **Servidor Express** en `src/`: API REST con Node, Drizzle + PostgreSQL y validación JWT con Cognito. Pensado para desplegar en EC2. Ver **Deploy en EC2** y [docs/postgresql-ec2.md](docs/postgresql-ec2.md).

La API en producción es la que corre en **Express en EC2** (no Lambda ni API Gateway). Lambdas, API Gateway y DynamoDB fueron eliminados tras la migración a Express + PostgreSQL.

## Stack CDK (solo Cognito)

- **Cognito**: User Pool `renova-ludoteca-users`, grupos `normal` y `premium`, App Client `renova-web-client`.

## Requisitos

- Node.js 18+
- AWS CLI configurado con el perfil por defecto (`aws sts get-caller-identity`)

## Despliegue del stack Cognito

1. **Primera vez en la cuenta/región** (solo una vez):

   ```bash
   npx cdk bootstrap
   ```

2. **Instalar dependencias y desplegar**:

   ```bash
   npm install
   npx cdk deploy RenovaTuLudotecaBackStack
   ```

   Acepta los cambios cuando lo pida. Los outputs son: `UserPoolId`, `UserPoolClientId`.

## Variables para el frontend y la API

Después de `cdk deploy`, usa estos valores:

| Variable | Descripción | Dónde obtenerla |
|----------|-------------|------------------|
| `NEXT_PUBLIC_API_URL` | Base URL de la API | URL de tu API en EC2 (ej. `https://api.renovatuludoteca.com` o la IP/DNS de la instancia) |
| `NEXT_PUBLIC_USER_POOL_ID` | Cognito User Pool ID | Output **UserPoolId** del stack |
| `NEXT_PUBLIC_USER_POOL_CLIENT_ID` | Cognito App Client ID | Output **UserPoolClientId** del stack |

En el servidor Express (EC2): `COGNITO_USER_POOL_ID`, `COGNITO_USER_POOL_CLIENT_ID` (y opcionalmente `COGNITO_REGION`). Las peticiones autenticadas envían el JWT de Cognito en el header `Authorization: Bearer <token>`.

## Deploy en EC2

Si usás el stack **RenovaEC2Stack** (instancia con Node, Nginx, PM2, PostgreSQL):

1. Desplegar infra: `npx cdk deploy RenovaEC2Stack`.
2. En la EC2: crear base y usuario PostgreSQL; ver [docs/postgresql-ec2.md](docs/postgresql-ec2.md).
3. Deploy de la app: `./scripts/deploy-ec2.sh` (clona o actualiza el repo en la instancia, `npm ci`, `npm run build`, PM2 con `dist/server.js`).

Variables en el servidor: `DATABASE_URL`, `COGNITO_USER_POOL_ID`, y opcionalmente `COGNITO_REGION`.

## Comandos útiles

- `npm run build` – Compilar el servidor Express (TypeScript → `dist/`)
- `npm run build:cdk` – Compilar CDK (`bin/`, `lib/`)
- `npx cdk synth` – Generar CloudFormation
- `npx cdk deploy RenovaTuLudotecaBackStack` – Desplegar el stack Cognito
- `npx cdk diff` – Ver diferencias con el stack desplegado
- `npx cdk destroy` – Eliminar el stack (¡cuidado en producción!)

## Esquema de la base de datos

El esquema de referencia es el de **PostgreSQL** definido con Drizzle en **`src/db/schema/`**. Ver [docs/database.md](docs/database.md) para más detalle (incluye referencia legacy a DynamoDB ya no usada).

**Migraciones (Drizzle):**

- `npm run db:generate` – Genera una migración en `drizzle/` a partir de los cambios en el esquema.
- Aplicar cambios:
  - **Con migraciones:** ejecutar los SQL generados contra tu base (o usar el comando que tengas para correr migraciones).
  - **Sin migraciones (desarrollo):** `npx drizzle-kit push` sincroniza el esquema con la base (útil para probar; en producción conviene usar migraciones).

## Estructura del proyecto

```
bin/renova-tu-ludoteca-back.ts
lib/renova-tu-ludoteca-back-stack.ts   # Solo Cognito
src/                                    # Servidor Express (API + Drizzle + PostgreSQL)
docs/
  database.md
  postgresql-ec2.md
```

El deploy del stack usa el **perfil por defecto** de AWS.
