# Salidas

Todo queda en `extraccion/<nombre>/`.

## extraccion/<nombre>/componentes.md

Una sección por componente, en este orden:

```markdown
## Button Group

- Nodo en Figma: 20663:520408
- Propiedades: size (small, medium), variant (neutral, brand), position (first, middle, last)
- Estados presentes: default, hover, pressed, disabled
- Estados faltantes: focus
- Tokens que usa: semantic.color.action.default, semantic.radius.control, …
- Valores sueltos: padding horizontal 14px sin variable; borde #C9C9C9 sin variable
- Notas: el estado hover usa el mismo color en brand y neutral
```

Al final, una tabla resumen:

```markdown
| Componente | Variantes | Estados faltantes | Valores sueltos |
| --- | --- | --- | --- |
| Button Group | 12 | focus | 2 |
```

## extraccion/<nombre>/hallazgos.md

```markdown
# Hallazgos · <nombre del sistema>

Extraído el <fecha> desde <link>. Llamadas al MCP: <n>.

## Lo más importante
1. …
2. …
3. …

## Valores sueltos
| Componente | Propiedad | Valor | Token sugerido |

## Casi duplicados
| Token A | Token B | Valor | Nota |

## Nombres inconsistentes
- …

## Estados faltantes
- …

## Validador
(pegar la salida de `node validar-tokens.mjs design_tokens.json`)

## Preguntas abiertas
- …
```

## extraccion/<nombre>/registro.md

```markdown
| # | Herramienta | Nodo | Para qué | Cuenta |
| --- | --- | --- | --- | --- |
| 1 | whoami | sin nodo | confirmar cuenta y plan | no |
| 2 | get_metadata | página raíz | lista de páginas | sí |
| 3 | use_figma | sin nodo | variables y estilos, solo lectura | no |

Al final: total de lecturas que cuentan para el límite.
```

## extraccion/<nombre>/tokens.css (solo si lo pidió)

Variables CSS generadas desde `design_tokens.json`. Un archivo de partida, no el definitivo.

```css
:root {
  --primitive-color-blue-600: #0176D3;
  --semantic-color-action-default: var(--primitive-color-blue-600);
}
[data-theme="dark"] {
  --semantic-color-action-default: var(--primitive-color-blue-400);
}
```

- Los nombres siguen el camino del token con guiones.
- Las referencias se vuelven `var(...)`, así la cadena de niveles se mantiene.
- Los modos que no son el de por defecto van en un selector `[data-theme="<modo>"]`.
