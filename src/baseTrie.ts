import { LevelUp } from 'levelup'
import { keccak, KECCAK256_RLP } from 'ethereumjs-util'
import { DB, DBMap, BatchDBOp, PutBatch } from './db'
import { bufferToNibbles, matchingNibbleLength, doKeysMatch } from './util/nibbles'
import {
  TrieNode,
  Nibbles,
  decodeNode,
  decodeRawNode,
  isRawNode,
  BranchNode,
  ExtensionNode,
  LeafNode,
  EmbeddedNode,
} from './trieNode'
const assert = require('assert')

interface Path {
  node: TrieNode | null
  remaining: Nibbles
  stack: TrieNode[]
}

interface FoundNode {
  nodeRef: Buffer
  node: TrieNode
  key: Nibbles
}

/**
 * Use `import { BaseTrie } from 'merkle-patricia-tree'` for the base interface.
 * In Ethereum applications use the Secure Trie Overlay: `import { SecureTrie } from 'merkle-patricia-tree'`.
 * The API for the base and the secure interface are about the same.
 * @param {LevelUp | DBMap} [db] - You may pass in a [levelup](https://github.com/Level/levelup) instance to get loaded into memory.
 * If the db is `null` or left undefined, then the trie will be stored via an in-memory JavaScript map.
 * @param {Buffer} [root] - A `Buffer` for the root of a previously stored trie
 * @prop {Buffer} root - The current root of the `trie`
 * @prop {Buffer} EMPTY_TRIE_ROOT - The root for an empty trie
 */
export class Trie {
  EMPTY_TRIE_ROOT: Buffer
  db: DB
  private _root: Buffer

  constructor(db?: LevelUp | DBMap | null, root?: Buffer) {
    this.EMPTY_TRIE_ROOT = KECCAK256_RLP

    if (db) {
      if (db instanceof Map) {
        this.db = new DB({ map: db })
      } else {
        // db is instanceOf LevelUp
        this.db = new DB({ leveldb: db })
      }
    } else {
      this.db = new DB()
    }

    this._root = this.EMPTY_TRIE_ROOT
    if (root) {
      this.setRoot(root)
    }
  }

  static fromProof(proofNodes: Buffer[], proofTrie?: Trie): Trie {
    let opStack = proofNodes.map((nodeValue) => {
      return {
        type: 'put',
        key: keccak(nodeValue),
        value: nodeValue,
      } as PutBatch
    })

    if (!proofTrie) {
      proofTrie = new Trie()
      if (opStack[0]) {
        proofTrie.root = opStack[0].key
      }
    }

    proofTrie.db.batch(opStack)

    return proofTrie
  }

  static prove(trie: Trie, key: Buffer): Buffer[] {
    const { stack } = trie.findPath(key)
    const p = stack.map((stackElem) => {
      return stackElem.serialize()
    })
    return p
  }

  static verifyProof(rootHash: Buffer, key: Buffer, proofNodes: Buffer[]): Buffer | null {
    let proofTrie = new Trie(null, rootHash)
    try {
      proofTrie = Trie.fromProof(proofNodes, proofTrie)
    } catch (e) {
      throw new Error('Invalid proof nodes given')
    }
    return proofTrie.get(key)
  }

  set root(value: Buffer) {
    this.setRoot(value)
  }

  get root(): Buffer {
    return this._root
  }

  setRoot(value?: Buffer) {
    if (!value) {
      value = this.EMPTY_TRIE_ROOT
    }
    assert(value.length === 32, 'Invalid root length. Roots are 32 bytes')
    this._root = value
  }

  /**
   * Gets a value given a `key`
   * @method get
   * @memberof Trie
   * @param {Buffer} key - the key to search for
   * @returns {Buffer | null} - Returns `Buffer` if a value was found or `null` if no value was found.
   */
  get(key: Buffer): Buffer | null {
    const { node, remaining } = this.findPath(key)
    let value = null
    if (node && remaining.length === 0) {
      value = node.value
    }
    return value
  }

  /**
   * Stores a given `value` at the given `key`
   * @method put
   * @memberof Trie
   * @param {Buffer} key
   * @param {Buffer} value
   */
  put(key: Buffer, value: Buffer) {
    // If value is empty, delete
    if (!value || value.toString() === '') {
      return this.del(key)
    }

    if (this.root.equals(KECCAK256_RLP)) {
      // If no root, initialize this trie
      this._createInitialNode(key, value)
    } else {
      // First try to find the given key or its nearest node
      const { remaining, stack } = this.findPath(key)
      // then update
      this._updateNode(key, value, remaining, stack)
    }
  }

  /**
   * Deletes a value given a `key`
   * @method del
   * @memberof Trie
   * @param {Buffer} key
   */
  del(key: Buffer) {
    const { node, stack } = this.findPath(key)
    if (node) {
      this._deleteNode(key, stack)
    }
  }

  /** Retrieves a node from db by hash **/
  _lookupNode(node: Buffer | Buffer[]): TrieNode | null {
    if (isRawNode(node)) {
      return decodeRawNode(node as Buffer[])
    }

    let value = null
    let foundNode = null

    value = this.db.get(node as Buffer)

    if (value) {
      foundNode = decodeNode(value)
    }

    return foundNode
  }

  /** Writes a single node to db **/
  _putNode(node: TrieNode) {
    const hash = node.hash()
    const serialized = node.serialize()
    this.db.put(hash, serialized)
  }

  /**
   * Tries to find a path to the node for the given key.
   * It returns a `stack` of nodes to the closet node.
   * @method findPath
   * @memberof Trie
   * @param {Buffer} key - the search key
   */
  findPath(key: Buffer): Path {
    let stack: TrieNode[] = []
    let targetKey = bufferToNibbles(key)

    // walk trie and process nodes
    const nodes = this._walkTrie(this.root, targetKey)

    for (const foundNode of nodes) {
      const { node, key: keyProgress } = foundNode

      const keyRemainder = targetKey.slice(matchingNibbleLength(keyProgress, targetKey))
      stack.push(node)
      if (node instanceof BranchNode) {
        if (keyRemainder.length === 0) {
          // we exhausted the key without finding a node
          return { node, remaining: [], stack }
        } else {
          const branchIndex = keyRemainder[0]
          const branchNode = node.getBranch(branchIndex)
          if (!branchNode) {
            // there are no more nodes to find and we didn't find the key
            return { node: null, remaining: keyRemainder, stack }
          } else {
            // node found, continuing search
          }
        }
      } else if (node instanceof LeafNode) {
        if (doKeysMatch(keyRemainder, node.key)) {
          // keys match, return node with empty key
          return { node, remaining: [], stack }
        } else {
          // reached leaf but keys dont match
          return { node: null, remaining: keyRemainder, stack }
        }
      } else if (node instanceof ExtensionNode) {
        const matchingLen = matchingNibbleLength(keyRemainder, node.key)
        if (matchingLen !== node.key.length) {
          // keys don't match, fail
          return { node: null, remaining: keyRemainder, stack }
        } else {
          // keys match, continue search
        }
      }
    }

    // Return if _walkTrie finishes without finding any nodes
    return { node: null, remaining: [], stack }
  }

  /*
   * Finds all nodes that are stored directly in the db
   * (some nodes are stored raw inside other nodes)
   */
  _findDbNodes(): FoundNode[] {
    const foundDbNodes: FoundNode[] = []
    const nodes = this._walkTrie(this.root)
    for (const foundNode of nodes) {
      const { nodeRef, node, key } = foundNode
      if (isRawNode(nodeRef)) {
        // look for next
      } else {
        foundDbNodes.push({ nodeRef, node, key })
      }
    }
    return foundDbNodes
  }

  /**
   * Updates a node
   * @method _updateNode
   * @private
   * @param {Buffer} key
   * @param {Buffer} value
   * @param {Nibbles} keyRemainder
   * @param {TrieNode[]} stack
   */
  _updateNode(k: Buffer, value: Buffer, keyRemainder: Nibbles, stack: TrieNode[]) {
    const toSave: BatchDBOp[] = []
    const lastNode = stack.pop()
    if (!lastNode) {
      throw new Error('Stack underflow')
    }

    // add the new nodes
    let key = bufferToNibbles(k)

    // Check if the last node is a leaf and the key matches to this
    let matchLeaf = false

    if (lastNode instanceof LeafNode) {
      let l = 0
      for (let i = 0; i < stack.length; i++) {
        const n = stack[i]
        if (n instanceof BranchNode) {
          l++
        } else {
          l += n.key.length
        }
      }

      if (
        matchingNibbleLength(lastNode.key, key.slice(l)) === lastNode.key.length &&
        keyRemainder.length === 0
      ) {
        matchLeaf = true
      }
    }

    if (matchLeaf) {
      // just updating a found value
      lastNode.value = value
      stack.push(lastNode as TrieNode)
    } else if (lastNode instanceof BranchNode) {
      stack.push(lastNode)
      if (keyRemainder.length !== 0) {
        // add an extension to a branch node
        keyRemainder.shift()
        // create a new leaf
        const newLeaf = new LeafNode(keyRemainder, value)
        stack.push(newLeaf)
      } else {
        lastNode.value = value
      }
    } else {
      // create a branch node
      const lastKey = lastNode.key
      const matchingLength = matchingNibbleLength(lastKey, keyRemainder)
      const newBranchNode = new BranchNode()

      // create a new extension node
      if (matchingLength !== 0) {
        const newKey = lastNode.key.slice(0, matchingLength)
        const newExtNode = new ExtensionNode(newKey, value)
        stack.push(newExtNode)
        lastKey.splice(0, matchingLength)
        keyRemainder.splice(0, matchingLength)
      }

      stack.push(newBranchNode)

      if (lastKey.length !== 0) {
        const branchKey = lastKey.shift() as number

        if (lastKey.length !== 0 || lastNode instanceof LeafNode) {
          // shrinking extension or leaf
          lastNode.key = lastKey
          const formattedNode = this._formatNode(lastNode, false, toSave)
          newBranchNode.setBranch(branchKey, formattedNode as EmbeddedNode)
        } else {
          // remove extension or attaching
          this._formatNode(lastNode, false, toSave, true)
          newBranchNode.setBranch(branchKey, lastNode.value)
        }
      } else {
        newBranchNode.value = lastNode.value
      }

      if (keyRemainder.length !== 0) {
        keyRemainder.shift()
        // add a leaf node to the new branch node
        const newLeafNode = new LeafNode(keyRemainder, value)
        stack.push(newLeafNode)
      } else {
        newBranchNode.value = value
      }
    }

    this._saveStack(key, stack, toSave)
  }

  /**
   * Walks a trie until finished.
   * @method _walkTrie
   * @private
   * @param {Buffer} root
   * @param {Nibbles} targetKey
   * @returns {FoundNode[]} - An array of nodes found
   */
  _walkTrie(root: Buffer, targetKey?: Nibbles): FoundNode[] {
    const self = this
    root = root || this.root
    const nodes: FoundNode[] = []

    if (root.equals(KECCAK256_RLP)) {
      return []
    }

    const processNode = (nodeRef: Buffer, node: TrieNode, key: Nibbles = []) => {
      if (node) {
        nodes.push({ nodeRef, node, key })
      }

      if (node instanceof LeafNode) {
        return
      }

      // Process children
      let children: Array<[Nibbles, Buffer | Buffer[]]>
      if (node instanceof ExtensionNode) {
        children = [[node.key, node.value]]
      } else if (node instanceof BranchNode) {
        children = node.getChildren().map((b) => [[b[0]], b[1]])
      } else {
        // Node has no children
        return
      }
      for (const [keyExtension, childRef] of children) {
        const childKey = key.concat(keyExtension)

        if (targetKey) {
          let matchingTarget = [...targetKey]
          // setting array.length is a fast way to shorten it
          matchingTarget.length = childKey.length
          // stringifying the arrays is an easy way to compare their items in sequence
          if (matchingTarget.toString() !== childKey.toString()) {
            // Skip child if not relevant
            continue
          }
        }
        const childNode = self._lookupNode(childRef)
        processNode(childRef as Buffer, childNode as TrieNode, childKey)
      }
    }

    const node = this._lookupNode(root)
    if (node) {
      processNode(root, node as TrieNode, [])
    }

    return nodes
  }

  /**
   * saves a stack
   * @method _saveStack
   * @private
   * @param {Array} key - the key. Should follow the stack
   * @param {Array} stack - a stack of nodes to the value given by the key
   * @param {Array} opStack - a stack of levelup operations to commit at the end of this funciton
   */
  _saveStack(key: Nibbles, stack: TrieNode[], opStack: BatchDBOp[]) {
    let lastRoot

    // update nodes
    while (stack.length) {
      const node = stack.pop() as TrieNode
      if (node instanceof LeafNode) {
        key.splice(key.length - node.key.length)
      } else if (node instanceof ExtensionNode) {
        key.splice(key.length - node.key.length)
        if (lastRoot) {
          node.value = lastRoot
        }
      } else if (node instanceof BranchNode) {
        if (lastRoot) {
          const branchKey = key.pop()
          node.setBranch(branchKey!, lastRoot)
        }
      }
      lastRoot = this._formatNode(node, stack.length === 0, opStack) as Buffer
    }

    if (lastRoot) {
      this.root = lastRoot
    }

    this.db.batch(opStack)
  }

  _deleteNode(k: Buffer, stack: TrieNode[]) {
    const processBranchNode = (
      key: Nibbles,
      branchKey: number,
      branchNode: TrieNode,
      parentNode: TrieNode,
      stack: TrieNode[],
    ) => {
      // branchNode is the node ON the branch node not THE branch node
      if (!parentNode || parentNode instanceof BranchNode) {
        // branch->?
        if (parentNode) {
          stack.push(parentNode)
        }

        if (branchNode instanceof BranchNode) {
          // create an extension node
          // branch->extension->branch
          // @ts-ignore
          const extensionNode = new ExtensionNode([branchKey], null)
          stack.push(extensionNode)
          key.push(branchKey)
        } else {
          const branchNodeKey = branchNode.key
          // branch key is an extension or a leaf
          // branch->(leaf or extension)
          branchNodeKey.unshift(branchKey)
          branchNode.key = branchNodeKey.slice(0)
          key = key.concat(branchNodeKey)
        }
        stack.push(branchNode)
      } else {
        // parent is an extension
        let parentKey = parentNode.key

        if (branchNode instanceof BranchNode) {
          // ext->branch
          parentKey.push(branchKey)
          key.push(branchKey)
          parentNode.key = parentKey
          stack.push(parentNode)
        } else {
          const branchNodeKey = branchNode.key
          // branch node is an leaf or extension and parent node is an exstention
          // add two keys together
          // dont push the parent node
          branchNodeKey.unshift(branchKey)
          key = key.concat(branchNodeKey)
          parentKey = parentKey.concat(branchNodeKey)
          branchNode.key = parentKey
        }

        stack.push(branchNode)
      }

      return key
    }

    let lastNode = stack.pop() as TrieNode
    assert(lastNode)
    let parentNode = stack.pop()
    const opStack: BatchDBOp[] = []

    let key = bufferToNibbles(k)

    if (!parentNode) {
      // the root here has to be a leaf.
      this.root = this.EMPTY_TRIE_ROOT
      return
    }

    if (lastNode instanceof BranchNode) {
      lastNode.value = null
    } else {
      // the lastNode has to be a leaf if it's not a branch.
      // And a leaf's parent, if it has one, must be a branch.
      if (!(parentNode instanceof BranchNode)) {
        throw new Error('Expected branch node')
      }
      const lastNodeKey = lastNode.key
      key.splice(key.length - lastNodeKey.length)
      // delete the value
      this._formatNode(lastNode, false, opStack, true)
      parentNode.setBranch(key.pop() as number, null)
      lastNode = parentNode
      parentNode = stack.pop()
    }

    // nodes on the branch
    // count the number of nodes on the branch
    const branchNodes: [number, EmbeddedNode][] = lastNode.getChildren()

    // if there is only one branch node left, collapse the branch node
    if (branchNodes.length === 1) {
      // add the one remaing branch node to node above it
      const branchNode = branchNodes[0][1]
      const branchNodeKey = branchNodes[0][0]

      // look up node
      const foundNode = this._lookupNode(branchNode)
      if (foundNode) {
        key = processBranchNode(
          key,
          branchNodeKey,
          foundNode as TrieNode,
          parentNode as TrieNode,
          stack,
        )
        this._saveStack(key, stack, opStack)
      }
    } else {
      // simple removing a leaf and recaluclation the stack
      if (parentNode) {
        stack.push(parentNode)
      }

      stack.push(lastNode)
      this._saveStack(key, stack, opStack)
    }
  }

  /** Creates the initial node from an empty tree **/
  _createInitialNode(key: Buffer, value: Buffer) {
    const newNode = new LeafNode(bufferToNibbles(key), value)
    this.root = newNode.hash()
    this._putNode(newNode)
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
  _formatNode(
    node: TrieNode,
    topLevel: boolean,
    opStack: BatchDBOp[],
    remove: boolean = false,
  ): Buffer | (EmbeddedNode | null)[] {
    const rlpNode = node.serialize()

    if (rlpNode.length >= 32 || topLevel) {
      const hashRoot = node.hash()
      opStack.push({
        type: 'put',
        key: hashRoot,
        value: rlpNode,
      })
      return hashRoot
    }

    return node.raw()
  }

  // creates a new trie backed by the same db
  // and starting at the same root
  copy(): Trie {
    const db = this.db.copy()
    return new Trie(db._map, this.root)
  }

  /**
   * The given hash of operations (key additions or deletions) are executed on the DB
   * @method batch
   * @memberof Trie
   * @example
   * const ops = [
   *    { type: 'del', key: Buffer.from('father') }
   *  , { type: 'put', key: Buffer.from('name'), value: Buffer.from('Yuri Irsenovich Kim') }
   *  , { type: 'put', key: Buffer.from('dob'), value: Buffer.from('16 February 1941') }
   *  , { type: 'put', key: Buffer.from('spouse'), value: Buffer.from('Kim Young-sook') }
   *  , { type: 'put', key: Buffer.from('occupation'), value: Buffer.from('Clown') }
   * ]
   * trie.batch(ops)
   * @param {Array} ops
   */
  batch(ops: BatchDBOp[]) {
    for (const op of ops) {
      if (op.type === 'put') {
        if (!op.value) {
          throw new Error('Invalid batch db operation')
        }
        this.put(op.key, op.value)
      } else if (op.type === 'del') {
        this.del(op.key)
      }
    }
  }

  /**
   * Checks if a given root exists.
   */
  checkRoot(root: Buffer): boolean {
    const value = this._lookupNode(root)
    return !!value
  }
}
