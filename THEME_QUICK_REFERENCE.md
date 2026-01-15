# Theme System Quick Reference

## 🎨 Card Levels (Elevation)

| Level | Class | Use Case | Example |
|-------|-------|----------|---------|
| **0** | `card-level-0` | List items, base cards | Transaction row |
| **1** | `card-level-1` | Standard cards | Settings item |
| **2** | `card-level-2` | Important cards | Main content panel |
| **3** | `card-level-3` | Floating elements | Modals, tooltips |

## 🖼️ Canvas Backgrounds

| Class | Use Case |
|-------|----------|
| `bg-canvas-default` | Main page background |
| `bg-canvas-subtle` | Elevated sections |
| `bg-canvas-inset` | Sunken areas (inputs, code blocks) |
| `bg-canvas-overlay` | Modal backgrounds |

## 📏 Border Colors

| Class | Use Case |
|-------|----------|
| `border-border-default` | Standard borders |
| `border-border-subtle` | Subtle dividers |

## 🌗 Dark Theme Colors (GitHub-Inspired)

| Element | Light | Dark |
|---------|-------|------|
| Background | `#f5f5f7` | `#0d1117` |
| Subtle BG | `#ffffff` | `#161b22` |
| Inset BG | `#eaeaea` | `#010409` |
| Card 0 | `rgba(255,255,255,0.6)` | `rgba(22,27,34,0.6)` |
| Card 1 | `rgba(255,255,255,0.7)` | `rgba(22,27,34,0.75)` |
| Card 2 | `rgba(255,255,255,0.8)` | `rgba(33,38,45,0.85)` |
| Card 3 | `rgba(255,255,255,0.9)` | `rgba(48,54,61,0.9)` |

## 💡 Common Patterns

### Page Layout
```tsx
<div className="bg-canvas-default min-h-screen p-4">
  {/* content */}
</div>
```

### Card Container
```tsx
<div className="card-level-2 rounded-2xl p-6">
  <h2>Title</h2>
</div>
```

### List Item
```tsx
<div className="card-level-0 rounded-xl p-4 hover:card-level-1">
  Item
</div>
```

### Modal
```tsx
<div className="card-level-3 rounded-3xl p-8">
  Modal Content
</div>
```

### Settings Row
```tsx
<div className="card-level-1 rounded-xl p-4">
  <span>Setting</span>
  <span>Value</span>
</div>
```

## 🎯 Best Practices

✅ **DO:**
- Use semantic card levels
- Test in both themes
- Use `rounded-xl` or `rounded-2xl` with cards
- Follow the visual hierarchy

❌ **DON'T:**
- Skip elevation levels unnecessarily
- Use Level 3 for everything
- Mix old and new systems in same component
- Forget backdrop blur is included

## 🔄 Migration from Old System

```tsx
// Before
className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border"

// After
className="card-level-1"
```

## 📚 More Info

- **Detailed Guide**: See `THEME_GUIDE.md`
- **Examples**: See `src/components/examples/ThemeExample.tsx`
- **Implementation**: See `THEME_IMPLEMENTATION.md`

---

**Pro Tip**: Card levels automatically include backdrop blur, borders, and smooth transitions! 🚀
