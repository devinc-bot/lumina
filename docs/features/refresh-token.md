# Refresh Token y Sesiones

## Estado actual

La API reserva la ruta `POST /api/auth/refresh` en `API_ROUTES`, pero la rama actual no expone un controlador ni un caso de uso que la atienda. Por lo tanto, un cliente no debe intentar renovar tokens contra ese endpoint todavía: recibirá una respuesta de ruta no encontrada.

El repositorio contiene la base de persistencia `account_sessions` y las operaciones de rotación y revocación. Esta guía describe ese contrato para completar o revisar la integración sin asumir que el endpoint ya está disponible.

## Objetivo

El refresh token permite emitir access tokens de vida corta sin obligar al usuario a iniciar sesión repetidamente. El servidor debe almacenar solamente un hash del secreto de refresh y debe poder revocar una sesión individual o todas las sesiones de una cuenta.

## Modelo de sesión

La tabla `account_sessions` conserva múltiples sesiones por cuenta y aplicación cliente. El repositorio limita las sesiones activas a siete por cuenta, sin distinguir la app en ese límite.

| Campo                 | Uso                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `documentId`          | Identificador público de la sesión. Debe viajar en contratos, no el `id` interno.           |
| `clientApp`           | Aísla las sesiones de `web`, `dashboard` y `admin`.                                         |
| `refreshTokenHash`    | Hash persistido del secreto; nunca se devuelve al cliente.                                  |
| `refreshTokenVersion` | Versión para rotación atómica y detección de replay.                                        |
| `expiresAt`           | Límite de renovación de la sesión.                                                          |
| `revokedAt`           | Marca la revocación lógica de flujos no gestionados; la limpieza posterior elimina la fila. |
| Metadatos             | IP, dispositivo, user-agent y ubicación aproximada para auditoría.                          |

## Operaciones disponibles en persistencia

`packages/db/src/repositories/auth/account-sessions.ts` contiene las operaciones que debe usar la capa de aplicación:

| Operación                                     | Comportamiento                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `createAccountSession`                        | Serializa por cuenta y revoca las sesiones activas más antiguas cuando supera el límite configurado.            |
| `rotateAccountSession`                        | Reemplaza hash, versión y expiración solo si coinciden la versión y el hash esperados y la sesión sigue activa. |
| `revokeAccountSessionForReplay`               | Revoca una sesión cuando se presenta una versión anterior autenticada.                                          |
| `revokeAccountSession`                        | Revoca una sesión al cerrar sesión con una credencial válida.                                                   |
| `revokeManagedAccountSession`                 | Elimina físicamente otra sesión activa no actual de la misma cuenta y app.                                      |
| `revokeAccountSessionsForPasswordReset`       | Revoca las sesiones activas después de cambiar la contraseña.                                                   |
| `deleteExpiredOrRevokedAccountSessionsBefore` | Elimina sesiones terminales cuando alcanzan el cutoff inclusivo de retención.                                   |

El límite de siete sesiones activas está definido actualmente como `MAXIMUM_ACTIVE_ACCOUNT_SESSIONS` en el repositorio; no es una configuración de entorno.

La revocación desde Settings elimina físicamente una sesión activa elegible que no es la actual. Los demás flujos de revocación usan `revokedAt`; sus filas se retienen siete días desde su timestamp terminal y `AccountSessionCleanupScheduler` las elimina cada catorce días.

## Flujo que debe implementar el endpoint

1. El cliente envía únicamente su refresh token mediante una cookie `HttpOnly`; no debe enviarlo en JSON, query string ni logs.
2. El controlador identifica la aplicación cliente desde el origen y la cookie correspondiente, no desde un valor libre proporcionado por el body.
3. La API valida primero la integridad criptográfica del token antes de consultar la base de datos.
4. La API lee la sesión por `documentId` y `clientApp`.
5. Si el hash y la versión son los esperados, llama a `rotateAccountSession` y emite un nuevo access token y refresh token.
6. Si una versión anterior supera la validación criptográfica, llama a `revokeAccountSessionForReplay` y rechaza la petición.
7. Si el token falta, venció, fue revocado o no puede rotarse, la API rechaza la renovación y el cliente limpia su estado local.

## Reglas de seguridad

- El access token actual dura un día (`ACCESS_TOKEN_TTL = '1d'`). Al habilitar refresh, reduce ese TTL para limitar la ventana de uso tras una revocación remota.
- No persistas ni registres el refresh token sin hash.
- Una rotación debe ser atómica. No hagas un `SELECT` seguido de un `UPDATE` sin los predicados de hash, versión, app, revocación y expiración.
- Extiende el JWT con `sessionDocumentId` antes de habilitar la gestión de sesiones; el JWT actual solo contiene `sub`, `email` y `role`.
- Mantén el refresh token aislado por app. Una cookie de `web` no debe renovar una sesión de `dashboard` o `admin`.
- El reset de contraseña actual no revoca sesiones. Antes de habilitar refresh, agrega la revocación de sesiones a la misma transacción que consume el token de reset y actualiza la contraseña.
- `HttpOnly` no previene CSRF. Define cookies `Secure` y `SameSite` apropiadas y valida el `Origin` en servidor o incorpora una defensa CSRF equivalente.

## Qué falta para habilitarlo

- Añadir `RefreshSessionUseCase` y `LogoutSessionUseCase` al módulo de autenticación.
- Añadir los handlers `POST /api/auth/refresh` y `POST /api/auth/logout` al controlador de auth.
- Definir cookies `HttpOnly` por aplicación, sus opciones de limpieza y validación estricta de origen.
- Emitir el access token con `sessionDocumentId` en todos los flujos de login y registro que creen una sesión.
- Integrar la renovación única en los clientes para evitar solicitudes simultáneas de refresh.
- Cubrir rotación, replay, revocación, expiración, aislamiento por app y limpieza con pruebas enfocadas.

## Referencias

- Persistencia: `packages/db/src/repositories/auth/account-sessions.ts`
- Esquema: `packages/db/src/schema/account-session.ts`
- Ruta reservada: `packages/common/src/config/api-routes.ts`
- Sesiones gestionadas: `apps/api/src/modules/session/`
