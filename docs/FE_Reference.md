# React Catalog Components & Design Tokens Reference

**Last Updated:** April 7, 2026  
**Scope:** Frontend component APIs and design system  
**Audience:** Frontend developers (lookup/reference)

---

## Catalog Components

All catalog components live in `src/a2ui/catalog/components/` and are registered in `src/a2ui/catalog/catalogRegistry.tsx`.

### TextComponent

**File:** `TextComponent.tsx`  
**Maps:** A2UI `Text` type

**Props:**
```typescript
interface TextComponentProps {
  text: unknown;           // Static string or data model value
  usageHint?: unknown;    // 'h1' | 'h2' | 'h3' | 'body' | 'caption'
}
```

**Renders:**
```
usageHint='h1'      → <h1> with design token (2.25rem, bold)
usageHint='h2'      → <h2> with design token (1.875rem, bold)
usageHint='h3'      → <h3> with design token (1.5rem, semibold)
usageHint='body'    → <p> with design token (1rem, normal)
usageHint='caption' → <p class="caption"> with design token (0.875rem, grey)
default             → <p> (body style)
```

**Design Tokens Applied:**
```
h1: text-4xl font-bold leading-tight text-gray-900
h2: text-3xl font-bold leading-snug text-gray-900
h3: text-2xl font-semibold leading-snug text-gray-900
body: text-base font-normal leading-relaxed text-gray-700
caption: text-sm font-normal leading-snug text-gray-500
```

**Usage in A2UI:**
```json
{
  "Text": {
    "text": { "literalString": "Welcome" },
    "usageHint": "h1"
  }
}
```

---

### CardComponent

**File:** `CardComponent.tsx`  
**Maps:** A2UI `Card` type  
**Depends on:** shadcn/ui Card, CardHeader, CardTitle, CardContent

**Props:**
```typescript
interface CardComponentProps {
  title?: unknown;      // Optional title (maps to CardHeader)
  childIds?: unknown;   // Array of component IDs to render inside
  renderChild?: (id: string) => ReactElement | null;
}
```

**Renders:**
```
<Card>
  {title && (
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
  )}
  <CardContent>
    {childIds.map(id => renderChild(id))}
  </CardContent>
</Card>
```

**Design Tokens Applied:**
```
Card: border-1 rounded-lg shadow-md
CardHeader: py-4 px-6 border-b
CardContent: py-4 px-6
```

**Usage in A2UI:**
```json
{
  "Card": {
    "title": { "literalString": "Results" },
    "childIds": ["child-1", "child-2"]
  }
}
```

---

### ButtonComponent

**File:** `ButtonComponent.tsx`  
**Maps:** A2UI `Button` type  
**Depends on:** shadcn/ui Button

**Props:**
```typescript
interface ButtonComponentProps {
  text: unknown;              // Button label
  variant?: unknown;          // 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  disabled?: unknown;         // boolean
  onClick?: () => void;       // (Optional, v2+)
}
```

**Variant Mapping:**
```
primary (default)   → Blue (token.colors.primary)
secondary           → Outlined grey
success             → Green (token.colors.success)
warning             → Orange (token.colors.warning)
error               → Red (token.colors.error)
```

**Design Tokens:**
```
Primary: bg-blue-500 text-white rounded-md px-4 py-2
Secondary: border-1 border-gray-300 text-gray-700
Success: bg-emerald-500 text-white
Warning: bg-amber-500 text-white
Error: bg-red-500 text-white
```

**Usage in A2UI:**
```json
{
  "Button": {
    "text": { "literalString": "Submit" },
    "variant": "primary"
  }
}
```

---

### BadgeComponent

**File:** `BadgeComponent.tsx`  
**Maps:** A2UI `Badge` type  
**Depends on:** shadcn/ui Badge

**Props:**
```typescript
interface BadgeComponentProps {
  text: unknown;         // Badge label
  variant?: unknown;     // 'default' | 'success' | 'warning' | 'error' | 'info'
}
```

**Variant Mapping:**
```
default   → Grey background
success   → Green background
warning   → Orange background
error     → Red background
info      → Blue background
```

**Design Tokens:**
```
Small text (0.875rem, font-semibold)
Rounded corners (rounded-full)
Padding: px-3 py-1
Color applied by variant
```

**Usage in A2UI:**
```json
{
  "Badge": {
    "text": { "literalString": "Score: 0.92" },
    "variant": "success"
  }
}
```

---

### SourceListComponent (Custom)

**File:** `SourceListComponent.tsx`  
**Maps:** A2UI `SourceList` type  
**Depends on:** shadcn/ui Card + Badge

**Props:**
```typescript
interface SourceListComponentProps {
  items: unknown;          // Data binding to /sources array
  renderChild?: (id: string) => ReactElement | null;
}
```

**Renders:**
```
<div className="grid gap-4 grid-cols-1">
  {items.map(item => (
    <Card>
      <h4>{item.title}</h4>
      <p className="text-sm">{item.excerpt}</p>
      <div className="flex items-center gap-2 mt-2">
        <Badge variant={scoreToVariant(item.score)}>
          {(item.score * 100).toFixed(0)}%
        </Badge>
        <a href={item.url} className="text-blue-500 underline">
          View source
        </a>
      </div>
    </Card>
  ))}
</div>
```

**Score Interpretation:**
```
score >= 0.9   → Green (success)
score >= 0.8   → Blue (info)
score >= 0.7   → Orange (warning)
score < 0.7    → Red (error)
```

**Expected Data Model Structure:**
```json
{
  "key": "sources",
  "valueList": [
    {
      "valueMap": [
        { "key": "title", "valueString": "..." },
        { "key": "excerpt", "valueString": "..." },
        { "key": "score", "valueFloat": 0.92 },
        { "key": "url", "valueString": "https://..." }
      ]
    }
  ]
}
```

**Usage in A2UI:**
```json
{
  "SourceList": {
    "items": { "path": "/sources" }
  }
}
```

---

## Design Tokens

All design tokens are defined in `src/a2ui/catalog/designTokens.ts` and applied via Tailwind CSS classes.

### Colors

```typescript
export const designTokens.colors = {
  primary:       '#3B82F6',  // Blue-500
  secondary:     '#8B5CF6',  // Violet-500
  success:       '#10B981',  // Emerald-500
  warning:       '#F59E0B',  // Amber-500
  error:         '#EF4444',  // Red-500
  neutral:       '#6B7280',  // Grey-500
  background:    '#FFFFFF',
  foreground:    '#1F2937',  // Grey-900
};
```

**Usage in Components:**
```typescript
className="bg-blue-500"  // primary
className="text-emerald-500"  // success
className="border-red-500"  // error
```

### Typography

```typescript
export const designTokens.typography = {
  h1: {
    fontSize: '2.25rem',    // 36px
    fontWeight: '700',      // bold
    lineHeight: '1.1',
  },
  h2: {
    fontSize: '1.875rem',   // 30px
    fontWeight: '700',      // bold
    lineHeight: '1.2',
  },
  h3: {
    fontSize: '1.5rem',     // 24px
    fontWeight: '600',      // semibold
    lineHeight: '1.25',
  },
  body: {
    fontSize: '1rem',       // 16px
    fontWeight: '400',      // normal
    lineHeight: '1.5',
  },
  caption: {
    fontSize: '0.875rem',   // 14px
    fontWeight: '400',      // normal
    lineHeight: '1.25',
  },
};
```

**Tailwind Classes (Applied Automatically):**
```
h1:       text-4xl font-bold leading-tight
h2:       text-3xl font-bold leading-snug
h3:       text-2xl font-semibold leading-snug
body:     text-base font-normal leading-relaxed
caption:  text-sm font-normal leading-snug text-gray-500
```

### Spacing

```typescript
export const designTokens.spacing = {
  xs:   '0.25rem',   // 4px
  sm:   '0.5rem',    // 8px
  md:   '1rem',      // 16px
  lg:   '1.5rem',    // 24px
  xl:   '2rem',      // 32px
  '2xl': '3rem',     // 48px
};
```

**Tailwind Classes:**
```
gap-1     → 0.25rem gap
gap-2     → 0.5rem gap
gap-4     → 1rem gap
gap-6     → 1.5rem gap
gap-8     → 2rem gap
gap-12    → 3rem gap
px-4      → 1rem padding left+right
py-2      → 0.5rem padding top+bottom
```

### Shadows

```typescript
export const designTokens.shadows = {
  sm:  '0 1px 2px rgba(0,0,0,0.05)',
  md:  '0 4px 6px rgba(0,0,0,0.1)',
  lg:  '0 10px 15px rgba(0,0,0,0.1)',
};
```

**Tailwind Classes:**
```
shadow-sm    → small shadow
shadow-md    → medium shadow (default for Card)
shadow-lg    → large shadow
```

---

## Adding New Components

To add a new component to the catalog:

1. **Create file:** `src/a2ui/catalog/components/NewComponent.tsx`
2. **Export default:** Component function matching `CatalogRenderer` signature
3. **Register:** Add to `src/a2ui/catalog/catalogRegistry.tsx`
4. **Update ComponentHost:** Add type mapping in `src/a2ui/renderer/ComponentHost.tsx`
5. **Document:** Add entry to this reference file

**Component Signature:**
```typescript
export function NewComponent(props: any, renderChild?: (id: string) => ReactElement | null) {
  return <div>...</div>;
}
```

**Registry Entry:**
```typescript
const catalogRegistry = {
  'Text': TextComponent,
  'Card': CardComponent,
  'NewComponent': NewComponent,  // ← Add here
  // ...
};
```

---

## Token Usage Best Practices

✅ **DO:**
- Import from `designTokens` and use constants
- Apply via `className` with Tailwind
- Update `designTokens.ts` for new values
- Test components with token changes

❌ **DON'T:**
- Hard-code colors: `className="bg-#3B82F6"` ❌
- Use inline styles: `style={{ color: 'blue' }}` ❌
- Create new color names: `className="text-custom-blue"` ❌
- Mix token systems: some tokens.ts, some tailwind.config ❌

---

**For how-to guides, see:** [FE_Patterns.md](FE_Patterns.md)  
**For protocol details, see:** [A2UI_Specification.md](A2UI_Specification.md)
