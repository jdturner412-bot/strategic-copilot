import { DexieRepository } from './dexieRepository'
import type { DataRepository } from './repository'

/**
 * The single place the app resolves its storage backend.
 *
 * Swapping in a synced backend later is a one-line change here, plus a
 * reimplementation of `data/hooks.ts` against the new source of truth.
 */
export const repo: DataRepository = new DexieRepository()

export * from './hooks'
export * from './types'
export { DEFAULT_SETTINGS } from './dexieRepository'
