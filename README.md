# renova-tu-ludoteca-back

Backend para la web Renova tu Ludoteca: API REST sobre AWS (CDK, Lambda, DynamoDB, Cognito, Algolia).

## Stack

- **API**: API Gateway HTTP API con rutas bajo `/api/*`
- **Lambdas**: Node.js 20 (games, offers, meetups)
- **DynamoDB**: Tablas `renova-games`, `renova-offers`, `renova-meetups`, `renova-session-participants`
- **Auth**: Cognito User Pool con grupos `normal` y `premium`
- **Búsqueda**: Algolia para el índice de juegos (credenciales en Secrets Manager)

## Requisitos

- Node.js 18+
- AWS CLI configurado con el perfil por defecto (`aws sts get-caller-identity`)
- Cuenta Algolia (para búsqueda de juegos)

## Despliegue

1. **Primera vez en la cuenta/región** (solo una vez):

   ```bash
   npx cdk bootstrap
   ```

2. **Instalar dependencias y desplegar**:

   ```bash
   npm install
   npx cdk deploy
   ```

   Acepta los cambios cuando lo pida. Al final verás los outputs: `ApiUrl`, `UserPoolId`, `UserPoolClientId`.

3. **Custom domain y Route 53** (opcional): Si en `cdk.json` (context) tenés `apiDomainName` y `apiCertificateArn`, el stack crea un custom domain en API Gateway y una **Hosted Zone en Route 53** para el dominio base, más un CNAME `api` → API Gateway. Para que el DNS use Route 53:
   - Tras el deploy, en los outputs aparece **Route53Nameservers** (4 nombres separados por coma).
   - En **DonWeb** → dominio renovatuludoteca.com → pestaña **NS Y REGISTROS DNS** → **Editar nameservers**.
   - Reemplazá los nameservers actuales por los 4 de Route 53 (uno por línea o como pida DonWeb). Guardá.
   - La propagación puede tardar hasta 24–48 h (en la práctica suele ser menos).
   - **Validación del certificado ACM**: si el certificado estaba en "Pending validation", en **Route 53** (consola AWS → Route 53 → tu hosted zone) agregá el registro CNAME que indica ACM (mismo nombre y valor que antes en DonWeb). Cuando ACM valide, el certificado pasará a "Issued".
   - Coste: Route 53 cobra ~0,50 USD/mes por hosted zone.

4. **Algolia** (opcional): Para activar la sincronización de juegos con Algolia, actualiza el secreto en AWS:

   - Consola AWS → Secrets Manager → secreto `renova/algolia`
   - Editar y poner el JSON con tus credenciales, por ejemplo:
     ```json
     {
       "ALGOLIA_APP_ID": "TU_APP_ID",
       "ALGOLIA_API_KEY": "TU_API_KEY_ADMIN"
     }
     ```
   - Crea en Algolia un índice llamado `games`. La Lambda de games indexa/actualiza/borra objetos ahí al crear/editar/eliminar juegos.

## Variables para el frontend

Después de `cdk deploy`, usa estos valores en tu app (por ejemplo en `.env.local` o en la config de Cognito/API):

| Variable | Descripción | Dónde obtenerla |
|----------|-------------|------------------|
| `NEXT_PUBLIC_API_URL` | Base URL de la API | Output **ApiUrl** (ej. `https://xxxx.execute-api.us-east-1.amazonaws.com`) |
| `NEXT_PUBLIC_USER_POOL_ID` | Cognito User Pool ID | Output **UserPoolId** |
| `NEXT_PUBLIC_USER_POOL_CLIENT_ID` | Cognito App Client ID | Output **UserPoolClientId** |

En el frontend, las peticiones a la API deben enviar el JWT de Cognito en el header:

```
Authorization: Bearer <idToken o accessToken>
```

Para rutas públicas (GET `/api/games`, GET `/api/games/{id}`, GET `/api/meetups`, GET `/api/meetups/{id}`) no hace falta token.

## Rutas de la API

- **Games**: `GET/POST /api/games`, `GET/PUT/DELETE /api/games/{id}`. Query `?sellerId=xxx` en GET lista juegos por vendedor.
- **Offers**: `GET/POST /api/offers`, `GET/PUT/DELETE /api/offers/{id}`. Query `?gameId=xxx` en GET lista ofertas de un juego.
- **Meetups**: `GET/POST /api/meetups`, `GET/PUT/DELETE /api/meetups/{id}`, `POST/DELETE /api/meetups/{id}/participants` (unirse / abandonar).

Rutas que requieren autenticación usan el autorizador JWT de Cognito (token en `Authorization`).

## Comandos útiles

- `npm run build` – Compilar TypeScript (CDK)
- `npx cdk synth` – Generar CloudFormation
- `npx cdk deploy` – Desplegar el stack
- `npx cdk diff` – Ver diferencias con el stack desplegado
- `npx cdk destroy` – Eliminar el stack (¡cuidado en producción!)

## Esquema de la base de datos

La definición explícita de tablas, claves e índices está en **[docs/database.md](docs/database.md)**. Los tipos TypeScript que reflejan ese esquema están en **lambdas/shared/schema.ts** (GameItem, OfferItem, MeetupItem, SessionParticipantItem).

## Estructura del proyecto

Una **Lambda por operación**. Cada dominio (games, offers, meetups) está organizado en capas:

```
bin/renova-tu-ludoteca-back.ts
lib/renova-tu-ludoteca-back-stack.ts
docs/
  database.md          # Esquema explícito de DynamoDB (tablas, columnas, GSI)
lambdas/
  shared/
    api.ts             # jsonResponse, getUserId, parseBody, errorToResponse
    errors.ts          # AppError, UnauthorizedError, NotFoundError, etc.
    schema.ts          # Tipos: GameItem, OfferItem, MeetupItem, SessionParticipantItem
    validation.ts      # validateBody, validateBodyOptional, requirePathParam, optionalQueryParam
    utils.ts           # uuid
  games/
    validators.ts      # createGameSchema, updateGameSchema (Zod)
  games/
    handlers/          # Entrada de cada Lambda (list, get, create, update, delete)
    repositories/      # game.repository.ts — acceso DynamoDB
    services/          # game.service.ts (reglas de negocio), algolia.service.ts
  offers/
    handlers/
    repositories/      # offer.repository.ts
    services/          # offer.service.ts
  meetups/
    handlers/
    repositories/      # meetup.repository.ts, participant.repository.ts
    services/          # meetup.service.ts
```

El deploy usa el **perfil por defecto** de AWS; no hace falta configurar `AWS_PROFILE` si ya usas ese perfil.
