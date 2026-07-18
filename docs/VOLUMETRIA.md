# Volumetría — FILO ESTILO

**Proyecto:** Plataforma web de reservas de citas para barberías multi-sede
**Stack:** Next.js 16 + Supabase (PostgreSQL) + Vercel / DigitalOcean
**Fecha:** 17/07/2026 &nbsp;&nbsp; **Versión:** 1.0 &nbsp;&nbsp; **Elaborado por:** Leonardo Matías

> Este documento dimensiona cuántos datos almacenará y moverá el sistema proyectado a
> 1 año de operación. Alimenta la sección de dimensionamiento del **Documento de
> Especificación Técnica** (sizing de infraestructura) y provee los parámetros del
> **Plan de Pruebas** (escenarios JMeter). Toda cifra declara su origen: **[R]** dato real
> del proyecto, **[S]** supuesto de negocio declarado, **[C]** calculado por fórmula.

---

## 0. Supuestos de negocio (insumos — ajustar aquí y recalcular)

| Insumo | Valor | Origen |
|---|---|---|
| Sedes (branches) activas | 3 | [S] escenario de lanzamiento |
| Barberos por sede | 4 (12 total) | [S] |
| Citas por sede por día | 40 | [S] capacidad: 4 barberos × ~10 turnos/día |
| Días operativos al mes | 30 | [S] |
| **Citas/mes** | 3 × 40 × 30 = **3,600** | [C] |
| **Citas/año (registros proyectados)** | 3,600 × 12 = **43,200** | [C] — multiplicador del Bloque A |
| Clientes registrados al año | ~5,000 | [S] ~8-9 citas/cliente/año |
| % de citas que generan entrada en lista de espera | 10% | [S] solo horarios pico se llenan |
| % de citas que canjean cupón | 15% | [S] clientes recurrentes con recompensa |

---

## Bloque A — Base de datos (PostgreSQL / Supabase)

### A.1 Esquema real del sistema (tablas de las migraciones step1–step5)

Pesos por tipo de dato PostgreSQL: `uuid` 16 B, `timestamptz` 8 B, `date` 4 B, `time` 8 B,
`integer` 4 B, `boolean` 1 B, `numeric(10,2)` ~8 B, `text` según promedio estimado del
contenido. Se suma **~28 B de overhead por fila** (cabecera de tupla + alineación de Postgres).

#### `appointments` — transacción central [R: esquema real]

| Campo | Tipo | Bytes |
|---|---|---|
| id | uuid | 16 |
| client_id | uuid | 16 |
| barber_id | uuid | 16 |
| service_id | uuid | 16 |
| branch_id | uuid | 16 |
| appointment_date | date | 4 |
| start_time / end_time | time × 2 | 16 |
| status | text (~10 car.) | 11 |
| notes | text (~150 car. — incluye auditoría de pago Culqi) | 151 |
| attendance_status | text (~9 car.) | 10 |
| attendance_confirmed_at | timestamptz | 8 |
| last_reminder_at | timestamptz | 8 |
| reminder_count | integer | 4 |
| release_reason | text (~15 car., nullable) | 16 |
| created_at / updated_at | timestamptz × 2 | 16 |
| Overhead de fila | — | 28 |
| **Total por registro** | | **≈ 352 B** |

#### `waitlist_entries` [R: step4]

| Campo | Tipo | Bytes |
|---|---|---|
| id, client_id, branch_id, service_id, barber_id, source_appointment_id, promoted_appointment_id | uuid × 7 | 112 |
| desired_date | date | 4 |
| desired_start_from / desired_start_to | time × 2 | 16 |
| status | text (~8 car.) | 9 |
| offer_expires_at, created_at, updated_at | timestamptz × 3 | 24 |
| notes | text (~80 car.) | 81 |
| Overhead de fila | — | 28 |
| **Total por registro** | | **≈ 274 B** |

#### `user_coupons` [R: step5]

| Campo | Tipo | Bytes |
|---|---|---|
| id, client_id, appointment_id | uuid × 3 | 48 |
| promo_key, title, description, status | text (~10+30+80+8 car.) | 132 |
| expires_at, used_at, created_at | timestamptz × 3 | 24 |
| Overhead de fila | — | 28 |
| **Total por registro** | | **≈ 232 B** |

#### Tablas maestras (crecen poco — se calculan una sola vez)

| Tabla | Bytes/registro (aprox.) | Registros al año | Subtotal |
|---|---|---|---|
| `profiles` (id, full_name, phone, role, timestamps) | ≈ 150 B | 5,000 clientes + 15 staff | ≈ 0.75 MB |
| `branches` (id, name, slug, address, phone, flags) | ≈ 250 B | 3 | despreciable |
| `services` (id, name, price, duración, branch_id, is_active) | ≈ 160 B | ~10 por sede = 30 | despreciable |
| `barbers` (id, nombre, branch_id, flags) | ≈ 150 B | 12 | despreciable |
| `business_hours` (id, barber_id, branch_id, día, horas) | ≈ 90 B | 12 barberos × 7 días = 84 | despreciable |
| `memberships` (id, user_id, branch_id, role, flags) | ≈ 120 B | ~20 | despreciable |

### A.2 Transacción completa: "reservar una cita"

Tablas que **escribe** una reserva (las maestras solo se leen):

```
Peso por transacción = appointments (352 B)
                     + waitlist_entries (274 B × 10% de las citas)
                     + user_coupons     (232 B × 15% de las citas)
                     = 352 + 27.4 + 34.8  ≈  414 B por cita efectiva
```

### A.3 Proyección anual de la base de datos

```
Almacenamiento transaccional = 414 B × 43,200 citas/año        ≈ 17.9 MB/año
Tablas maestras (profiles y catálogos)                          ≈  0.8 MB
Subtotal                                                        ≈ 18.7 MB
Margen de índices (× 1.25 — el esquema tiene 15+ índices reales) ≈ 23.4 MB/año
```

**Resultado Bloque A: ≈ 25 MB/año** (redondeado hacia arriba). El plan Free de Supabase
ofrece 500 MB de base de datos → capacidad para **~20 años** al volumen proyectado, o
margen para escalar a **60 sedes** antes de requerir el plan Pro (8 GB). La decisión de
usar el plan Free queda justificada por números, no por suposición.

---

## Bloque B — Almacenamiento de archivos (Storage)

**No aplica en la versión actual [R].** El sistema no permite subida de archivos por
usuarios: las imágenes de sedes, servicios y branding son **assets estáticos** empaquetados
en el build de Next.js (carpeta `public/`, servidos por la CDN de Vercel, no ocupan storage
de base de datos ni de Supabase Storage).

Proyección si se habilitara en una fase futura (fotos de perfil de barberos + galería de
cortes por sede):

```
Peso mensual = 200 KB/foto [S] × (12 barberos + 3 sedes × 8 fotos/mes) = 200 KB × 36 ≈ 7.2 MB/mes
Peso anual   = 7.2 MB × 12 ≈ 87 MB/año  →  dentro del 1 GB del plan Free de Supabase Storage
```

---

## Bloque C — Notificaciones

Eventos del sistema que generan mensajes al cliente (correo vía Supabase Auth / avisos del sistema):

| Evento | Mensajes por cita | Origen |
|---|---|---|
| Confirmación de reserva (con comprobante de pago) | 1 | [R] flujo de pago Culqi |
| Recordatorio previo al turno | 1 | [R] campos `last_reminder_at`, `reminder_count` |
| Aviso de oferta de lista de espera / no-show | 0.15 | [C] solo el ~10% en waitlist + ~5% no-show |
| **Promedio por cita** | **≈ 2.15** | |

```
Mensajes/mes = 3,600 citas × 2.15                    ≈ 7,740 mensajes/mes
Peso mensual = 15 KB/mensaje [S: HTML simple] × 7,740 ≈ 116 MB/mes de tráfico saliente
Peso anual   = 116 MB × 12                            ≈ 1.4 GB/año
```

Además: correos de autenticación (registro, recuperación) ≈ 5,000 × 2 = 10,000/año
(adicional marginal). El plan Free de Supabase limita los correos de Auth (~2/hora por
usuario) — suficiente para el volumen proyectado; para los recordatorios masivos se
declararía un proveedor transaccional (p. ej. Resend) en fase de producción real.

---

## Bloque D — Carga y concurrencia (parámetros para el Plan de Pruebas)

### D.1 Caracterización de la carga

| Parámetro | Valor | Origen |
|---|---|---|
| Usuarios totales registrados (año 1) | ~5,000 | [S] |
| Usuarios activos por día | ~150 (120 citas/día + navegación) | [C] |
| **Pico de demanda** | **Sábado 9:00–12:00** — patrón típico de barbería | [S] |
| Reservas en hora pico | ~45/hora (3 sedes, agenda del fin de semana) | [C] |
| Usuarios concurrentes en pico (navegando + reservando) | **50 normal / 100 estrés** | [C] → parámetro directo de JMeter |

### D.2 Concurrencia de lectura vs. escritura en la BD

- **Lectura (dominante):** cada usuario que reserva ejecuta ~1 carga de catálogo
  (`services`, `barbers`, `branches`) y 2–4 consultas de disponibilidad
  (`appointments` + `business_hours`) antes de decidir. Relación estimada
  **lecturas:escrituras ≈ 10:1**.
- **Escritura (crítica):** el "hit" principal `POST /api/booking` compromete
  **3 tablas en escritura** en el peor caso (`appointments`, `waitlist_entries`,
  `user_coupons`) y 5 en lectura. La contención por el mismo horario se resuelve con
  **restricción de unicidad sobre el slot**: el segundo insert concurrente recibe el error
  `23505` de Postgres y la API responde `409 — Selected slot is already taken` [R:
  implementado en `src/lib/booking.ts`]. La volumetría de pico (45 reservas/hora sobre
  ~120 slots disponibles) anticipa colisiones reales en los horarios de 10:00–11:00.

### D.3 Traducción a escenarios JMeter (plan `FILO_ESTILO_StressTest.jmx`)

| Escenario | Nodos | Usuarios | Justificación desde la volumetría |
|---|---|---|---|
| E1 | 1 | 50 | Pico normal de sábado (D.1) |
| E2 | 1 | 100 | 2× pico: campaña de promoción o feriado |
| E3 | 2 | 50 | Pico normal con escalado horizontal |
| E4 | 2 | 100 | 2× pico con escalado horizontal |

Flujo por usuario virtual (refleja la relación 10:1 de D.2): `GET /` → pausa 1–3 s →
`GET /api/booking/catalog` → `POST /api/booking/availability` → pausa 2–4 s, sostenido
20–25 minutos. Validación previa real: 5 usuarios × 60 s → 51 requests, 0% error,
promedio 271 ms [R].

### D.4 Volumen de datos para poblar antes de las pruebas

Para que las consultas de disponibilidad midan sobre datos realistas (no una BD vacía):

```
Citas históricas a sembrar = 3 meses de operación = 3,600 × 3 ≈ 10,800 registros
Perfiles de cliente        ≈ 1,250 (5,000 / 4 trimestres)
Waitlist                   ≈ 1,080 entradas (10%)
```

---

## Resumen de dimensionamiento

| Dimensión | Proyección año 1 | Infraestructura elegida | Holgura |
|---|---|---|---|
| Base de datos | ≈ 25 MB (con índices) | Supabase Free — 500 MB | 20× |
| Storage de archivos | 0 (no aplica; futuro: 87 MB/año) | Assets estáticos en CDN Vercel | N/A |
| Notificaciones | ≈ 7,740 msg/mes ≈ 1.4 GB/año | Supabase Auth + proveedor futuro | Suficiente |
| Concurrencia pico | 50 usuarios (100 en estrés) | 1–2 nodos DO + Vercel serverless | Verificada en E1–E4 |
| Transacción crítica | 414 B × 43,200 citas/año | Unicidad de slot → 409 en colisión | Probada (23505) |

**Trazabilidad:** el Bloque A justifica la sección de dimensionamiento de la
[Especificación Técnica](ESPECIFICACION_TECNICA.md); el Bloque D provee los parámetros
usuarios/duración de los escenarios E1–E4 del plan
[RENDIMIENTO_ESCALABILIDAD](RENDIMIENTO_ESCALABILIDAD.md) y del Plan de Pruebas.
