# ACTA DE CIERRE DE HITO

**FILO ESTILO — Plataforma Web de Reservas para Barberías** &nbsp;&nbsp;|&nbsp;&nbsp; Página 1 de 1

| TEMA: | Cierre: "Fin del Proyecto" | N° ACTA: | 0001 |
|---|---|---|---|

## Control de Versiones

| | | | |
|---|---|---|---|
| **FECHA:** | 17/07/2026 | **Versión:** | 1.0 |
| **Elaborado por:** | Leonardo Matías _(equipo FILO ESTILO)_ | | |

---

## Actividades de Cierre

✓ Se realizaron sesiones de trabajo para la revisión del documento de especificación técnica de la plataforma FILO ESTILO — Sistema de Reservas de Citas para Barberías con pasarela de pagos.

✓ Se revisaron los siguientes puntos en las sesiones de trabajo:

- Evidencia de las fuentes de código de todos los módulos del sistema (repositorio GitHub, rama `main`).
- Entendimiento del flujo de proceso de reserva de citas con pago en línea mediante la pasarela Culqi.
- Entendimiento del flujo de proceso de gestión de inasistencias (no-show) y promoción automática de la lista de espera.
- Entendimiento de la autenticación de usuarios (correo/contraseña y Google OAuth vía Supabase Auth) y del modelo de roles (cliente, barbero, administrador).
- Entendimiento de la visualización del panel administrativo: gestión de citas, indicador de confiabilidad del cliente y registro de asistencias.
- Entendimiento de las pruebas ejecutadas: 65 pruebas unitarias (Vitest) y pruebas de estrés con Apache JMeter (50 y 100 usuarios concurrentes, 1 y 2 nodos en DigitalOcean).

✓ Los entregables aprobados para este Hito son:

**Fase de construcción:**
- Repositorio GitHub con documentación README e integración continua (GitHub Actions).
- Diseño físico e implementación de la Base de Datos PostgreSQL en Supabase (scripts SQL: fundación multi-sede, políticas RLS, índices de rendimiento, módulo no-show/lista de espera, módulo de cupones).
- Implementación del patrón de acceso a datos (clientes Supabase centralizados: server, admin y browser).
- Catálogo de Controles de Seguridad del Proyecto (RLS por rol, rate limiting, validación de entradas, checklist de QA).
- Mitigación de vulnerabilidades OWASP Top 10 (control de acceso por roles, autenticación Supabase Auth + Google OAuth, protección contra fuerza bruta).
- Módulo de pagos en línea con pasarela Culqi.
- Módulo de gestión de inasistencias (no-show), lista de espera e indicador de confiabilidad del cliente.

**Fase de pruebas y calidad:**
- BDD con Gherkin (escenarios de autenticación, reservas y acceso de administrador).
- Pruebas unitarias (TDD) — 65 casos con Vitest (reservas, asistencia, lista de espera, confiabilidad, sesión, rate limiting).
- Automatización de pruebas E2E con Playwright (autenticación, reservas, panel admin).
- Pruebas de integración de API (colección Bruno y matriz de pruebas funcionales).
- Informe de pruebas de estrés con Apache JMeter (50 y 100 usuarios concurrentes).
- Evaluación de rendimiento y escalabilidad horizontal — 1 y 2 nodos en DigitalOcean.
- Documento de Especificación Técnica.
- Evidencia del escenario de cambio (mantenimiento del módulo no-show, 19 → 65 pruebas).

✓ Como resultado de las Actividades del proyecto se da conformidad del: **Cierre: "Fin del Proyecto"** que incluye la totalidad de los entregables listados en el punto anterior, dando por conforme el trabajo realizado en el proyecto, así mismo dando conformidad con los entregables realizados en el proyecto.

---

## Aprobaciones

| Cargo | Responsable | Firma |
|---|---|---|
| Gestor del Proyecto y/o Requerimiento | Leonardo Matías | |
| Docente / Asesor del Proyecto — UTP | _[nombre del profesor]_ | |
