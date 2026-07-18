# Evaluación de Rendimiento y Escalabilidad Horizontal — FILO ESTILO

**Fecha de ejecución:** _[completar]_
**Responsable:** _[completar]_
**Herramientas:** Apache JMeter 5.6.3, DigitalOcean Monitoring, Supabase Reports

---

## 1. Objetivo

Evaluar el comportamiento del sistema FILO ESTILO bajo carga sostenida (50 y 100 usuarios
concurrentes, 20-30 minutos) midiendo rendimiento (tiempos de respuesta, throughput, errores)
y consumo de recursos (CPU, RAM, red) en las tres capas — frontend/backend (Next.js),
base de datos (Supabase) — comparando una topología de **1 nodo vs. 2 nodos** con balanceador
de carga en DigitalOcean, para verificar la hipótesis de escalabilidad horizontal e
identificar cuellos de botella.

## 2. Métricas especuladas (hipótesis — definidas ANTES de ejecutar)

Justificación: el backend Next.js es stateless (la sesión vive en cookies + Supabase),
por lo que se espera que duplicar nodos duplique aproximadamente la capacidad de cómputo,
con la base de datos como recurso compartido no escalado.

| Métrica | E1: 1 nodo / 50 u | E2: 1 nodo / 100 u | E3: 2 nodos / 50 u | E4: 2 nodos / 100 u |
|---|---|---|---|---|
| Response time promedio | < 800 ms | < 1,500 ms | < 700 ms | < 900 ms |
| Percentil 95 | < 1,500 ms | < 3,000 ms | < 1,400 ms | < 1,800 ms |
| Error rate | < 2% | < 8% | < 2% | < 3% |
| Throughput | > 15 req/s | 15-25 req/s (saturado) | > 15 req/s | > 30 req/s |
| CPU del nodo (cada uno) | < 60% | > 85% | < 40% | < 55% |
| RAM del nodo | < 70% | < 85% | < 60% | < 65% |
| CPU BD Supabase | < 40% | < 70% | < 45% | < 75% ⚠️ |

⚠️ Hipótesis clave: la BD es compartida entre nodos — se espera que en E4 la presión sobre
Supabase sea igual o mayor que en E2, revelando que el escalado horizontal del backend
NO escala la capa de datos.

## 3. Entorno de pruebas

| Componente | Detalle |
|---|---|
| Aplicación | Next.js 16 (build de producción, dockerizada) |
| Nodo(s) | DigitalOcean Droplet _[tamaño: ej. 2 vCPU / 4 GB]_ , región _[ej. nyc1]_ |
| Balanceador (E3/E4) | DigitalOcean Load Balancer (round robin) |
| Base de datos | Supabase PostgreSQL (plan Free, compartida entre nodos) |
| Generador de carga | JMeter 5.6.3 en PC local _[specs: CPU/RAM/ancho de banda]_ |
| Plan de prueba | `FILO_ESTILO_StressTest.jmx` (parametrizado) |

### Flujo simulado por usuario virtual (con think-time realista)
1. `GET /` — página de inicio (SSR del frontend)
2. Pausa 1-3 s (usuario mirando)
3. `GET /api/booking/catalog` — carga del catálogo
4. `POST /api/booking/availability` — consulta de horarios disponibles
5. Pausa 2-4 s → repite durante toda la duración del test

Nota: se excluye `POST /api/auth/login` del estrés masivo porque el rate limiting propio
(5 intentos/60 s) lo bloquearía por diseño; esa protección se evidenció por separado.

## 4. Matriz de escenarios y comandos de ejecución

Validación previa del plan (local): 5 usuarios × 60 s → 51 requests, 0% error, avg 271 ms ✅

| # | Nodos | Usuarios | Ramp-up | Duración | Comando |
|---|---|---|---|---|---|
| E1 | 1 | 50 | 120 s | 20 min | ver abajo |
| E2 | 1 | 100 | 180 s | 25 min | ver abajo |
| E3 | 2 | 50 | 120 s | 20 min | ver abajo |
| E4 | 2 | 100 | 180 s | 25 min | ver abajo |

```bat
REM Desde cmd, en la carpeta del proyecto. Reemplazar IP_O_DOMINIO por:
REM   E1/E2: IP del droplet único      E3/E4: IP del Load Balancer

REM E1 — 1 nodo, 50 usuarios, 20 min
C:\Users\ASUS\Desktop\apache-jmeter-5.6.3\bin\jmeter -n -t FILO_ESTILO_StressTest.jmx ^
  -Jhost=IP_O_DOMINIO -Jport=80 -Jprotocol=http ^
  -Jusers=50 -Jramp=120 -Jduration=1200 ^
  -l resultados\E1.jtl -e -o resultados\E1-reporte

REM E2 — 1 nodo, 100 usuarios, 25 min
C:\Users\ASUS\Desktop\apache-jmeter-5.6.3\bin\jmeter -n -t FILO_ESTILO_StressTest.jmx ^
  -Jhost=IP_O_DOMINIO -Jport=80 -Jprotocol=http ^
  -Jusers=100 -Jramp=180 -Jduration=1500 ^
  -l resultados\E2.jtl -e -o resultados\E2-reporte

REM E3 — 2 nodos (load balancer), 50 usuarios, 20 min
C:\Users\ASUS\Desktop\apache-jmeter-5.6.3\bin\jmeter -n -t FILO_ESTILO_StressTest.jmx ^
  -Jhost=IP_BALANCEADOR -Jport=80 -Jprotocol=http ^
  -Jusers=50 -Jramp=120 -Jduration=1200 ^
  -l resultados\E3.jtl -e -o resultados\E3-reporte

REM E4 — 2 nodos (load balancer), 100 usuarios, 25 min
C:\Users\ASUS\Desktop\apache-jmeter-5.6.3\bin\jmeter -n -t FILO_ESTILO_StressTest.jmx ^
  -Jhost=IP_BALANCEADOR -Jport=80 -Jprotocol=http ^
  -Jusers=100 -Jramp=180 -Jduration=1500 ^
  -l resultados\E4.jtl -e -o resultados\E4-reporte
```

El flag `-e -o` genera automáticamente el **reporte HTML con gráficos** (response time
en el tiempo, throughput, percentiles, errores) — abrir `index.html` de cada carpeta.

## 5. Protocolo de captura de evidencias (durante CADA escenario)

| Minuto | Acción |
|---|---|
| 0 | Captura "reposo": DO Monitoring (CPU/RAM/red) + Supabase Reports antes de iniciar |
| 5 | Captura DO Monitoring + Supabase Reports (carga estabilizada) |
| 15 | Captura DO Monitoring + Supabase Reports (pico sostenido) |
| fin | Captura final + resumen `summary =` de la consola JMeter |

En E3/E4 capturar además el gráfico del Load Balancer (distribución entre nodos).
Toda captura debe incluir la hora visible para correlacionar con el reporte JMeter.

## 6. Resultados obtenidos

### 6.1 Tabla comparativa especulado vs. obtenido

| Métrica | E1 esp. | E1 obt. | E2 esp. | E2 obt. | E3 esp. | E3 obt. | E4 esp. | E4 obt. |
|---|---|---|---|---|---|---|---|---|
| Avg response (ms) | <800 | **249** ✅ | <1500 | _[ ]_ | <700 | _[ ]_ | <900 | _[ ]_ |
| Máx (ms) | — | 928 | — | _[ ]_ | — | _[ ]_ | — | _[ ]_ |
| Error rate (%) | <2 | **0.0** ✅ | <8 | _[ ]_ | <2 | _[ ]_ | <3 | _[ ]_ |
| Throughput (req/s) | >15 | 9.05 ⚠️(think time) | 15-25 | _[ ]_ | >15 | _[ ]_ | >30 | _[ ]_ |
| # Samples (20 min) | — | 10,825 | — | _[ ]_ | — | _[ ]_ | — | _[ ]_ |
| CPU nodo app (%) | <60 | **~1** ✅ | >85 | _[ ]_ | <40 | _[ ]_ | <55 | _[ ]_ |
| RAM nodo app (%) | <70 | ~24 ✅ | <85 | _[ ]_ | <60 | _[ ]_ | <65 | _[ ]_ |
| CPU BD (%) | <40 | **~4.5** ✅ | <70 | _[ ]_ | <45 | _[ ]_ | <75 | _[ ]_ |

**E1 — veredicto:** cumple todos los SLO holgadamente. Latencia 3× mejor que el objetivo,
0% de errores, y el nodo apenas tocado (~1% CPU). Confirma que 1 nodo tiene capacidad de
sobra para la carga normal proyectada (pico de sábado, 50 usuarios). El único valor "bajo"
es el throughput, explicado por los think times realistas del plan (1-4 s por interacción).

### 6.2 Evidencias
_[Insertar aquí: capturas DO Monitoring, Supabase Reports, gráficos del reporte HTML
de JMeter, capturas de Vercel Analytics/Speed Insights del entorno de producción]_

### 6.3 Análisis comparativo 1 nodo vs. 2 nodos
_[Comparar E2 vs E4: ¿mejoró el throughput ~2x? ¿bajó el P95? ¿la CPU por nodo bajó a la mitad?
Calcular el % de mejora real vs. el 100% teórico y explicar la diferencia (overhead del
balanceador, BD compartida, latencia de red)]_

## 7. Identificación de cuellos de botella

Método: ante degradación de rendimiento, identificar el primer recurso en saturarse.

| Recurso | ¿Se saturó? | Escenario | Evidencia | ¿Escala con más nodos? |
|---|---|---|---|---|
| CPU nodo (SSR Next.js) | _[ ]_ | _[ ]_ | _[captura]_ | ✅ Sí |
| RAM nodo | _[ ]_ | _[ ]_ | _[captura]_ | ✅ Sí |
| Conexiones/CPU Supabase | _[ ]_ | _[ ]_ | _[captura]_ | ❌ No — recurso compartido |
| Ancho de banda del generador | _[ ]_ | _[ ]_ | _[captura]_ | N/A (limitación del test) |

## 8. Conclusiones y acciones de mejora

_[Completar con:_
- _¿Se validó la hipótesis de escalabilidad horizontal? ¿En qué %?_
- _Cuello de botella principal identificado y su mitigación (ej: pooler de conexiones
  PgBouncer de Supabase, caché Redis, índices adicionales)_
- _Capacidad recomendada por nodo y política de escalamiento (ej: agregar nodo al superar
  70% CPU sostenido)_
- _Limitaciones del experimento (BD en plan free, generador de carga único, red doméstica)]_
