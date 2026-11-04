# Política de seguridad — EcuaRutas

EcuaRutas administra información de usuarios, pasajeros, cooperativas, reservas, pagos y boletos. Todo cambio debe proteger la confidencialidad de esos datos y limitar el acceso según los roles del sistema.

## Información sensible

**Nunca incluyas en commits, Pull Requests, capturas o incidencias públicas:**

- Contraseñas de usuarios o contraseñas de aplicación de Gmail.
- Secretos JWT, tokens de acceso, claves de API o claves privadas.
- Cadenas de conexión que contengan contraseñas o identificadores sensibles.
- Archivos locales de secretos (`secrets.json`, `.env` con datos reales) y respaldos con credenciales.
- Datos personales identificables de pasajeros, documentos de identidad, comprobantes reales o datos de pago.

Para desarrollo con ASP.NET Core, utiliza **User Secrets** u otros mecanismos seguros de configuración local. En despliegues, emplea variables de entorno o un gestor de secretos adecuado. No confundas User Secrets con un almacén cifrado de producción.

## Acceso y autorización

- Usa autenticación y autorización en los endpoints que administren o consulten información privada.
- Comprueba los roles `ADMIN`, `COOPERATIVA`, `OFICINISTA`, `CLIENTE` y `BUS` según la operación.
- Para información de clientes, filtra los datos por la identidad autenticada; nunca confíes solamente en un identificador enviado desde el navegador.
- Revisa la separación de información entre cooperativas cuando corresponda.
- Los endpoints públicos deben estar definidos y documentados de forma intencional.

## Base de datos y notificaciones

- No ejecutes scripts destructivos ni migraciones sobre bases compartidas sin revisión y respaldo.
- Mantén el esquema PostgreSQL y el código del backend compatibles; documenta las migraciones para bases previamente creadas.
- Antes de habilitar el procesamiento SMTP, verifica los estados de `notificaciones`, la conexión a PostgreSQL y el comportamiento ante errores.
- Evita reenvíos masivos o inesperados de correos; realiza las pruebas con destinatarios controlados.

## Dependencias y cambios

Antes de solicitar un merge:

1. Comprueba que no se incluyeron secretos ni archivos generados sensibles.
2. Revisa los permisos de los nuevos endpoints.
3. Valida las dependencias y advierte sobre vulnerabilidades conocidas cuando se detecten.
4. Compila los componentes afectados y especifica las pruebas ejecutadas y pendientes.
5. Solicita revisión de otros integrantes para cambios en autenticación, pagos o tratamiento de datos.

## Configuración y puesta en marcha

En desarrollo, las cadenas de conexión y credenciales SMTP se almacenan en User Secrets, no en `appsettings.json` versionado. No actives `Correo:Habilitado=true` en un entorno con notificaciones pendientes hasta verificar la compatibilidad SQL, destinatarios y comportamiento de reintentos. El script inicial `database/EcuaRutas.sql` y las migraciones deben revisarse antes de usarse en entornos compartidos.

## Reporte de vulnerabilidades

Si detectas una vulnerabilidad, **no publiques credenciales, pasos de explotación contra sistemas reales ni información personal en un Issue público**. Repórtala de forma privada a los responsables del repositorio mediante los canales de coordinación del equipo o las opciones de reporte privado de GitHub, si están habilitadas.

Incluye una descripción del problema, su impacto posible y una manera segura de reproducirlo. El equipo evaluará su prioridad y coordinará la corrección antes de divulgar detalles.

## Incidentes relacionados con secretos

Si una credencial llega a exponerse, debe **revocarse o rotarse**, incluso si posteriormente se elimina del repositorio o del historial visible. La eliminación del archivo por sí sola no invalida la clave comprometida.
