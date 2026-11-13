# Validador de tokens

Un script que revisa tu `design_tokens.json` y te dice si algo está mal. Claude genera tokens rápido, pero puede equivocarse. El validador es la verificación objetiva: no depende de que nadie "lo vea bien".

## Qué revisa

| Chequeo | Qué busca |
| --- | --- |
| Nombres | Que cada parte del nombre esté en minúsculas, con números y guiones (`semantic.color.text.on-action`). Que todo token tenga `$type`. |
| Referencias | Que cada referencia apunte a un token que existe, sin ciclos. Que se respeten los niveles: `semantic` apunta a `primitive`, `component` apunta a `semantic`. Que `semantic` y `component` no tengan valores fijos. Avisa si algo usa un token deprecado. |
| Modos | Que todos los colores semánticos tengan valor para dark (y para cualquier otro modo de la configuración). |
| Descripciones | Opcional. Que cada token semántico y de componente tenga una descripción que diga cuándo usarlo. Es lo que hace que el sistema se pueda leer con IA. Se activa en la configuración con `"requireDescriptions": {"levels": ["semantic", "component"], "severity": "error"}`. |
| Contraste | Que los pares de texto y fondo definidos en la configuración pasen el mínimo WCAG en cada modo: 4.5:1 para texto, 3:1 para bordes y elementos de UI. |

## Cómo se usa

Necesitas Node 18 o superior. No hay nada que instalar.

```bash
node validar-tokens.mjs design_tokens.json
```

Busca `validador.config.json` primero al lado de los tokens y, si no está ahí, al lado del script. Así funciona igual en la raíz del proyecto y dentro de una Skill (`.claude/skills/<nombre>/scripts/`). Para usar otra:

```bash
node validar-tokens.mjs design_tokens.json --config ruta/validador.config.json
```

Para que Claude Code lea el resultado como datos:

```bash
node validar-tokens.mjs design_tokens.json --json
```

Devuelve código de salida 0 si está todo en verde y 1 si hay errores.

## Formato de tokens que espera

Formato DTCG (W3C) con tres niveles en la raíz: `primitive`, `semantic` y `component`.

- Las referencias van entre llaves: `"$value": "{primitive.color.cyan.700}"`.
- El modo light es el `$value`. Los otros modos van en `$extensions.modes`:

```json
"default": {
  "$value": "{primitive.color.cyan.700}",
  "$extensions": { "modes": { "dark": "{primitive.color.cyan.400}" } }
}
```

- Los colores pueden ser hex (`"#0E7490"`) u objeto DTCG con `hex`.
- Para deprecar un token: `"$deprecated": "Usar semantic.color.surface.default"`.

## Cómo adaptarlo a tu sistema

No hace falta tocar el script. Todo se ajusta en `validador.config.json`:

- `levels` y `allowedReferences`: los niveles de tu arquitectura y quién puede apuntar a quién.
- `modes`: el primero es el modo por defecto.
- `requireModes.modes` (opcional): qué modos exige a los colores. Útil si sumas modos de plataforma: con `"modes": ["light", "dark", "mobile", "web"]`, pon `"requireModes": {"level": "semantic", "types": ["color"], "modes": ["dark"]}` para que a los colores no les pida valores de mobile y web.
- `contrastModes` (opcional): en qué modos se revisa el contraste. Con modos de plataforma, `["light", "dark"]`.
- `contrastPairs`: los pares de texto y fondo que quieres proteger.
- `namePattern`: la convención de nombres, como expresión regular.

Pídele a Claude Code: "Adapta validador.config.json a mi design_tokens.json: revisa mis niveles, mis modos y arma los pares de contraste que importan en mis componentes."
