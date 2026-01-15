# Theme System Guide

## Overview

The application uses a GitHub-inspired dark theme with a layered background system and Apple-inspired light theme. The theme provides multiple background levels and card elevations for creating depth and hierarchy in the UI.

## Color Philosophy

### Light Theme
- **Apple-inspired**: Clean, minimal with subtle shadows
- **Background**: Light gray (#f5f5f7)
- **Cards**: White with varying opacity levels

### Dark Theme
- **GitHub-inspired**: Deep blue-black tones
- **Background**: Very dark blue (#0d1117)
- **Cards**: Progressively lighter grays for elevation
- **Borders**: Subtle borders using GitHub color palette

## Background Levels

### Canvas Backgrounds

Use these for main layout areas:

| Class | CSS Variable | Light | Dark | Use Case |
|-------|--------------|-------|------|----------|
| `bg-canvas-default` | `--bg-canvas-default` | #f5f5f7 | #0d1117 | Main page background |
| `bg-canvas-subtle` | `--bg-canvas-subtle` | #ffffff | #161b22 | Elevated sections |
| `bg-canvas-inset` | `--bg-canvas-inset` | #eaeaea | #010409 | Sunken/inset areas |
| `bg-canvas-overlay` | `--bg-canvas-overlay` | rgba(255,255,255,0.95) | rgba(22,27,34,0.95) | Modals/overlays |

### Example Usage:

```tsx
// Main page
<div className="bg-canvas-default min-h-screen">
  {/* Page content */}
</div>

// Elevated section
<section className="bg-canvas-subtle rounded-lg p-4">
  {/* Content */}
</section>

// Inset area (like a code block or input field background)
<div className="bg-canvas-inset rounded p-2">
  {/* Content */}
</div>
```

## Card Levels

Cards have 4 elevation levels (0-3), with higher numbers appearing more elevated:

### Level 0 - Base Cards
- **Class**: `card-level-0`
- **Use**: Base level cards, list items, minimal elevation
- **Light**: rgba(255, 255, 255, 0.6)
- **Dark**: rgba(22, 27, 34, 0.6)

```tsx
<div className="card-level-0 rounded-xl p-4">
  <p>Base card content</p>
</div>
```

### Level 1 - Standard Cards
- **Class**: `card-level-1`
- **Use**: Standard cards, content containers
- **Light**: rgba(255, 255, 255, 0.7)
- **Dark**: rgba(22, 27, 34, 0.75)

```tsx
<div className="card-level-1 rounded-xl p-4">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>
```

### Level 2 - Elevated Cards
- **Class**: `card-level-2`
- **Use**: Important cards, modals, popovers
- **Light**: rgba(255, 255, 255, 0.8)
- **Dark**: rgba(33, 38, 45, 0.85)

```tsx
<div className="card-level-2 rounded-2xl p-6">
  <h2>Important Content</h2>
  <p>This stands out more</p>
</div>
```

### Level 3 - Highest Elevation
- **Class**: `card-level-3`
- **Use**: Floating elements, tooltips, highest priority content
- **Light**: rgba(255, 255, 255, 0.9)
- **Dark**: rgba(48, 54, 61, 0.9)

```tsx
<div className="card-level-3 rounded-2xl p-6 shadow-lg">
  <h1>Hero Content</h1>
  <p>Highest visual priority</p>
</div>
```

## Practical Examples

### Navigation Bar

```tsx
function NavBar() {
  return (
    <nav className="card-level-2 rounded-full p-2 flex gap-2">
      <button className="card-level-1 rounded-full px-4 py-2">Home</button>
      <button className="card-level-1 rounded-full px-4 py-2">Settings</button>
    </nav>
  );
}
```

### Settings Panel

```tsx
function SettingsPanel() {
  return (
    <div className="bg-canvas-default min-h-screen p-4">
      <div className="card-level-2 rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold">Settings</h2>
        
        {/* Individual setting rows */}
        <div className="card-level-1 rounded-xl p-4">
          <span>Dark Mode</span>
          <Switch />
        </div>
        
        <div className="card-level-1 rounded-xl p-4">
          <span>Language</span>
          <Select />
        </div>
      </div>
    </div>
  );
}
```

### Modal

```tsx
function Modal({ children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="card-level-3 rounded-3xl p-8 max-w-md">
        {children}
      </div>
    </div>
  );
}
```

### Transaction List

```tsx
function TransactionList({ transactions }) {
  return (
    <div className="bg-canvas-default p-4">
      <div className="card-level-1 rounded-2xl p-4 space-y-2">
        {transactions.map((tx) => (
          <div key={tx.id} className="card-level-0 rounded-xl p-3 hover:card-level-1">
            <span>{tx.description}</span>
            <span>{tx.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Border Utilities

Use Tailwind's border color utilities with the new variables:

```tsx
// Subtle border
<div className="border border-border-subtle rounded-lg p-4">

// Default border
<div className="border border-border-default rounded-lg p-4">

// Or use directly in Tailwind
<div className="border border-[var(--border-default)] rounded-lg p-4">
```

## Color Variables Reference

### CSS Variables

You can use these directly in your CSS or Tailwind:

```css
/* Canvas backgrounds */
var(--bg-canvas-default)
var(--bg-canvas-subtle)
var(--bg-canvas-inset)
var(--bg-canvas-overlay)

/* Card backgrounds */
var(--card-bg-level-0)
var(--card-bg-level-1)
var(--card-bg-level-2)
var(--card-bg-level-3)

/* Borders */
var(--border-default)
var(--border-subtle)

/* Shadows */
var(--shadow-soft)
var(--shadow-medium)
var(--shadow-card)
```

### Tailwind Classes

```tsx
// Canvas backgrounds
className="bg-canvas-default"
className="bg-canvas-subtle"
className="bg-canvas-inset"
className="bg-canvas-overlay"

// Card backgrounds (direct color, without effects)
className="bg-card-0"
className="bg-card-1"
className="bg-card-2"
className="bg-card-3"

// Borders
className="border-border-default"
className="border-border-subtle"
```

## Legacy Support

Old classes are still supported for backward compatibility:

- `.glass-panel` → Maps to `.card-level-1`
- `.glass-card` → Maps to `.card-level-2`

## Best Practices

1. **Use appropriate levels**: Don't skip levels unnecessarily
   - Page background → Level 0 cards → Level 1 nested cards
   
2. **Consistent elevation**: Keep the same level for similar elements
   - All list items should be the same level
   - All buttons in a group should be the same level

3. **Visual hierarchy**: Higher levels = more important
   - Modals: Level 3
   - Main content cards: Level 1-2
   - List items: Level 0-1

4. **Avoid over-elevation**: Don't use Level 3 for everything
   - Reserve it for truly important or floating elements

5. **Theme awareness**: Test in both light and dark modes
   - Dark theme shows more pronounced elevation differences
   - Light theme is more subtle

## Dark Theme Colors (GitHub-Inspired)

| Element | Color | Hex |
|---------|-------|-----|
| Canvas Default | Darkest | #0d1117 |
| Canvas Subtle | Dark Gray | #161b22 |
| Canvas Inset | Black | #010409 |
| Card Level 0 | Dark | rgba(22, 27, 34, 0.6) |
| Card Level 1 | Medium Dark | rgba(22, 27, 34, 0.75) |
| Card Level 2 | Medium | rgba(33, 38, 45, 0.85) |
| Card Level 3 | Light Gray | rgba(48, 54, 61, 0.9) |
| Border Default | Gray | #30363d |
| Border Subtle | Dark Gray | #21262d |

## Migration from Old System

```tsx
// Before
<div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl">

// After
<div className="card-level-1">

// Before
<div className="bg-white/60 dark:bg-gray-800/60">

// After  
<div className="card-level-0">
```

## Tips

- Use backdrop blur with cards for a premium glass effect
- Combine with rounded corners for modern UI: `rounded-xl`, `rounded-2xl`
- Add hover states: `hover:card-level-2` to elevate on hover
- Use transitions for smooth theme switching (already included in card classes)
