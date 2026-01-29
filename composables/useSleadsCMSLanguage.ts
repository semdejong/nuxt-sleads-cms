import { inject } from 'vue'
import type { SleadsCMSLanguageContextType } from '../types'

export const SLEADS_CMS_LANGUAGE_KEY = 'sleads-cms-language' as const

export function useSleadsCMSLanguage(): SleadsCMSLanguageContextType {
  const context = inject<SleadsCMSLanguageContextType | undefined>(SLEADS_CMS_LANGUAGE_KEY)
  if (!context) {
    throw new Error(
      'useSleadsCMSLanguage must be used within a SleadsCMSLanguageProvider',
    )
  }
  return context
}
