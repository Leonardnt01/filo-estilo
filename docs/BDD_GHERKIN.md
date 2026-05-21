# BDD con Gherkin y Cucumber

Este proyecto usa BDD para validar historias de usuario con escenarios Gherkin.

## Historias cubiertas

- HU-01 Registro de cliente
- HU-02 Inicio y cierre de sesion
- HU-03 Catalogo por sede
- HU-04 Reserva y bloqueo de duplicidad
- HU-05 Mis citas (proteccion por sesion)
- HU-07 Acceso restringido a modulo admin
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

2. Definir un usuario confirmado para pruebas autenticadas en `.env.local`:

```txt
BDD_CLIENT_EMAIL=tu_correo_confirmado@mail.com
BDD_CLIENT_PASSWORD=tu_password
```

3. (Opcional) Cambiar URL base de pruebas:

```txt
BDD_BASE_URL=http://localhost:3001
```

## Ejecucion

Escenarios automatizados:

```bash
npm run bdd:test
```

Todos los escenarios (incluye manuales/documentales):

```bash
npm run bdd:test:all
```

