# Filo Estilo

Plataforma web de reservas para barberias.  
Permite mostrar servicios, horarios disponibles y facilitar la reserva de citas de forma rapida.

![Next.js](https://img.shields.io/badge/Next.js-16.2.4-000000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19.2.4-61DAFB?logo=react&logoColor=000)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Status](https://img.shields.io/badge/Status-En%20desarrollo-F59E0B)

## Demo local

```bash
http://localhost:3000
```

## Tecnologias

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- ESLint 9

## Estructura del proyecto

```text
filo-estilo/
├─ public/                 # Recursos estaticos (imagenes, iconos, etc.)
├─ src/
│  └─ app/
│     ├─ globals.css       # Estilos globales
│     ├─ layout.tsx        # Layout raiz y metadata
│     └─ page.tsx          # Landing principal
├─ package.json
└─ README.md
```

## Instalacion y ejecucion

1. Clona el repositorio:

```bash
git clone <https://github.com/Leonardnt01/Filo-Estilo.git>
cd filo-estilo
```

2. Instala dependencias:

```bash
npm install
```

3. Ejecuta en desarrollo:

```bash
npm run dev
```

4. Build de produccion:

```bash
npm run build
npm run start
```

## Scripts disponibles

- `npm run dev`: Levanta el servidor en modo desarrollo
- `npm run build`: Genera build optimizado de produccion
- `npm run start`: Sirve la build de produccion
- `npm run lint`: Ejecuta validaciones con ESLint
- `npm run test:unit`: Ejecuta pruebas unitarias con Vitest
- `npm run test:unit:watch`: Ejecuta Vitest en modo observacion
- `npm run bdd:test`: Ejecuta escenarios BDD automatizados
- `npm run bdd:test:client`: Ejecuta BDD del flujo cliente
- `npm run bdd:test:admin`: Ejecuta BDD del flujo admin

## Documentacion QA y pruebas API

- Checklist QA: [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md)
- Guia Bruno/Postman: [docs/API_TESTING_BRUNO.md](docs/API_TESTING_BRUNO.md)
- BDD con Cucumber y Gherkin: [docs/BDD_GHERKIN.md](docs/BDD_GHERKIN.md)
- TDD con Vitest: [docs/TDD_VITEST.md](docs/TDD_VITEST.md)

## Roadmap funcional

- [ ] Landing comercial de barberia
- [ ] Catalogo de servicios (corte, barba, premium, etc.)
- [ ] Agenda por barbero con franjas horarias
- [ ] Reserva en linea con confirmacion
- [ ] Panel para administracion de citas
- [ ] Recordatorios por WhatsApp o correo

## Objetivo del proyecto

Reducir la friccion al reservar citas en barberias, mejorando la experiencia del cliente y el control operativo del negocio.

## Autor

Desarrollado por **Filo Estilo**.

---

Si este proyecto te resulta util, deja una estrella en GitHub.
