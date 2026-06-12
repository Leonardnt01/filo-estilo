# Matriz de Pruebas Funcionales - APF2

Fecha de elaboracion: 2026-06-07  
Proyecto: FILO ESTILO  
Rubrica cubierta: Evaluacion de pruebas funcionales

## Objetivo

Esta matriz consolida la cobertura funcional del MVP real de FILO ESTILO y su trazabilidad hacia historias de usuario, controles transversales de seguridad y escenarios BDD.

## Frameworks utilizados

- `@cucumber/cucumber`
- Gherkin
- `fetch` sobre endpoints reales de Next.js
- Supabase Auth + API Routes + RLS

## Alcance funcional vigente

- Vigentes: HU-01, HU-02, HU-03, HU-04, HU-05, HU-08, HU-09, HU-10
- Backlog: HU-06 Cancelacion/reprogramacion, HU-07 CRUD completo de sedes
- Control adicional automatizado: acceso administrativo por autenticacion/autorizacion

## Matriz de casos

| ID | Referencia | Escenario | Rol | Tipo | Modulo o endpoint | Resultado esperado | Evidencia |
|---|---|---|---|---|---|---|---|
| CPF-01 | HU-01 | Registro exitoso | Cliente | Manual | `POST /api/auth/register` | `201` y alta correcta | captura + evidencia manual |
| CPF-02 | HU-01 | Correo duplicado | Cliente | Manual | `POST /api/auth/register` | `409` por duplicidad | captura + evidencia manual |
| CPF-03 | HU-02 | Inicio de sesion exitoso | Cliente | Automatizada | `POST /api/auth/login` | `200` y sesion valida | `npm run bdd:test:client` |
| CPF-04 | HU-02 | Credenciales invalidas | Cliente | Automatizada | `POST /api/auth/login` | `401` | `npm run bdd:test:client` |
| CPF-05 | HU-02 | Rate limit de login | Cliente | Automatizada | `POST /api/auth/login` | `429` | `npm run bdd:test:client` |
| CPF-06 | HU-02 | Cierre de sesion | Cliente | Automatizada | `POST /api/auth/logout` | `200` y sesion cerrada | `npm run bdd:test:client` |
| CPF-07 | HU-03 | Catalogo general y filtrado por sede | Cliente | Automatizada | `GET /api/booking/catalog` | `200` y filtro consistente | `npm run bdd:test:client` |
| CPF-08 | HU-04 | Reserva valida con pago simulado | Cliente | Manual | `/reservar` + `POST /api/my/appointments` | cita `pending` y redireccion a `mis-citas` | captura UI + red |
| CPF-09 | HU-04 | Reserva duplicada bloqueada | Cliente | Automatizada | `POST /api/my/appointments` | `409` en segundo intento | `npm run bdd:test:client` |
| CPF-10 | HU-04 | Reserva invalida por fecha pasada | Cliente | Automatizada | `POST /api/my/appointments` | `400` | `npm run bdd:test:client` |
| CPF-11 | HU-05 | Mis citas requiere sesion | Cliente | Automatizada | `GET /api/my/appointments` | `401` | `npm run bdd:test:client` |
| CPF-12 | HU-05 | Mis citas con sesion activa | Cliente | Automatizada | `GET /api/my/appointments` | `200` y listado propio | `npm run bdd:test:client` |
| CPF-13 | SEC-01 | Acceso admin sin sesion | Visitante | Automatizada | `GET /api/admin/health` | `401` | `npm run bdd:test:admin` |
| CPF-14 | SEC-01 | Acceso admin con rol cliente | Cliente | Automatizada | `GET /api/admin/health` | `403` | `npm run bdd:test:admin` |
| CPF-15 | SEC-01 | Acceso admin autorizado | Admin | Automatizada | `GET /api/admin/health` | `200` | `npm run bdd:test:admin` |
| CPF-16 | HU-08 | Gestion de servicios por sede | Admin | Manual | `/admin/services` | solo opera sedes permitidas | evidencia UI/API |
| CPF-17 | HU-09 | Gestion de barberos y horarios por sede | Admin | Manual | `/admin/barbers`, `/admin/business-hours` | altas y ediciones restringidas por sede | evidencia UI/API |
| CPF-18 | HU-10 | Gestion administrativa de citas por sede | Admin | Manual | `/admin/appointments` | filtro y cambios de estado solo en sedes permitidas | evidencia UI/API |

## Trazabilidad resumida

| Referencia | Estado | Tipo | Observacion |
|---|---|---|---|
| HU-01 | Parcial | Manual | Supabase free limita automatizacion del registro completo |
| HU-02 | Cubierta | Automatizada | Login, error, rate limit y logout |
| HU-03 | Cubierta | Automatizada | Catalogo general y filtrado |
| HU-04 | Cubierta | Mixta | BDD cubre reglas criticas y manual cubre pago simulado visible |
| HU-05 | Cubierta | Automatizada | Acceso con y sin sesion |
| HU-06 | Backlog | No aplica MVP | No forma parte del cierre actual |
| HU-07 | Backlog | No aplica MVP | CRUD completo de sedes no implementado en esta fase |
| HU-08 | Parcial | Manual | Operativo en panel admin, falta automatizacion UI |
| HU-09 | Parcial | Manual | Operativo en panel admin, falta automatizacion UI |
| HU-10 | Parcial | Manual | Operativo en panel admin, falta automatizacion UI |
| SEC-01 | Cubierta | Automatizada | Control transversal de acceso administrativo |

## Observaciones

- El MVP no incluye cancelacion/reprogramacion como flujo final de cliente.
- El MVP no incluye CRUD completo de sedes.
- La reserva usa pago simulado con validacion ficticia interna; no se declara pasarela real.
- La cobertura automatizada se concentra en autenticacion, catalogo, reservas, mis citas y control de acceso.
