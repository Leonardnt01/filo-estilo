# Matriz de Pruebas Funcionales - APF2

Fecha de elaboracion: 2026-06-01
Proyecto: FILO ESTILO
Rúbrica cubierta: Punto 1 - Evaluacion de Pruebas Funcionales

## Objetivo

Esta matriz consolida las pruebas funcionales del sistema FILO ESTILO con trazabilidad hacia las historias de usuario, los escenarios BDD implementados y los criterios de calidad de la ISO/IEC 25010 aplicables a la adecuacion funcional del software: completitud funcional, correccion funcional e idoneidad funcional.

## Frameworks utilizados

- `@cucumber/cucumber`: automatizacion BDD con lenguaje Gherkin.
- `Node.js fetch`: ejecucion de pruebas funcionales sobre endpoints reales del sistema.
- `Supabase Auth + API Routes de Next.js`: servicios integrados que forman parte del flujo validado.

## Cobertura general

| Indicador | Valor |
|---|---:|
| Historias de usuario trazadas | 10 |
| Historias con automatizacion funcional | 5 |
| Historias con cobertura manual/documental | 5 |
| Escenarios automatizados | 12 |
| Escenarios manuales/documentales | 6 |
| Total de escenarios registrados | 18 |

## Matriz de casos de prueba funcional

| ID | HU | Escenario | Rol | Tipo | ISO 25010 | Archivo BDD | Endpoint o modulo validado | Resultado esperado | Evidencia de ejecucion |
|---|---|---|---|---|---|---|---|---|---|
| CPF-01 | HU-01 | Registro exitoso | Cliente | Manual | Completitud funcional | `bdd/features/client-authentication.feature` | `POST /api/auth/register` | `201` y `ok=true` | `npm run bdd:test:manual` + captura del escenario |
| CPF-02 | HU-01 | Correo ya registrado | Cliente | Manual | Correccion funcional | `bdd/features/client-authentication.feature` | `POST /api/auth/register` | `409` por duplicidad de correo | `npm run bdd:test:manual` + captura del escenario |
| CPF-03 | HU-02 | Inicio de sesion exitoso | Cliente | Automatizada | Idoneidad funcional | `bdd/features/client-authentication.feature` | `POST /api/auth/login` | `200` con sesion valida | `npm run bdd:test:client` |
| CPF-04 | HU-02 | Credenciales incorrectas | Cliente | Automatizada | Correccion funcional | `bdd/features/client-authentication.feature` | `POST /api/auth/login` | `401` por credenciales invalidas | `npm run bdd:test:client` |
| CPF-05 | HU-02 | Bloqueo por multiples intentos fallidos | Cliente | Automatizada | Correccion funcional | `bdd/features/client-authentication.feature` | `POST /api/auth/login` | `429` y cabecera `Retry-After` | `npm run bdd:test:client` |
| CPF-06 | HU-02 | Cierre de sesion | Cliente | Automatizada | Idoneidad funcional | `bdd/features/client-authentication.feature` | `POST /api/auth/logout` | `200` y sesion terminada | `npm run bdd:test:client` |
| CPF-07 | HU-03 | Catalogo general y filtrado por sede | Cliente | Automatizada | Completitud funcional | `bdd/features/client-booking.feature` | `GET /api/booking/catalog` | `200`, sedes visibles y filtro consistente | `npm run bdd:test:client` |
| CPF-08 | HU-04 | Reserva duplicada bloqueada | Cliente | Automatizada | Correccion funcional | `bdd/features/client-booking.feature` | `POST /api/my/appointments` | primera reserva `201`, segundo intento `409` | `npm run bdd:test:client` |
| CPF-09 | HU-04 | Reserva rechazada por fecha pasada | Cliente | Automatizada | Correccion funcional | `bdd/features/client-booking.feature` | `POST /api/my/appointments` | `400` por regla de negocio | `npm run bdd:test:client` |
| CPF-10 | HU-05 | Mis citas requiere sesion | Cliente | Automatizada | Correccion funcional | `bdd/features/client-booking.feature` | `GET /api/my/appointments` | `401` sin autenticacion | `npm run bdd:test:client` |
| CPF-11 | HU-05 | Mis citas con sesion activa | Cliente | Automatizada | Idoneidad funcional | `bdd/features/client-booking.feature` | `GET /api/my/appointments` | `200` y `ok=true` | `npm run bdd:test:client` |
| CPF-12 | HU-06 | Cancelacion y reprogramacion de cita | Cliente | Manual | Completitud funcional | `bdd/features/manual-backlog.feature` | Flujo cliente de cita futura | actualizacion correcta de estado y disponibilidad | `npm run bdd:test:manual` + evidencia UI/API |
| CPF-13 | HU-07 | Acceso admin sin sesion | Visitante | Automatizada | Correccion funcional | `bdd/features/administrator-access.feature` | `GET /api/admin/health` | `401` por falta de autenticacion | `npm run bdd:test:admin` |
| CPF-14 | HU-07 | Acceso admin con rol cliente | Cliente | Automatizada | Correccion funcional | `bdd/features/administrator-access.feature` | `GET /api/admin/health` | `403` por permisos insuficientes | `npm run bdd:test:admin` |
| CPF-15 | HU-07 | Acceso admin con rol administrador | Admin | Automatizada | Idoneidad funcional | `bdd/features/administrator-access.feature` | `GET /api/admin/health` | `200` con acceso autorizado | `npm run bdd:test:admin` |
| CPF-16 | HU-08 | Gestion de servicios por sede | Admin | Manual | Completitud funcional | `bdd/features/manual-backlog.feature` | Panel admin de servicios | alta, edicion y desactivacion reflejadas en catalogo | `npm run bdd:test:manual` + evidencia UI |
| CPF-17 | HU-09 | Gestion de barberos y horarios | Admin | Manual | Completitud funcional | `bdd/features/manual-backlog.feature` | Panel admin de barberos y horarios | disponibilidad actualizada para reserva | `npm run bdd:test:manual` + evidencia UI |
| CPF-18 | HU-10 | Gestion administrativa de citas | Admin | Manual | Completitud funcional | `bdd/features/manual-backlog.feature` | Panel admin de citas | filtro y cambio de estados consistente | `npm run bdd:test:manual` + evidencia UI |

## Trazabilidad por historia de usuario

| HU | Descripcion resumida | Estado de cobertura | Tipo de cobertura | Observacion |
|---|---|---|---|---|
| HU-01 | Registro de cliente | Parcial | Manual | Se mantiene manual por restriccion del proveedor de email de Supabase free |
| HU-02 | Inicio y cierre de sesion | Cubierta | Automatizada | Valida exito, error, bloqueo y logout |
| HU-03 | Catalogo por sede | Cubierta | Automatizada | Valida catalogo general y filtrado |
| HU-04 | Reserva de citas | Cubierta | Automatizada | Valida duplicidad y fecha invalida |
| HU-05 | Mis citas | Cubierta | Automatizada | Valida acceso con y sin sesion |
| HU-06 | Cancelacion y reprogramacion | Parcial | Manual | Falta automatizacion completa de flujo cliente |
| HU-07 | Acceso administrativo | Cubierta | Automatizada | Valida 401, 403 y 200 |
| HU-08 | Gestion de servicios | Parcial | Manual | Existe escenario documental, falta automatizacion UI/API |
| HU-09 | Gestion de barberos y horarios | Parcial | Manual | Existe escenario documental, falta automatizacion UI/API |
| HU-10 | Gestion administrativa de citas | Parcial | Manual | Existe escenario documental, falta automatizacion UI/API |

## Metricas y nivel de cumplimiento

| Metrica | Formula | Resultado |
|---|---|---:|
| Cobertura por historias de usuario | `HU con al menos una prueba / HU totales` | `10/10 = 100%` |
| Cobertura automatizada por historias | `HU automatizadas / HU totales` | `5/10 = 50%` |
| Cobertura automatizada por escenarios | `Escenarios automatizados / escenarios totales` | `12/18 = 66.67%` |
| Cobertura manual/documental | `Escenarios manuales / escenarios totales` | `6/18 = 33.33%` |

Nivel de cumplimiento propuesto para el Punto 1:

- Alto en funcionalidad critica de autenticacion, reserva, consulta de citas y proteccion administrativa.
- Medio en funcionalidades administrativas operativas aun no automatizadas.
- Recomendable complementar con capturas recientes de ejecucion y un anexo de resultados `PASS/FAIL` sobre entorno local y cloud.

## Observaciones

- La matriz refleja el estado real del repositorio y evita declarar automatizacion donde todavia no existe.
- Las pruebas funcionales automatizadas estan centradas en flujos criticos del negocio y controles de acceso.
- Para cerrar el criterio con mayor fortaleza academica, se recomienda anexar:
  - captura de `npm run bdd:test:client`
  - captura de `npm run bdd:test:admin`
  - captura de `npm run bdd:test:manual`
  - tabla de resultados ejecutados con fecha, entorno y porcentaje de exito

## Comandos de reproduccion

```bash
npm run bdd:test:client
npm run bdd:test:admin
npm run bdd:test:manual
npm run bdd:test
```
