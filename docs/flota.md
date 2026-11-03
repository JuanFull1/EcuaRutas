# Módulo de flota

Documentación del módulo de flota de EcuaRutas: buses, grupos de buses y plantillas de asientos.

## Endpoints

Todos los endpoints requieren un token JWT. Las consultas (GET) están permitidas a los roles `ADMIN`, `COOPERATIVA` y `OFICINISTA`. Las operaciones de escritura solo a `ADMIN` y `COOPERATIVA`.

### Buses (`/api/buses`)

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/api/buses` | Lista los buses de una cooperativa | ADMIN, COOPERATIVA, OFICINISTA |
| GET | `/api/buses/{id}` | Obtiene un bus | ADMIN, COOPERATIVA, OFICINISTA |
| POST | `/api/buses` | Registra un bus | ADMIN, COOPERATIVA |
| PUT | `/api/buses/{id}` | Actualiza un bus | ADMIN, COOPERATIVA |
| DELETE | `/api/buses/{id}` | Da de baja un bus | ADMIN, COOPERATIVA |
| GET | `/api/buses/{busId}/asientos` | Consulta los asientos de un bus | ADMIN, COOPERATIVA, OFICINISTA |
| PUT | `/api/buses/{busId}/plantilla/{plantillaId}` | Asigna una plantilla a un bus | ADMIN, COOPERATIVA |

### Grupos de buses (`/api/grupos-buses`)

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/api/grupos-buses` | Lista los grupos | ADMIN, COOPERATIVA, OFICINISTA |
| GET | `/api/grupos-buses/{id}` | Obtiene un grupo | ADMIN, COOPERATIVA, OFICINISTA |
| POST | `/api/grupos-buses` | Crea un grupo | ADMIN, COOPERATIVA |
| PUT | `/api/grupos-buses/{id}` | Actualiza un grupo | ADMIN, COOPERATIVA |
| DELETE | `/api/grupos-buses/{id}` | Desactiva un grupo | ADMIN, COOPERATIVA |

### Plantillas de asientos (`/api/plantillas`)

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/api/plantillas` | Lista las plantillas | ADMIN, COOPERATIVA, OFICINISTA |
| GET | `/api/plantillas/{id}` | Obtiene una plantilla | ADMIN, COOPERATIVA, OFICINISTA |
| POST | `/api/plantillas` | Crea una plantilla | ADMIN, COOPERATIVA |
| GET | `/api/plantillas/{id}/asientos` | Consulta la disposición de asientos | ADMIN, COOPERATIVA, OFICINISTA |
| PUT | `/api/plantillas/{id}/asientos` | Define la disposición de asientos | ADMIN, COOPERATIVA |

### Tipos de asiento (`/api/tipos-asiento`)

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/api/tipos-asiento` | Lista los tipos de asiento | ADMIN, COOPERATIVA, OFICINISTA |

## Códigos de respuesta

- `401`: no se envió un token válido.
- `403`: el rol no tiene permiso o se intenta operar sobre otra cooperativa.
- `404`: el recurso no existe.
- `409`: conflicto con datos existentes (por ejemplo, una placa o un número de bus duplicado).
