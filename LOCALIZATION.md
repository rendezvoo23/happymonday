# Localization Guide

This project uses **i18next** and **react-i18next** for internationalization (i18n).

## Supported Languages

The application currently supports **12 languages**:

- **English** (en) - English
- **Spanish** (es) - Español
- **French** (fr) - Français
- **German** (de) - Deutsch
- **Russian** (ru) - Русский
- **Chinese** (zh) - 中文
- **Japanese** (ja) - 日本語
- **Portuguese** (pt) - Português
- **Italian** (it) - Italiano
- **Korean** (ko) - 한국어
- **Arabic** (ar) - العربية
- **Hindi** (hi) - हिन्दी

## Quick Start

### Using Translations in Components

There are two ways to use translations in your components:

#### 1. Using the `useTranslation` hook (Recommended)

```tsx
import { useTranslation } from "@/hooks/useTranslation";

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("common.cancel")}</h1>
      <p>{t("transactions.loadingTransactions")}</p>
    </div>
  );
}
```

#### 2. Using the `useLocale` hook (Full control)

```tsx
import { useLocale } from "@/context/LocaleContext";

function MyComponent() {
  const { t, locale, setLocale, languages } = useLocale();

  return (
    <div>
      <h1>{t("settings.title")}</h1>
      <p>Current language: {locale}</p>
      <button onClick={() => setLocale("es")}>Switch to Spanish</button>
    </div>
  );
}
```

## Translation Keys Structure

All translation keys are organized in the following structure:

```typescript
{
  common: {
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    // ... more common actions
  },
  nav: {
    home: "Home",
    statistics: "Statistics",
    settings: "Settings",
    // ... navigation items
  },
  settings: {
    title: "Settings",
    language: "Language",
    currency: "Currency",
    // ... settings-related translations
  },
  transactions: {
    add: "Add Transaction",
    edit: "Edit Transaction",
    // ... transaction-related translations
  },
  // ... more categories
}
```

## Available Translation Categories

- **common** - Common buttons and actions (cancel, save, delete, etc.)
- **nav** - Navigation items
- **settings** - Settings page translations
- **theme** - Theme-related translations
- **transactions** - Transaction-related translations
- **statistics** - Statistics page translations
- **categories** - Transaction category names
- **subcategories** - Transaction subcategory names
- **date** - Date and time-related translations
- **months** - Month names (full)
- **monthsShort** - Month names (abbreviated)
- **days** - Day names (full)
- **daysShort** - Day names (abbreviated)
- **errors** - Error messages
- **success** - Success messages
- **ai** - AI assistant translations

## Adding a New Translation

1. **Add the key to English (`src/locales/en.ts`)**:

```typescript
export default {
  // ... existing translations
  myNewSection: {
    myNewKey: "My New Translation",
  },
};
```

2. **Add the same key to all other language files**:
   - `src/locales/es.ts` - Spanish
   - `src/locales/fr.ts` - French
   - `src/locales/de.ts` - German
   - `src/locales/ru.ts` - Russian
   - `src/locales/zh.ts` - Chinese
   - `src/locales/ja.ts` - Japanese
   - `src/locales/pt.ts` - Portuguese
   - `src/locales/it.ts` - Italian
   - `src/locales/ko.ts` - Korean
   - `src/locales/ar.ts` - Arabic
   - `src/locales/hi.ts` - Hindi

3. **Use the translation in your component**:

```tsx
const { t } = useTranslation();
return <div>{t("myNewSection.myNewKey")}</div>;
```

## Adding a New Language

1. **Create a new translation file** in `src/locales/`:

```typescript
// src/locales/nl.ts (Dutch example)
export default {
  common: {
    cancel: "Annuleren",
    confirm: "Bevestigen",
    // ... translate all keys
  },
  // ... all other sections
};
```

2. **Add the language to `src/locales/index.ts`**:

```typescript
import nl from "./nl";

export const translations = {
  en,
  es,
  fr,
  de,
  ru,
  zh,
  ja,
  pt,
  it,
  nl, // Add your new language
};

export const languages = [
  // ... existing languages
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
];
```

3. The language will now be available in the Settings page language selector.

## Changing the Language

Users can change the language from the Settings page:

1. Navigate to Settings
2. Click on "Language"
3. Select the desired language from the list

The selected language is stored in `localStorage` and persists across sessions.

## Default Language

The application automatically detects the browser's language on first load. If the detected language is supported, it will be used. Otherwise, it defaults to English.

## Language Persistence

The selected language is stored in `localStorage` under the key `"language"` and will be automatically loaded when the user returns to the application.

## Best Practices

1. **Always use translation keys** - Never hardcode text in components
2. **Keep keys organized** - Use logical grouping (common, nav, settings, etc.)
3. **Use descriptive key names** - Make it clear what the translation is for
4. **Translate all languages** - When adding a new key, update all language files
5. **Test in multiple languages** - Ensure UI layouts work with different text lengths

## Examples

### Button with Translation

```tsx
import { useTranslation } from "@/hooks/useTranslation";

function SaveButton() {
  const { t } = useTranslation();

  return <button>{t("common.save")}</button>;
}
```

### Form with Translations

```tsx
import { useTranslation } from "@/hooks/useTranslation";

function TransactionForm() {
  const { t } = useTranslation();

  return (
    <form>
      <label>{t("transactions.amount")}</label>
      <input placeholder={t("transactions.enterAmount")} />

      <label>{t("transactions.category")}</label>
      <select>
        <option>{t("categories.food")}</option>
        <option>{t("categories.transport")}</option>
      </select>

      <button type="submit">{t("common.save")}</button>
      <button type="button">{t("common.cancel")}</button>
    </form>
  );
}
```

### Conditional Translations

```tsx
import { useTranslation } from "@/hooks/useTranslation";

function StatusMessage({ type }: { type: "success" | "error" }) {
  const { t } = useTranslation();

  return (
    <div>
      {type === "success"
        ? t("success.transactionAdded")
        : t("errors.generic")}
    </div>
  );
}
```

## TypeScript Support

The localization system is fully typed. You'll get autocomplete and type checking for all translation keys.

## Troubleshooting

### Translation not showing up

1. Check that the key exists in all language files
2. Verify the key path is correct (e.g., `"common.save"` not `"common.Save"`)
3. Make sure you're using `t()` function from the hook

### New language not appearing in settings

1. Verify the language is added to `src/locales/index.ts`
2. Check that the translation file is imported correctly
3. Ensure the language code is correct in the `languages` array

### Language not persisting

1. Check browser's localStorage is enabled
2. Verify the `LocaleProvider` is wrapping your app in `main.tsx`
3. Clear localStorage and try again: `localStorage.clear()`
