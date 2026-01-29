import { ref, watch, computed, unref } from 'vue'
import {
  type SleadsCMSField,
  type FetchedCMSField,
  SLEADS_CMS_BASE_URL,
  PROJECT_ID,
  CACHE_KEY_FIELDS_PREFIX,
  transformFetchedFields,
  getCachedData,
  setCachedData,
} from '../types'
import { useSleadsCMSLanguage } from './useSleadsCMSLanguage'

function mergeFields(
  prevFields: SleadsCMSField[] | null,
  newFields: SleadsCMSField[],
): SleadsCMSField[] {
  if (!prevFields) return newFields
  const fetchedMap = new Map<string, SleadsCMSField>(
    newFields.map((field) => [field.id, field]),
  )
  const updatedFields = [...prevFields]
  fetchedMap.forEach((fetchedField, id) => {
    const existingIndex = updatedFields.findIndex((f) => f.id === id)
    if (existingIndex >= 0) {
      updatedFields[existingIndex] = fetchedField
    } else {
      updatedFields.push(fetchedField)
    }
  })
  return updatedFields
}

export default function useSleadsCMS(overridePathname?: string | null) {
  const route = useRoute()
  const config = useRuntimeConfig()
  const apiKey = (config.public?.sleadsCmsApiKey as string) ?? ''

  const page = computed(() => overridePathname ?? route.path ?? '')

  const { languages, selectedLanguage, isLoadingLanguages, setLanguage } =
    useSleadsCMSLanguage()

  const splitId = ref<string | undefined>(undefined)
  const hasRegistered = ref(false)
  const fields = ref<SleadsCMSField[] | null>(null)

  const fieldsRef = ref<SleadsCMSField[] | null>(null)
  const initializedFields = ref<Set<string>>(new Set())
  const hasFetchedRef = ref('')
  const hasRegisteredRef = ref(false)
  const selectedLanguageRef = ref(unref(selectedLanguage))

  function getInitialSplitId(): string | undefined {
    if (typeof window === 'undefined') return undefined
    const q = route.query?.splitId
    if (Array.isArray(q)) return q[0] ?? undefined
    return (q as string) ?? undefined
  }

  function getInitialFields(
    pageValue: string,
    selectedLang: string,
  ): SleadsCMSField[] | null {
    if (typeof window === 'undefined') return null
    const initialSplitId = getInitialSplitId()
    const fetchKey = `${pageValue}-${initialSplitId || 'default'}`
    const cacheKey = `${CACHE_KEY_FIELDS_PREFIX}${fetchKey}`
    const cachedFields = getCachedData<FetchedCMSField[]>(cacheKey)
    if (cachedFields?.length) {
      return transformFetchedFields(cachedFields, selectedLang || 'en')
    }
    return null
  }

  if (import.meta.client) {
    splitId.value = getInitialSplitId()
    fields.value = getInitialFields(page.value, unref(selectedLanguage))
  }

  watch(fields, (v) => {
    fieldsRef.value = v
  }, { immediate: true })

  watch(
    () => unref(selectedLanguage),
    (v) => {
      selectedLanguageRef.value = v
    },
    { immediate: true },
  )

  watch(
    () => ({ path: route.path, query: route.query }),
    () => {
      if (!import.meta.client) return
      const q = route.query?.splitId
      const newSplitId = Array.isArray(q) ? (q[0] ?? undefined) : ((q as string) ?? undefined)
      if (splitId.value !== newSplitId) {
        splitId.value = newSplitId
      }
    },
    { immediate: true },
  )

  async function getRegisterStatus(): Promise<boolean> {
    if (
      typeof window === 'undefined' ||
      !window.location.hostname.includes('localhost')
    ) {
      return false
    }
    const response = await fetch(
      `${SLEADS_CMS_BASE_URL}/cms/listening-mode/${PROJECT_ID}`,
    )
    const data = await response.json()
    if (data.listeningMode) {
      alert('Listening mode is enabled')
    }
    return data.listeningMode ?? false
  }

  function transformFields(fetchedFields: FetchedCMSField[]): SleadsCMSField[] {
    const currentLang = selectedLanguageRef.value || 'en'
    return transformFetchedFields(fetchedFields, currentLang)
  }

  watch(
    [page, splitId],
    () => {
      const pageValue = page.value
      const splitIdValue = splitId.value
      const fetchKey = `${pageValue}-${splitIdValue || 'default'}`
      const cacheKey = `${CACHE_KEY_FIELDS_PREFIX}${fetchKey}`

      if (hasFetchedRef.value !== fetchKey) {
        hasFetchedRef.value = ''
      }
      if (hasFetchedRef.value === fetchKey) return

      const cachedFields = getCachedData<FetchedCMSField[]>(cacheKey)
      if (cachedFields?.length) {
        const transformed = transformFields(cachedFields)
        queueMicrotask(() => {
          fields.value = mergeFields(fields.value, transformed)
        })
      }

      setTimeout(async () => {
        const getFields = await fetch(
          `${SLEADS_CMS_BASE_URL}/cms/get-fields/?projectId=${PROJECT_ID}&pageId=${pageValue}&splitId=${splitIdValue}`,
        )
        const data = (await getFields.json()) as { fields?: FetchedCMSField[] }
        if (data.fields) {
          setCachedData(cacheKey, data.fields)
          const transformed = transformFields(data.fields)
          fields.value = mergeFields(fields.value, transformed)
        }
        hasFetchedRef.value = fetchKey
      })
    },
    { immediate: true },
  )

  watch(
    [fields, hasRegistered],
    () => {
      if (
        hasRegisteredRef.value ||
        !fields.value?.length ||
        hasRegistered.value
      ) {
        return
      }
      const timeoutId = setTimeout(async () => {
        const isListening = await getRegisterStatus()
        if (
          isListening &&
          apiKey &&
          fieldsRef.value?.length &&
          !hasRegistered.value
        ) {
          hasRegistered.value = true
          const response = await fetch(`${SLEADS_CMS_BASE_URL}/cms/register`, {
            method: 'POST',
            body: JSON.stringify({
              projectId: PROJECT_ID,
              page: page.value,
              fields: fieldsRef.value.map((field) => ({
                id: field.id,
                value: field.value,
              })),
              apiKey,
            }),
          })
          const data = await response.json()
          if (data.success) {
            alert('Fields registered successfully')
            hasRegisteredRef.value = true
          } else {
            alert('Failed to register fields')
          }
        }
      }, 500)
      return () => clearTimeout(timeoutId)
    },
    { immediate: true },
  )

  function c(
    id: string,
    defaultValue: string | number | boolean | null | undefined,
  ): string | number | boolean | null | undefined {
    const currentFields = fields.value
    const currentLang = unref(selectedLanguage)
    const existingField = currentFields?.find((field) => field.id === id)

    if (existingField) {
      if (!initializedFields.value.has(id)) {
        initializedFields.value.add(id)
      }
      if (existingField.values && currentLang) {
        const langValue = existingField.values[currentLang]
        if (
          langValue !== null &&
          langValue !== undefined &&
          langValue !== ''
        ) {
          return langValue
        }
      }
      return existingField.defaultValue ?? defaultValue
    }

    initializedFields.value.add(id)
    const newField: SleadsCMSField = {
      id,
      value: defaultValue,
      defaultValue:
        typeof defaultValue === 'string' ? defaultValue : undefined,
    }
    if (!currentFields) {
      fields.value = [newField]
    } else if (!currentFields.find((f) => f.id === id)) {
      fields.value = [...currentFields, newField]
    }
    return defaultValue
  }

  function showFieldsAlert() {
    alert(fieldsRef.value?.map((field) => field.id).join(', '))
  }

  return {
    c,
    getRegisterStatus,
    showFieldsAlert,
    languages,
    isLoadingLanguages,
    setLanguage,
    selectedLanguage,
  }
}
