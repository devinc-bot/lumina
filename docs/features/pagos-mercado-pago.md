# Pagos con Mercado Pago Checkout Pro

## Objetivo

El flujo de pagos reserva inventario para una orden pendiente, crea una preferencia de Mercado Pago Checkout Pro y confirma el resultado únicamente desde un webhook firmado. El cliente recibe una URL de checkout, pero no decide el estado final del pago.

## Recorrido rápido

1. Un usuario autenticado crea una orden con `POST /api/orders`.
2. La API reserva stock y crea una compra pendiente.
3. La API crea una preferencia de Checkout Pro y devuelve `checkoutUrl`.
4. El usuario paga en Mercado Pago.
5. Mercado Pago envía `POST /api/mercado-pago/webhook`.
6. La API valida la firma, consulta el pago al proveedor y reconcilia el estado persistido.
7. El cliente obtiene el estado de la orden con GET al cargar la página de resultado.

## Crear una orden

`POST /api/orders` requiere `JwtAuthGuard`, `RolesGuard` y rol `user`. El body se valida con `createOrderSchema`.

La respuesta incluye datos suficientes para redirigir al checkout:

```json
{
  "documentId": "uuid-de-la-compra",
  "ticketId": "uuid-del-ticket",
  "status": "pending",
  "amount": 12000,
  "quantity": 2,
  "provider": "mercado_pago",
  "checkoutUrl": "https://..."
}
```

No construyas `checkoutUrl` en el frontend ni asumas que una URL de retorno confirma el pago.

## Qué hace la API al crear el checkout

`CreatePendingOrderUseCase` ejecuta el siguiente flujo:

| Paso             | Regla                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Configuración    | Rechaza la operación si los pagos de plataforma no están configurados.                                 |
| Ticket y usuario | Obtiene ambos en paralelo y comprueba que el ticket esté activo y en venta.                            |
| Reserva          | Ejecuta `reserveSingleTicketCheckout` con vencimiento `CHECKOUT_RESERVATION_DURATION_MS`.              |
| Preferencia      | Envía a Mercado Pago el título, cantidad, precio unitario, referencia externa, callback y vencimiento. |
| Enlace           | Persiste el `providerPreferenceId` solo si la compra sigue en un estado vinculable.                    |
| Fallo            | Libera la reserva y marca la compra como cancelada antes de responder error.                           |

La referencia externa de Mercado Pago es siempre el `documentId` público de la compra. Esa relación permite reconciliar el webhook sin confiar en datos enviados por el navegador.

## Preferencia de Checkout Pro

El adapter `MercadoPagoCheckoutProSdkAdapter` configura una preferencia con:

- Un único item por la compra reservada.
- `external_reference` igual al `documentId` de la compra.
- `notification_url` apuntando a `/api/mercado-pago/webhook` bajo `API_PUBLIC_URL`.
- Vencimiento entre la creación de la preferencia y el vencimiento de la reserva.
- URLs de retorno `success`, `pending` y `failure` en `WEB_URL`.
- `auto_return: 'approved'`.

En modo de prueba usa `sandbox_init_point`; fuera de ese modo usa `init_point`.

## Webhook y reconciliación

El webhook es público, responde `204 No Content` y no usa el estado comunicado por el navegador.

### Validación

`ReconcileMercadoPagoWebhookUseCase` exige:

- Una notificación de tipo `payment` o el formato legado con `topic: payment`.
- Un identificador de pago desde `data.id`, `resource` o el query param `data.id`.
- Un header `x-signature` válido y, cuando Mercado Pago lo incluye, `x-request-id` para componer el manifiesto de validación.
- Firma válida con `MERCADOPAGO_WEBHOOK_SECRET`.
- Antigüedad máxima de cinco minutos para limitar replays.

Una notificación inválida devuelve un error de autorización y no consulta ni actualiza pagos.

### Fuente de verdad

Tras validar la firma, la API consulta `Payment.get` mediante el adapter y solo reconcilia con los hechos verificados por Mercado Pago:

- ID del pago del proveedor.
- Estado del proveedor.
- `external_reference`.
- Importe.
- Moneda.

`reconcileMercadoPagoPayment` persiste el resultado y conserva el payload recibido para auditoría. Si el proveedor no devuelve referencia externa, el handler termina sin modificar compras.

> Limitación actual: la reconciliación no verifica que el pago consultado pertenezca al `providerPreferenceId` almacenado. Antes de ampliar el flujo, incorpora esa comprobación en el adapter y el repositorio para ligar el pago del proveedor a la preferencia creada.

## Estados y expiración

- Una compra comienza con pago `pending` y una reserva de inventario activa.
- El webhook reconciliado decide la transición según el estado verificable de Mercado Pago.
- `PurchaseExpiryScheduler` libera reservas locales vencidas. `PendingOrderCleanupScheduler` elimina órdenes pendientes antiguas de acuerdo con su retención; no vence preferencias de Mercado Pago.
- La preferencia de Mercado Pago se vence mediante el puerto del proveedor al borrar una orden pendiente por solicitud del comprador.
- Borrar una orden pendiente también está restringido al comprador autenticado.

## Variables necesarias

| Variable                     | Uso                                   |
| ---------------------------- | ------------------------------------- |
| `MERCADOPAGO_WEBHOOK_SECRET` | Valida la firma de notificaciones.    |
| `MERCADOPAGO_TEST_MODE`      | Selecciona el init point de sandbox.  |
| `API_PUBLIC_URL`             | Construye la URL pública del webhook. |
| `WEB_URL`                    | Construye los retornos del checkout.  |

No expongas estas variables al cliente ni las registres en logs.

## Checklist de integración

- [ ] El cliente redirige exclusivamente a `checkoutUrl` recibido desde `POST /api/orders`.
- [ ] El webhook de Mercado Pago apunta a la URL pública de la API.
- [ ] `MERCADOPAGO_WEBHOOK_SECRET` está configurado en el entorno desplegado.
- [ ] Las URLs públicas usan HTTPS fuera de desarrollo.
- [ ] La UI consulta la orden con GET al cargar la página; no confirma pagos desde los parámetros de retorno.
- [ ] Las pruebas cubren firma inválida, formato legado, ventana de replay, importe o moneda incongruentes e idempotencia de reconciliación.

## Referencias

- Órdenes: `apps/api/src/modules/orders/`
- Puerto y adapter: `apps/api/src/modules/mercado-pago/`
- Webhook: `apps/api/src/modules/mercado-pago/presentation/mercado-pago.controller.ts`
- Reconciliación: `apps/api/src/modules/mercado-pago/application/reconcile-webhook.use-case.ts`
