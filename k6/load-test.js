// FILO ESTILO — Prueba de carga/estres con k6
// Flujo de reserva (home -> catalogo -> disponibilidad) con think-times realistas.
//
// Parametros por variable de entorno: HOST, PORT, VUS, RAMP, HOLD, SLEEP_FACTOR, DATE
//
// Escenarios:
//   E1 (1 nodo, 50 u, 20 min): VUS=50  RAMP=120s HOLD=1080s   (default)
//   E2 (1 nodo, 100 u, 25 min): VUS=100 RAMP=180s HOLD=1320s
//   E3 (2 nodos, 50 u): igual que E1 pero HOST = IP del Load Balancer
//   E4 (2 nodos, 100 u): igual que E2 pero HOST = IP del Load Balancer
//   PUNTO DE QUIEBRE: VUS=200+ y SLEEP_FACTOR=0 (sin pausas, maxima agresividad)

import http from "k6/http";
import { check, sleep } from "k6";

const HOST = __ENV.HOST || "167.99.232.250";
const PORT = __ENV.PORT || "80";
const BASE = `http://${HOST}:${PORT}`;

const VUS = parseInt(__ENV.VUS || "50");
const RAMP = __ENV.RAMP || "120s";
const HOLD = __ENV.HOLD || "1080s";
// Palanca de agresividad: 1 = think times normales (E1-E4). 0 = sin pausas (punto de quiebre).
const SLEEP_FACTOR = parseFloat(__ENV.SLEEP_FACTOR || "1");

const BRANCH_ID = "82335cb8-711d-4001-86d0-82d7d88adc03";
const BARBER_ID = "29f204f7-7922-4e81-8579-df7d4dc0928c";
const SERVICE_ID = "d8356693-2ea4-486c-bcff-48f16c29f791";
const DATE = __ENV.DATE || "2026-07-25";

export const options = {
  stages: [
    { duration: RAMP, target: VUS },
    { duration: HOLD, target: VUS },
  ],
  thresholds: {
    http_req_duration: ["p(95)<1500"],
    http_req_failed: ["rate<0.02"],
  },
};

export default function () {
  // 1) Home (SSR del frontend)
  let res = http.get(`${BASE}/`, { tags: { name: "01_home" } });
  check(res, { "home 200": (r) => r.status === 200 });

  sleep((Math.random() * 2 + 1) * SLEEP_FACTOR); // think time 1-3 s

  // 2) Catalogo
  res = http.get(`${BASE}/api/booking/catalog`, { tags: { name: "02_catalog" } });
  check(res, { "catalog 200": (r) => r.status === 200 });

  // 3) Disponibilidad
  const payload = JSON.stringify({
    branch_id: BRANCH_ID,
    barber_id: BARBER_ID,
    service_id: SERVICE_ID,
    appointment_date: DATE,
  });
  res = http.post(`${BASE}/api/booking/availability`, payload, {
    headers: { "Content-Type": "application/json" },
    tags: { name: "03_availability" },
  });
  check(res, { "availability 200": (r) => r.status === 200 });

  sleep((Math.random() * 2 + 2) * SLEEP_FACTOR); // think time 2-4 s
}
