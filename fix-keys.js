// Script to fix key={index} / key={idx} / key={i} anti-patterns in React .map() calls
const fs = require('fs');
const path = require('path');

// Get all .tsx files with key={index|idx|i} patterns
function findFiles(dir, pattern) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...findFiles(fullPath, pattern));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (pattern.test(content)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

// Priority list of unique key fields to look for
const KEY_FIELD_PRIORITY = [
  'id', 'mrn', 'patientId', 'patient_id',
  'name', 'label', 'title', 'key',
  'factor', 'type', 'graft', 'criterion', 'category',
  'metric', 'stage', 'module', 'code', 'drg', 'drgCode',
  'condition', 'therapy', 'medication', 'drug', 'device',
  'pathway', 'step', 'action', 'status', 'level', 'tier',
  'role', 'specialty', 'department', 'provider', 'physician',
  'format', 'report', 'template', 'indicator', 'measure',
  'recommendation', 'intervention', 'procedure', 'diagnosis',
  'phenotype', 'trigger', 'barrier', 'gap', 'risk',
  'finding', 'result', 'outcome', 'score', 'value',
  'description', 'text', 'heading', 'subtitle',
  'icon', 'color', 'bgClass', 'borderClass',
  'from', 'to', 'source', 'target',
  'date', 'time', 'period', 'quarter', 'month', 'year',
  'url', 'href', 'link', 'path',
  'field', 'property', 'attribute', 'feature',
  'cabgLabel', 'pciLabel', 'patency', 'usage',
  'weight', 'priority', 'severity', 'urgency',
  'alert', 'notification', 'message', 'error',
  'section', 'tab', 'panel', 'view', 'page',
  'check', 'task', 'todo', 'item',
  'member', 'consult', 'activity', 'referral',
  'topic', 'question', 'answer',
  'variant', 'size', 'className',
];

// Compound key fields - use two fields combined
const COMPOUND_KEY_PAIRS = [
  ['name', 'category'],
  ['name', 'type'],
  ['label', 'category'],
  ['label', 'type'],
  ['title', 'category'],
  ['type', 'value'],
  ['category', 'value'],
  ['from', 'to'],
  ['source', 'target'],
];

function getMapContext(content, keyLine) {
  // Find the .map() call that contains this key= line
  // Look backwards from key line to find .map((varName, indexName) =>
  const lines = content.split('\n');
  const keyLineIdx = keyLine; // 0-based

  // Search backwards for .map(
  for (let i = keyLineIdx; i >= Math.max(0, keyLineIdx - 30); i--) {
    const line = lines[i];
    const mapMatch = line.match(/\.map\(\((\w+)(?:,\s*(\w+))?\)\s*=>/);
    if (mapMatch) {
      return {
        itemVar: mapMatch[1],
        indexVar: mapMatch[2] || null,
        mapLineIdx: i,
        mapLine: line,
      };
    }
    // Also match destructured: .map(({ name, value }, index) =>
    const destructuredMatch = line.match(/\.map\(\(\{([^}]+)\}(?:,\s*(\w+))?\)\s*=>/);
    if (destructuredMatch) {
      const fields = destructuredMatch[1].split(',').map(f => f.trim().split(':')[0].trim());
      return {
        itemVar: null,
        indexVar: destructuredMatch[2] || null,
        destructuredFields: fields,
        mapLineIdx: i,
        mapLine: line,
      };
    }
  }
  return null;
}

function findItemProperties(content, keyLineIdx, itemVar, searchRange = 30) {
  // Look at lines around the key= to find which properties of itemVar are used
  const lines = content.split('\n');
  const properties = new Set();
  const start = Math.max(0, keyLineIdx - 5);
  const end = Math.min(lines.length - 1, keyLineIdx + searchRange);

  for (let i = start; i <= end; i++) {
    // Match itemVar.property or itemVar?.property
    const regex = new RegExp(`${itemVar}\\??\\.(\\w+)`, 'g');
    let match;
    while ((match = regex.exec(lines[i])) !== null) {
      properties.add(match[1]);
    }
  }
  return [...properties];
}

function isStringArray(content, keyLineIdx) {
  // Check if the array being mapped contains strings (e.g., ['a', 'b', 'c'].map(...))
  const lines = content.split('\n');
  for (let i = keyLineIdx; i >= Math.max(0, keyLineIdx - 20); i--) {
    const line = lines[i];
    if (line.match(/\[\s*['"][^'"]*['"]\s*,/) || line.match(/\.map\(\((\w+),/)) {
      // Check if the array items are just strings
      // Look for patterns like ['PDF Summary', 'Excel Data', ...].map((format, index)
      const arrayContent = [];
      for (let j = i; j >= Math.max(0, i - 15); j--) {
        arrayContent.unshift(lines[j]);
        if (lines[j].includes('[')) break;
      }
      const joined = arrayContent.join('\n');
      // If all array elements are strings (not objects)
      if (joined.match(/\[\s*(['"][^'"]*['"],?\s*)+\]/) && !joined.includes('{')) {
        return true;
      }
    }
  }
  return false;
}

function determineKey(content, keyLineIdx, ctx) {
  if (!ctx) return null;

  const lines = content.split('\n');

  // Handle destructured parameters
  if (ctx.destructuredFields) {
    for (const field of KEY_FIELD_PRIORITY) {
      if (ctx.destructuredFields.includes(field)) {
        return field; // Direct field name since it's destructured
      }
    }
    // Compound key from destructured fields
    if (ctx.destructuredFields.length >= 2) {
      return `\`\${${ctx.destructuredFields[0]}}-\${${ctx.destructuredFields[1]}}\``;
    }
    return ctx.destructuredFields[0];
  }

  const itemVar = ctx.itemVar;
  if (!itemVar) return null;

  // Check for string arrays first
  if (isStringArray(content, ctx.mapLineIdx)) {
    return itemVar; // use the string value itself
  }

  // Find properties used on this item
  const props = findItemProperties(content, keyLineIdx, itemVar);

  // Special handling: if it's '_' (unused destructuring like [...Array(N)].map((_, i))
  if (itemVar === '_') {
    // This is a skeleton/placeholder pattern - static-index is fine
    return null; // Will be handled as static
  }

  // Try single unique field first
  for (const field of KEY_FIELD_PRIORITY) {
    if (props.includes(field)) {
      return `${itemVar}.${field}`;
    }
  }

  // Try compound keys
  for (const [f1, f2] of COMPOUND_KEY_PAIRS) {
    if (props.includes(f1) && props.includes(f2)) {
      return `\`\${${itemVar}.${f1}}-\${${itemVar}.${f2}}\``;
    }
  }

  // If we have at least 2 properties, combine the first two
  if (props.length >= 2) {
    return `\`\${${itemVar}.${props[0]}}-\${${itemVar}.${props[1]}}\``;
  }

  // If we have at least 1 property, use it
  if (props.length >= 1) {
    return `${itemVar}.${props[0]}`;
  }

  // Check if it's a simple string being mapped
  // Look for {itemVar} in the JSX (plain text rendering)
  for (let i = keyLineIdx; i <= Math.min(lines.length - 1, keyLineIdx + 10); i++) {
    const plainUse = new RegExp(`\\{${itemVar}\\}`);
    if (plainUse.test(lines[i])) {
      return itemVar; // It's likely a string
    }
  }

  return null;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let fixCount = 0;
  let modified = false;

  // Find all key={index}, key={idx}, key={i} occurrences
  const keyPattern = /key=\{(index|idx|i)\}/g;

  // Process from bottom to top to avoid line number shifts
  const matches = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    keyPattern.lastIndex = 0;
    while ((match = keyPattern.exec(line)) !== null) {
      matches.push({
        lineIdx: i,
        indexVar: match[1],
        matchStart: match.index,
        matchEnd: match.index + match[0].length,
        fullMatch: match[0],
      });
    }
  }

  // Process from last to first to maintain line positions
  for (let m = matches.length - 1; m >= 0; m--) {
    const { lineIdx, indexVar, fullMatch } = matches[m];
    const ctx = getMapContext(content, lineIdx);

    if (!ctx) {
      // Can't find map context, use static prefix
      const newKey = `key={\`item-\${${indexVar}}\`}`;
      lines[lineIdx] = lines[lineIdx].replace(fullMatch, newKey);
      fixCount++;
      modified = true;
      content = lines.join('\n');
      continue;
    }

    // Check if the index var in key matches the map's index var
    if (ctx.indexVar !== indexVar) {
      // Might be a nested map or mismatch, still try to fix
    }

    const keyExpr = determineKey(content, lineIdx, ctx);

    let newKey;
    if (keyExpr === null) {
      // Static/skeleton pattern or can't determine - use descriptive static key
      newKey = `key={\`item-\${${indexVar}}\`}`;
    } else if (keyExpr.startsWith('`')) {
      // Template literal
      newKey = `key={${keyExpr}}`;
    } else if (keyExpr.includes('.')) {
      // Object property
      newKey = `key={${keyExpr}}`;
    } else {
      // Simple variable (string item)
      newKey = `key={${keyExpr}}`;
    }

    lines[lineIdx] = lines[lineIdx].replace(fullMatch, newKey);
    fixCount++;
    modified = true;
    content = lines.join('\n');
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return fixCount;
}

// Main
const srcDir = path.join(__dirname, 'src');
const pattern = /key=\{(index|idx|i)\}/;
const files = findFiles(srcDir, pattern);

let totalFixes = 0;
let totalFiles = 0;
const results = [];

for (const file of files) {
  const fixes = processFile(file);
  if (fixes > 0) {
    totalFiles++;
    totalFixes += fixes;
    const relPath = path.relative(__dirname, file);
    results.push(`  ${relPath}: ${fixes} fix(es)`);
  }
}

console.log(`\nTotal files changed: ${totalFiles}`);
console.log(`Total instances fixed: ${totalFixes}`);
console.log(`\nPer-file breakdown:`);
results.forEach(r => console.log(r));
