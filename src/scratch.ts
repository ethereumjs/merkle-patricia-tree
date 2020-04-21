import { DB } from './db'

/**
 * An in-memory wrap over `DB` with an upstream DB
 * which will be queried when a key is not found
 * in the in-memory scratch. This class is used to implement
 * checkpointing functionality in CheckpointTrie.
 */
export class ScratchDB extends DB {
  private _upstream: DB

  constructor(upstreamDB: DB) {
    super()
    this._upstream = upstreamDB
  }

  /**
   * Similar to `DB.get`, but first searches in-memory
   * scratch DB, if key not found, searches upstream DB.
   */
  get(key: Buffer): Buffer | null {
    const formattedKey = key.toString('hex')
    // First, search in-memory db
    let value = this._map.get(formattedKey)

    // If not found, try searching upstream db
    if (!value && this._upstream._map) {
      value = this._upstream._map.get(formattedKey)
    }

    return value || null
  }

  copy(): ScratchDB {
    const scratch = new ScratchDB(this._upstream)
    scratch._map = this._map
    return scratch
  }
}
