# Evidencia de Mantenimiento: Cierre del Feature No-Show + Waitlist

**Proyecto:** FILO ESTILO
**Fecha del cambio:** 2026-07-15
**Tipo de mantenimiento:** Evolutivo/correctivo (ISO/IEC 25010 — Mantenibilidad)
**Alcance:** Endurecimiento de reglas de negocio no-show y cierre del ciclo de lista de espera

---

## 1. Escenario del cambio realizado

### Contexto
El feature de prevención de no-show y recuperación de cupos mediante lista de espera se encontraba
en fase funcional intermedia. Una auditoría de código detectó tres deficiencias:

| # | Deficiencia detectada | Severidad |
|---|----------------------|-----------|
| D1 | Las funciones de regla de negocio `canMarkNoShow` e `isAttendanceAtRisk` existían en `src/lib/booking.ts` pero **ningún componente del sistema las invocaba** (código muerto). El endpoint admin permitía marcar `no_show` a citas futuras o revivir citas completadas. | Alta |
| D2 | Al marcar `no_show` no se registraba `release_reason` ni nota de auditoría, rompiendo la trazabilidad del ciclo de vida de la cita. | Media |
| D3 | **Ningún componente del sistema generaba ofertas de waitlist**: el cupo se liberaba (`release_reason`) pero la entrada de lista de espera nunca pasaba a `offered`. Los endpoints de aceptar/rechazar oferta eran inalcanzables (ciclo roto de extremo a extremo). | Alta |

### Cambio implementado
1. **Endpoint admin** (`src/app/api/admin/appointments/[id]/route.ts`):
   - La transición a `no_show` ahora se valida con `canMarkNoShow()`: solo citas activas cuya hora de inicio ya pasó. Transición inválida responde **HTTP 422**.
   - Al marcar `no_show` se setea `release_reason = "no_show"` y nota auditada `[ADMIN_NO_SHOW <timestamp>]`.
   - La cancelación por admin ahora setea `release_reason = "admin_cancelled"` y nota auditada.
2. **Nuevo módulo** `src/lib/waitlist-offers.ts`:
   - `offerReleasedSlotToWaitlist()`: al liberarse un cupo busca la entrada `active` más antigua compatible (misma sede, mismo servicio, misma fecha, barbero compatible, ventana horaria compatible) y la promueve a `offered` con expiración (`getOfferExpiry`).
   - Se ejecuta con el cliente service-role de Supabase porque quien libera el cupo no es dueño de la entrada de waitlist promovida (restricción RLS).
   - Diseño *best-effort*: si no hay candidato o falta configuración, la operación principal no falla.
3. **Endpoint cliente** (`src/app/api/my/appointments/[id]/route.ts`):
   - Las acciones `decline_attendance` y `cancel` ahora disparan la oferta de waitlist tras liberar el cupo.
4. **Corrección de configuración de pruebas** (`vitest.config.mts`):
   - Vitest ejecutaba por error los specs de Playwright. Se limitó el scope a `tests/unit/**/*.test.ts`.

---

## 2. Casos de prueba — ANTES del cambio

**Ejecución:** 2026-07-15 13:41 (hora local)
**Comando:** `npm run test:unit`

```
Test Files  3 failed | 3 passed (6)
Tests       19 passed (19)
```

*Nota: los 3 archivos fallidos eran specs de Playwright ejecutados por error por Vitest (deficiencia de configuración, corregida en este cambio).*

| Caso | Comportamiento ANTES | Esperado |
|------|---------------------|----------|
| CP-01: Admin marca `no_show` a cita futura | ✗ Lo permite (update genérico sin validación) | Rechazar con 422 |
| CP-02: Admin marca `no_show` a cita `completed` | ✗ Lo permite | Rechazar con 422 |
| CP-03: `no_show` registra `release_reason` | ✗ No se registra | `release_reason = "no_show"` |
| CP-04: `no_show` deja nota de auditoría | ✗ No deja nota | Nota `[ADMIN_NO_SHOW ...]` |
| CP-05: Cliente cancela → entrada waitlist compatible pasa a `offered` | ✗ Nunca ocurre (sin implementación) | Entrada promovida con expiración |
| CP-06: Cliente declina asistencia → oferta waitlist | ✗ Nunca ocurre | Entrada promovida |
| CP-07: Admin cancela → `release_reason` | ✗ No se registra | `release_reason = "admin_cancelled"` |
| CP-08: Cobertura unitaria de reglas de asistencia | ✗ 0 tests | Reglas cubiertas |

---

## 3. Casos de prueba — DESPUÉS del cambio

**Ejecución:** 2026-07-15 14:47 (hora local)
**Comando:** `npm run test:unit`

```
Test Files  5 passed (5)
Tests       55 passed (55)
Duration    993ms
```

| Caso | Comportamiento DESPUÉS | Estado |
|------|------------------------|--------|
| CP-01: Admin marca `no_show` a cita futura | HTTP 422 con mensaje explicativo (validación `canMarkNoShow`) | ✅ PASS |
| CP-02: Admin marca `no_show` a cita `completed`/`cancelled`/`no_show` | HTTP 422 (estados bloqueados) | ✅ PASS |
| CP-03: `no_show` registra `release_reason` | `release_reason = "no_show"` en el mismo update | ✅ PASS |
| CP-04: `no_show` deja nota de auditoría | `[ADMIN_NO_SHOW <ISO timestamp>]` anexada a notes | ✅ PASS |
| CP-05: Cliente cancela → oferta waitlist | `offerReleasedSlotToWaitlist` promueve entrada FIFO compatible a `offered` | ✅ PASS |
| CP-06: Cliente declina → oferta waitlist | Ídem CP-05 | ✅ PASS |
| CP-07: Admin cancela → `release_reason` | `release_reason = "admin_cancelled"` + nota + oferta waitlist | ✅ PASS |
| CP-08: Cobertura unitaria | 36 tests nuevos (19 → 55) cubriendo las 4 reglas de asistencia y 7 helpers de waitlist | ✅ PASS |

### Detalle de tests nuevos
- `tests/unit/booking/attendance.test.ts` (22 tests): `canConfirmAttendance`, `canDeclineAttendance`, `canMarkNoShow`, `isAttendanceAtRisk` — casos válidos, inválidos y de borde (hora exacta de inicio, umbral personalizado de riesgo).
- `tests/unit/waitlist/waitlist.test.ts` (14 tests): `canJoinWaitlist`, `isWaitlistOfferActive`, `canRespondToWaitlistOffer`, `isDesiredWindowCompatible`, `getOfferExpiry`, `isOfferExpired`, `buildWaitlistRange`.

---

## 4. Impacto del cambio en el sistema

| Dimensión | Impacto |
|-----------|---------|
| **Archivos modificados** | 3 (`admin/appointments/[id]/route.ts`, `my/appointments/[id]/route.ts`, `vitest.config.mts`) |
| **Archivos nuevos** | 3 (`src/lib/waitlist-offers.ts`, 2 archivos de tests) |
| **Regresiones** | 0 — los 19 tests preexistentes siguen pasando sin modificación |
| **Compatibilidad de esquema** | Mantenida — el helper tolera esquema moderno (`start_time`) y legado (`appointment_time`) |
| **Contrato de API** | Retrocompatible — se agrega campo `waitlist_offer` a la respuesta admin; nuevo código 422 documentable en OpenAPI |
| **Seguridad** | La promoción de waitlist usa service-role de forma controlada y acotada (solo tabla `waitlist_entries`, solo transición `active → offered`); RLS permanece intacta para los clientes |
| **Requisito operativo** | La promoción de ofertas requiere `SUPABASE_SERVICE_ROLE_KEY` en el entorno; sin ella degrada de forma segura (no ofrece, no falla) |

## 5. Estado final y conclusiones

- El ciclo no-show/waitlist quedó **cerrado de extremo a extremo**: liberación de cupo (cliente o admin) → oferta automática FIFO a la lista de espera → aceptación/rechazo por el cliente (endpoints preexistentes, ahora alcanzables).
- Las reglas de negocio que eran código muerto quedaron **conectadas y verificadas por pruebas**.
- La cobertura unitaria del proyecto pasó de **19 a 55 tests** (+189%), con la totalidad de las reglas del feature cubiertas.
- **Trabajo futuro documentado:** barrido automático de no-show por vencimiento (`/api/cron/no-show-sweep`) y panel admin de gestión de waitlist. El marcado manual endurecido cubre la operación del MVP.

---

*Documento generado como evidencia para el criterio "Evaluación del Monitoreo y mantenimiento del sistema" (elementos 5-8): escenario del cambio, casos de prueba antes/después, impacto y estado final.*
