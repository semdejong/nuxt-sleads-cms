<script setup lang="ts">
import { ref, provide, onMounted } from 'vue'
import {
  CACHE_KEY_LANGUAGES,
  getCachedData,
  setCachedData,
  SLEADS_CMS_BASE_URL,
  PROJECT_ID,
} from '../types'
import { SLEADS_CMS_LANGUAGE_KEY } from '../composables/useSleadsCMSLanguage'

const languages = ref<string[]>([])
const isLoadingLanguages = ref(false)
const selectedLanguage = ref('en')

function getInitialLanguages(): string[] {
  if (typeof window === 'undefined') return []
  const cached = getCachedData<string[]>(CACHE_KEY_LANGUAGES)
  if (cached?.length) return cached
  return []
}

function getInitialSelectedLanguage(): string {
  if (typeof window === 'undefined') return 'en'
  const cached = getCachedData<string[]>(CACHE_KEY_LANGUAGES)
  const fromCache = cached?.length ? cached : null
  const saved = localStorage.getItem('selectedLanguage')
  if (saved && fromCache?.includes(saved)) return saved
  if (fromCache?.length) return fromCache[0]
  return 'en'
}

if (import.meta.client) {
  languages.value = getInitialLanguages()
  selectedLanguage.value = getInitialSelectedLanguage()
}

function applyLanguages(languageList: string[]) {
  languages.value = languageList
  if (import.meta.client) {
    const saved = localStorage.getItem('selectedLanguage')
    if (saved && languageList.includes(saved)) {
      selectedLanguage.value = saved
    } else {
      selectedLanguage.value = languageList[0]
    }
  } else {
    selectedLanguage.value = languageList[0]
  }
}

function setLanguage(language: string) {
  if (!languages.value.includes(language)) return
  if (language === selectedLanguage.value) return
  if (import.meta.client) {
    localStorage.setItem('selectedLanguage', language)
  }
  selectedLanguage.value = language
}

onMounted(() => {
  const cached = getCachedData<string[]>(CACHE_KEY_LANGUAGES)
  if (cached?.length && languages.value.length === 0) {
    queueMicrotask(() => applyLanguages(cached))
  } else {
    queueMicrotask(() => { isLoadingLanguages.value = true })
  }

  const fetchLanguages = async () => {
    try {
      const response = await fetch(
        `${SLEADS_CMS_BASE_URL}/cms/get-languages/${PROJECT_ID}`,
      )
      const data = (await response.json()) as { languages?: string[] }
      if (data.languages) {
        setCachedData(CACHE_KEY_LANGUAGES, data.languages)
        applyLanguages(data.languages)
      }
      isLoadingLanguages.value = false
    } catch (error) {
      console.error('Failed to fetch languages:', error)
      isLoadingLanguages.value = false
    }
  }
  fetchLanguages()
})

provide(SLEADS_CMS_LANGUAGE_KEY, {
  languages,
  selectedLanguage,
  isLoadingLanguages,
  setLanguage,
})
</script>

<template>
  <slot />
</template>
