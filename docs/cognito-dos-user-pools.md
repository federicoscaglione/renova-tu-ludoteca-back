# Por qué pueden aparecer dos User Pools con el mismo nombre

Si ves dos User Pools llamados `renova-ludoteca-users` en Cognito, es por cómo trabaja CDK/CloudFormation con **reemplazo** de recursos y **RemovalPolicy.RETAIN**.

## Cuál usar

- **El que usa tu stack (deploy actual)** es el que tiene **Last updated** más reciente (el que se actualizó en el último deploy).
- El otro es un pool “viejo” que quedó retenido cuando CloudFormation creó uno nuevo.

En la consola de Cognito, el **User pool ID** del activo es el que está asociado al stack (por ejemplo el que aparece en los Outputs del stack: `UserPoolId` / export `RenovaUserPoolId`).

## Por qué se creó un segundo pool

En CDK el User Pool **no tiene un ID físico fijo** (a diferencia de las tablas DynamoDB que usan `tableName: "renova-users"`). CloudFormation lo identifica por un **logical ID** (ej. `UserPool6BA7E5F2`). Si algo hace que ese recurso se **reemplace**:

1. CloudFormation **crea un nuevo** User Pool.
2. Como el pool tiene `removalPolicy: cdk.RemovalPolicy.RETAIN`, el **viejo no se borra**.
3. Resultado: dos pools con el mismo nombre; el stack usa solo el nuevo.

Causas típicas de reemplazo:

- **Cambio en el logical ID del recurso**: por ejemplo renombrar el construct de `"UsersPool"` a `"UserPool"` en el código.
- **Cambio de propiedades que exigen reemplazo en Cognito**: por ejemplo `signInAliases`, `standardAttributes`, `schema`, etc.
- **Stack recreado**: si en algún momento se eliminó y volvió a crear el stack (el pool viejo se retuvo por RETAIN).

## Qué hacer

- **Usar siempre el pool del deploy reciente** (el que tiene Last updated reciente y/o el que figura en los Outputs del stack).
- Para el **primer usuario**, crear usuario y grupo en **ese** pool y el ítem en DynamoDB como en `primer-usuario-cognito-dynamodb.md`.
- El pool viejo podés **borrarlo desde la consola de Cognito** si ya no lo usás (atención: no tiene vuelta atrás).

## Evitar un tercer pool en el futuro

- Evitá cambiar propiedades del User Pool que CloudFormation marque como “replacement” (en los cambios del stack).
- No renombrar el construct del pool en CDK (el segundo parámetro de `new cognito.UserPool(this, "UserPool", ...)`).
