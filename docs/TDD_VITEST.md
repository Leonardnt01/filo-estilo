# TDD con Vitest - FILO ESTILO

## 1. Objetivo

Este documento describe la implementacion de TDD parcial en FILO ESTILO usando Vitest como framework de pruebas unitarias. Su finalidad es fortalecer la calidad interna del sistema mediante la validacion de logica critica, sin ampliar innecesariamente el alcance hacia pruebas visuales o de integracion que ya son cubiertas por BDD y pruebas API.

## 2. Enfoque adoptado

El proyecto no aplica TDD sobre toda la aplicacion. Se adopta una estrategia parcial, equivalente aproximadamente al 20 por ciento de la logica critica reusable, priorizando:

- autorizacion por roles y sedes
- control de intentos y rate limit
- reglas base de reserva

Esta estrategia permite cubrir las piezas con mayor impacto en seguridad y consistencia del negocio, manteniendo el esfuerzo de implementacion alineado al alcance del MVP.

## 3. Framework utilizado

- `Vitest`

Vitest fue elegido por su integracion natural con TypeScript, su baja complejidad de configuracion y su compatibilidad con proyectos modernos basados en Next.js.

## 4. Configuracion implementada

### Scripts

En [package.json](C:/Users/ASUS/Desktop/integrador/filo-estilo/package.json) se agregaron los siguientes scripts:

```json
"test:unit": "vitest run",
"test:unit:watch": "vitest"
```

### Configuracion de Vitest

Se incorporo el archivo [vitest.config.mts](C:/Users/ASUS/Desktop/integrador/filo-estilo/vitest.config.mts) para:

- resolver el alias `@/`
- ejecutar pruebas en entorno `node`

## 5. Estructura de pruebas unitarias

```txt
tests/
  unit/
    auth/
      session.test.ts
    booking/
      booking.test.ts
    security/
      rate-limit.test.ts
```

## 6. Modulos cubiertos

### 6.1 Rate limit

Archivo fuente:

- [rate-limit.ts](C:/Users/ASUS/Desktop/integrador/filo-estilo/src/lib/security/rate-limit.ts)

Archivo de prueba:

- [rate-limit.test.ts](C:/Users/ASUS/Desktop/integrador/filo-estilo/tests/unit/security/rate-limit.test.ts)

Casos cubiertos:

- permite el primer intento
- descuenta el contador restante
- bloquea cuando se supera `maxAttempts`
- reinicia el contador cuando vence `windowMs`
- usa `x-forwarded-for` como IP principal
- usa `x-real-ip` si no existe `x-forwarded-for`
- devuelve `unknown` cuando no hay headers de IP

### 6.2 Autorizacion por sesion y sede

Archivo fuente:

- [session.ts](C:/Users/ASUS/Desktop/integrador/filo-estilo/src/lib/auth/session.ts)

Archivo de prueba:

- [session.test.ts](C:/Users/ASUS/Desktop/integrador/filo-estilo/tests/unit/auth/session.test.ts)

Casos cubiertos:

- deteccion de admin global
- calculo de sedes gestionables para admin global
- filtrado de sedes `owner/admin`
- eliminacion de duplicados
- rechazo de sedes sin permisos
- rechazo de `branchId` nulo o indefinido
- caso donde el usuario solo tiene rol `barber`

Nota tecnica:

- se aplico `mock` del cliente de Supabase para aislar la logica pura de autorizacion y evitar dependencias innecesarias del entorno SSR

### 6.3 Reglas base de reserva

Archivo fuente:

- [booking.ts](C:/Users/ASUS/Desktop/integrador/filo-estilo/src/lib/booking.ts)

Archivo de prueba:

- [booking.test.ts](C:/Users/ASUS/Desktop/integrador/filo-estilo/tests/unit/booking/booking.test.ts)

Casos cubiertos:

- suma de minutos a una hora base
- cruce de tramo horario alto
- rechazo de fecha pasada
- rechazo por exceso de ventana de 60 dias
- aceptacion de fechas validas
- deteccion de cita futura
- deteccion de cita que ya no es futura

Nota tecnica:

- se uso reloj controlado con `vi.useFakeTimers()` para evitar inestabilidad por dependencia del tiempo real

## 7. Comandos de ejecucion

Ejecucion completa:

```bash
npm run test:unit
```

Modo observacion:

```bash
npm run test:unit:watch
```

Ejecucion por archivo:

```bash
npx vitest run tests/unit/security/rate-limit.test.ts
npx vitest run tests/unit/auth/session.test.ts
npx vitest run tests/unit/booking/booking.test.ts
```

## 8. Resultado actual

Estado verificado de la suite:

- 3 archivos de prueba
- 19 pruebas unitarias aprobadas
- ejecucion satisfactoria con `npm run test:unit`

## 9. Relacion con BDD

En FILO ESTILO, TDD no reemplaza BDD. Ambas estrategias cumplen funciones complementarias:

- BDD valida comportamiento funcional observable del sistema
- TDD valida logica interna critica y reusable

Correspondencia:

- `bdd/*` -> historias de usuario y escenarios funcionales
- `tests/unit/*` -> reglas internas y helpers del dominio

## 10. Alcance y justificacion academica

La adopcion de TDD parcial responde a una decision tecnica deliberada: concentrar el esfuerzo de pruebas unitarias en los modulos con mayor impacto sobre seguridad, control de acceso y reglas del negocio. Esta estrategia es adecuada para un MVP universitario con restricciones de tiempo, ya que incrementa la confiabilidad del sistema sin desviar el foco principal del proyecto.

## 11. Evidencia recomendada

Para el informe final se recomienda adjuntar:

- captura de `npm run test:unit`
- tabla de modulos cubiertos
- cantidad total de pruebas aprobadas
- referencia a los archivos fuente y archivos `.test.ts`

## 12. Conclusion

La implementacion de TDD con Vitest en FILO ESTILO fortalece la validacion del nucleo logico del sistema, especialmente en autorizacion por sede, rate limiting y reglas de reserva. En conjunto con BDD, esta estrategia aporta trazabilidad funcional y calidad tecnica medible.
