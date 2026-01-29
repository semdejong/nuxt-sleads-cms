# Sleads CMS for Nuxt 4

Drop-in Sleads CMS integration for Nuxt 4. Mirrors the Next.js `useSleadsCMS` API 1:1: same composable surface, cache keys, and API behavior.

## Setup

1. Copy the contents of this folder into your Nuxt 4 project:
   - `types.ts` → project root (so that `composables/` and `components/` can import from `../types`), or put it elsewhere and update the import paths in the composables and the provider
   - `composables/` → your project’s `composables/`
   - `components/` → your project’s `components/`

   Or add this repo as a local dependency and re-export the composables and component from your app.

2. **Runtime config**

   In `nuxt.config.ts`:

   ```ts
   export default defineNuxtConfig({
     runtimeConfig: {
       public: {
         sleadsCmsApiKey: '',
       },
     },
   })
   ```

3. **Environment**

   Set the API key via env (no hardcoding):

   ```bash
   NUXT_PUBLIC_SLEADS_CMS_API_KEY=your-api-key
   ```

   Nuxt maps `NUXT_PUBLIC_*` to `runtimeConfig.public.*`, so this becomes `runtimeConfig.public.sleadsCmsApiKey`.

4. **Mount the provider**

   Wrap the app (or the part that uses CMS) with `SleadsCMSLanguageProvider` so language state is shared.

   **Option A – whole app**  
   In `app.vue`:

   ```vue
   <template>
     <SleadsCMSLanguageProvider>
       <NuxtPage />
     </SleadsCMSLanguageProvider>
   </template>
   ```

   **Option B – CMS-only layout**  
   In a layout used only by CMS pages, wrap that layout’s content with `<SleadsCMSLanguageProvider>`.

## Usage

- **`useSleadsCMS(overridePathname?)`**  
  Use in any page/component under the provider. Returns:

  - `c(id, defaultValue)` – get CMS value for field `id`, fallback `defaultValue`
  - `getRegisterStatus()` – check if listening mode is on (localhost)
  - `showFieldsAlert()` – debug: list current field ids
  - `languages`, `selectedLanguage`, `isLoadingLanguages`, `setLanguage` – language state and setter

- **`useSleadsCMSLanguage()`**  
  Use when you only need language state (e.g. a language switcher). Must be used inside `SleadsCMSLanguageProvider`.

- **`LanguageSelector`**  
  Drop-in language switcher component. Renders a dropdown with flag, display name, and code for each available language (from the CMS). Handles loading and empty states, click-outside to close, and dark mode. Must be used inside `SleadsCMSLanguageProvider`.

  ```vue
  <template>
    <LanguageSelector />
  </template>
  ```

  Use it in your header, layout, or anywhere under the provider. No props required.

Example (manual select, if you prefer to build your own):

```vue
<script setup lang="ts">
const { c, languages, selectedLanguage, setLanguage } = useSleadsCMS()
</script>

<template>
  <h1>{{ c('hero_title', 'Welcome') }}</h1>
  <select :value="selectedLanguage" @change="setLanguage(($event.target as HTMLSelectElement).value)">
    <option v-for="lang in languages" :key="lang" :value="lang">{{ lang }}</option>
  </select>
</template>
```

## Parity with Next.js

- Same cache keys and 30-day expiry; same Convex/API endpoints and request shapes.
- `c(id, defaultValue)` returns `defaultValue` on first paint, then CMS value when loaded; respects `selectedLanguage` and `splitId` query param.
- `setLanguage(lang)` updates all consumers and persists to `localStorage` under `selectedLanguage`.
- Listening mode (localhost + `sleadsCmsApiKey`) triggers one registration request; `getRegisterStatus` and `showFieldsAlert` behave as in the Next version.
