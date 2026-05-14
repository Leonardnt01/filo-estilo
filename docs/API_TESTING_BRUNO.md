# API Testing Guide (Bruno/Postman) - Filo Estilo

Base URL local:

```txt
http://localhost:3000
```

Nota: Para rutas protegidas, usa la misma coleccion/sesion para conservar cookies.

## 1) Auth

### Register

`POST /api/auth/register`

```json
{
  "email": "cliente_demo@mail.com",
  "password": "123456",
  "full_name": "Cliente Demo"
}
```

Esperado:
- 201 creado
- Si existe: 409

### Login

`POST /api/auth/login`

```json
{
  "email": "cliente_demo@mail.com",
  "password": "123456"
}
```

Esperado:
- 200
- `user.role`, `user.is_staff`, `memberships`

### Me

`GET /api/auth/me`

Esperado:
- 200 autenticado
- 401 sin sesion

### Logout

`POST /api/auth/logout`

Esperado:
- 200

## 2) Catalogo y reservas

### Catalogo general

`GET /api/booking/catalog`

### Catalogo por sede

`GET /api/booking/catalog?branch_id={BRANCH_ID}`

### Disponibilidad

`POST /api/booking/availability`

```json
{
  "branch_id": "{BRANCH_ID}",
  "barber_id": "{BARBER_ID}",
  "service_id": "{SERVICE_ID}",
  "appointment_date": "2026-05-20"
}
```

### Crear cita (usuario logueado)

`POST /api/my/appointments`

```json
{
  "branch_id": "{BRANCH_ID}",
  "barber_id": "{BARBER_ID}",
  "service_id": "{SERVICE_ID}",
  "appointment_date": "2026-05-20",
  "start_time": "10:00",
  "notes": "Sin observaciones"
}
```

### Mis citas

`GET /api/my/appointments`

## 3) Admin base

### Health (permiso)

`GET /api/admin/health`

### Sedes permitidas

`GET /api/admin/branches`

## 4) Admin servicios

### Listar

`GET /api/admin/services?branch_id={BRANCH_ID}`

### Crear

`POST /api/admin/services`

```json
{
  "branch_id": "{BRANCH_ID}",
  "name": "Corte Skin Fade",
  "description": "Corte moderno",
  "price": 35,
  "duration_minutes": 45
}
```

### Actualizar

`PATCH /api/admin/services/{SERVICE_ID}`

```json
{
  "price": 40
}
```

## 5) Admin barberos

### Listar

`GET /api/admin/barbers?branch_id={BRANCH_ID}`

### Crear

`POST /api/admin/barbers`

```json
{
  "branch_id": "{BRANCH_ID}",
  "full_name": "Barbero Demo",
  "specialty": "Fade y barba"
}
```

### Actualizar

`PATCH /api/admin/barbers/{BARBER_ID}`

```json
{
  "specialty": "Clásico + premium"
}
```

## 6) Admin horarios

### Listar

`GET /api/admin/business-hours?branch_id={BRANCH_ID}`

### Crear

`POST /api/admin/business-hours`

```json
{
  "branch_id": "{BRANCH_ID}",
  "barber_id": "{BARBER_ID}",
  "day_of_week": 1,
  "start_time": "09:00",
  "end_time": "18:00"
}
```

## 7) Admin citas

### Listar

`GET /api/admin/appointments?branch_id={BRANCH_ID}&limit=20`

### Cambiar estado

`PATCH /api/admin/appointments/{APPOINTMENT_ID}`

```json
{
  "status": "confirmed"
}
```

## 8) Admin staff (owner/admin)

### Listar staff por sede

`GET /api/admin/memberships?branch_id={BRANCH_ID}`

### Agregar staff por email

`POST /api/admin/memberships`

```json
{
  "email": "barbero_demo@mail.com",
  "branch_id": "{BRANCH_ID}",
  "role": "barber"
}
```

Si el usuario no existe en auth:
- 404 `User not found for this email. The user must register first.`

### Activar/desactivar membresia

`PATCH /api/admin/memberships/{MEMBERSHIP_ID}`

```json
{
  "is_active": false
}
```

## 9) Orden sugerido de pruebas

1. Login admin/owner
2. Obtener `branch_id` de `/api/admin/branches`
3. Crear service + barber + business_hours
4. Login client
5. Crear cita
6. Login admin/owner
7. Ver cita y cambiar estado
8. Probar staff por email

