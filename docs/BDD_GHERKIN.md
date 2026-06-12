# BDD con Gherkin y Cucumber

Este proyecto usa BDD para validar los flujos criticos del MVP real de FILO ESTILO.

## Alcance del MVP cubierto

- HU-01 Registro de cliente
- HU-02 Inicio y cierre de sesion
- HU-03 Catalogo por sede
- HU-04 Reserva de cita
- HU-05 Mis citas
- HU-08 Gestion de servicios por sede
- HU-09 Gestion de barberos y horarios
- HU-10 Gestion administrativa de citas

## Backlog fuera del MVP final

- HU-06 Cancelacion y reprogramacion
- HU-07 CRUD completo de sedes

## Nota de trazabilidad

- El archivo `bdd/features/administrator-access.feature` se conserva como prueba automatizada de seguridad y autorizacion del modulo administrativo.
- Ese escenario valida controles 401, 403 y 200, pero en la documentacion final se presenta como control transversal de seguridad, no como HU-07 del MVP.

## Matriz de alineacion

- HU-01 y HU-02: `bdd/features/client-authentication.feature`
- HU-03, HU-04 y HU-05: `bdd/features/client-booking.feature`
- Control transversal de seguridad admin: `bdd/features/administrator-access.feature`
- Escenarios manuales/documentales de backlog o evidencia operativa: `bdd/features/manual-backlog.feature`

## Reglas de negocio observables que valida BDD

- `POST /api/auth/register` usa `{ email, password, full_name }`.
- `POST /api/auth/login` responde `200`, `401` o `429` segun el caso.
- `POST /api/my/appointments` registra citas con estado inicial `pending`.
- El flujo de reserva usa pago simulado con validacion ficticia interna.
- El catalogo se consulta desde `GET /api/booking/catalog`.
- El modulo admin exige sesion y permisos validos.

## Requisitos previos

1. Levantar servidor:

```bash
npm run dev
```

2. Definir credenciales reales en `.env.local`:

```txt
BDD_CLIENT_EMAIL=tu_correo_confirmado@mail.com
BDD_CLIENT_PASSWORD=tu_password
BDD_ADMIN_EMAIL=tu_admin_confirmado@mail.com
BDD_ADMIN_PASSWORD=tu_password_admin
```

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

Todos los escenarios:

```bash
npm run bdd:test:all
```
