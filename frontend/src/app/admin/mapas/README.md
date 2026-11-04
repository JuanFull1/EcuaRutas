# Integración administrativa de mapas

Ambos visualizadores se cargan de forma diferida dentro del `Layout` existente:

| URL | Selección contextual |
| --- | --- |
| `/admin/mapas/lugares?lugarId=11` | Lugar 11 |
| `/admin/mapas/rutas?rutaId=7` | Recorrido completo de la ruta 7 |
| `/admin/mapas/rutas?rutaId=7&paradaId=101` | Parada 101 de la ruta 7 |

El padre administrativo y cada ruta de mapa utilizan los guards existentes
`authGuard` y `roleGuard`, con `roles: ['ADMIN']`. Los enlaces se incorporan solo
al menú ADMIN. Su resaltado compara exactamente el path e ignora los parámetros
de consulta. Los otros enlaces conservan sus opciones anteriores.

Los listados generan enlaces Angular que transmiten únicamente identificadores.
Los mapas consultan los catálogos con los servicios existentes y no reciben DTOs
por URL ni agregan escrituras. Los enlaces de regreso abren la gestión respectiva;
el menú permite volver al inicio o cambiar de módulo.

La selección inicial espera la carga del catálogo y el mapa. `queryParamMap`
permite cambiar de identificador conservando el componente y su instancia MapLibre.
`identificadorMapa` rechaza parámetros repetidos, vacíos, negativos, decimales y
valores fuera de int32 positivo. Un registro inexistente o una parada ajena a la
ruta muestra un aviso; nunca selecciona otro registro como sustituto. Un lugar
sin coordenadas conserva sus datos sin fabricar una posición.

Las consultas y la suscripción a parámetros se limpian con `takeUntilDestroyed`.
Se conserva la cancelación de paradas al cambiar de ruta y la propiedad de los
recursos cartográficos de cada visualizador. MapLibre 6 observa el tamaño de su
contenedor mediante `trackResize`; el menú móvil se superpone y no cambia el
ancho del área de contenido. No se modifican CSS global ni el mapa compartido.

## Verificación

Desde `frontend`:

```text
npm test -- --watch=false --include=src/app/admin/mapas/mapas-integracion.spec.ts
npm test -- --watch=false --include=src/app/admin/**/*.spec.ts --include=src/app/shared/maps/**/*.spec.ts
npm test -- --watch=false
npx --no-install tsc -p tsconfig.app.json --noEmit
npx --no-install tsc -p tsconfig.spec.json --noEmit
npm run build
node src/app/admin/mapas/mapas-integracion.browser.mjs
```

La suite de integración utiliza router, guards, AuthService, interceptor HTTP,
servicios y layout reales, con HttpTestingController y MapLibre simulado. Comprueba
los enlaces, las restricciones de todos los roles existentes, sesiones vencidas,
selección contextual, parámetros inválidos y conservación de la instancia del mapa.

El ejecutor de navegador utiliza Chrome/Edge instalado y un perfil aislado, sin
añadir dependencias. Compila una entrada exclusiva de pruebas con el router y
layout de producción. **La sesión y las respuestas HTTP son simuladas**; MapLibre,
WebGL por software, worker y cartografía son reales. Valida ambos mapas, los accesos
desde listados, selección por parámetros, menú móvil, liberación al navegar y
ausencia de desbordamiento a 1440 y 390 px. Guarda capturas y `resultado.json` en
`frontend/dist/mapas-integracion-browser/`. Esa entrada no se importa en producción.

La suite general conserva un fallo anterior en `app.spec.ts`: espera el título de
la plantilla inicial `Hello, frontend`, mientras `App` contiene un `router-outlet`.
Esta integración no modifica esa prueba ajena ni el componente raíz.

## Límites

La verificación contra la API del PR 2 y PostgreSQL queda pendiente. Las líneas de
ruta continúan siendo trazados referenciales entre puntos conocidos, sin cálculo
de distancia vial o tiempo. El estilo de demostración y el worker público mantienen
las limitaciones descritas en [el mapa compartido](../../shared/maps/README.md).
Los archivos compartidos de rutas y menú requieren atención al integrar cambios
de otros colaboradores. No se modifica autenticación, guards ni otros roles.
