# BDD con Gherkin y Cucumber

Este proyecto usa BDD para validar historias de usuario con escenarios Gherkin.

## Historias cubiertas

- HU-01 Registro de cliente (manual por limite de email provider en Supabase free)
- HU-02 Inicio y cierre de sesion
- HU-03 Catalogo por sede
- HU-04 Reserva y bloqueo de duplicidad
- HU-05 Mis citas (proteccion por sesion)
- HU-07 Acceso restringido y permitido a modulo admin
- HU-06, HU-08, HU-09, HU-10 documentadas como escenarios manuales

Nota de estabilidad:

- HU-01 se mantiene en manual porque el endpoint de registro dispara envio de email y Supabase (plan free / SMTP por defecto) aplica limite estricto por hora.
- Se agregaron escenarios automatizados objetivos para:
  - Rate limit en login (HTTP 429 + cabecera Retry-After).
  - Mis citas con sesion activa (HTTP 200).
  - Reserva rechazada por fecha pasada (HTTP 400).

## Matriz de alineacion HU -> Feature

- HU-01, HU-02: `bdd/features/client-authentication.feature`
- HU-03, HU-04, HU-05: `bdd/features/client-booking.feature`
- HU-07: `bdd/features/administrator-access.feature`
- HU-06, HU-08, HU-09, HU-10 (manual): `bdd/features/manual-backlog.feature`

## Estructura

- `bdd/features/*.feature`
- `bdd/steps/api.steps.mjs`
- `bdd/support/world.mjs`

## Requisitos previos

1. Levantar servidor:

```bash
npm run dev
```

2. Definir usuarios confirmados para pruebas autenticadas en `.env.local`:

```txt
BDD_CLIENT_EMAIL=tu_correo_confirmado@mail.com
BDD_CLIENT_PASSWORD=tu_password
BDD_ADMIN_EMAIL=tu_admin_confirmado@mail.com
BDD_ADMIN_PASSWORD=tu_password_admin
```

Nota:

- Las variables se leen automaticamente desde `.env.local` al ejecutar Cucumber.
- `BDD_CLIENT_*` debe ser un usuario con rol cliente.
- `BDD_ADMIN_*` debe ser un usuario con rol admin.

## Ejecucion

Escenarios automatizados:

```bash
npm run bdd:test
```

Solo cliente:

```bash
npm run bdd:test:client
```

Solo administrador:

```bash
npm run bdd:test:admin
```

Solo manual/documental:

```bash
npm run bdd:test:manual
```

Todos los escenarios (incluye manuales/documentales):

```bash
npm run bdd:test:all
```
