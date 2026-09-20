import appConfig from '@/data/app-config.json'
import type { ThemeName } from '@/lib/theme'
import type { ViewName } from '@/types/view'

/**
 * Typed view over data/app-config.json.
 *
 * The JSON module's inferred types are structurally right but too wide -
 * `defaultView` infers as `string`, not `ViewName`. Rather than sprinkle casts
 * at every use site, they are narrowed once here, which also makes this module
 * the single place to look when asking "where does that number come from".
 */
export const config = {
  /** Screen shown on first visit, before localStorage has a stored view. */
  defaultView: appConfig.defaultView as ViewName,
  defaultTheme: appConfig.defaultTheme as ThemeName,
  storageKeys: appConfig.storageKeys,
  timings: appConfig.timings,
  limits: appConfig.limits,
  callId: appConfig.callId,
  waitTime: appConfig.waitTime,
  csv: appConfig.csv,
  speechRecognition: appConfig.speechRecognition,
  features: appConfig.features,
  sounds: appConfig.sounds,
} as const
