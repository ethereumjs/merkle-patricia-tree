import { LevelUp } from 'levelup'

export type DBMap = Map<String, Buffer>

export type BatchDBOp = PutBatch | DelBatch
export interface PutBatch {
  type: 'put'
  key: Buffer
  value: Buffer
}
export interface DelBatch {
  type: 'del'
  key: Buffer
}

/** Options to be passed in the constructor of a new DB */
export interface DBOptions {
  /** The db may be initialized with an existing JavaScript map. **/
  map?: Map<String, Buffer>
  /** The db may be initialized with an abstract-leveldown compliant store. **/
  leveldb?: LevelUp
}

/**
 * DB is a thin wrapper around JavaScript's map data structure.
 */
export class DB {
  _map: DBMap

  /**
   * Initialize a DB instance with [[DBOptions]].
   * If `leveldb` is not provided, db defaults to an in-memory JavaScript map.
   */
  constructor(options?: DBOptions) {
    if (options?.map) {
      this._map = options.map
    } else if (options?.leveldb) {
      this._map = new Map()
      // TODO one idea to resolve this async init race condition: create a public API method for _leveldbToMap and expect the result of that to be passed into `Trie(db)`.
      this._leveldbToMap(options.leveldb).then((dbMap) => {
        this._map = dbMap
      })
    } else {
      this._map = new Map()
    }
  }

  /**
   * Retrieves a raw value from db.
   * @param {Buffer} key
   * @returns {Buffer | null} - Returns with `Buffer` if a value is found or `null` if no value is found.
   */
  get(key: Buffer): Buffer | null {
    const formattedKey = key.toString('hex')
    const value = this._map.get(formattedKey)
    return value || null
  }

  /**
   * Writes a value to db.
   * @param {Buffer} key - The key to be stored
   * @param {Buffer} value - The value to be stored
   */
  put(key: Buffer, value: Buffer) {
    const formattedKey = key.toString('hex')
    this._map.set(formattedKey, value)
  }

  /**
   * Removes a raw value in the underlying leveldb.
   * @param {Buffer} key
   * @returns {Promise}
   */
  del(key: Buffer) {
    const formattedKey = key.toString('hex')
    this._map.delete(formattedKey)
  }

  /**
   * Performs a batch operation on db.
   * @param {Array} opStack A stack of db operations
   */
  batch(opStack: BatchDBOp[]) {
    for (const op of opStack) {
      if (op.type === 'put') {
        this.put(op.key, op.value)
      } else {
        // delete
        this.del(op.key)
      }
    }
  }

  /**
   * Returns a copy of the DB instance, with a reference
   * to the **same** underlying db instance.
   */
  copy(): DB {
    return new DB({ map: this._map })
  }

  /**
   * Creates a [[DBMap]] instance by iterating through a leveldb.
   * @private
   * @param {LevelUp} db - An abstract-leveldown compliant store.
   */
  async _leveldbToMap(db: LevelUp): Promise<DBMap> {
    return new Promise((resolve) => {
      const dbMap = new Map()

      db.createReadStream()
        .on('data', (data) => {
          const formattedKey = data.key.toString('hex')
          dbMap.set(formattedKey, data.value)
        })
        .on('error', (err) => {
          throw err
        })
        .on('end', () => {
          resolve(dbMap)
        })
    })
  }
}
