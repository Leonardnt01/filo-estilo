# Step 2 - RLS y Politicas (Supabase)

## 1) Ejecutar script
En Supabase > SQL Editor, ejecuta el archivo:

- `supabase/step2_rls_policies.sql`

## 2) Que configura
- Funcion `public.is_admin()` para resolver rol admin desde `profiles`
- RLS habilitada en:
  - `profiles`
  - `services`
  - `barbers`
  - `business_hours`
  - `appointments`
- Politicas por rol:
  - Client: solo ve sus citas y puede crear solo sus citas
  - Admin: CRUD de catalogos y gestion total de citas
- Indice unico parcial para bloquear doble reserva activa por barbero/fecha/hora

## 3) Verificacion rapida
Con usuario `client` autenticado:
- `GET /api/auth/me` => 200 con `role: client`
- `GET /api/admin/health` => 403

Con usuario `admin` autenticado:
- `GET /api/admin/health` => 200
- `GET /api/admin/appointments` => 200

## 4) Nota importante
Este paso asume que las tablas y columnas ya existen con estos nombres exactos:
- `profiles(id, role, ...)`
- `services(..., is_active)`
- `barbers(..., is_active)`
- `business_hours(..., barber_id, is_active)`
- `appointments(client_id, barber_id, service_id, appointment_date, start_time, status, ...)`

Si algun nombre difiere, ajustamos el script antes de ejecutarlo.
