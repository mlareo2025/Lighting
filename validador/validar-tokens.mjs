#!/usr/bin/env node
// Validador de design tokens · Design System AI Ready
// Uso: node validar-tokens.mjs [ruta/design_tokens.json] [--config ruta] [--json]
// Sin dependencias. Requiere Node 18 o superior.

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ---------- argumentos ----------
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--config");

const tokensPath = resolve(positional[0] ?? "design_tokens.json");
// La configuración se busca en este orden: --config, al lado de los tokens, al lado de este script.
const scriptDir = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(
  option("--config") ??
    [join(dirname(tokensPath), "validador.config.json"), join(scriptDir, "validador.config.json")].find((p) => existsSync(p)) ??
    join(dirname(tokensPath), "validador.config.json")
);
const jsonOutput = flag("--json");

const fail = (msg) => {
  console.error(`✖ ${msg}`);
  process.exit(2);
};

if (!existsSync(tokensPath)) fail(`No encuentro el archivo de tokens: ${tokensPath}`);

let tokens;
try {
  tokens = JSON.parse(readFileSync(tokensPath, "utf8"));
} catch (e) {
  fail(`El archivo de tokens no es JSON válido: ${e.message}`);
}

const defaultConfig = {
  levels: ["primitive", "semantic", "component"],
  allowedReferences: {
    primitive: [],
    semantic: ["primitive"],
    component: ["semantic"],
  },
  modes: ["light", "dark"],
  requireModes: { level: "semantic", types: ["color"] },
  namePattern: "^[a-z0-9]+(-[a-z0-9]+)*$",
  contrastPairs: [],
  requireDescriptions: null, // p. ej. { "levels": ["semantic", "component"], "severity": "error" }
};

let config = defaultConfig;
if (existsSync(configPath)) {
  try {
    config = { ...defaultConfig, ...JSON.parse(readFileSync(configPath, "utf8")) };
  } catch (e) {
    fail(`El archivo de configuración no es JSON válido: ${e.message}`);
  }
}

// ---------- recorrido del árbol ----------
const flat = new Map(); // path -> { token, type, level }
const issues = []; // { check, severity, path, message }
const add = (check, severity, path, message) => issues.push({ check, severity, path, message });

function walk(node, path, inheritedType) {
  if (node === null || typeof node !== "object" || Array.isArray(node)) return;
  const groupType = node.$type ?? inheritedType;
  if ("$value" in node) {
    flat.set(path.join("."), { token: node, type: groupType, level: path[0] });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    walk(child, [...path, key], groupType);
  }
}
walk(tokens, [], undefined);

if (flat.size === 0) fail("No encontré ningún token (nada con $value). ¿Es un archivo DTCG?");

// ---------- utilidades ----------
const refPattern = /^\{([^{}]+)\}$/;
const isRef = (v) => typeof v === "string" && refPattern.test(v.trim());
const refTarget = (v) => v.trim().match(refPattern)[1];
const defaultMode = config.modes[0];

function rawValue(entry, mode) {
  const override = entry.token.$extensions?.modes?.[mode];
  return mode !== defaultMode && override !== undefined ? override : entry.token.$value;
}

function resolveValue(path, mode, stack = []) {
  if (stack.includes(path)) return { error: `ciclo: ${[...stack, path].join(" → ")}` };
  const entry = flat.get(path);
  if (!entry) return { error: `no existe ${path}` };
  const value = rawValue(entry, mode);
  if (isRef(value)) return resolveValue(refTarget(value), mode, [...stack, path]);
  return { value, type: entry.type, chain: [...stack, path] };
}

function toHex(value) {
  if (typeof value === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return value;
  if (value && typeof value === "object" && typeof value.hex === "string") return value.hex;
  return null;
}

function luminance(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// ---------- 1. nombres ----------
const nameRe = new RegExp(config.namePattern);
for (const [path, entry] of flat) {
  if (!config.levels.includes(entry.level)) {
    add("nombres", "error", path, `el primer nivel debe ser uno de: ${config.levels.join(", ")}`);
  }
  for (const segment of path.split(".")) {
    if (!nameRe.test(segment)) {
      add("nombres", "error", path, `"${segment}" no sigue la convención (minúsculas, números y guiones)`);
    }
  }
  if (!entry.type) add("nombres", "error", path, "no tiene $type (ni en el token ni en su grupo)");
}

// ---------- 2. referencias y niveles ----------
for (const [path, entry] of flat) {
  const values = [["", entry.token.$value]];
  for (const [mode, v] of Object.entries(entry.token.$extensions?.modes ?? {})) values.push([mode, v]);

  for (const [mode, value] of values) {
    const where = mode ? ` (modo ${mode})` : "";
    if (isRef(value)) {
      const target = refTarget(value);
      const targetEntry = flat.get(target);
      if (!targetEntry) {
        add("referencias", "error", path, `apunta a ${target}, que no existe${where}`);
        continue;
      }
      const allowed = config.allowedReferences[entry.level] ?? [];
      if (!allowed.includes(targetEntry.level)) {
        add(
          "referencias",
          "error",
          path,
          `un token ${entry.level} no puede apuntar a ${targetEntry.level} (${target})${where}. Permitido: ${allowed.join(", ") || "ninguno, debe tener valor propio"}`
        );
      }
      if (targetEntry.token.$deprecated) {
        add("referencias", "warning", path, `usa ${target}, que está deprecado${where}`);
      }
      const resolved = resolveValue(path, mode || defaultMode);
      if (resolved.error) add("referencias", "error", path, resolved.error);
    } else if (entry.level !== "primitive") {
      add("referencias", "error", path, `tiene un valor fijo (${JSON.stringify(value)}) en vez de referenciar a otro token${where}`);
    }
  }
}

// ---------- 3. modos ----------
if (config.requireModes) {
  const { level, types } = config.requireModes;
  // requireModes.modes permite exigir solo algunos modos, por ejemplo dark para color y no mobile ni web.
  const otherModes = config.requireModes.modes ?? config.modes.slice(1);
  for (const [path, entry] of flat) {
    if (entry.level !== level || !types.includes(entry.type)) continue;
    for (const mode of otherModes) {
      if (entry.token.$extensions?.modes?.[mode] === undefined) {
        add("modos", "error", path, `no define valor para el modo ${mode}`);
      }
    }
  }
  for (const [path, entry] of flat) {
    for (const mode of Object.keys(entry.token.$extensions?.modes ?? {})) {
      if (!config.modes.includes(mode)) add("modos", "error", path, `usa el modo "${mode}", que no está en la configuración`);
    }
  }
}

// ---------- 4. descripciones ----------
if (config.requireDescriptions) {
  const { levels = ["semantic", "component"], severity = "error" } = config.requireDescriptions;
  for (const [path, entry] of flat) {
    if (!levels.includes(entry.level)) continue;
    const d = entry.token.$description;
    if (typeof d !== "string" || d.trim().length < 10) {
      add("descripciones", severity, path, "no tiene descripción (o es demasiado corta para explicar cuándo usarlo)");
    }
  }
}

// ---------- 5. contraste ----------
const contrastResults = [];
for (const pair of config.contrastPairs) {
  for (const mode of config.contrastModes ?? config.modes) {
    const fg = resolveValue(pair.foreground, mode);
    const bg = resolveValue(pair.background, mode);
    const label = `${pair.foreground} sobre ${pair.background}`;
    if (fg.error || bg.error) {
      add("contraste", "error", label, `no se pudo resolver (${fg.error ?? bg.error}) en modo ${mode}`);
      continue;
    }
    const a = toHex(fg.value);
    const b = toHex(bg.value);
    if (!a || !b) {
      add("contraste", "error", label, `alguno de los dos no es un color hexadecimal en modo ${mode}`);
      continue;
    }
    if (a.length === 9 || b.length === 9) {
      add("contraste", "warning", label, `tiene transparencia; el cálculo la ignora (modo ${mode})`);
    }
    const ratio = contrast(a.slice(0, 7), b.slice(0, 7));
    const ok = ratio >= pair.min;
    contrastResults.push({ pair: label, mode, ratio: Number(ratio.toFixed(2)), min: pair.min, ok });
    if (!ok) {
      add("contraste", "error", label, `contraste ${ratio.toFixed(2)}:1 en modo ${mode}, el mínimo es ${pair.min}:1`);
    }
  }
}

// ---------- salida ----------
const errors = issues.filter((i) => i.severity === "error");
const warnings = issues.filter((i) => i.severity === "warning");

if (jsonOutput) {
  console.log(
    JSON.stringify(
      { file: tokensPath, tokens: flat.size, errors: errors.length, warnings: warnings.length, issues, contrast: contrastResults },
      null,
      2
    )
  );
} else {
  const checks = ["nombres", "referencias", "modos", "descripciones", "contraste"];
  console.log(`\nValidando ${tokensPath}`);
  console.log(existsSync(configPath) ? `Configuración: ${configPath}` : "Sin validador.config.json: uso la configuración por defecto, sin pares de contraste.");
  console.log(`${flat.size} tokens encontrados\n`);
  for (const check of checks) {
    const found = issues.filter((i) => i.check === check);
    const e = found.filter((i) => i.severity === "error").length;
    const w = found.filter((i) => i.severity === "warning").length;
    const icon = e ? "✖" : w ? "!" : "✔";
    const summary = e || w ? `${e} error(es), ${w} aviso(s)` : "todo bien";
    console.log(`${icon} ${check.padEnd(14)} ${summary}`);
    for (const i of found) console.log(`    ${i.severity === "error" ? "✖" : "!"} ${i.path}: ${i.message}`);
  }
  if (contrastResults.length) {
    const passed = contrastResults.filter((r) => r.ok).length;
    console.log(`\n  Pares de contraste revisados: ${passed} de ${contrastResults.length} pasan`);
  }
  console.log(
    errors.length
      ? `\n✖ ${errors.length} error(es). Corrige y vuelve a correr el validador.\n`
      : `\n✔ Todo en verde${warnings.length ? ` (con ${warnings.length} aviso(s))` : ""}.\n`
  );
}

process.exit(errors.length ? 1 : 0);
