# Comandos k6 — Escenarios de prueba FILO ESTILO

> Abre una **PowerShell nueva** (para que reconozca el comando `k6`) y verifica con `k6 version`.
> El dashboard en vivo se abre en http://localhost:5665 mientras corre (para capturar pantallas).
> Al terminar, se guarda un reporte HTML en la carpeta `k6\` (evidencia para el informe).

## 1 NODO — objetivo: `167.99.232.250`

### E1 — 1 nodo, 50 usuarios, 20 min
```powershell
$env:HOST="167.99.232.250"; $env:PORT="80"; $env:VUS="50"; $env:RAMP="120s"; $env:HOLD="1080s"; $env:K6_WEB_DASHBOARD="true"; $env:K6_WEB_DASHBOARD_EXPORT="c:\Users\ASUS\Desktop\integrador\filo-estilo\k6\E1-reporte.html"; k6 run c:\Users\ASUS\Desktop\integrador\filo-estilo\k6\load-test.js
```

### E2 — 1 nodo, 100 usuarios, 25 min
```powershell
$env:HOST="167.99.232.250"; $env:PORT="80"; $env:VUS="100"; $env:RAMP="180s"; $env:HOLD="1320s"; $env:K6_WEB_DASHBOARD="true"; $env:K6_WEB_DASHBOARD_EXPORT="c:\Users\ASUS\Desktop\integrador\filo-estilo\k6\E2-reporte.html"; k6 run c:\Users\ASUS\Desktop\integrador\filo-estilo\k6\load-test.js
```

## 2 NODOS — objetivo: IP del Load Balancer (se define al escalar)

### E3 — 2 nodos, 50 usuarios, 20 min
```powershell
$env:HOST="IP_DEL_LOAD_BALANCER"; $env:PORT="80"; $env:VUS="50"; $env:RAMP="120s"; $env:HOLD="1080s"; $env:K6_WEB_DASHBOARD="true"; $env:K6_WEB_DASHBOARD_EXPORT="c:\Users\ASUS\Desktop\integrador\filo-estilo\k6\E3-reporte.html"; k6 run c:\Users\ASUS\Desktop\integrador\filo-estilo\k6\load-test.js
```

### E4 — 2 nodos, 100 usuarios, 25 min
```powershell
$env:HOST="IP_DEL_LOAD_BALANCER"; $env:PORT="80"; $env:VUS="100"; $env:RAMP="180s"; $env:HOLD="1320s"; $env:K6_WEB_DASHBOARD="true"; $env:K6_WEB_DASHBOARD_EXPORT="c:\Users\ASUS\Desktop\integrador\filo-estilo\k6\E4-reporte.html"; k6 run c:\Users\ASUS\Desktop\integrador\filo-estilo\k6\load-test.js
```

## PUNTO DE QUIEBRE — encontrar el límite (romper el nodo)
Sube usuarios agresivamente hasta que aparezcan errores/timeouts.
```powershell
$env:HOST="167.99.232.250"; $env:PORT="80"; $env:VUS="800"; $env:RAMP="120s"; $env:HOLD="480s"; $env:K6_WEB_DASHBOARD="true"; $env:K6_WEB_DASHBOARD_EXPORT="c:\Users\ASUS\Desktop\integrador\filo-estilo\k6\QUIEBRE-reporte.html"; k6 run c:\Users\ASUS\Desktop\integrador\filo-estilo\k6\load-test.js
```

## Qué capturar en cada corrida
- Dashboard en vivo (http://localhost:5665) en minuto 5 y 15
- Gráficas de DigitalOcean Insights: CPU/RAM de `filo-app-1` y `filo-db`
- El resumen final de la consola (TOTAL RESULTS) y el HTML generado
