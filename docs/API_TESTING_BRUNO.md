# FILO_ESTILO API

## Guia Unificada de Endpoints y Pruebas en Bruno

Este documento concentra los endpoints mas importantes del proyecto para pruebas funcionales, demo academica y sustentacion.

## 1. Objetivo

La API de **FILO_ESTILO** soporta la plataforma web de reservas para barberia multi-sede. Esta guia esta pensada para:

- probar los flujos clave en Bruno
- ordenar la coleccion por carpetas entendibles
- mostrar los endpoints mas representativos
- evitar ruido con rutas secundarias o repetidas

## 2. Que conviene mostrar

Lo mas fuerte del sistema hoy esta en:

- autenticacion y sesion
- catalogo publico y disponibilidad
- reserva de citas por cliente
- control administrativo por sede
- seguridad por roles y validacion de acceso

## 3. Configuracion base para Bruno

### Base URL local

```txt
http://localhost:3000
```

### Variables recomendadas

```txt
baseUrl=http://localhost:3000
branchId=
serviceId=
barberId=
appointmentId=
membershipId=
clientEmail=
clientPassword=
adminEmail=
adminPassword=
```

### Nota importante de sesion

Para rutas protegidas, usa la misma coleccion o sesion en Bruno para conservar las cookies `HttpOnly` del login.

### Referencia interactiva disponible

Si quieres inspeccionar contratos y respuestas antes de probar en Bruno, usa la documentacion interactiva de Scalar:

```txt
http://localhost:3000/reference
```

Redireccion adicional disponible:

```txt
http://localhost:3000/api-docs
```

## 4. Estructura recomendada de carpetas en Bruno

```txt
FILO_ESTILO
|-- 01. Autenticacion
|-- 02. Catalogo y Reserva Cliente
|-- 03. Administracion Base
|-- 04. Administracion Operativa
`-- 05. Validaciones Clave
```

## 5. Coleccion recomendada para Bruno

### 01. Autenticacion

#### `POST Iniciar sesion - cliente o admin`

```http
POST {{baseUrl}}/api/auth/login
```

Body:

```json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
```

Devuelve:

- `200` si las credenciales son validas
- datos del usuario autenticado
- `role`
- `is_staff`
- `memberships`

#### `GET Ver sesion actual`

```http
GET {{baseUrl}}/api/auth/me
```

Devuelve:

- `200`
- `authenticated: true` si hay sesion
- `authenticated: false` si no hay sesion

#### `POST Registrar cliente`

```http
POST {{baseUrl}}/api/auth/register
```

Body:

```json
{
  "email": "cliente_demo@mail.com",
  "password": "123456",
  "full_name": "Cliente Demo"
}
```

Devuelve:

- `201` si registra correctamente
- `409` si el correo ya existe
- `429` si se excede el rate limit

#### `POST Cerrar sesion`

```http
POST {{baseUrl}}/api/auth/logout
```

Devuelve:

- `200`
- `{ "ok": true }`

### 02. Catalogo y Reserva Cliente

#### `GET Catalogo general de sedes y servicios`

```http
GET {{baseUrl}}/api/booking/catalog
```

Uso recomendado:

- obtener un `branchId`
- identificar un `serviceId`
- identificar un `barberId`

#### `GET Catalogo filtrado por sede`

```http
GET {{baseUrl}}/api/booking/catalog?branch_id={{branchId}}
```

#### `POST Consultar disponibilidad`

```http
POST {{baseUrl}}/api/booking/availability
```

Body:

```json
{
  "branch_id": "{{branchId}}",
  "barber_id": "{{barberId}}",
  "service_id": "{{serviceId}}",
  "appointment_date": "2026-06-20"
}
```

Devuelve:

- `200`
- lista de `slots` disponibles

#### `POST Crear cita del cliente`

```http
POST {{baseUrl}}/api/my/appointments
```

Body:

```json
{
  "branch_id": "{{branchId}}",
  "barber_id": "{{barberId}}",
  "service_id": "{{serviceId}}",
  "appointment_date": "2026-06-20",
  "start_time": "10:00",
  "notes": "Reserva de prueba Bruno"
}
```

Devuelve:

- `201` si la cita se crea
- `409` si el horario ya esta tomado
- `400` si la fecha es invalida o pasada
- `401` si no hay sesion

#### `GET Ver mis citas`

```http
GET {{baseUrl}}/api/my/appointments
```

Filtro util:

```http
GET {{baseUrl}}/api/my/appointments?status=pending&limit=10
```

### 03. Administracion Base

#### `GET Validar acceso administrativo`

```http
GET {{baseUrl}}/api/admin/health
```

Devuelve:

- `200` si el usuario tiene acceso admin
- `403` si es cliente sin permisos
- `401` si no hay sesion

#### `GET Listar sedes permitidas`

```http
GET {{baseUrl}}/api/admin/branches
```

Uso recomendado:

- tomar de aqui el `branchId` para las pruebas administrativas

### 04. Administracion Operativa

#### `GET Listar servicios por sede`

```http
GET {{baseUrl}}/api/admin/services?branch_id={{branchId}}
```

#### `POST Crear servicio`

```http
POST {{baseUrl}}/api/admin/services
```

Body:

```json
{
  "branch_id": "{{branchId}}",
  "name": "Corte Skin Fade",
  "description": "Servicio de prueba para Bruno",
  "price": 35,
  "duration_minutes": 45
}
```

#### `PATCH Actualizar precio de servicio`

```http
PATCH {{baseUrl}}/api/admin/services/{{serviceId}}
```

Body:

```json
{
  "price": 40
}
```

#### `GET Listar barberos por sede`

```http
GET {{baseUrl}}/api/admin/barbers?branch_id={{branchId}}
```

#### `POST Crear barbero`

```http
POST {{baseUrl}}/api/admin/barbers
```

Body:

```json
{
  "branch_id": "{{branchId}}",
  "full_name": "Barbero Demo",
  "specialty": "Fade y barba"
}
```

#### `PATCH Actualizar especialidad de barbero`

```http
PATCH {{baseUrl}}/api/admin/barbers/{{barberId}}
```

Body:

```json
{
  "specialty": "Clasico + premium"
}
```

#### `GET Listar horarios por sede`

```http
GET {{baseUrl}}/api/admin/business-hours?branch_id={{branchId}}
```

#### `POST Crear horario de barbero`

```http
POST {{baseUrl}}/api/admin/business-hours
```

Body:

```json
{
  "branch_id": "{{branchId}}",
  "barber_id": "{{barberId}}",
  "day_of_week": 1,
  "start_time": "09:00",
  "end_time": "18:00"
}
```

Validaciones importantes:

- `day_of_week` entre `0` y `6`
- formato `HH:MM`
- `start_time` menor que `end_time`
- el `barber_id` debe pertenecer a la misma sede

#### `GET Listar citas administrativas`

```http
GET {{baseUrl}}/api/admin/appointments?branch_id={{branchId}}&limit=20
```

Filtro util:

```http
GET {{baseUrl}}/api/admin/appointments?branch_id={{branchId}}&status=pending
```

#### `PATCH Cambiar estado de cita`

```http
PATCH {{baseUrl}}/api/admin/appointments/{{appointmentId}}
```

Body:

```json
{
  "status": "confirmed"
}
```

#### `GET Listar staff por sede`

```http
GET {{baseUrl}}/api/admin/memberships?branch_id={{branchId}}
```

#### `POST Agregar staff por correo`

```http
POST {{baseUrl}}/api/admin/memberships
```

Body:

```json
{
  "email": "barbero_demo@mail.com",
  "branch_id": "{{branchId}}",
  "role": "barber"
}
```

Devuelve:

- `201` si la membresia se crea
- `404` si el usuario aun no existe en Auth
- `403` si el actor no puede gestionar esa sede

### 05. Validaciones Clave

#### `GET Admin sin sesion`

```http
GET {{baseUrl}}/api/admin/health
```

Esperado:

- `401`

#### `GET Mis citas sin sesion`

```http
GET {{baseUrl}}/api/my/appointments
```

Esperado:

- `401`

#### `POST Login con credenciales incorrectas`

```http
POST {{baseUrl}}/api/auth/login
```

Body:

```json
{
  "email": "incorrecto@mail.com",
  "password": "xxxxxx"
}
```

Esperado:

- `401`

#### `POST Crear cita duplicada`

Repite la misma reserva:

```txt
branch_id + barber_id + appointment_date + start_time
```

Esperado:

- primera llamada `201`
- segunda llamada `409`

## 6. Flujo recomendado para demostrar

1. `POST Iniciar sesion - admin`
2. `GET Ver sesion actual`
3. `GET Validar acceso administrativo`
4. `GET Listar sedes permitidas`
5. `POST Crear servicio`
6. `POST Crear barbero`
7. `POST Crear horario de barbero`
8. `GET Catalogo general de sedes y servicios`
9. `POST Iniciar sesion - cliente`
10. `POST Consultar disponibilidad`
11. `POST Crear cita del cliente`
12. `GET Ver mis citas`
13. `POST Iniciar sesion - admin`
14. `GET Listar citas administrativas`
15. `PATCH Cambiar estado de cita`

## 7. Orden recomendado entre Scalar y Bruno

1. Abre `http://localhost:3000/reference` para mostrar el contrato.
2. Usa Bruno para ejecutar `login`.
3. Mantiene la misma sesion para probar endpoints protegidos.
4. Vuelve a Scalar si necesitas explicar request, response o estados HTTP.

## 8. Endpoints a priorizar si hay poco tiempo

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/admin/health`
- `GET /api/admin/branches`
- `GET /api/booking/catalog`
- `POST /api/booking/availability`
- `POST /api/my/appointments`
- `GET /api/admin/appointments`
- `PATCH /api/admin/appointments/{id}`

## 9. Estados de cita

| Estado | Descripcion |
|---|---|
| `pending` | Cita pendiente |
| `confirmed` | Cita confirmada |
| `in_progress` | Cliente siendo atendido |
| `completed` | Servicio finalizado |
| `cancelled` | Cita cancelada |
| `no_show` | Cliente no asistio |

## 10. Errores comunes al probar

| Error | Que significa |
|---|---|
| `401 Unauthorized` | No hay sesion activa |
| `403 Forbidden` | El usuario no tiene permisos suficientes |
| `404 User not found for this email` | El usuario aun no se registro |
| `409` al crear cita | El horario ya esta ocupado |
| `400 Invalid payload` | El body esta incompleto o mal formado |
| `429` en auth | Se activo el limite de intentos |

## 11. Recomendacion final

Para Bruno no intentes replicar toda la API. Quedate con una coleccion corta, limpia y demostrable. Lo mas solido para sustentar es:

- autenticacion
- control de acceso admin
- catalogo y disponibilidad
- creacion de cita
- seguimiento administrativo de la cita
