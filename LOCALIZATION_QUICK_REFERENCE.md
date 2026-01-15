# Localization Quick Reference

## 🚀 Quick Start

### Use translations in any component:

```tsx
import { useTranslation } from "@/hooks/useTranslation";

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t("settings.title")}</h1>
      <button>{t("common.save")}</button>
    </div>
  );
}
```

## 🌍 Available Languages

**12 languages supported:**

🇬🇧 English | 🇪🇸 Spanish | 🇫🇷 French | 🇩🇪 German  
🇷🇺 Russian | 🇨🇳 Chinese | 🇯🇵 Japanese | 🇵🇹 Portuguese  
🇮🇹 Italian | 🇰🇷 Korean | 🇸🇦 Arabic | 🇮🇳 Hindi

## 📋 Common Translation Keys

### Buttons & Actions
```tsx
t("common.save")       // Save
t("common.cancel")     // Cancel
t("common.delete")     // Delete
t("common.edit")       // Edit
t("common.add")        // Add
t("common.confirm")    // Confirm
t("common.close")      // Close
t("common.back")       // Back
```

### Navigation
```tsx
t("nav.home")          // Home
t("nav.statistics")    // Statistics
t("nav.settings")      // Settings
t("nav.history")       // History
```

### Transactions
```tsx
t("transactions.add")           // Add Transaction
t("transactions.edit")          // Edit Transaction
t("transactions.amount")        // Amount
t("transactions.category")      // Category
t("transactions.enterAmount")   // Enter amount
```

### Categories
```tsx
t("categories.food")           // Food
t("categories.transport")      // Transport
t("categories.shopping")       // Shopping
t("categories.entertainment")  // Entertainment
```

### Messages
```tsx
t("success.transactionAdded")   // Transaction added successfully
t("errors.generic")             // Something went wrong
t("common.loading")             // Loading...
```

## 🔄 Language Switching

### Get current language:
```tsx
const { locale } = useTranslation();
// locale = "en", "es", "fr", etc.
```

### Change language:
```tsx
const { setLocale } = useTranslation();

setLocale("es");  // Switch to Spanish
setLocale("fr");  // Switch to French
```

### Get all languages:
```tsx
const { languages } = useTranslation();

languages.map(lang => (
  <option key={lang.code} value={lang.code}>
    {lang.nativeName}
  </option>
))
```

## ➕ Adding New Translations

1. Add to `src/locales/en.ts`:
```typescript
export default {
  // ... existing translations
  mySection: {
    myKey: "My Translation",
  },
};
```

2. Add to all other language files (es, fr, de, ru, zh, ja, pt, it, ko, ar, hi)

3. Use in component:
```tsx
{t("mySection.myKey")}
```

## 📝 Translation Categories

| Category | Example Keys | Use For |
|----------|-------------|---------|
| `common` | save, cancel, delete | Common buttons & actions |
| `nav` | home, settings | Navigation items |
| `settings` | language, currency | Settings page |
| `transactions` | add, edit, amount | Transaction operations |
| `statistics` | overview, trends | Statistics page |
| `categories` | food, transport | Transaction categories |
| `subcategories` | groceries, taxi | Category details |
| `date` | today, yesterday | Date-related text |
| `months` | january, february | Month names |
| `days` | monday, tuesday | Day names |
| `errors` | generic, network | Error messages |
| `success` | transactionAdded | Success messages |
| `ai` | title, send | AI assistant |

## 💡 Pro Tips

- **Always use translations** - Never hardcode text in JSX
- **Use descriptive keys** - `t("transactions.enterAmount")` not `t("text1")`
- **Keep keys organized** - Group by feature/section
- **Update all languages** - When adding a key, update all 12 files
- **Test in multiple languages** - UI should work with different text lengths

## 🎯 Complete Hook API

```tsx
const {
  t,           // Translation function
  locale,      // Current language code (e.g., "en")
  setLocale,   // Change language function
  languages,   // Array of all supported languages
} = useTranslation();
```

## 📚 Full Documentation

- **Detailed Guide**: See `LOCALIZATION.md`
- **Implementation Summary**: See `LOCALIZATION_SUMMARY.md`
- **Code Examples**: See `src/components/examples/LocalizationExample.tsx`

---

**200+ translation keys available in 12 languages!** 🌟
