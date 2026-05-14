# QA Checklist - Filo Estilo Multi-Sede

Checklist de validacion funcional para cierre de proyecto (local + predeploy).

## 1) Auth y sesion (cookies SSR)

- [ ] `POST /api/auth/register` crea usuario client con `full_name`.
- [ ] `POST /api/auth/login` responde `ok: true` y setea cookie de sesion.
- [ ] `GET /api/auth/me` devuelve `authenticated: true` despues de login.
- [ ] `POST /api/auth/logout` limpia sesion.
- [ ] Sin sesion: `/admin/*` redirige o bloquea correctamente.

## 2) Roles y permisos

- [ ] Usuario client NO accede a `/admin/*`.
- [ ] Usuario owner/admin SI accede a `/admin/*`.
- [ ] `GET /api/admin/branches` solo muestra sedes permitidas para owner/admin.
- [ ] `GET /api/admin/health` responde 200 para owner/admin y 403 para client.

## 3) Multi-sede catalogo

- [ ] `GET /api/booking/catalog` devuelve `branches`, `services`, `barbers`.
- [ ] `GET /api/booking/catalog?branch_id=...` filtra por sede.
- [ ] `/sedes` lista sedes activas.
- [ ] `/sedes/[slug]` muestra servicios/barberos de esa sede.
- [ ] CTA a `/reservar?branch_id=...` preselecciona sede.

## 4) Reserva de cita

- [ ] Flujo completo en `/reservar`: sede -> servicio -> barbero -> fecha -> horario.
- [ ] `POST /api/booking/availability` devuelve slots validos por sede/barbero/servicio.
- [ ] `POST /api/my/appointments` crea cita `pending`.
- [ ] En conflicto de horario activo, API rechaza y no duplica.
- [ ] Al reservar, redirige a `/mis-citas?created=1`.

## 5) Mis citas y perfil

- [ ] `/mis-citas` muestra solo citas del usuario autenticado.
- [ ] `/perfil` carga datos del profile y permite actualizar `full_name/phone`.
- [ ] Usuario client no puede ver citas de otros.

## 6) Admin operacion por sede

- [ ] `admin/services`: CRUD y activar/desactivar por sede.
- [ ] `admin/barbers`: CRUD y activar/desactivar por sede.
- [ ] `admin/business-hours`: CRUD por sede y validez de barber de la misma sede.
- [ ] `admin/appointments`: filtro por sede, estado y cambio de estado.
- [ ] `admin/staff`: alta por email y toggle de membresia.

## 7) Casos de error HTTP (usabilidad minima)

- [ ] 400 payload invalido: mensaje claro en UI.
- [ ] 401 no autenticado: bloquea acciones privadas.
- [ ] 403 sin permisos: no mostrar acciones restringidas.
- [ ] 404 usuario no encontrado en staff por email.
- [ ] 409 registro duplicado en auth/register.
- [ ] 500 inesperado: UI muestra error usable.

## 8) Build y deploy readiness

- [ ] `npm run lint` sin errores.
- [ ] `npm run build` exitoso.
- [ ] Variables en Vercel cargadas correctamente:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Smoke test en produccion:
  - Home carga
  - Login/register
  - Reservar
  - Admin por sede

---

Si un item falla, registrar:
1. Endpoint/pantalla
2. Request exacto
3. Response y status
4. Captura
5. Repro pasos

