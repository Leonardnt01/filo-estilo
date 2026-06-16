# Skill: Optimización de Performance para Filo Estilo

Actúa como un senior frontend/fullstack especializado en performance con Next.js App Router, Supabase, Tailwind CSS y TypeScript.

## Contexto del proyecto

Este proyecto es una aplicación web universitaria llamada Filo Estilo.
El frontend y backend están en un solo repositorio usando:

- Next.js App Router
- React
- TypeScript
- Supabase Auth, Database y Storage
- Tailwind CSS
- API Routes de Next.js
- Vercel como plataforma objetivo

El objetivo principal es mejorar la velocidad de carga, navegación entre vistas, peso del frontend y rendimiento general sin romper la lógica existente del sistema.

## Reglas principales

Antes de modificar código, revisa el proyecto y prepara un diagnóstico breve indicando:

1. Qué partes pueden estar generando lentitud.
2. Qué archivos o componentes parecen críticos.
3. Qué mejoras aplicarías primero.
4. Qué cambios NO harías todavía y por qué.

No hagas refactors grandes si no son necesarios.
No cambies la lógica de negocio.
No cambies nombres de rutas, endpoints, modelos o tablas sin justificación clara.
No elimines funcionalidades existentes.
No agregues librerías pesadas sin explicar por qué.
Prioriza cambios pequeños, seguros y medibles.

## Áreas que debes revisar

### 1. Uso correcto de Server Components y Client Components

Revisa si hay demasiados archivos con `"use client"`.

Mantén como Server Components todo lo que sea:

- Contenido estático
- Layouts
- Secciones informativas
- Fetching de datos inicial
- SEO
- Páginas sin interacción fuerte

Usa `"use client"` solo cuando sea necesario:

- Formularios interactivos
- Modales
- Estados locales
- Eventos onClick
- Hooks como useState, useEffect, useRouter
- Acceso a localStorage, window o document

Si encuentras componentes grandes marcados como `"use client"`, propón dividirlos en:

- Un componente server para estructura y datos.
- Un componente client pequeño para la interacción.

### 2. Optimización de imágenes

Revisa todas las imágenes del proyecto.

Prioriza:

- Reemplazar `<img>` por `next/image` cuando corresponda.
- Definir siempre `width`, `height` y `alt`.
- Usar `priority` solo en la imagen principal visible al cargar la página.
- Usar `loading="lazy"` para imágenes secundarias si aplica.
- Evitar imágenes PNG/JPG muy pesadas en el repositorio.
- Recomendar WebP para la mayoría de imágenes.
- Usar AVIF solo si tiene sentido, considerando que puede tardar más en procesarse.
- Evitar subir imágenes enormes si se muestran pequeñas.
- Revisar imágenes de hero, banners, cards, servicios, barberos y testimonios.

Si las imágenes vienen desde Supabase Storage, revisar `next.config.ts` y configurar `images.remotePatterns` correctamente.

No conviertas imágenes automáticamente si no tienes claro dónde se usan. Primero identifica cuáles son pesadas y dónde impactan.

### 3. Navegación entre páginas

Revisa que la navegación interna use `next/link` y no etiquetas `<a>` para rutas internas.

Verifica:

- Links del header.
- Links de botones.
- Navegación a login, registro, reservas, perfil y panel admin.
- Evitar recargas completas innecesarias.
- Evitar usar `window.location.href` si se puede usar navegación de Next.js.

### 4. Consultas a Supabase

Revisa las consultas a Supabase en:

- API routes
- Server actions
- Componentes server
- Componentes client
- Hooks personalizados
- Archivos dentro de `src/lib/supabase`

Optimiza siguiendo estas reglas:

- No usar `select("*")` si solo se necesitan algunos campos.
- Evitar consultas repetidas en varios componentes de la misma vista.
- Evitar pedir datos en cliente si pueden cargarse desde servidor.
- Revisar si hay consultas ejecutándose en cada render.
- Evitar llamadas innecesarias en `useEffect`.
- Revisar si las tablas consultadas frecuentemente necesitan índices.

Tablas importantes a revisar:

- profiles
- branches
- memberships
- services
- barbers
- business_hours
- appointments
- featured_services
- testimonials
- promotions
- site_settings

Si detectas filtros frecuentes como `branch_id`, `barber_id`, `user_id`, `status`, `appointment_date` o rangos de fecha, sugiere índices SQL, pero no los apliques sin explicar antes.

### 5. Bundle y JavaScript enviado al cliente

Revisa si se están importando librerías grandes en componentes client.

Busca:

- Librerías usadas solo para una pequeña función.
- Icon packs importados de forma pesada.
- Componentes grandes cargados en la primera vista.
- Modales, calendarios, dashboards o gráficos cargados aunque no se usen al inicio.

Cuando tenga sentido:

- Usar dynamic import.
- Cargar componentes pesados solo cuando se necesiten.
- Separar código de admin y cliente.
- Evitar que el home cargue lógica del panel admin.
- Evitar que el login cargue componentes innecesarios.

Si se requiere medir bundle, proponer uso de `@next/bundle-analyzer`.

### 6. Tailwind CSS y estilos

Revisa clases duplicadas, clases innecesarias y estilos muy costosos.

No es prioridad cambiar clases solo porque el editor sugiere una forma más corta, por ejemplo:

- `z-[120]` a `z-120`
- `bg-gradient-to-r` a `bg-linear-to-r`
- `text-[var(--accent)]` a `text-accent`

Eso ayuda a limpieza, pero no suele ser la causa principal de lentitud.

Sí revisar con más cuidado:

- Uso excesivo de `backdrop-blur`
- Sombras muy pesadas
- Animaciones constantes
- Transiciones aplicadas a demasiados elementos
- Efectos visuales en listas grandes

Si una animación o blur afecta rendimiento, proponer una versión más ligera.

### 7. Caching y carga de datos

Revisa si las páginas públicas pueden usar cache o renderizado estático.

Prioriza cache para:

- Home
- Servicios destacados
- Testimonios
- Promociones
- Configuración del sitio
- Información de sedes

No cachear sin cuidado:

- Datos de sesión
- Perfil del usuario autenticado
- Citas personales
- Panel admin
- Información sensible

Si hay datos que cambian poco, proponer `revalidate`.
Si hay datos privados, mantenerlos dinámicos.

### 8. API Routes

Revisa endpoints dentro de `src/app/api`.

Optimiza:

- Validaciones innecesariamente repetidas.
- Consultas duplicadas.
- Respuestas demasiado grandes.
- Errores que generan retries o lentitud.
- Uso incorrecto del cliente Supabase.
- Falta de control de campos retornados.

No cambiar contratos de respuesta sin advertirlo.

### 9. Métricas y validación

Antes y después de los cambios, indicar cómo validar:

- `npm run build`
- `npm run lint`
- `npm run test` si existe
- Lighthouse en mobile y desktop
- Network tab del navegador
- Tamaño de imágenes
- Tiempo de respuesta de endpoints
- Tamaño del bundle si se configura analyzer

Cada mejora debe tener una explicación clara:

- Problema detectado
- Archivo afectado
- Cambio realizado
- Riesgo del cambio
- Cómo probarlo

## Orden de trabajo recomendado

Trabaja en este orden:

1. Detectar imágenes pesadas y uso incorrecto de `<img>`.
2. Revisar componentes con `"use client"` innecesario.
3. Revisar navegación interna con `next/link`.
4. Revisar consultas Supabase repetidas o muy grandes.
5. Revisar bundle e imports pesados.
6. Revisar animaciones, blur y estilos costosos.
7. Revisar caching de páginas públicas.
8. Proponer índices SQL si hay filtros frecuentes.

## Forma de responder

Cuando termines la revisión, responde con este formato:

### Diagnóstico

Explica de forma breve qué estaba afectando el rendimiento.

### Cambios aplicados

Lista los archivos modificados y qué se hizo en cada uno.

### Cambios sugeridos no aplicados

Indica mejoras que conviene hacer después, pero que no aplicaste porque requieren más validación.

### Cómo probar

Indica los comandos y pasos para validar.

### Riesgos

Menciona si algún cambio puede afectar datos, rutas, autenticación o comportamiento visual.

## Importante

No optimices a ciegas.
No cambies todo el proyecto de golpe.
Primero mide, luego mejora.
La prioridad es que la app cargue más rápido, navegue mejor y mantenga el código limpio.