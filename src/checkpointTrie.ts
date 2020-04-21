import { Trie as BaseTrie } from './baseTrie'
import { ScratchDB } from './scratch'
import { DB, BatchDBOp } from './db'
import { TrieNode } from './trieNode'

export class CheckpointTrie extends BaseTrie {
  _mainDB: DB
  _scratch: ScratchDB | null
  _checkpoints: Buffer[]

  constructor(...args: any) {
    super(...args)
    // Reference to main DB instance
    this._mainDB = this.db
    // DB instance used for checkpoints
    this._scratch = null
    // Roots of trie at the moment of checkpoint
    this._checkpoints = []
  }

  /**
   * Is the trie during a checkpoint phase?
   */
  get isCheckpoint() {
    return this._checkpoints.length > 0
  }

  /**
   * Creates a checkpoint that can later be reverted to or committed.
   * After this is called, no changes to the trie will be permanently saved
   * until `commit` is called.
   */
  checkpoint() {
    const wasCheckpoint = this.isCheckpoint
    this._checkpoints.push(this.root)

    // Entering checkpoint mode is not necessary for nested checkpoints
    if (!wasCheckpoint && this.isCheckpoint) {
      this._enterCpMode()
    }
  }

  /**
   * Commits a checkpoint to disk, if current checkpoint is not nested. If
   * nested, only sets the parent checkpoint as current checkpoint.
   * @method commit
   * @throws If not during a checkpoint phase
   */
  commit() {
    if (!this.isCheckpoint) {
      throw new Error('trying to commit when not checkpointed')
    }

    this._checkpoints.pop()
    if (!this.isCheckpoint) {
      this._exitCpMode(true)
    }
  }

  /**
   * Reverts the trie to the state it was at when `checkpoint` was first called.
   * If during a nested checkpoint, sets root to most recent checkpoint, and sets
   * parent checkpoint as current.
   */
  revert() {
    if (this.isCheckpoint) {
      this.root = this._checkpoints.pop()!
      if (!this.isCheckpoint) {
        this._exitCpMode(false)
      }
    }
  }

  /**
   * Returns a copy of the underlying trie with the interface
   * of CheckpointTrie. If during a checkpoint, the copy will
   * contain the checkpointing metadata (incl. reference to the same scratch).
   * @param {boolean} includeCheckpoints - If true and during a checkpoint, the copy will
   * contain the checkpointing metadata and will use the same scratch as underlying db.
   */
  copy(includeCheckpoints: boolean = true): CheckpointTrie {
    const db = this._mainDB.copy()
    const trie = new CheckpointTrie(db._map, this.root)
    if (includeCheckpoints && this.isCheckpoint) {
      trie._checkpoints = this._checkpoints.slice()
      trie._scratch = this._scratch!.copy()
      trie.db = trie._scratch
    }
    return trie
  }

  /**
   * Enter into checkpoint mode.
   * @private
   */
  _enterCpMode() {
    this._scratch = new ScratchDB(this._mainDB)
    this.db = this._scratch
  }

  /**
   * Exit from checkpoint mode.
   * @private
   */
  _exitCpMode(commitState: boolean) {
    const scratch = this._scratch as ScratchDB
    this._scratch = null
    this.db = this._mainDB

    if (commitState) {
      this._commitChanges(scratch)
    }
  }

  /**
   * Commits changes based on the state updates since checkpoint.
   * @method _commitChanges
   * @param {ScratchDB} scratchDb
   * @private
   */
  _commitChanges(scratchDb?: ScratchDB) {
    let scratch = scratchDb || this._scratch
    if (!scratch) {
      throw new Error('No scratch found to use')
    }
    const trie = new BaseTrie(scratch._map, this.root)
    trie.db = scratch

    const batchOps: BatchDBOp[] = []
    const nodes = trie._findDbNodes()
    for (const foundNode of nodes) {
      const { nodeRef, node } = foundNode
      batchOps.push({
        type: 'put',
        key: nodeRef,
        value: node.serialize(),
      })
    }

    this.db.batch(batchOps)
  }

  /**
   * Formats node to be saved by db.batch.
   * @method _formatNode
   * @private
   * @param {TrieNode} node - the node to format
   * @param {Boolean} topLevel - if the node is at the top level
   * @param {BatchDBOp[]} opStack - the opStack to push the node's data
   * @param {Boolean} remove - whether to remove the node (only used for CheckpointTrie)
   * @returns {Buffer | (EmbeddedNode | null)[]} - the node's hash used as the key or the rawNode
   */
  _formatNode(node: TrieNode, topLevel: boolean, opStack: BatchDBOp[], remove: boolean = false) {
    const rlpNode = node.serialize()

    if (rlpNode.length >= 32 || topLevel) {
      const hashRoot = node.hash()

      if (remove && this.isCheckpoint) {
        opStack.push({
          type: 'del',
          key: hashRoot,
        })
      } else {
        opStack.push({
          type: 'put',
          key: hashRoot,
          value: rlpNode,
        })
      }

      return hashRoot
    }

    return node.raw()
  }
}
