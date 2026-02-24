# Esquema de base de datos (DynamoDB)

Definición explícita de tablas, claves e índices. Los tipos TypeScript están en `lambdas/shared/schema.ts` y deben mantenerse alineados con este documento.

---

## Tabla: `renova-games`

| Atributo    | Tipo    | Descripción                          |
|------------|---------|--------------------------------------|
| gameId     | string  | PK. Identificador único del juego.   |
| title      | string  | Título.                              |
| description| string  | Descripción.                         |
| condition  | string  | Uno de: `Nuevo`, `Como nuevo`, `Usado`, `Coleccionista`. |
| price      | number  | Precio.                              |
| location   | string  | Ubicación.                           |
| sellerId   | string  | Cognito `sub` del vendedor.          |
| tags       | list S  | Lista de etiquetas.                  |
| images     | list S  | URLs de imágenes.                    |
| createdAt  | string  | ISO 8601.                            |

**Claves:**
- **Partition key:** `gameId` (String)

**GSI:**
- **bySeller:** PK `sellerId` (String), SK `createdAt` (String) — listar juegos por vendedor.

---

## Tabla: `renova-offers`

| Atributo | Tipo   | Descripción                          |
|----------|--------|--------------------------------------|
| offerId  | string | PK. Identificador único de la oferta.|
| gameId   | string | Referencia al juego.                 |
| buyerId  | string | Cognito `sub` del comprador.         |
| sellerId | string | Cognito `sub` del vendedor.          |
| price    | number | Precio ofertado.                     |
| message  | string | Mensaje opcional.                    |
| status   | string | `pending`, `accepted`, `rejected`, `completed`. |
| createdAt| string | ISO 8601.                            |

**Claves:**
- **Partition key:** `offerId` (String)

**GSI:**
- **byGame:** PK `gameId` (String), SK `createdAt` (String) — listar ofertas por juego.

---

## Tabla: `renova-meetups`

| Atributo   | Tipo   | Descripción                          |
|------------|--------|--------------------------------------|
| sessionId  | string | PK. Identificador único del meetup.  |
| title      | string | Título.                              |
| game       | list S | Nombres de juegos.                   |
| location   | string | Ubicación.                           |
| dateTime   | string | Fecha/hora (ISO 8601 o string).      |
| organizerId| string | Cognito `sub` del organizador.       |
| maxPlayers | number | Máximo de participantes.             |
| description| string | Descripción.                         |
| createdAt  | string | ISO 8601.                            |

**Claves:**
- **Partition key:** `sessionId` (String)

---

## Tabla: `renova-session-participants`

| Atributo | Tipo   | Descripción                          |
|----------|--------|--------------------------------------|
| sessionId| string | PK. Referencia al meetup.            |
| userId   | string | SK. Cognito `sub` del participante.  |
| joinedAt | string | ISO 8601.                            |

**Claves:**
- **Partition key:** `sessionId` (String)
- **Sort key:** `userId` (String)

**GSI:**
- **byUser:** PK `userId` (String), SK `joinedAt` (String) — listar meetups por usuario.
