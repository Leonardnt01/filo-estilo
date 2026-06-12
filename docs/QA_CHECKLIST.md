# QA Checklist - Filo Estilo Multi-Sede

Checklist de validacion funcional para cierre de MVP y predeploy.

## 1) Auth y sesion

- [ ] `POST /api/auth/register` crea usuario cliente con `{ email, password, full_name }`.
- [ ] `POST /api/auth/register` responde `409` si el correo ya existe.
- [ ] `POST /api/auth/login` responde `200` y crea sesion.
- [ ] `POST /api/auth/login` responde `401` con credenciales invalidas.
- [ ] `POST /api/auth/login` responde `429` al exceder intentos.
- [ ] `POST /api/auth/logout` limpia sesion.
- [ ] `GET /api/auth/me` devuelve `authenticated: true` despues del login.

## 2) Cliente y catalogo

- [ ] `GET /api/booking/catalog` devuelve `branches`, `services` y `barbers`.
- [ ] `GET /api/booking/catalog?branch_id=...` filtra por sede.
- [ ] `/sedes` lista sedes activas.
- [ ] `/sedes/[slug]` muestra catalogo de la sede.

## 3) Reserva

- [ ] Flujo `/reservar`: sede -> servicio -> barbero -> fecha -> horario -> pago simulado -> confirmacion.
- [ ] El texto visible menciona "pago simulado" o "validacion ficticia interna".
- [ ] `POST /api/my/appointments` crea cita `pending`.
- [ ] La API rechaza reservas duplicadas activas.
- [ ] Al reservar, redirige a `/mis-citas?created=1`.

## 4) Mis citas y perfil

- [ ] `/mis-citas` muestra solo citas del usuario autenticado.
- [ ] El flujo normal no expone "Generar citas demo".
- [ ] `/perfil` permite actualizar `full_name` y `phone`.

## 5) Admin por sede

- [ ] `GET /api/admin/branches` solo lista sedes gestionables.
- [ ] Usuario cliente no accede a `/admin/*`.
- [ ] Admin global puede operar cualquier sede.
- [ ] Owner/admin de sede solo opera recursos de sus sedes.
- [ ] `admin/services` respeta permisos por sede.
- [ ] `admin/barbers` respeta permisos por sede.
- [ ] `admin/business-hours` respeta permisos por sede.
- [ ] `admin/appointments` respeta permisos por sede.

## 6) Backlog declarado

- [ ] HU-06 cancelacion/reprogramacion marcada como backlog en documentos finales.
- [ ] HU-07 CRUD completo de sedes marcado como backlog en documentos finales.

## 7) Build y deploy

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Variables de entorno cargadas en cloud:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

## 8) Evidencia

- [ ] Captura de BDD cliente
- [ ] Captura de BDD admin
- [ ] Captura del flujo de reserva con pago simulado
- [ ] Captura del panel admin restringido por sede
