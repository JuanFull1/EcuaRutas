# Seguridad

Este documento establece las reglas iniciales de seguridad para el desarrollo de EcuaRutas.

## Información sensible

No se debe almacenar en el repositorio:

- Contraseñas.
- Tokens de acceso.
- Claves privadas.
- Credenciales de servicios externos.
- Variables de entorno con información sensible.
- Cadenas de conexión que contengan credenciales reales.

Los archivos `.env` y otros archivos locales con secretos deberán mantenerse fuera del control de versiones.

## Datos personales

El sistema manejará información de pasajeros y usuarios.

Durante el desarrollo se evitará publicar en el repositorio información personal real, documentos de identidad, comprobantes de pago u otros datos sensibles utilizados para pruebas.

## Código y dependencias

Antes de integrar cambios se deberá comprobar que:

- No se hayan incluido credenciales.
- No se hayan versionado archivos generados innecesarios.
- Las dependencias utilizadas sean necesarias para el proyecto.
- Los cambios hayan sido revisados mediante Pull Request.

## Reporte de problemas de seguridad

Los problemas relacionados con seguridad deberán comunicarse al equipo y registrarse para su análisis sin publicar credenciales o información sensible.