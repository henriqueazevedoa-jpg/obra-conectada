/**
 * check-imports.mjs (v2)
 * Verifica se ícones Lucide usados em TSX estão importados.
 * Foca APENAS em nomes presentes no pacote lucide-react (não shadcn, não outros).
 * Uso: node scripts/check-imports.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', 'src');

// Detecta ícones lucide através de padrões específicos:
// <IconName className= ou <IconName /> ou { IconName } from 'lucide-react'
// Ícones Lucide geralmente terminam no padrão de um nome simples sem sufixo
// (Button, Card não são ícones; RefreshCw, AlertTriangle, Download são)
// Heurística: ícones lucide não têm "Content", "Header", "Title", "Trigger",
// "Provider", "Item", "Group", "Root", "Viewport", "Portal", etc.
const NOT_LUCIDE = new Set([
  'Button', 'Card', 'CardHeader', 'CardTitle', 'CardContent', 'CardFooter',
  'CardDescription', 'Badge', 'Input', 'Textarea', 'Label', 'Select',
  'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue', 'SelectGroup',
  'Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogDescription',
  'DialogFooter', 'DialogTrigger', 'DialogClose', 'DialogOverlay',
  'Popover', 'PopoverContent', 'PopoverTrigger', 'PopoverAnchor',
  'Tooltip', 'TooltipContent', 'TooltipTrigger', 'TooltipProvider',
  'Sheet', 'SheetContent', 'SheetHeader', 'SheetTitle', 'SheetDescription',
  'SheetFooter', 'SheetTrigger', 'SheetClose',
  'Tabs', 'TabsList', 'TabsTrigger', 'TabsContent',
  'Collapsible', 'CollapsibleContent', 'CollapsibleTrigger',
  'DropdownMenu', 'DropdownMenuContent', 'DropdownMenuItem', 'DropdownMenuTrigger',
  'DropdownMenuSeparator', 'DropdownMenuLabel', 'DropdownMenuGroup',
  'ContextMenu', 'ContextMenuContent', 'ContextMenuItem', 'ContextMenuTrigger',
  'Accordion', 'AccordionContent', 'AccordionItem', 'AccordionTrigger',
  'Avatar', 'AvatarImage', 'AvatarFallback',
  'Separator', 'Skeleton', 'Spinner', 'Progress',
  'ScrollArea', 'ScrollBar',
  'Switch', 'Checkbox', 'RadioGroup', 'RadioGroupItem',
  'Slider', 'Toggle', 'ToggleGroup', 'ToggleGroupItem',
  'Command', 'CommandInput', 'CommandList', 'CommandItem', 'CommandGroup',
  'CommandEmpty', 'CommandSeparator', 'CommandDialog',
  'Table', 'TableHeader', 'TableBody', 'TableRow', 'TableHead', 'TableCell',
  'TableCaption', 'TableFooter',
  'Form', 'FormField', 'FormItem', 'FormLabel', 'FormControl',
  'FormDescription', 'FormMessage',
  'NavigationMenu', 'NavigationMenuList', 'NavigationMenuItem',
  'HoverCard', 'HoverCardContent', 'HoverCardTrigger',
  'Alert', 'AlertTitle', 'AlertDescription',
  'AspectRatio', 'Menubar', 'MenubarContent', 'MenubarItem', 'MenubarMenu',
  'MenubarTrigger', 'MenubarSeparator', 'MenubarLabel',
  'Icon', 'Fragment', 'React', 'Component', 'ReactNode',
  'SortIcon', 'MapaItem', 'CotacaoLink',
]);

// Ícones Lucide: nome PascalCase curto sem "Content/Header/Title/Trigger/etc"
// Aparecem como <IconName className=... ou <IconName />
const ICON_USAGE_RE = /<([A-Z][a-zA-Z0-9]{2,30})\s+className=/g;
const ICON_SELF_CLOSE_RE = /<([A-Z][a-zA-Z0-9]{2,30})\s*\/>/g;
const LUCIDE_IMPORT_FILE_RE = /from ['"]lucide-react['"]/;

let errors = 0;
let checked = 0;
const problemFiles = [];

function isLikelyLucideIcon(name) {
  if (NOT_LUCIDE.has(name)) return false;
  // Shadcn suffixes
  if (/Content|Header|Title|Footer|Trigger|Provider|Portal|Overlay|Close|Group|Item|Root|Viewport|Area|Bar|Control|Description|Message|Label|Field$/.test(name)) return false;
  // Known patterns of Lucide icon names (contain repeated consonants or numbers)
  return true;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!LUCIDE_IMPORT_FILE_RE.test(content)) return;

  const importMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/s);
  if (!importMatch) return;

  const imported = new Set(
    importMatch[1].split(',').map(s => s.trim()).filter(Boolean)
  );

  const used = new Set();

  let m;
  ICON_USAGE_RE.lastIndex = 0;
  while ((m = ICON_USAGE_RE.exec(content)) !== null) {
    if (isLikelyLucideIcon(m[1])) used.add(m[1]);
  }
  ICON_SELF_CLOSE_RE.lastIndex = 0;
  while ((m = ICON_SELF_CLOSE_RE.exec(content)) !== null) {
    if (isLikelyLucideIcon(m[1])) used.add(m[1]);
  }

  const missing = [...used].filter(icon => !imported.has(icon));

  if (missing.length > 0) {
    const rel = path.relative(process.cwd(), filePath);
    console.error(`\n❌ ${rel}`);
    missing.forEach(icon => {
      console.error(`   └─ "${icon}" usado mas não importado de lucide-react`);
    });
    errors += missing.length;
    problemFiles.push(rel);
  }

  checked++;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', '.git', 'dist', 'original'].includes(entry.name)) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      checkFile(fullPath);
    }
  }
}

walk(ROOT);

console.log(`\n📋 ${checked} arquivos .tsx verificados`);
if (errors === 0) {
  console.log('✅ Nenhum ícone Lucide sem import detectado!\n');
  process.exit(0);
} else {
  console.error(`\n🚨 ${errors} ícone(s) potencialmente sem import.`);
  console.error(`   Arquivos afetados: ${problemFiles.join(', ')}\n`);
  process.exit(1);
}
