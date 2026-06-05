# Analisis de Avance 02 vs Rubrica APF2

Fecha de revision: 2026-05-29
Proyecto: FILO ESTILO

## 1) Hallazgos generales (Word + Excel)

1. El informe tiene buena estructura macro (Scrum, backend, seguridad, despliegue), pero faltan artefactos de evidencia cuantitativa en pruebas (cobertura, metricas, cumplimiento por porcentaje).
2. El Excel de HU tiene inconsistencias de calidad documental que restan formalidad:
- IDs con error (ej. `HU--04`).
- Texto sucio (`Como cliente registradoASDAS`).
- Términos de otro dominio ("platos", "menu") en HU de barberia.
3. En plan/matriz de pruebas hay desalineaciones con el sistema real:
- Ejemplo: `POST /api/auth/register` se espera 200 en tabla, pero el backend real responde 201 en exito.
4. Las BDD automatizadas existen y son un punto fuerte, pero no se ven integradas formalmente al informe con metrica de cumplimiento por HU.

## 2) Evaluacion por criterio de rubrica

## 2.1 Evaluacion de pruebas funcionales (4 pts)

Estado actual: Parcial alto (aprox. 2.5/4)

Fortalezas:
- Framework automatizado implementado: `@cucumber/cucumber`.
- Casos funcionales automatizados por rol (cliente/admin).
- Features Gherkin y steps mantenidos en repo (`bdd/features`, `bdd/steps`).

Brechas para 4/4:
- Falta reporte formal de cobertura funcional por HU (porcentaje, total, aprobadas/fallidas/manuales).
- Falta sección de metricas ISO 25010 con indicadores explicitos (completitud, correccion, idoneidad).
- Faltan capturas de ejecucion recientes y trazables (comando + timestamp + resultado).

Accion concreta:
- Agregar tabla: HU -> escenario BDD -> estado (PASS/FAIL/MANUAL) -> evidencia (captura/log).
- Reportar tasa de exito: `(escenarios pass / escenarios ejecutados) * 100`.

## 2.2 Automatizacion de pruebas de integracion (4 pts)

Estado actual: Parcial medio-alto (aprox. 2.7/4)

Fortalezas:
- Integracion Frontend/API/DB validada por endpoints (`auth`, `booking`, `my`, `admin`).
- Integracion con sistema externo principal (Supabase) ya en funcionamiento.
- Controles de seguridad de integracion presentes (401/403/429).

Brechas para 4/4:
- Falta declarar formalmente "sistemas externos" en el capitulo (Supabase Auth, PostgreSQL, Vercel).
- Falta reporte de resultados de integracion consolidado (por endpoint/escenario).
- Faltan metricas de interoperabilidad/coexistencia (latencia media, error rate, disponibilidad en cloud).

Accion concreta:
- Matriz CPI actualizada con codigos reales esperados (ej. register 201).
- Tabla de resultados: Endpoint, Caso, Esperado, Obtenido, Evidencia, Estado.

## 2.3 Evaluacion de usabilidad del sistema (4 pts)

Estado actual: Bajo-medio (aprox. 1.5/4)

Fortalezas:
- Existe trabajo UX/UI en informe (mockups, flujo, mobile-first).
- Existen mensajes de error/estado en UI para tareas criticas.

Brechas para 4/4:
- La rubrica exige pruebas automatizadas de usabilidad (no solo descripcion UX).
- Falta informe especifico de usabilidad ISO/IEC 25010 con casos, resultados y metricas.
- Falta evidencia automatizada (ej. Lighthouse CI o pruebas de flujo UI con Playwright).

Accion concreta:
- Incorporar automatizacion minima de usabilidad:
  - Lighthouse (Performance, Accessibility, Best Practices, SEO).
  - Casos UI clave con Playwright (registro/login/reserva).
- Reportar metricas y nivel de cumplimiento por umbral.

## 2.4 Validacion y verificacion en cloud (2 pts)

Estado actual: Parcial (aprox. 1.2/2)

Fortalezas:
- Proyecto pensado para despliegue cloud y pruebas en entorno online.

Brechas para 2/2:
- Falta evidencia consolidada de ejecucion de pruebas funcionales + integracion en cloud (no solo local).
- Falta vincular resultados cloud con usabilidad y automatizacion.

Accion concreta:
- Ejecutar suite en entorno desplegado y registrar:
  - URL cloud
  - fecha/hora
  - escenarios ejecutados
  - resultados
  - capturas

## 2.5 Sustentacion (2 pts)

Estado actual: Medio-alto (aprox. 1.5/2)

Fortalezas:
- Documento amplio y con narrativa tecnica consistente.
- Se muestran decisiones de arquitectura y Scrum.

Brechas para 2/2:
- Mejorar sintesis y eliminar duplicidad de secciones (ej. capitulo 10 repetido).
- Incluir hilo narrativo "decision -> evidencia -> impacto" por cada aporte principal.

Accion concreta:
- Preparar guion de sustentacion de 8-10 minutos con 4 bloques:
  - Problema y propuesta
  - Arquitectura y seguridad
  - Pruebas automatizadas + metricas
  - Demo cloud final

## 2.6 Levantamiento de observaciones APF2 (4 pts)

Estado actual: No demostrable documentalmente (aprox. 1/4 hasta evidenciar)

Brecha critica:
- No se observa matriz explicita "Observacion APF2 -> accion tomada -> evidencia -> estado (cerrada)".

Accion obligatoria para 4/4:
- Agregar tabla de trazabilidad de observaciones con cierre al 100%.

## 3) Priorizacion para subir nota rapido

1. Corregir consistencia documental (HU, codigos esperados reales, limpieza de texto).
2. Insertar reporte de resultados BDD + metricas de cumplimiento por HU.
3. Completar capitulo de integracion con matriz CPI actualizada y evidencias.
4. Agregar bloque de usabilidad automatizada (Lighthouse/Playwright) con metricas.
5. Añadir matriz de levantamiento APF2 al 100%.

## 4) Evidencias minimas recomendadas por capitulo

- Pruebas funcionales:
  - Salida de `npm run bdd:test:client` y `npm run bdd:test:admin` con pass/fail.
  - Capturas de consola y resumen de escenarios.
- Pruebas integracion:
  - Tabla por endpoint con esperado/obtenido.
  - Evidencias Bruno/Postman/Cucumber API.
- Usabilidad:
  - Reportes Lighthouse (cloud) con puntajes.
- Cloud:
  - Capturas de despliegue, URL activa, pruebas ejecutadas en produccion.
- APF2:
  - Matriz de observaciones cerradas.
