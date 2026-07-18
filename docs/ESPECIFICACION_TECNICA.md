# DOCUMENTO DE ESPECIFICACIÓN TÉCNICA
## FILO ESTILO — Plataforma Web de Gestión de Citas para Barberías

| Nombre del documento | Código | Fecha | Versión |
|---|---|---|---|
| Especificación de los Requerimientos Técnicos | FE-ET-001 | 2026-07-17 | 1.0 |

### Historial de revisiones

| Fecha Revisión | Autor | Versión | Resumen del Cambio |
|---|---|---|---|
| 2026-07-17 | Equipo FILO ESTILO | 1.0 | Elaboración del documento. |
| _[fecha]_ | _[autor]_ | 2.0 | _[Actualización con cambios de la fase X]_ |

---

## Contenido

1. **Introducción**
   - 1.1. Glosario
2. **Objetivos y Restricciones de la Arquitectura**
   - 2.1. Consideraciones de arquitectura
   - 2.2. Alcance del Proyecto
   - 2.3. Exclusiones del Proyecto
   - 2.4. Objetivos por Cambio
3. **Dimensionamiento y Volumetría**
4. **Vista de Casos de Uso**
   - 4.1. Actores del Sistema
   - 4.2. Opciones del Sistema (matriz por rol)
   - 4.3. Casos de Uso del Negocio
   - 4.4. Casos de Uso del Sistema
5. **Vista Lógica**
   - 5.1. Autenticación (registro, login, OAuth Google, sesión)
   - 5.2. Catálogo y Reservas (catálogo, disponibilidad, citas, waitlist)
   - 5.3. Administración (citas, recursos de sede)
   - 5.5. Seguridad (login, renovación de token)
6. **Vista de Desarrollo (Implementación)**
   - 6.1. Diagrama de Componentes
7. **Vista de Proceso**
   - 7.1. Diagrama general de procesos
   - 7.2. Proceso de Reserva con Pago
   - 7.3. Proceso No-Show y Recuperación de Cupos
7-bis. **Vista Física (Despliegue)**
   - Diagrama de despliegue, componentes de infraestructura, consolas
8. **Vista de Datos**
   - 8.1. Diagrama de Base de Datos
   - 8.2. Diccionario de datos — APPOINTMENTS
   - 8.3. Diccionario de datos — WAITLIST_ENTRIES
9. **Capa de Integración**
   - 9.1. Validaciones del Sistema (health checks)
   - 9.5. Integraciones Externas (Supabase Auth, Culqi)
   - 9.6. Diagramas de Integración
   - 9.7. Listado de Servicios
   - 9.8. Colección de pruebas API
10. **Configuraciones**
11. **Manejo de Excepciones**
    - 11.1. Mecanismos
    - 11.2. Códigos de error
12. **Interfaces de Usuario**
13. **Control del Código**
    - 13.1. Repositorios de código fuente
    - 13.2. Esquema de ramas y versionamiento

---

## 1. Introducción

El presente documento busca documentar los componentes técnicos de la plataforma FILO ESTILO,
sistema web de gestión de citas para barberías multi-sede. Se detallan los aspectos relevantes
que permiten la comprensión de los componentes, la documentación de los servicios expuestos
y el flujo de comunicación entre los componentes y la información que intercambian.

### 1.1. Glosario

| Término | Definición |
|---|---|
| App Router | Sistema de enrutamiento de Next.js que organiza páginas y endpoints por carpetas. |
| API Route | Endpoint HTTP implementado dentro de Next.js que ejecuta lógica de servidor. |
| SSR | Server-Side Rendering: renderizado de páginas en el servidor antes de enviarlas al navegador. |
| RLS | Row Level Security: políticas de PostgreSQL que restringen el acceso a filas según el usuario. |
| Supabase | Plataforma cloud que provee autenticación y base de datos PostgreSQL administrada. |
| Rate Limiting | Mecanismo de seguridad que limita la cantidad de intentos por ventana de tiempo. |
| Waitlist | Lista de espera: mecanismo de recuperación de cupos liberados por cancelación o no-show. |
| No-show | Inasistencia del cliente a una cita reservada, sin aviso previo. |
| Serverless | Modelo de ejecución cloud donde la infraestructura escala automáticamente por demanda. |
| Middleware/Proxy | Capa de Next.js que intercepta todas las peticiones antes de llegar a páginas o APIs. |

## 2. Objetivos y Restricciones de la Arquitectura

Objetivos del presente documento:

- Detallar los componentes de la arquitectura.
- Especificar las integraciones expuestas.
- Detallar la funcionalidad y configuración necesaria para el funcionamiento de la solución.

### 2.1. Consideraciones de arquitectura

**• Lenguaje de Programación: TypeScript**
Se utiliza TypeScript sobre Node.js, aportando tipado estático que reduce errores en tiempo
de desarrollo y facilita el mantenimiento del código en equipo.

**• Framework: Next.js 16 (App Router)**
Framework full-stack que unifica frontend (React 19) y backend (API Routes) en un solo
proyecto. Soporta renderizado híbrido (SSR/estático), middleware de seguridad y despliegue
serverless optimizado.

**• Autenticación: Supabase Auth**
Proveedor de identidad que gestiona registro, inicio de sesión (email/contraseña y OAuth
con Google), sesiones persistentes mediante cookies httpOnly y tokens de seguridad con
renovación automática.

**• Base de Datos: Supabase PostgreSQL**
Motor relacional administrado en la nube con políticas Row Level Security activas para
aislamiento de datos por usuario, rol y sede.

**• Infraestructura Cloud: Vercel + DigitalOcean**
Vercel aloja el entorno de producción (serverless, CDN global). DigitalOcean App Platform
se utiliza como entorno de experimentación de escalabilidad horizontal (1 y 2 contenedores
Docker con balanceo automático).

**• Pasarela de Pagos: Culqi**
Procesamiento de pagos con tarjeta y Yape en soles peruanos (PEN), mediante tokenización
en el navegador (el servidor nunca manipula números de tarjeta).

### 2.2. Alcance del Proyecto

Implementación de la plataforma FILO ESTILO para digitalizar la operación de reservas de
una barbería con una o varias sedes, en reemplazo de mecanismos manuales (agendas físicas,
llamadas, mensajería).

Procesos principales cubiertos:

| Módulos | Procesos de Negocio |
|---|---|
| Autenticación | Registro, inicio/cierre de sesión (email y Google OAuth), verificación de sesión, control por rol y sede |
| Catálogo y Reservas | Consulta de sedes/servicios/barberos, disponibilidad de horarios, creación de citas, pago en línea (Culqi) |
| Gestión del Cliente | Mis citas, cancelación, reprogramación, confirmación de asistencia, lista de espera |
| Prevención No-Show | Confirmación/declinación de asistencia, marcado no_show con reglas, liberación y reoferta de cupos |
| Administración | Gestión de servicios, barberos, horarios y citas por sede; indicador de confiabilidad del cliente; cupones |

### 2.3. Exclusiones del Proyecto

- Aplicación móvil nativa (la web es responsive).
- Facturación electrónica y contabilización de pagos.
- Módulo de convenios con proveedores externos.
- Notificaciones push / SMS (solo flujos web).
- Barrido automático (cron) de no-show por vencimiento — documentado como trabajo futuro;
  el marcado manual endurecido cubre la operación del MVP.
- Todo lo no especificado explícitamente en este documento se considera fuera del alcance.

### 2.4. Objetivos por Cambio

| Cambio | Objetivo |
|---|---|
| Cierre feature No-Show/Waitlist | Activar reglas de negocio de inasistencia y cerrar el ciclo de recuperación de cupos |
| Semáforo de confiabilidad | Dar visibilidad al administrador del historial de asistencia de cada cliente |
| OAuth Google | Reforzar la seguridad de autenticación delegando identidad a Google |
| Dockerfile de producción | Habilitar despliegue reproducible en DigitalOcean para pruebas de escalado |

## 3. Dimensionamiento y Volumetría

Estimación basada en el análisis del negocio y validada con pruebas de carga (JMeter):

| Escenario | Usuarios concurrentes | Justificación |
|---|---|---|
| Operación mínima (Lun-Jue) | 2-5 | 3-4 barberos, 8-10 clientes/barbero/día |
| Operación normal (Viernes) | 15-30 | 4-6 barberos activos |
| Hora pico (Vie 6-8 PM, Sáb) | 50-100 | Máxima demanda esperada |
| Escenario extremo (viral) | 150-200 | Degradación controlada aceptable |

Capacidad validada: el sistema soporta la carga esperada del negocio; los resultados
detallados de las campañas de rendimiento (escenarios E1-E4 sobre 1 y 2 nodos) se documentan
en el informe de rendimiento y escalabilidad (docs/RENDIMIENTO_ESCALABILIDAD.md).

## 4. Vista de Casos de Uso

### 4.1. Actores del Sistema

| Actor | Descripción |
|---|---|
| Visitante | Usuario sin sesión. Consulta contenido público, se registra o inicia sesión. |
| Cliente | Usuario registrado. Reserva, paga, gestiona sus citas y su lista de espera. |
| Administrador | Usuario con permisos operativos sobre sedes autorizadas (membresías). |
| Propietario (Owner) | Usuario con privilegios globales del negocio. |
| Supabase | Componente externo: autenticación, persistencia y RLS. |
| Culqi | Componente externo: procesamiento de pagos. |
| Vercel / DigitalOcean | Plataformas de infraestructura y despliegue. |

_[INSERTAR: diagrama de actores — reutilizar el del informe final, sección 3.3]_

### 4.2. Opciones del Sistema (matriz por rol)

| OPCIONES OPERATIVAS | CLIENTE | ADMINISTRADOR | PROPIETARIO |
|---|---|---|---|
| Registro / Login (email y Google) | SI | SI | SI |
| Consultar catálogo y disponibilidad | SI | SI | SI |
| Reservar cita (con pago Culqi) | SI | NO | NO |
| Mis citas (cancelar/reprogramar/confirmar asistencia) | SI | NO | NO |
| Lista de espera (crear/aceptar/rechazar oferta) | SI | NO | NO |
| Dashboard administrativo | NO | SI (sus sedes) | SI (todas) |
| Gestión de servicios/barberos/horarios | NO | SI (sus sedes) | SI |
| Gestión de citas (estados, no_show) | NO | SI (sus sedes) | SI |
| Gestión de membresías (staff) | NO | NO | SI |

### 4.3. Casos de Uso del Negocio

| CÓDIGO | CASO DE USO | FLUJO |
|---|---|---|
| CUN-01 | Reservar cita con pago | Reservas |
| CUN-02 | Gestionar asistencia (confirmar / declinar / no_show) | Prevención No-Show |
| CUN-03 | Recuperar cupo liberado vía lista de espera | Prevención No-Show |
| CUN-04 | Gestionar recursos de sede (servicios, barberos, horarios) | Administración |

### 4.4. Casos de Uso del Sistema

| CÓDIGO | CASO DE USO | FLUJO |
|---|---|---|
| CUS-01 | Iniciar sesión (credenciales / OAuth Google) | Autenticación |
| CUS-02 | Calcular disponibilidad de horarios | Reservas |
| CUS-03 | Procesar cargo Culqi con rollback ante fallo | Pagos |
| CUS-04 | Clasificar confiabilidad del cliente | Administración |

_[INSERTAR: diagrama general de casos de uso — reutilizar sección 5.1 del informe final]_

## 5. Vista Lógica

Formato por operación: ejecución, base de datos, lógica del servicio y servicio expuesto.
URLs: **LOCAL** `http://localhost:3000` — **PRD** `https://filo-estilo.vercel.app`

### 5.1. Autenticación

#### 5.1.1. Registrar Cliente

| INTEGRACIÓN | DETALLE |
|---|---|
| EJECUCIÓN | Frontend y Backend FILO ESTILO |
| BASE DATOS | Supabase PostgreSQL (`auth.users`, `public.profiles`) |
| LÓGICA DEL SERVICIO | Valida payload (Zod), aplica rate limit (3 intentos/60 s por IP), crea identidad en Supabase Auth y aprovisiona el perfil con rol `client`. Registra evento de auditoría. |
| SERVICIO EXPUESTO | POST `{BASE}/api/auth/register` — Response 201: `{ "ok": true, "user": { "id", "email", "full_name" } }` |

#### 5.1.2. Iniciar Sesión

| INTEGRACIÓN | DETALLE |
|---|---|
| EJECUCIÓN | Frontend y Backend FILO ESTILO |
| BASE DATOS | Supabase Auth |
| LÓGICA DEL SERVICIO | Valida credenciales contra Supabase Auth, aplica rate limit (5 intentos/60 s), emite cookies httpOnly de sesión y registra evento `[SECURITY]`. |
| SERVICIO EXPUESTO | POST `{BASE}/api/auth/login` — 200: `{ "ok": true, "user": {...} }` · 401 credenciales inválidas · 429 exceso de intentos |

#### 5.1.3. Autenticación con Google (OAuth)

| INTEGRACIÓN | DETALLE |
|---|---|
| EJECUCIÓN | Frontend (signInWithOAuth) + Callback de servidor |
| BASE DATOS | Supabase Auth + `public.profiles` |
| LÓGICA DEL SERVICIO | El navegador redirige a Google; Supabase intercambia el código y retorna a `/auth/callback`, donde el servidor canjea la sesión (`exchangeCodeForSession`), asegura el perfil con rol `client` sin sobrescribir roles existentes, y audita el evento. |
| SERVICIO EXPUESTO | GET `{BASE}/auth/callback?code=...` — 302 a la aplicación autenticada |

#### 5.1.4. Verificar Sesión / Cerrar Sesión

| Servicio | Detalle |
|---|---|
| GET `/api/auth/me` | 200: estado de autenticación y datos del usuario (rol, membresías). |
| POST `/api/auth/logout` | Destruye la sesión y revoca el token activo. |

### 5.2. Catálogo y Reservas

#### 5.2.1. Consultar Catálogo

| INTEGRACIÓN | DETALLE |
|---|---|
| EJECUCIÓN | Backend (recurso público, con caché `s-maxage=60`) |
| BASE DATOS | `branches`, `services`, `barbers` |
| LÓGICA DEL SERVICIO | Consulta relacional de sedes activas con sus servicios y barberos. |
| SERVICIO EXPUESTO | GET `{BASE}/api/booking/catalog` — 200: `{ "ok": true, "branches": [...], "services": [...], "barbers": [...] }` |

#### 5.2.2. Consultar Disponibilidad

| INTEGRACIÓN | DETALLE |
|---|---|
| EJECUCIÓN | Backend |
| BASE DATOS | `business_hours`, `appointments` (estados activos) |
| LÓGICA DEL SERVICIO | Calcula slots libres cruzando horario de la sede/barbero con citas activas (`pending`, `confirmed`, `in_progress`). Las citas `cancelled`/`no_show` liberan el slot automáticamente. |
| SERVICIO EXPUESTO | POST `{BASE}/api/booking/availability` — Body: `{branch_id, barber_id, service_id, appointment_date}` — 200: `{ "ok": true, "slots": [{"start_time","end_time"}] }` |

#### 5.2.3. Crear Cita (Cliente)

| INTEGRACIÓN | DETALLE |
|---|---|
| EJECUCIÓN | Backend (sesión de cliente requerida) |
| BASE DATOS | `appointments` |
| LÓGICA DEL SERVICIO | Valida ventana temporal (no pasado, máx. 60 días), verifica disponibilidad con doble chequeo anti-duplicidad, crea la cita `pending` con `attendance_status: "pending"`. |
| SERVICIO EXPUESTO | POST `{BASE}/api/my/appointments` — 201 · 409 slot ocupado · 401 sin sesión |

#### 5.2.4. Gestionar Mi Cita (cancelar / reprogramar / asistencia)

| INTEGRACIÓN | DETALLE |
|---|---|
| EJECUCIÓN | Backend (dueño de la cita) |
| BASE DATOS | `appointments`, `waitlist_entries` |
| LÓGICA DEL SERVICIO | Acciones: `cancel` (setea `release_reason: client_cancelled`), `decline_attendance` (`client_declined`), `confirm_attendance`, `reschedule`. Toda liberación de cupo dispara la oferta automática a la lista de espera (mejor entrada activa compatible pasa a `offered` con expiración). Notas auditadas con timestamp en cada transición. |
| SERVICIO EXPUESTO | PATCH `{BASE}/api/my/appointments/{id}` — 200 · 400 acción no permitida |

#### 5.2.5. Lista de Espera

| Servicio | Detalle |
|---|---|
| GET/POST `/api/my/waitlist` | Consultar / crear solicitud (sede, servicio, fecha, ventana horaria, barbero opcional). |
| POST `/api/my/waitlist/{id}/accept` | Acepta una oferta activa y materializa la cita. |
| POST `/api/my/waitlist/{id}/reject` | Rechaza la oferta. |
| POST `/api/my/waitlist/{id}/cancel` | Cancela la solicitud. |

### 5.3. Administración

#### 5.3.1. Gestión de Citas Administrativas

| INTEGRACIÓN | DETALLE |
|---|---|
| EJECUCIÓN | Backend (rol admin/owner + membresía de la sede) |
| BASE DATOS | `appointments` + historial por cliente |
| LÓGICA DEL SERVICIO | Listado enriquecido (cliente, servicio, barbero, sede) con **indicador de confiabilidad** por cliente (Confiable / Neutral / Alerta) calculado de su historial `completed` vs `no_show`. Actualización de estados con regla endurecida: `no_show` solo si la cita ya inició (validación `canMarkNoShow`, si no → 422) y registra `release_reason: "no_show"` + nota auditada + oferta del cupo a waitlist. |
| SERVICIO EXPUESTO | GET `/api/admin/appointments` · PATCH `/api/admin/appointments/{id}` — 200 · 422 transición inválida · 403 sede no autorizada |

#### 5.3.2. Recursos de Sede

| Servicio | Detalle |
|---|---|
| GET `/api/admin/health` | Verificación de privilegios administrativos (200/401/403). |
| GET `/api/admin/branches` | Sedes autorizadas según membresías del usuario. |
| GET/POST `/api/admin/services`, `/api/admin/barbers`, `/api/admin/business-hours` | Gestión del catálogo operativo por sede. |
| GET/POST `/api/admin/memberships` | Asignación de staff a sedes (solo owner). |

### 5.5. Seguridad

#### 5.5.1. Flujo de Login y Sesión

La sesión se materializa en cookies httpOnly administradas por Supabase (`@supabase/ssr`).
El middleware (proxy de Next.js) refresca la sesión en cada petición y bloquea rutas
`/admin` y `/api/admin/*` sin autenticación (401) o sin privilegios (403), registrando
los intentos denegados en el log de seguridad.

_[INSERTAR: diagrama de secuencia de login — reutilizable del informe final]_

#### 5.5.2. Renovación de Token

La renovación del token de sesión es automática: el middleware invoca `updateSession` en
cada request, y Supabase rota los tokens antes de su expiración sin intervención del usuario.

## 6. Vista de Desarrollo (Implementación)

### 6.1. Diagrama de Componentes

_[INSERTAR: diagrama de componentes — sección 5.2 del informe final]_

Componentes principales:

| Capa | Componente | Responsabilidad |
|---|---|---|
| Presentación | Páginas y componentes React 19 (Tailwind CSS 4) | Captura de eventos, render reactivo, interactividad |
| Lógica | API Routes (Next.js App Router) | Validación de payloads (Zod), reglas de negocio, orquestación |
| Reglas de dominio | `src/lib/booking.ts`, `src/lib/waitlist.ts`, `src/lib/client-reliability.ts`, `src/lib/waitlist-offers.ts` | Reglas puras de reserva, asistencia, waitlist y confiabilidad (cubiertas por 65 pruebas unitarias) |
| Seguridad | `src/proxy.ts`, `src/lib/security/*`, `src/lib/auth/*` | Middleware, rate limiting, auditoría, autorización por rol/sede |
| Datos | Supabase Services | Autenticación de identidades y persistencia transaccional con RLS |
| Pagos | `src/lib/payments/culqi.ts` | Comunicación server-only con la API de Culqi |

## 7. Vista de Proceso

### 7.1. Diagrama general de procesos

_[INSERTAR: diagrama de actividades del proceso de reserva — sección 5.4 del informe final]_

### 7.2. Proceso de Reserva con Pago

1. Cliente selecciona sede, servicio, barbero, fecha y horario disponible.
2. El sistema verifica nuevamente la disponibilidad (doble validación anti-concurrencia).
3. Se crean las citas en estado `pending` con nota de pago en proceso.
4. Se ejecuta el cargo en Culqi (token de un solo uso generado en el navegador).
5. Éxito → citas `confirmed` con referencia de transacción. Fallo → rollback automático
   (citas `cancelled`, `payment_status: failed`) y error 402 al cliente.

### 7.3. Proceso No-Show y Recuperación de Cupos

1. Toda cita nace con `attendance_status: "pending"`.
2. El cliente puede **confirmar asistencia** o **declinar** ("No podré asistir") desde Mis Citas.
3. Declinar o cancelar libera el cupo (`release_reason`) y el sistema ofrece automáticamente
   el horario a la primera entrada activa compatible de la lista de espera (FIFO), que pasa
   a `offered` con expiración de 2 horas.
4. Si el cliente no se presenta, el administrador marca `no_show` — permitido solo después
   de la hora de inicio y sobre citas activas (regla `canMarkNoShow`; transición inválida → 422).
5. El historial `completed` / `no_show` alimenta el semáforo de confiabilidad mostrado al
   administrador en cada nueva reserva del cliente.

## 7-bis. Vista Física (Despliegue)

### Diagrama de Despliegue

_[INSERTAR: diagrama de despliegue — sección 5.5 del informe final, actualizado con DigitalOcean]_

### Detalle de componentes de infraestructura

| Componente | Plataforma | Detalle |
|---|---|---|
| Producción | Vercel (serverless) | `https://filo-estilo.vercel.app` — build automático por push a `main`, CDN global, HTTPS |
| Entorno de escalabilidad | DigitalOcean App Platform | Contenedor Docker (build de producción), región ATL1, escalable 1→2 contenedores con balanceo automático |
| Base de datos | Supabase Cloud | PostgreSQL administrado + Auth; backups automáticos |
| CI/CD | GitHub Actions | Build + suite Playwright/Vitest en cada push/PR (Node.js 22, secrets inyectados) |

### Consola de despliegue

- Vercel Dashboard: deployments, runtime logs, Analytics y Speed Insights.
- DigitalOcean Dashboard: Insights (CPU/RAM), Runtime Logs, escalado de contenedores.
- Supabase Dashboard: Reports (CPU/memoria/disco/conexiones), SQL Editor, Auth.

## 8. Vista de Datos

### 8.1. Diagrama de Base de Datos

_[INSERTAR: diagrama ER — reutilizar diagrama de clases del dominio (sección 5.6 del informe final) o captura del Schema Visualizer de Supabase]_

Tablas principales: `profiles`, `branches`, `services`, `barbers`, `business_hours`,
`appointments`, `waitlist_entries`, `memberships`.

### 8.2. Diccionario de datos — APPOINTMENTS (tabla central)

| COLUMNA | TIPO | NULO | DESCRIPCIÓN |
|---|---|---|---|
| id | UUID (PK) | No | Identificador único de la cita |
| client_id | UUID (FK profiles) | Sí | Cliente que reservó |
| branch_id | UUID (FK branches) | No | Sede de la cita |
| barber_id | UUID (FK barbers) | No | Barbero asignado |
| service_id | UUID (FK services) | No | Servicio reservado |
| customer_name / phone / email | VARCHAR | Sí | Datos de contacto del cliente |
| appointment_date | DATE | No | Fecha de la cita |
| start_time / end_time | TIME | No | Bloque horario reservado |
| status | TEXT (check) | No | `pending` · `confirmed` · `in_progress` · `completed` · `cancelled` · `no_show` |
| attendance_status | TEXT (check) | No | `pending` · `confirmed` · `declined` · `expired` (default `pending`) |
| attendance_confirmed_at | TIMESTAMPTZ | Sí | Momento de confirmación de asistencia |
| last_reminder_at / reminder_count | TIMESTAMPTZ / INT | Sí/No | Control de recordatorios |
| release_reason | TEXT (check) | Sí | `client_declined` · `client_cancelled` · `admin_cancelled` · `no_show` |
| payment_method / payment_status | TEXT | Sí | Método (TARJETA/YAPE/EFECTIVO) y estado del pago |
| notes | TEXT | Sí | Notas + trazas de auditoría `[EVENTO timestamp]` |
| created_at / updated_at | TIMESTAMPTZ | No | Auditoría de registro |

Índices relevantes: `appointments_attendance_status_idx`, `appointments_release_reason_idx`
(parcial, `release_reason IS NOT NULL`), índices de rendimiento por sede/fecha/barbero.

### 8.3. Diccionario de datos — WAITLIST_ENTRIES

| COLUMNA | TIPO | NULO | DESCRIPCIÓN |
|---|---|---|---|
| id | UUID (PK) | No | Identificador de la solicitud |
| client_id | UUID (FK profiles) | No | Cliente en espera |
| branch_id / service_id | UUID (FK) | No | Sede y servicio deseados |
| barber_id | UUID (FK) | Sí | Barbero preferido (null = cualquiera) |
| desired_date | DATE | No | Fecha deseada |
| desired_start_from / desired_start_to | TIME | Sí | Ventana horaria aceptable |
| status | TEXT (check) | No | `active` · `offered` · `accepted` · `rejected` · `expired` · `fulfilled` · `cancelled` |
| source_appointment_id | UUID (FK) | Sí | Cita cuya liberación originó la oferta |
| promoted_appointment_id | UUID (FK) | Sí | Cita creada al aceptar la oferta |
| offer_expires_at | TIMESTAMPTZ | Sí | Vencimiento de la oferta (2 h) |
| created_at / updated_at | TIMESTAMPTZ | No | Auditoría |

RLS: lectura/edición solo para el dueño de la entrada o el administrador de la sede
(`can_manage_branch`). La promoción `active → offered` la ejecuta el servidor con la
clave service-role, de forma acotada.

## 9. Capa de Integración

### 9.1. Validaciones del Sistema (health checks)

#### 9.1.1. Estatus de la Aplicación y Privilegios

| URL SERVICIOS | |
|---|---|
| PRD | `https://filo-estilo.vercel.app/api/admin/health` |
| LOCAL | `http://localhost:3000/api/admin/health` |

| Campo | Detalle |
|---|---|
| METHOD | GET |
| DESCRIPCIÓN | Verifica sesión y privilegios administrativos antes de renderizar el dashboard. |
| TIP. AUT. | Sesión activa (cookies) |
| BODY – RESPONSE | `{ "ok": true, "role": "admin", "memberships": [], "user_id": "uuid" }` |

#### 9.1.2. Estatus Base de Datos

La conexión a Supabase se valida implícitamente en `GET /api/booking/catalog` (consulta
relacional real). Respuesta 200 con datos = BD activa; 500 con mensaje controlado = incidencia.

### 9.5. Integraciones Externas

#### 9.5.1. Supabase Auth (identidad)

| Campo | Detalle |
|---|---|
| SERVICIO | `https://<proyecto>.supabase.co/auth/v1/*` (consumido vía SDK `@supabase/ssr`) |
| TIP. AUT. | Claves de proyecto (publishable en cliente; service-role solo en servidor) |
| OPERACIONES | signUp, signInWithPassword, signInWithOAuth (Google), exchangeCodeForSession, getUser, signOut |
| FLUJO OAUTH | App → Google (selección de cuenta) → Supabase callback → `{BASE}/auth/callback` → sesión emitida y perfil asegurado |

#### 9.5.2. Culqi (pagos)

| URL SERVICIOS | |
|---|---|
| EXTERNO | `https://api.culqi.com/v2/charges` |
| INTERNO | POST `{BASE}/api/payments/culqi/charge` |

| Campo | Detalle |
|---|---|
| METHOD | POST |
| DESCRIPCIÓN | Crea el cargo del pago de la reserva (tarjeta o Yape) y confirma las citas. |
| TIP. AUT. | Interno: sesión de cliente. Externo: `Authorization: Bearer CULQI_SECRET_KEY` (server-only). |

**BODY – REQUEST (interno):**
```json
{
  "token_id": "tkn_xxx",
  "payment_method": "card",
  "branch_id": "uuid", "barber_id": "uuid",
  "appointment_date": "2026-07-25",
  "selections": [{ "service_id": "uuid", "start_time": "10:00" }]
}
```

**BODY – RESPONSE (201):**
```json
{
  "ok": true,
  "charge_id": "chr_live_xxx",
  "items": [{ "id": "uuid", "status": "confirmed", "notes": "[PAGO CULQI] estado:pagado metodo:TARJETA tx:chr_xxx monto:35.00 moneda:PEN" }]
}
```

Manejo de fallo: si Culqi rechaza el cargo, el sistema ejecuta rollback (citas `cancelled`,
`payment_status: failed`) y responde 402 con el mensaje controlado de la pasarela.

### 9.6. Diagramas de Integración

_[INSERTAR: diagrama del módulo de integración — sección 5.7 del informe final]_

### 9.7. Listado de Servicios

| # | Servicio | Método | Autenticación | Origen |
|---|---|---|---|---|
| 1 | /api/auth/register · /login · /logout · /me | POST/GET | Pública / Sesión | Propio |
| 2 | /auth/callback (OAuth Google) | GET | Código OAuth | Supabase/Google |
| 3 | /api/booking/catalog · /availability | GET/POST | Pública | Propio |
| 4 | /api/my/appointments (+/{id}) | GET/POST/PATCH | Cliente | Propio |
| 5 | /api/my/waitlist (+accept/reject/cancel) | GET/POST | Cliente | Propio |
| 6 | /api/my/profile | GET/PATCH | Cliente | Propio |
| 7 | /api/admin/* (health, branches, services, barbers, business-hours, appointments, memberships) | GET/POST/PATCH | Admin/Owner + sede | Propio |
| 8 | /api/payments/culqi/charge | POST | Cliente | Culqi |
| 9 | /api/openapi · /reference | GET | Pública | Propio (documentación) |

### 9.8. Colección de pruebas API

Colección Bruno organizada por carpetas (Autenticación, Catálogo y Reserva, Administración
Base, Administración Operativa) — ver documento `docs/API_BRUNO.md` y especificación
OpenAPI navegable en `/reference`.

## 10. Configuraciones

La aplicación requiere las siguientes variables de entorno (almacenadas en `.env.local` en
desarrollo y como secretos cifrados en Vercel / DigitalOcean / GitHub Actions):

| Variable | Descripción | Ámbito |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | URL del proyecto Supabase | Build + Runtime |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Clave pública (anon) de Supabase | Build + Runtime |
| SUPABASE_SERVICE_ROLE_KEY | Clave de servicio (operaciones privilegiadas acotadas: promoción de waitlist, aprovisionamiento de perfiles) | Runtime (server-only) |
| CULQI_SECRET_KEY | Clave secreta de la pasarela de pagos | Runtime (server-only) |

Scripts SQL de aprovisionamiento (ejecutados en Supabase SQL Editor, idempotentes):
`step1_multibranch_foundation.sql`, `step2_rls_policies.sql`, `step3_performance_indexes.sql`,
`step4_noshow_waitlist.sql`.

## 11. Manejo de Excepciones

### 11.1. Mecanismos

1. Validación de entrada con **Zod** en cada API Route: payload inválido → 400 con detalle.
2. Bloques try/catch en integraciones externas (Supabase, Culqi) con mensajes controlados.
3. Rollback transaccional en el flujo de pago ante fallo de la pasarela.
4. **Log de auditoría de seguridad** (`[SECURITY]` JSON estructurado) para eventos de
   autenticación, accesos denegados y rate limiting — visible en Vercel Runtime Logs.
5. Notas auditadas por transición de estado en citas (`[ADMIN_NO_SHOW ...]`,
   `[CLIENT_CANCELLED ...]`, `[PAGO CULQI ...]`).

### 11.2. Códigos de error

| Código | Excepción | Cuándo se emite |
|---|---|---|
| 400 Bad Request | Validación Zod / regla de negocio | Payload inválido, fecha pasada, acción no permitida |
| 401 Unauthorized | Sin sesión | Token expirado o petición sin cookies de sesión |
| 402 Payment Required | Fallo de pago | Culqi rechaza el cargo (con rollback de citas) |
| 403 Forbidden | Sin privilegios | Cliente en rutas admin, o admin en sede no autorizada |
| 404 Not Found | Recurso inexistente | UUID de cita/servicio/barbero no encontrado |
| 409 Conflict | Duplicidad | Slot ya reservado para el mismo barbero/horario; email ya registrado |
| 422 Unprocessable | Transición inválida | Marcar `no_show` a una cita futura o en estado final |
| 429 Too Many Requests | Rate limiting | Exceso de intentos de login (5/60 s) o registro (3/60 s) |
| 500 Internal Error | Excepción no prevista | Error de infraestructura con mensaje controlado |

Estructura homogénea de error: `{ "error": "mensaje controlado", "details": { ... } }`.

## 12. Interfaces de Usuario

### 12.1. Iniciar Sesión

_[INSERTAR: captura de /login mostrando formulario + botón "Continuar con Google"]_

### 12.2. Flujo de Reserva

_[INSERTAR: captura de /reservar (pasos sede→servicio→barbero→horario→pago)]_

### 12.3. Mis Citas (asistencia y waitlist)

_[INSERTAR: captura de /mis-citas con botones "Confirmar asistencia" / "No podré asistir" y sección de lista de espera]_

### 12.4. Dashboard Administrativo

_[INSERTAR: captura de /admin/appointments mostrando el badge de confiabilidad (Confiable/Neutral/Alerta) junto al nombre del cliente]_

## 13. Control del Código

### 13.1. Repositorios de código fuente

- Repositorio principal (monorepo full-stack): https://github.com/Leonardnt01/filo-estilo

### 13.2. Esquema de ramas y versionamiento

- **main:** producción estable — cada push dispara build en Vercel; DigitalOcean despliega
  bajo demanda desde esta rama.
- **feature/\*:** desarrollo por funcionalidad (ej. `feature/terminar-noshow`,
  `feature/calidad.j`), integradas a `main` mediante merge tras pasar la suite de calidad.
- **CI:** GitHub Actions (`.github/workflows/playwright.yml`) compila el build de producción
  e inyecta secretos desde GitHub Repository Secrets; los artefactos de fallo (reporte HTML,
  trace.zip) se conservan 30 días.
- **Identificación de despliegues:** Vercel asigna hash único e inmutable por deployment,
  con capacidad de rollback instantáneo a cualquier versión previa.

---

_El presente entregable ha sido elaborado por el equipo del proyecto FILO ESTILO._

| APROBADORES | CARGO | FIRMA |
|---|---|---|
| Ecmias Eduardo Fernandez Galvez | Docente del curso | |
| Angel Jefferson Gonzalez Chaca | Product Owner | |
| Leonardo Matias Condori Navarro | Scrum Master | |
