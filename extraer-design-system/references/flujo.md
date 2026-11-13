# Flujo detallado

## 1 · Mapa del archivo (1 a 3 lecturas)

- `get_metadata` sin `nodeId`: lista de páginas.
- Clasifica cada página: foundations, componentes, pantallas, interna o descartable (por ejemplo, "do not use").
- `get_metadata` en las páginas de componentes para ubicar los component sets y sus nodos. Solo la estructura.
- Guarda `mapa.md`.

## 2 · Variables y estilos (sin gastar lecturas)

- Un script de solo lectura con `use_figma` (carga antes la skill `figma-use`, si tu cliente la tiene). Por cada colección local: nombre, modos y, por cada variable, nombre, tipo, valor o alias en cada modo, descripción y scopes. Más los estilos de texto y de efecto.
- La respuesta de `use_figma` tiene un límite de 20 KB: si el archivo tiene muchas variables, pide una colección por llamada, o en tandas de 100 variables.
- Guarda el resultado crudo en `extraccion/<nombre>/variables.json` y trabaja desde ahí.
- Respaldo, si `use_figma` no está disponible: `get_variable_defs` sobre un nodo representativo de cada component set. Solo trae nombre y valor final, sin modos ni alias: anota en hallazgos que los niveles y los modos no se pudieron confirmar.
- Si el archivo usa una librería, `get_libraries` y `search_design_system` para ver de dónde vienen las variables.

## 3 · Componentes (1 o 2 lecturas por componente)

- `get_design_context` sobre el set, no sobre cada variante. Si el set es muy grande, la herramienta devuelve solo la estructura: en ese caso pide una variante representativa.
- `get_screenshot` solo si algo visual no queda claro.
- Por componente: nombre, propiedades y valores, estados presentes, estados que faltan respecto del patrón habitual (default, hover, pressed, focus, disabled, error si aplica), tokens que usa y valores sueltos.

## 4 · Tokens

`design_tokens.json` en formato DTCG, con los niveles que tenga el archivo:

- `primitive`: valores crudos (escalas de color, spacing, radius, tipografía).
- `semantic`: roles que referencian primitivos con `{primitive.…}`.
- `component`: tokens de componentes que referencian semánticos.

Reglas:

- El nombre original de Figma va en `$description` (por ejemplo, `"Original en Figma: surface/action"`). El nombre del token se normaliza a minúsculas con guiones.
- Modo por defecto en `$value`, los demás en `$extensions.modes`.
- Los alias de Figma se vuelven referencias entre llaves. Si una variable no es alias de otra, es primitive.
- Si una variable no encaja clara en un nivel, ubícala en el más probable y anótalo en hallazgos.

## 5 · tokens.css (solo si lo pidió)

Genéralo desde el json con el formato de `salidas.md`. No lo importes en ninguna app ni toques estilos existentes sin confirmación.

## 6 · Inventario y hallazgos

`componentes.md` y `hallazgos.md` con el formato de `salidas.md`. En hallazgos: valores sueltos, casi duplicados, nombres inconsistentes, estados faltantes, contraste (si corriste el validador) y preguntas abiertas.

## 7 · Validador

Si existe `validar-tokens.mjs`, crea `extraccion/<nombre>/validador.config.json` con los niveles y los modos del archivo extraído y sin pares de contraste (los pares del proyecto son de otro sistema). El validador la toma sola porque está al lado del json. Córrelo y pega la salida en hallazgos. Sus errores son información sobre el sistema extraído, no algo para "arreglar" en silencio.
