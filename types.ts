/**
 * Shared types, constants, and pure helpers for Sleads CMS (Nuxt 4).
 * Framework-agnostic; no Vue/React imports.
 */

export interface SleadsCMSField {
  id: string
  value: string | number | boolean | null | undefined
  defaultValue?: string
  values?: Record<string, string | null>
}

export interface FetchedCMSField {
  fieldId: string
  key: string
  defaultValue: string
  values: Record<string, string | null>
}

export interface CachedData<T> {
  data: T
  timestamp: number
}

export interface SleadsCMSLanguageContextType {
  languages: string[]
  selectedLanguage: string
  isLoadingLanguages: boolean
  setLanguage: (language: string) => void
}

export const SLEADS_CMS_BASE_URL = 'https://elegant-cheetah-861.convex.site'
export const PROJECT_ID = 'jx71e542y494xq534p8z6a9f5n7xvf52'

export const CACHE_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
export const CACHE_KEY_LANGUAGES = `sleads_cms_languages_${PROJECT_ID}`
export const CACHE_KEY_FIELDS_PREFIX = `sleads_cms_fields_${PROJECT_ID}_`

export function transformFetchedFields(
  fetchedFields: FetchedCMSField[],
  currentLang: string,
): SleadsCMSField[] {
  const language = currentLang || 'en'
  return fetchedFields.map((field) => ({
    id: field.key,
    defaultValue: field.defaultValue,
    values: field.values,
    value:
      field.values[language] !== null && field.values[language] !== undefined
        ? field.values[language]
        : field.defaultValue,
  }))
}

export function getCachedData<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null
    const parsed: CachedData<T> = JSON.parse(cached)
    const now = Date.now()
    if (now - parsed.timestamp > CACHE_EXPIRATION_MS) {
      localStorage.removeItem(key)
      return null
    }
    return parsed.data
  } catch (error) {
    console.error('Error reading from cache:', error)
    return null
  }
}

export function setCachedData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  try {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(cached))
  } catch (error) {
    console.error('Error writing to cache:', error)
  }
}
