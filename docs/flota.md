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

## Aislamiento por cooperativa

Un usuario con rol `COOPERATIVA` o `OFICINISTA` solo puede operar sobre los buses de su propia cooperativa. El identificador de la cooperativa se toma del token (claim `cooperativa_id`). El rol `ADMIN` puede operar sobre cualquier cooperativa.

Si se intenta listar, consultar, crear, actualizar o dar de baja un bus de otra cooperativa, la API responde `403` con el mensaje "No puede operar sobre otra cooperativa.".

La misma validación se aplica a los grupos de buses (`/api/grupos-buses`): se comprueba la cooperativa al listar, consultar, crear, actualizar y desactivar un grupo.

### Plantillas de asientos

Una plantilla puede ser **general** (sin cooperativa asociada, `cooperativaId` nulo) o pertenecer a una cooperativa. Las reglas para un usuario con rol `COOPERATIVA` u `OFICINISTA` son:

| Operación | Plantilla propia | Plantilla general | Plantilla de otra cooperativa |
|-----------|------------------|-------------------|-------------------------------|
| Consultar la plantilla y su disposición de asientos | Permitido | Permitido | 403 |
| Asignarla a un bus | Permitido | Permitido | 403 |
| Crear | Permitido, en su cooperativa | 403 (solo ADMIN) | 403 |
| Definir la disposición de asientos | Permitido | 403 (solo ADMIN) | 403 |

Reglas adicionales:

- Al listar plantillas sin `cooperativaId`, se usa la cooperativa del token; un usuario de cooperativa no puede listar las de otra (403).
- Asignar una plantilla a un bus y consultar los asientos de un bus (`/api/buses/{busId}/...`) exige que el bus sea de la cooperativa del usuario.
- El rol `ADMIN` puede operar sobre cualquier plantilla, incluidas las generales.

## Pantallas del rol COOPERATIVA

| Pantalla | Ruta | Qué permite |
|----------|------|-------------|
| Inicio | `/cooperativas/inicio` | Muestra el total de buses (sin contar los dados de baja) y de plantillas activas |
| Buses | `/cooperativas/buses` | Lista los buses, con acciones de editar y dar de baja |
| Nuevo bus | `/cooperativas/buses/nuevo` | Registra un bus |
| Editar bus | `/cooperativas/buses/:id/editar` | Modifica los datos y el estado de un bus |
| Grupos | `/cooperativas/grupos` | Lista los grupos de buses |
| Plantillas | `/cooperativas/plantillas` | Lista las plantillas de asientos |
