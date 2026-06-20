# FILO_ESTILO API

## Guía Unificada de Endpoints y Pruebas en Bruno

Este documento reemplaza la guía separada de Bruno y concentra solo los endpoints más importantes del proyecto para pruebas funcionales, demo académica y sustentación.

## 1. Objetivo 123

La API de **FILO_ESTILO** soporta la plataforma web de reservas para barbería multi-sede. Esta guía está pensada para:

- probar los flujos clave en Bruno
- ordenar la colección por carpetas entendibles
- mostrar al profesor los endpoints más representativos
- evitar ruido con rutas secundarias o repetidas

## 2. Qué sí conviene mostrar

Para la sustentación no necesitas probar todo. Lo más fuerte del sistema hoy está en:

- autenticación y sesión
- catálogo público y disponibilidad
- reserva de citas por cliente
- control administrativo por sede
- seguridad por roles y validación de acceso

## 3. Configuración base para Bruno

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

### Nota importante de sesión

Para rutas protegidas, usa la misma colección o sesión en Bruno para conservar las cookies `HttpOnly` del login.

## 4. Estructura recomendada de carpetas en Bruno

Esta estructura está pensada para que se vea ordenada y rápida de entender:

```txt
FILO_ESTILO
├── 01. Autenticacion
├── 02. Catalogo y Reserva Cliente
├── 03. Administracion Base
├── 04. Administracion Operativa
└── 05. Validaciones Clave
```

## 5. Colección recomendada para Bruno

### 01. Autenticación

#### `POST Iniciar sesión - cliente o admin`

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

- `200` si las credenciales son válidas
- datos del usuario autenticado
- `role`
- `is_staff`
- `memberships`

Respuesta esperada resumida:

```json
{
  "ok": true,
  "user": {
    "id": "uuid",
    "email": "admin@mail.com",
    "role": "admin",
    "is_staff": true,
    "memberships": []
  }
}
```

#### `GET Ver sesión actual`

```http
GET {{baseUrl}}/api/auth/me
```

Devuelve:

- `200`
- `authenticated: true` si hay sesión
- `authenticated: false` si no hay sesión

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

#### `POST Cerrar sesión`

```http
POST {{baseUrl}}/api/auth/logout
```

Devuelve:

- `200`
- `{ "ok": true }`

### 02. Catálogo y Reserva Cliente

#### `GET Catálogo general de sedes y servicios`

```http
GET {{baseUrl}}/api/booking/catalog
```

Devuelve:

- `branches`
- `services`
- `barbers`

Uso recomendado:

- obtener un `branchId`
- identificar un `serviceId`
- identificar un `barberId`

#### `GET Catálogo filtrado por sede`

```http
GET {{baseUrl}}/api/booking/catalog?branch_id={{branchId}}
```

Devuelve:

- servicios y barberos solo de la sede indicada

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

Respuesta esperada resumida:

```json
{
  "ok": true,
  "slots": [
    {
      "start_time": "10:00",
      "end_time": "10:45"
    }
  ]
}
```

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
- `409` si el horario ya está tomado
- `400` si la fecha es inválida o pasada
- `401` si no hay sesión

#### `GET Ver mis citas`

```http
GET {{baseUrl}}/api/my/appointments
```

Devuelve:

- `200`
- solo las citas del usuario autenticado

Filtro útil:

```http
GET {{baseUrl}}/api/my/appointments?status=pending&limit=10
```

### 03. Administración Base

#### `GET Validar acceso administrativo`

```http
GET {{baseUrl}}/api/admin/health
```

Devuelve:

- `200` si el usuario tiene acceso admin
- `403` si es cliente sin permisos
- `401` si no hay sesión

Esta prueba luce mucho porque demuestra seguridad por rol.

#### `GET Listar sedes permitidas`

```http
GET {{baseUrl}}/api/admin/branches
```

Devuelve:

- `200`
- `items` con las sedes que puede administrar el usuario autenticado

Uso recomendado:

- tomar de aquí el `branchId` para las pruebas administrativas

### 04. Administración Operativa

#### `GET Listar servicios por sede`

```http
GET {{baseUrl}}/api/admin/services?branch_id={{branchId}}
```

Devuelve:

- `200`
- lista de servicios de la sede

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

Devuelve:

- `201`
- objeto `item` creado

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

Devuelve:

- `200`
- servicio actualizado

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

Devuelve:

- `201`
- objeto `item` creado

#### `PATCH Actualizar especialidad de barbero`

```http
PATCH {{baseUrl}}/api/admin/barbers/{{barberId}}
```

Body:

```json
{
  "specialty": "Clásico + premium"
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

Devuelve:

- `201`
- horario creado

Validaciones importantes:

- `day_of_week` entre `0` y `6`
- formato `HH:MM`
- `start_time` menor que `end_time`
- el `barber_id` debe pertenecer a la misma sede

#### `GET Listar citas administrativas`

```http
GET {{baseUrl}}/api/admin/appointments?branch_id={{branchId}}&limit=20
```

Devuelve:

- `200`
- citas con datos de cliente, servicio, barbero y sede

Filtro útil:

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

También puedes enviar:

```json
{
  "status": "completed",
  "notes": "Atención finalizada correctamente"
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

- `201` si la membresía se crea
- `404` si el usuario aún no existe en Auth
- `403` si el actor no puede gestionar esa sede

### 05. Validaciones Clave

Estas pruebas cortas te ayudan a mostrar que sí existe validación y seguridad:

#### `GET Admin sin sesión`

```http
GET {{baseUrl}}/api/admin/health
```

Esperado:

- `401`

#### `GET Mis citas sin sesión`

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

## 6. Flujo recomendado para demostrar al profesor

Este orden funciona bien en Bruno:

1. `POST Iniciar sesión - admin`
2. `GET Ver sesión actual`
3. `GET Validar acceso administrativo`
4. `GET Listar sedes permitidas`
5. `POST Crear servicio`
6. `POST Crear barbero`
7. `POST Crear horario de barbero`
8. `GET Catálogo general de sedes y servicios`
9. `POST Iniciar sesión - cliente`
10. `POST Consultar disponibilidad`
11. `POST Crear cita del cliente`
12. `GET Ver mis citas`
13. `POST Iniciar sesión - admin`
14. `GET Listar citas administrativas`
15. `PATCH Cambiar estado de cita`

## 7. Qué endpoints priorizar en la exposición

Si te falta tiempo, muestra solo estos:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/admin/health`
- `GET /api/admin/branches`
- `GET /api/booking/catalog`
- `POST /api/booking/availability`
- `POST /api/my/appointments`
- `GET /api/admin/appointments`
- `PATCH /api/admin/appointments/{id}`

## 8. Estados de cita

| Estado        | Descripción             |
| ------------- | ----------------------- |
| `pending`     | Cita pendiente          |
| `confirmed`   | Cita confirmada         |
| `in_progress` | Cliente siendo atendido |
| `completed`   | Servicio finalizado     |
| `cancelled`   | Cita cancelada          |
| `no_show`     | Cliente no asistió      |

## 9. Errores comunes al probar

| Error                               | Qué significa                            |
| ----------------------------------- | ---------------------------------------- |
| `401 Unauthorized`                  | No hay sesión activa                     |
| `403 Forbidden`                     | El usuario no tiene permisos suficientes |
| `404 User not found for this email` | El usuario aún no se registró            |
| `409` al crear cita                 | El horario ya está ocupado               |
| `400 Invalid payload`               | El body está incompleto o mal formado    |
| `429` en auth                       | Se activó el límite de intentos          |

## 10. Recomendación final

Para Bruno no intentes replicar toda la API. Quédate con una colección corta, limpia y demostrable. En tu caso, lo más sólido para sustentar es:

- autenticación
- control de acceso admin
- catálogo y disponibilidad
- creación de cita
- seguimiento administrativo de la cita
