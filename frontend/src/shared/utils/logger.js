/**
 * Structured Frontend Logger
 *
 * Provides level-gated, prefixed logging that can be silenced in production.
 * Drop-in replacement for console.log/warn/error with automatic prefixing
 * and environment-aware log levels.
 *
 * Usage:
 *   import { createLogger } from '@/shared/utils/logger'
 *   const log = createLogger('MyComponent')
 *   log.info('loaded', { items: 5 })  // → [MyComponent] loaded { items: 5 }
 *   log.warn('slow query', { ms: 3200 })
 *   log.error('failed', error)
 *
 * Log levels (ordered): debug < info < warn < error < silent
 * Default level: 'warn' in production, 'debug' in development.
 * Override via localStorage: localStorage.setItem('neura:logLevel', 'debug')
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 }

function getLevel() {
  try {
    const stored = localStorage.getItem('neura:logLevel')
    if (stored && stored in LEVELS) return LEVELS[stored]
  } catch {
    // localStorage may be unavailable (SSR, privacy mode)
  }
  return import.meta.env?.DEV ? LEVELS.debug : LEVELS.warn
}

let currentLevel = getLevel()

/**
 * Set the global log level at runtime.
 * @param {'debug' | 'info' | 'warn' | 'error' | 'silent'} level
 */
export function setLogLevel(level) {
  if (level in LEVELS) {
    currentLevel = LEVELS[level]
    try {
      localStorage.setItem('neura:logLevel', level)
    } catch {
      // ignore
    }
  }
}

/**
 * Create a prefixed logger instance.
 * @param {string} prefix - Component or module name
 * @returns {{ debug: Function, info: Function, warn: Function, error: Function }}
 */
export function createLogger(prefix) {
  const tag = `[${prefix}]`

  return {
    debug(...args) {
      if (currentLevel <= LEVELS.debug) console.debug(tag, ...args)
    },
    info(...args) {
      if (currentLevel <= LEVELS.info) console.info(tag, ...args)
    },
    warn(...args) {
      if (currentLevel <= LEVELS.warn) console.warn(tag, ...args)
    },
    error(...args) {
      if (currentLevel <= LEVELS.error) console.error(tag, ...args)
    },
  }
}

// Convenience: default app-wide logger
export const appLogger = createLogger('NeuraReport')
