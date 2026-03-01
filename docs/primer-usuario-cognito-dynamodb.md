# Crear el primer usuario (Cognito + DynamoDB)

Guía para crear el primer usuario manualmente en AWS Cognito y en la tabla DynamoDB, sin usar el flujo de invitación.

---

## Parte 1: Crear el usuario en Cognito

1. **Entrá a la consola de AWS** → **Cognito** → **User pools**.

2. **Abrí el User pool** que usa tu app (el que está configurado en el stack CDK; su nombre suele ser algo como `renova-tu-ludoteca-back-UsersPool...` o similar).

3. **Crear usuario**  
   - Pestaña **Users** → **Create user**.

4. **Completar el formulario** (modo "Create user"):
   - **Username**: elegí **Send an email invitation** o **Provide a temporary password**.
     - Si elegís **Send an email invitation**: Cognito enviará un mail con link para establecer contraseña (el usuario debe tener ese email).
     - Si elegís **Provide a temporary password**: poné una contraseña temporal (mínimo 8 caracteres, mayúscula, minúscula, número; el usuario la cambia en el primer login).
   - **Temporary password** (si no usás invitación por email): por ejemplo `TempPass123`.
   - **Email address**: el email del primer usuario (ej. `admin@tudominio.com`).
   - **Mark email as verified**: marcá **Yes** para que no pida verificación.
   - **Name** (opcional en Cognito): podés poner el nombre completo; en DynamoDB lo desglosamos en `firstName` y `lastName`.

5. **Create user**.

6. **Anotar el `sub` (User ID)**  
   - En la lista de Users, hacé clic en el usuario recién creado.  
   - En **Attribute** buscá **sub**.  
   - **Copiá ese valor** (es un UUID tipo `a1b2c3d4-e5f6-7890-abcd-ef1234567890`). Lo vas a usar en DynamoDB.

7. **Asignar el grupo `normal`**  
   - En el mismo User pool → pestaña **Groups**.  
   - Si no existe, **Create group** → Name: `normal` → Create.  
   - Volvé a **Users** → abrí el usuario → **Add user to group** → elegí **normal** → Add.

---

## Parte 2: Crear el perfil en DynamoDB

La app espera un perfil en la **misma tabla** donde están usuarios e invitaciones. Sin este ítem, el login puede funcionar pero la app fallará al cargar datos del usuario.

1. **Entrá a la consola de AWS** → **DynamoDB** → **Tables**.

2. **Abrí la tabla** `renova-users` (es el `tableName` definido en el stack).

3. **Create item** (crear item).

4. **Formato del item**  
   DynamoDB pide cada atributo con su **tipo**. Usá exactamente estos nombres y tipos:

   | Atributo   | Tipo   | Valor (ejemplo / qué poner)                          |
   |------------|--------|------------------------------------------------------|
   | `pk`       | String | `USER#` + el **sub** de Cognito (ej. `USER#a1b2c3d4-e5f6-7890-abcd-ef1234567890`) |
   | `sk`       | String | El **mismo** que `pk` (ej. `USER#a1b2c3d4-e5f6-7890-abcd-ef1234567890`) |
   | `userId`   | String | El **sub** de Cognito (sin el prefijo `USER#`)       |
   | `dni`      | String | DNI del usuario (ej. `12345678`)                     |
   | `firstName`| String | Nombre (ej. `María`)                                 |
   | `lastName` | String | Apellido (ej. `García`)                              |
   | `email`    | String | **Mismo email** que en Cognito (ej. `admin@tudominio.com`) |
   | `phone`    | String | Teléfono (ej. `+54 11 1234-5678`)                     |
   | `address`  | String | Dirección (ej. `Av. Corrientes 1234`)                 |
   | `city`     | String | Ciudad (ej. `CABA`)                                  |
   | `province` | String | Provincia (ej. `Buenos Aires`)                        |
   | `role`     | String | `normal`                                              |
   | `createdAt`| String | Fecha/hora en ISO 8601 (ej. `2025-02-28T12:00:00.000Z`) |

   **Opcional** (podés omitirlo si no querés):
   - `postalCode` (String): código postal.

5. **Cómo cargar cada campo en la consola**  
   - Para cada fila: en **Partition key** solo va `pk` (y en **Sort key** solo va `sk` la primera vez que definís las claves; al crear item ya está fijo que PK es `pk` y SK es `sk`).  
   - En el formulario de "Add new attribute":
     - Tipo **String** para todos los de la tabla.
     - Nombre exacto: `pk`, `sk`, `userId`, `dni`, `firstName`, `lastName`, `email`, `phone`, `address`, `city`, `province`, `role`, `createdAt` (y `postalCode` si lo usás).

6. **Save** (Guardar).

---

## Resumen de valores a tener a mano

Antes de crear el ítem en DynamoDB necesitás:

- **sub** de Cognito (lo copiaste en la Parte 1, paso 6).
- Datos del usuario: nombre, apellido, DNI, email (igual al de Cognito), teléfono, dirección, ciudad, provincia. Opcional: código postal.

Ejemplo de `pk` y `sk`: si el sub es `a1b2c3d4-e5f6-7890-abcd-ef1234567890`, entonces:
- `pk` = `USER#a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- `sk` = `USER#a1b2c3d4-e5f6-7890-abcd-ef1234567890`

---

## Probar

1. En la app, ir a **Iniciar sesión**.
2. Usar el **email** del usuario y la **contraseña** (la temporal si elegiste esa opción; Cognito puede pedir cambiarla en el primer login).
3. La app debería cargar el perfil desde DynamoDB y funcionar con normalidad.
