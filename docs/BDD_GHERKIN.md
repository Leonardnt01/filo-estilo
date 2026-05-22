# BDD con Gherkin y Cucumber

Este proyecto usa BDD para validar historias de usuario con escenarios Gherkin.

## Historias cubiertas

- HU-01 Registro de cliente
- HU-02 Inicio y cierre de sesion
- HU-03 Catalogo por sede
- HU-04 Reserva y bloqueo de duplicidad
- HU-05 Mis citas (proteccion por sesion)
- HU-07 Acceso restringido y permitido a modulo admin
- HU-06, HU-08, HU-09, HU-10 documentadas como escenarios manuales

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

Todos los escenarios (incluye manuales/documentales):

```bash
npm run bdd:test:all
```
