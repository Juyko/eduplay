const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src');

function walk(directory) {
  let results = [];
  const list = fs.readdirSync(directory);
  list.forEach(file => {
    file = path.join(directory, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(dir);

const mappings = {
  // Backgrounds
  'bg-slate-950': 'dark:bg-slate-950 bg-slate-50',
  'bg-slate-900': 'dark:bg-slate-900 bg-white',
  'bg-slate-800': 'dark:bg-slate-800 bg-slate-100',
  'bg-slate-700': 'dark:bg-slate-700 bg-slate-200',

  // Hover Backgrounds
  'hover:bg-slate-800': 'dark:hover:bg-slate-800 hover:bg-slate-200',
  'hover:bg-slate-700': 'dark:hover:bg-slate-700 hover:bg-slate-300',

  // Active Backgrounds
  'active:bg-slate-800': 'dark:active:bg-slate-800 active:bg-slate-300',
  'active:bg-slate-600': 'dark:active:bg-slate-600 active:bg-slate-400',

  // Text
  'text-white': 'dark:text-white text-slate-900',
  'text-slate-100': 'dark:text-slate-100 text-slate-800',
  'text-slate-200': 'dark:text-slate-200 text-slate-700',
  'text-slate-300': 'dark:text-slate-300 text-slate-600',
  'text-slate-400': 'dark:text-slate-400 text-slate-500',
  'text-slate-500': 'dark:text-slate-500 text-slate-400',

  // Hover Text
  'hover:text-white': 'dark:hover:text-white hover:text-slate-900',

  // Borders
  'border-slate-800': 'dark:border-slate-800 border-slate-200',
  'border-slate-700': 'dark:border-slate-700 border-slate-300',
  'border-slate-600': 'dark:border-slate-600 border-slate-400',

  // Hover Borders
  'hover:border-slate-700': 'dark:hover:border-slate-700 hover:border-slate-400',
  'hover:border-slate-500': 'dark:hover:border-slate-500 hover:border-slate-400',
};

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // We need to be careful with things like bg-slate-900/50 -> dark:bg-slate-900/50 bg-white/50
  // Instead of simple string replace, let's use regex to catch opacities and prefixes.

  // A helper function to replace specific tailwind classes
  const replaceClass = (className, newClasses) => {
    // Regex matches the class name exactly, with optional opacity, bounded by word boundaries or quotes
    const regex = new RegExp(`(?<!dark:)(?<!\\w)${className}(/\\d+)?(?!\\w)`, 'g');
    content = content.replace(regex, (match, opacity) => {
      // match is something like bg-slate-900/50
      // newClasses is "dark:bg-slate-900 bg-white"
      const parts = newClasses.split(' ');
      const op = opacity || '';
      return `${parts[0]}${op} ${parts[1]}${op}`;
    });
  };

  for (const [key, value] of Object.entries(mappings)) {
    replaceClass(key, value);
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
