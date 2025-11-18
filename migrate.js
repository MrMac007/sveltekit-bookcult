#!/usr/bin/env node

/**
 * Migration script to convert Next.js components to SvelteKit
 *
 * This script automates the conversion of:
 * - React TSX files to Svelte files
 * - Next.js patterns to SvelteKit patterns
 * - Import paths
 * - Component syntax
 *
 * Usage: node migrate.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source (Next.js) and destination (SvelteKit) paths
const NEXT_ROOT = path.join(__dirname, '..');
const SVELTE_ROOT = __dirname;

// Component conversion templates
const conversions = {
  // Import conversions
  imports: [
    { from: /from ['"]@\//, to: "from '$lib/" },
    { from: /from ['"]next\//, to: "// Next.js import removed: " },
    { from: /'use client'/, to: "<!-- Client component -->" },
    { from: /'use server'/, to: "<!-- Server action -->" },
    { from: /import.*from ['"]react['"]/, to: "" },
    { from: /import.*useState.*from ['"]react['"]/, to: "<!-- Using $state rune -->" },
    { from: /import.*useEffect.*from ['"]react['"]/, to: "<!-- Using $effect rune -->" },
    { from: /import { createClient } from '@\/lib\/supabase\/client'/, to: "import { createClient } from '$lib/supabase/client';" },
    { from: /import { createClient } from '@\/lib\/supabase\/server'/, to: "// Server client imported in load function" },
  ],

  // React to Svelte syntax
  syntax: [
    { from: /className=/g, to: "class=" },
    { from: /onClick=/g, to: "onclick=" },
    { from: /onChange=/g, to: "onchange=" },
    { from: /htmlFor=/g, to: "for=" },
    { from: /<>/, to: "" },
    { from: /<\/>/, to: "" },
  ],

  // State conversions
  state: [
    {
      from: /const \[(\w+), set(\w+)\] = useState\((.*?)\)/g,
      to: "let $1 = $$state($3)"
    },
    {
      from: /const (\w+) = useMemo\((.*?), \[(.*?)\]\)/g,
      to: "let $1 = $$derived($2)"
    },
    {
      from: /useEffect\(\(\) => \{([\s\S]*?)\}, \[(.*?)\]\)/g,
      to: "$$effect(() => {$1})"
    }
  ]
};

/**
 * Convert a React component file to Svelte
 */
async function convertComponentToSvelte(content, filename) {
  let converted = content;

  // Remove 'use client' and 'use server' directives
  converted = converted.replace(/'use client'\n/g, '');
  converted = converted.replace(/'use server'\n/g, '');

  // Basic import conversions
  conversions.imports.forEach(({ from, to }) => {
    converted = converted.replace(from, to);
  });

  // Syntax conversions
  conversions.syntax.forEach(({ from, to }) => {
    converted = converted.replace(from, to);
  });

  // State conversions (React hooks to Svelte runes)
  conversions.state.forEach(({ from, to }) => {
    converted = converted.replace(from, to);
  });

  // Extract JSX/TSX and convert to Svelte structure
  const scriptMatch = converted.match(/^([\s\S]*?)(export default|function|const \w+ =)/m);
  const hasScript = scriptMatch && scriptMatch[1].trim();

  if (filename.endsWith('.tsx') || filename.endsWith('.jsx')) {
    // This is a component file
    // For now, just wrap in Svelte script tags as a starting point
    return `<script lang="ts">
  ${hasScript || '// TODO: Add imports and logic here'}

  // TODO: Convert React component to Svelte
  // Original file needs manual conversion
</script>

<!-- TODO: Convert JSX to Svelte template -->

<style>
  /* Component styles */
</style>

<!--
  Original Next.js component:

${converted.split('\n').map(line => '  ' + line).join('\n')}
-->`;
  }

  return converted;
}

/**
 * Create directory structure
 */
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

/**
 * Copy and convert a file
 */
async function processFile(sourcePath, destPath) {
  const ext = path.extname(sourcePath);

  // Skip certain files
  if (['.map', '.test.ts', '.test.tsx'].some(e => sourcePath.endsWith(e))) {
    return;
  }

  const content = await fs.readFile(sourcePath, 'utf8');
  let converted = content;
  let newPath = destPath;

  // Convert TypeScript/React files
  if (['.ts', '.tsx', '.jsx'].includes(ext)) {
    if (ext === '.tsx' || ext === '.jsx') {
      // Component files -> .svelte
      newPath = destPath.replace(/\.(tsx|jsx)$/, '.svelte');
      converted = await convertComponentToSvelte(content, sourcePath);
    } else if (sourcePath.includes('/actions/')) {
      // Server actions -> keep as .ts but add comment
      converted = `// SvelteKit form action - move to +page.server.ts\n\n${content}`;
    } else {
      // Regular TS files - update imports
      conversions.imports.forEach(({ from, to }) => {
        converted = converted.replace(from, to);
      });
    }
  }

  await ensureDir(path.dirname(newPath));
  await fs.writeFile(newPath, converted, 'utf8');
  console.log(`✓ Processed: ${path.relative(NEXT_ROOT, sourcePath)} -> ${path.relative(SVELTE_ROOT, newPath)}`);
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting Next.js to SvelteKit migration...\n');

  const tasks = [
    {
      name: 'Lib files',
      source: path.join(NEXT_ROOT, 'lib'),
      dest: path.join(SVELTE_ROOT, 'src/lib')
    },
    {
      name: 'Components',
      source: path.join(NEXT_ROOT, 'components'),
      dest: path.join(SVELTE_ROOT, 'src/lib/components')
    },
    {
      name: 'Types',
      source: path.join(NEXT_ROOT, 'types'),
      dest: path.join(SVELTE_ROOT, 'src/lib/types')
    },
  ];

  for (const task of tasks) {
    console.log(`\n📁 Processing ${task.name}...`);

    try {
      const files = await fs.readdir(task.source, { recursive: true, withFileTypes: true });

      for (const file of files) {
        if (file.isFile()) {
          const sourcePath = path.join(file.path, file.name);
          const relativePath = path.relative(task.source, sourcePath);
          const destPath = path.join(task.dest, relativePath);

          try {
            await processFile(sourcePath, destPath);
          } catch (err) {
            console.error(`✗ Error processing ${sourcePath}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error(`✗ Error reading ${task.source}:`, err.message);
    }
  }

  console.log('\n✅ Migration complete!');
  console.log('\n📝 Next steps:');
  console.log('  1. Review generated .svelte files and complete manual conversions');
  console.log('  2. Update imports in lib files');
  console.log('  3. Convert page components to +page.svelte files');
  console.log('  4. Create +page.server.ts load functions for data fetching');
  console.log('  5. Convert Server Actions to SvelteKit form actions');
  console.log('  6. Test authentication flow');
  console.log('  7. Test all features');
  console.log('\n📖 See MIGRATION_STATUS.md for detailed checklist');
}

// Run migration
migrate().catch(console.error);
