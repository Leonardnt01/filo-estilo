# Guía del Experimento de Rendimiento y Escalabilidad — FILO ESTILO

> Documento para el equipo. Explica **qué estamos haciendo, por qué, y cómo interpretar
> las gráficas** (k6 y DigitalOcean) para redactar el informe. No hace falta ser experto:
> aquí está todo con analogías.

---

## 1. ¿Qué estamos probando y por qué?

Queremos responder tres preguntas que pide la rúbrica:

1. **¿Cuántos usuarios simultáneos aguanta la app antes de degradarse?** (prueba de estrés)
2. **¿Si agregamos un segundo servidor, mejora el rendimiento?** (escalabilidad horizontal)
3. **¿Cuál es el "cuello de botella"** — el componente que se satura primero y limita todo?

**Analogía:** es como medir cuántos clientes puede atender una barbería. Primero con un
barbero (1 nodo), luego con dos (2 nodos), y ver si de verdad atienden al doble… o si el
problema es que solo hay **una caja registradora compartida** (la base de datos) y ahí se
hace la cola sin importar cuántos barberos pongas.

---

## 2. La arquitectura del experimento

Montamos todo en **máquinas virtuales (droplets) de DigitalOcean** que nosotros configuramos.

```
   k6 (genera usuarios falsos)
   corre en la PC del equipo
            │
            ▼
   ┌──────────────────┐        ┌──────────────────┐
   │   filo-app-1     │───────▶│     filo-db      │
   │  (la aplicación  │        │ (base de datos   │
   │   Next.js)       │        │  PostgreSQL)     │
   └──────────────────┘        └──────────────────┘
     nodo de aplicación          recurso compartido
```

### ¿Por qué no usamos servicios "automáticos" (PaaS) como Vercel o Supabase cloud?
Porque el profesor lo pidió: esos servicios **te esconden los recursos** y te protegen con
colas — nunca ves la CPU real ni puedes "romper" la app. Con droplets (IaaS) **nosotros**
controlamos las máquinas, vemos su CPU/RAM real y podemos saturarlas. Eso es medir
rendimiento de verdad.

**Los dos servidores están separados a propósito:** así medimos por separado cuánto sufre
el **nodo de la app** y cuánto la **base de datos**, y podemos señalar cuál es el cuello de botella.

---

## 3. Las herramientas

| Herramienta | Qué hace | Dónde se ve |
|---|---|---|
| **k6** | Genera "usuarios virtuales" que navegan la app en simultáneo | Dashboard en http://localhost:5665 + reporte HTML |
| **DigitalOcean Insights** | Mide CPU, RAM y carga de cada droplet | Panel de DO → cada droplet → Insights/Graphs |

**Importante:** k6 mide desde *afuera* (cuánto tarda la app en responder). DigitalOcean mide
desde *adentro* (cuánto se esfuerza cada servidor). **Se necesitan los dos** para el análisis.

### El flujo que simula cada usuario virtual
Cada usuario de k6 repite este ciclo durante toda la prueba, con pausas realistas ("think time"):
1. Entra a la página de inicio (`GET /`)
2. Espera 1-3 s (como quien mira la pantalla)
3. Carga el catálogo de servicios (`GET /api/booking/catalog`)
4. Consulta horarios disponibles (`POST /api/booking/availability`)
5. Espera 2-4 s y vuelve a empezar

---

## 4. Los escenarios de prueba

| Escenario | Nodos | Usuarios | Duración | Qué demuestra |
|---|---|---|---|---|
| **E1** | 1 | 50 | 20 min | Línea base: carga normal (pico de un sábado) |
| **E2** | 1 | 100 | 25 min | Estrés: el doble de carga sobre un solo nodo |
| **E3** | 2 | 50 | 20 min | Carga normal repartida entre 2 nodos |
| **E4** | 2 | 100 | 25 min | Estrés repartido entre 2 nodos |

La comparación clave es **E2 vs E4**: mismos 100 usuarios, pero con 1 nodo vs 2 nodos.
Si 2 nodos mejoran → escalar sirve. Si no mejoran → el cuello de botella es la BD compartida.

---

## 5. Cómo interpretar las gráficas de k6 (dashboard y reporte HTML)

### 5.1 Los recuadros de arriba (Overview)
| Recuadro | Qué significa | Qué es "bueno" |
|---|---|---|
| **HTTP Request Rate** | Peticiones por segundo que procesa la app | Más alto = más capacidad |
| **HTTP Request Duration** | Cuánto tarda en responder (promedio) | Más bajo = más rápido |
| **HTTP Request Failed** | % de peticiones con error | Debe ser **0% o casi** |
| **VUs** | Usuarios virtuales activos en ese momento | Confirma que llegó a 50/100 |

### 5.2 Gráfico "HTTP Request Duration" (pestaña Timings) — el más importante
Muestra líneas de **avg, p90, p95, p99** (percentiles).
- **p95 = 95% de los usuarios tuvieron una respuesta más rápida que este valor.** Es la métrica
  estándar de rendimiento (mejor que el promedio, que esconde los casos lentos).
- **Cómo leerlo:** si las líneas se mantienen **planas** durante la prueba → el sistema aguanta
  estable. Si **suben con el tiempo** → se está saturando (cada vez responde más lento).

### 5.3 Gráfico "Request Failed Rate"
- Plano en 0% → perfecto, ningún error.
- Si empieza a subir → el servidor ya no da abasto (aparecen timeouts o errores 500). **Ese es
  el momento en que "se rompió".**

---

## 6. Cómo interpretar las gráficas de DigitalOcean (por cada droplet)

### 6.1 CPU %
- Cuánto del procesador se está usando.
- **Plano y bajo** (ej. <40%) → holgado. **Cerca del 100%** → saturado, ese es el cuello de botella.

### 6.2 Load (1/5/15)
- Son tres líneas: promedio de carga en 1, 5 y 15 minutos.
- **Regla de oro:** el número límite es la **cantidad de núcleos** del servidor. Nuestros droplets
  tienen **2 núcleos**, así que:
  - Load cerca de **2.0** = saturación total.
  - Load en 0.5 = usando ~25% de la capacidad (holgado).
- **Pico que sube y baja solo** = evento puntual (mantenimiento interno), no es saturación.
- **Load alto y sostenido durante toda la prueba** = eso sí es la carga real estresando el servidor.

### 6.3 Memory (RAM)
- Cuánta memoria se usa. Si llega al 100% el servidor empieza a fallar. Debe quedar margen.

---

## 7. Cómo sacar la conclusión (el análisis que va en el informe)

Se cruza lo que dice **k6** (latencia/errores) con lo que dice **DigitalOcean** (CPU de cada servidor):

| Latencia (k6) | CPU nodo app | CPU base de datos | Conclusión para el informe |
|---|---|---|---|
| Sube | Alta (>80%) | Baja | El **nodo de la app** es el cuello → **agregar nodos ayuda** |
| Sube | Baja | Alta | La **base de datos** es el cuello → **agregar nodos NO ayuda** |
| Estable | Baja | Baja | No hubo saturación (el sistema sobró) |

**La hipótesis central del experimento:** la base de datos es compartida por todos los nodos de
app. Por eso esperamos que al pasar de 1 a 2 nodos (E2 → E4), la app aguante más… hasta que la
**base de datos** se convierta en el límite que no se resuelve poniendo más nodos de app.

---

## 8. Qué imagen va en qué parte del informe

| Imagen que capturamos | Sección del informe donde va |
|---|---|
| Reporte HTML de k6 (E1, E2, E3, E4) | Resultados de cada prueba (latencia, throughput, errores) |
| Dashboard de k6 en vivo (min 5 y 15) | Evidencia del comportamiento durante la prueba |
| CPU/Load de `filo-app-1` en DO | Consumo del nodo de aplicación |
| CPU/Load de `filo-db` en DO | Consumo de la base de datos (para el análisis de cuello de botella) |
| Comparación E2 vs E4 | Sección de escalabilidad horizontal (¿mejoró con 2 nodos?) |

---

## 9. Resumen en una frase (para explicarlo rápido)

> "Simulamos 50 y 100 usuarios reales navegando la barbería, con 1 y luego 2 servidores,
> midiendo con k6 la velocidad de respuesta y con DigitalOcean el esfuerzo de cada máquina,
> para demostrar hasta dónde aguanta el sistema y si agregar servidores realmente lo mejora
> o si el límite está en la base de datos compartida."
