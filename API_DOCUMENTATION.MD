# FILO_ESTILO API

## Documentación Técnica — MVP Seguro

---

# 1. Objetivo

La API de **FILO_ESTILO** soporta la plataforma web de gestión de citas para barberías.

## Características principales

- Autenticación mediante Supabase Auth
- Manejo de sesión con cookies HttpOnly
- Control de acceso por roles (`admin` / `client`)
- Middleware para protección de rutas privadas
- Seguridad mediante RLS (Row Level Security)

---

# 2. Arquitectura de Seguridad

## 2.1 Autenticación

La autenticación se realiza utilizando Supabase Auth mediante:

- email
- password

### Endpoint principal

```http
POST /api/auth/login
```

La sesión se almacena automáticamente en cookies seguras HttpOnly.

No se manejan tokens manualmente en frontend.

---

## 2.2 Autorización por Rol

El rol del usuario se almacena en:

```txt
public.profiles.role
```

La API obtiene el rol consultando:

```txt
profiles.id = auth.user.id
```

## Roles disponibles

| Rol | Permisos |
|---|---|
| admin | Acceso completo a `/api/admin/*` |
| client | Acceso limitado a sus propios recursos |

---

## 2.3 Middleware

El middleware protege las siguientes rutas:

```txt
/admin/*
/api/admin/*
```

## Respuestas esperadas

| Caso | Código |
|---|---|
| Usuario no autenticado | 401 Unauthorized |
| Usuario sin permisos admin | 403 Forbidden |
| Usuario admin válido | 200 OK |

---

## 2.4 Seguridad con RLS

Supabase utiliza Row Level Security (RLS) para proteger los datos.

## Restricciones implementadas

- Los clientes solo pueden visualizar sus propias citas.
- Los administradores pueden gestionar todas las citas.
- No se permiten reservas activas duplicadas.

## Restricción de integridad

No puede existir más de una cita activa con:

```txt
barber_id + appointment_date + start_time
```

## Estados considerados activos

```txt
pending
confirmed
in_progress
```

---

# 3. Estados de Cita

| Estado | Descripción |
|---|---|
| pending | Cita pendiente |
| confirmed | Cita confirmada |
| in_progress | Cliente siendo atendido |
| completed | Servicio finalizado |
| cancelled | Cita cancelada |
| no_show | Cliente no asistió |

---

# 4. Endpoints Implementados

---

# 4.1 Auth

## POST `/api/auth/login`

Inicia sesión y devuelve el usuario autenticado.

### Body

```json
{
  "email": "usuario@mail.com",
  "password": "clave"
}
```

### Respuesta Exitosa

```json
{
  "ok": true,
  "user": {
    "id": "uuid",
    "email": "usuario@mail.com",
    "role": "admin"
  }
}
```

---

## POST `/api/auth/logout`

Cierra la sesión actual.

### Respuesta

```json
{
  "ok": true
}
```

---

## GET `/api/auth/me`

Devuelve el usuario autenticado actual.

### Respuesta

```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "usuario@mail.com",
    "role": "admin"
  }
}
```

---

# 4.2 Admin — Health

## GET `/api/admin/health`

Valida acceso admin.

## Respuestas esperadas

| Caso | Código |
|---|---|
| Admin válido | 200 OK |
| Usuario client | 403 Forbidden |
| Usuario no autenticado | 401 Unauthorized |

---

# 4.3 Admin — Services

## GET `/api/admin/services`

Lista servicios registrados.

### Query Params opcionales

```txt
only_active=true
```

---

## POST `/api/admin/services`

Crea un nuevo servicio.

### Body

```json
{
  "name": "Corte clásico",
  "description": "Servicio base",
  "price": 30,
  "duration_minutes": 30,
  "is_active": true
}
```

---

## PATCH `/api/admin/services/:id`

Actualiza parcialmente un servicio.

### Body parcial

```json
{
  "price": 35
}
```

---

## DELETE `/api/admin/services/:id`

Soft delete del servicio:

```txt
is_active = false
```

---

# 4.4 Admin — Barbers

## GET `/api/admin/barbers`

Lista barberos.

### Query Params opcionales

```txt
only_active=true
```

---

## POST `/api/admin/barbers`

Crea un nuevo barbero.

### Body

```json
{
  "full_name": "Carlos Mendoza",
  "specialty": "Fade",
  "image_url": "https://example.com/barber.jpg",
  "is_active": true
}
```

---

## PATCH `/api/admin/barbers/:id`

Actualiza parcialmente un barbero.

### Body parcial

```json
{
  "specialty": "Fade y barba"
}
```

---

## DELETE `/api/admin/barbers/:id`

Soft delete:

```txt
is_active = false
```

---

# 4.5 Admin — Business Hours

## GET `/api/admin/business-hours`

Lista horarios de atención.

### Query Params opcionales

```txt
barber_id=<uuid>
only_active=true
```

---

## POST `/api/admin/business-hours`

Crea un horario de atención.

### Body

```json
{
  "barber_id": "UUID_BARBER",
  "day_of_week": 1,
  "start_time": "09:00",
  "end_time": "18:00",
  "is_active": true
}
```

## Validaciones

- `day_of_week` entre 0 y 6
- Formato de hora `HH:MM`
- `start_time < end_time`
- `barber_id` existente

---

## PATCH `/api/admin/business-hours/:id`

Actualiza parcialmente un horario.

### Body parcial

```json
{
  "start_time": "10:00",
  "end_time": "19:00"
}
```

---

## DELETE `/api/admin/business-hours/:id`

Elimina un horario.

---

# 4.6 Admin — Appointments

## GET `/api/admin/appointments`

Lista citas registradas.

### Query Params opcionales

```txt
status
barber_id
service_id
date_from=YYYY-MM-DD
date_to=YYYY-MM-DD
limit=1..100
```

---

## PATCH `/api/admin/appointments/:id`

Actualiza parcialmente una cita.

### Body parcial

```json
{
  "status": "confirmed",
  "notes": "Cliente confirmó por WhatsApp"
}
```

---

# 4.7 Cliente — Mis Citas

## GET `/api/my/appointments`

Devuelve únicamente las citas del usuario autenticado.

## Restricción

```txt
client_id = auth.uid()
```

### Query Params opcionales

```txt
status
date_from
date_to
limit
```

---

# 5. Flujo de Pruebas Recomendado

1. `POST /api/auth/login`
2. `GET /api/auth/me`
3. `GET /api/admin/health`
4. CRUD de:
   - services
   - barbers
   - business-hours
5. Gestión admin de appointments
6. `GET /api/my/appointments`

---

# 6. Errores Comunes

| Error | Descripción |
|---|---|
| `{id}` literal en URL | Debe enviarse UUID real |
| `Content-Type` en query params | Debe enviarse en headers |
| Usuario sin fila en profiles | Existe en `auth.users` pero no en `public.profiles` |
| Acceso admin con role client | Devuelve 403 Forbidden |

---

# 7. Estado Actual del Proyecto

## MVP Backend Seguro Implementado

- Auth SSR con cookies
- Middleware seguro
- Control de roles
- CRUD de services
- CRUD de barbers
- CRUD de business_hours
- Gestión admin de appointments
- Endpoints client (`my appointments`)
- Seguridad mediante RLS
- Protección server-side + database-level security