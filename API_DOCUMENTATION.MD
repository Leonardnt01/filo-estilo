# FILO ESTILO API

Documentacion tecnica del MVP real.

## 1. Resumen

La API soporta la gestion de citas para barberias multi-sede con:

- Next.js App Router
- Supabase Auth
- cookies de sesion en servidor
- autorizacion por rol global y membresias por sede
- RLS en PostgreSQL

## 2. Seguridad y autorizacion

### Autenticacion

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

La sesion se maneja con cookies seguras; el frontend no administra tokens manuales.

### Autorizacion

- Rol global en `public.profiles.role`
- Membresias por sede en `staff_memberships`
- Acceso admin permitido para:
  - admin global
  - owner/admin de al menos una sede

### RLS

El SQL de `supabase/step2_rls_policies.sql` usa:

- `public.is_admin()`
- `public.can_manage_branch(target_branch_id uuid)`

Con ello:

- el cliente solo ve sus propias citas
- admin global u owner/admin de sede gestionan recursos de su sede
- el catalogo publico solo expone datos activos

## 3. Contratos principales

### POST `/api/auth/register`

Request:

```json
{
  "email": "cliente@mail.com",
  "password": "Password123",
  "full_name": "Cliente Demo"
}
```

Respuestas:

- `201` registro exitoso
- `400` datos invalidos
- `409` correo ya registrado
- `429` rate limit

### POST `/api/auth/login`

Request:

```json
{
  "email": "cliente@mail.com",
  "password": "Password123"
}
```

Respuestas:

- `200` login exitoso
- `401` credenciales invalidas
- `429` demasiados intentos

### POST `/api/my/appointments`

Request:

```json
{
  "branch_id": "uuid",
  "barber_id": "uuid",
  "service_id": "uuid",
  "appointment_date": "2026-06-10",
  "start_time": "15:00",
  "notes": "[PAGO FICTICIO] metodo:EFECTIVO tx:TX-123",
  "initial_status": "pending"
}
```

Reglas:

- el estado real inicial es `pending`
- efectivo sigue como pago simulado
- Yape y tarjeta se procesan via Culqi desde `/api/payments/culqi/charge`
- se bloquean reservas activas duplicadas

### GET `/api/booking/catalog`

Devuelve:

- `branches`
- `services`
- `barbers`

Admite filtro por `branch_id`.

## 4. Endpoints administrativos

### GET `/api/admin/branches`

Lista solo las sedes gestionables por el actor autenticado.

### Services

- `GET /api/admin/services`
- `POST /api/admin/services`
- `PATCH /api/admin/services/:id`
- `DELETE /api/admin/services/:id`

### Barbers

- `GET /api/admin/barbers`
- `POST /api/admin/barbers`
- `PATCH /api/admin/barbers/:id`
- `DELETE /api/admin/barbers/:id`

### Business hours

- `GET /api/admin/business-hours`
- `POST /api/admin/business-hours`
- `PATCH /api/admin/business-hours/:id`
- `DELETE /api/admin/business-hours/:id`

### Appointments

- `GET /api/admin/appointments`
- `PATCH /api/admin/appointments/:id`

### Regla de permisos

- Si el actor intenta operar fuera de sus sedes permitidas: `403`
- Si no hay sesion: `401`

## 5. Alcance MVP

Incluido:

- autenticacion
- catalogo por sede
- reserva
- mis citas
- perfil
- operacion admin por sede

No incluido en esta fase:

- HU-06 cancelacion/reprogramacion como flujo oficial de MVP
- HU-07 CRUD completo de sedes

## 6. Endpoint publico de home

El endpoint oficial de home es:

- `GET /api/public/home`

`/api/home` queda como wrapper de compatibilidad para evitar duplicar logica.
