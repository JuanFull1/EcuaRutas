# Gestión de Cambios

Este documento define el proceso inicial de control de cambios utilizado en EcuaRutas.

## Herramientas

El proyecto utilizará:

- Git y GitHub para control de versiones.
- GitHub Issues y Pull Requests para documentar solicitudes de cambio, cuando aplique, y revisar su implementación.
- GitFlow como flujo de trabajo para el desarrollo.

## Comité de Control de Cambios

El equipo contará con un Comité de Control de Cambios (CCB), formado por uno o dos integrantes.

El comité será responsable de revisar las peticiones de cambio y decidir si deben ser aprobadas, rechazadas o canceladas.

## Tipos de cambio

### Standard

Cambios conocidos, repetitivos y de bajo riesgo.

### Normal

Cambios que requieren evaluación y aprobación antes de ser implementados.

### Emergency

Cambios urgentes relacionados con errores críticos de una versión estable.

Los cambios de emergencia que afectan una versión estable podrán implementarse mediante ramas `hotfix/*`, creadas desde `main`. Una vez aprobada la corrección, se integra en `main` y también en `develop` para conservarla en el desarrollo futuro.

Los errores encontrados durante el desarrollo se corrigen mediante ramas `bugfix/*`, creadas desde `develop` e integradas de vuelta en `develop`. No se clasifican como cambios de emergencia salvo que afecten una versión estable publicada.

## Proceso general

1. Registrar la petición de cambio.
2. Clasificar el tipo de cambio.
3. Analizar impacto y justificación.
4. Revisar la petición mediante el CCB.
5. Aprobar, rechazar o cancelar el cambio.
6. Implementar el cambio en una rama correspondiente: `feature/*` para funcionalidad, `docs/*` para documentación, `bugfix/*` para errores de desarrollo o `hotfix/*` para una corrección urgente de una versión estable.
7. Registrar los cambios mediante commits.
8. Crear un Pull Request.
9. Realizar revisión por otro integrante.
10. Integrar y cerrar la petición de cambio.

## Trazabilidad

Cada petición deberá permitir identificar, cuando corresponda:

- Identificador del cambio.
- Solicitante.
- Responsable.
- Tipo de cambio.
- Descripción y justificación.
- Estado.
- Rama relacionada.
- Commits relacionados.
- Pull Request relacionado.
- Resultado de la revisión.
