const util = require('util')
const assert = require('assert')
const level = require('level-mem')
const async = require('async')
const rlp = require('rlp')
const ethUtil = require('ethereumjs-util')
const semaphore = require('semaphore')
const ReadStream = require('./readStream')
const PrioritizedTaskExecutor = require('./prioritizedTaskExecutor')
const { callTogether, asyncFirstSeries } = require('./util/async')
const { bufferToNibbles, stringToNibbles, matchingNibbleLength, doKeysMatch, consumeCommonPrefix } = require('./util/nibbles')
const { decodeNode, nodeRefEq, NODE_TYPE_NULL, NODE_TYPE_BRANCH,
  NODE_TYPE_EXTENSION, NODE_TYPE_LEAF, NULL_NODE,
  BranchNode, ExtensionNode, LeafNode
} = require('./node')

/**
 * Use `require('merkel-patricia-tree')` for the base interface. In Ethereum applications stick with the Secure Trie Overlay `require('merkel-patricia-tree/secure')`. The API for the raw and the secure interface are about the same
 * @class Trie
 * @public
 * @param {Object} [db] An instance of [levelup](https://github.com/rvagg/node-levelup/) or a compatible API. If the db is `null` or left undefined, then the trie will be stored in memory via [memdown](https://github.com/rvagg/memdown)
 * @param {Buffer|String} [root] A hex `String` or `Buffer` for the root of a previously stored trie
 * @prop {Buffer} root The current root of the `trie`
 * @prop {Boolean} isCheckpoint  determines if you are saving to a checkpoint or directly to the db
 * @prop {Buffer} EMPTY_TRIE_ROOT the Root for an empty trie
 */
module.exports = class Trie {
  constructor (db, root) {
    this.EMPTY_TRIE_ROOT = ethUtil.KECCAK256_RLP
    this.sem = semaphore(1)

    // setup dbs
    this.db = db || level()

    this._getDBs = [this.db]
    this._putDBs = [this.db]

    this.root = root

    this.putRaw = this._putRaw
    this.putRawP = util.promisify(this.putRaw)
    this.getRawP = util.promisify(this.getRaw)
  }

  get root () {
    return this._root
  }

  set root (v) {
    if (v) {
      v = ethUtil.toBuffer(v)
      assert(v.length === 32, 'Invalid root length. Roots are 32 bytes')
    } else {
      v = this.EMPTY_TRIE_ROOT
    }

    this._root = v
  }

  /**
   * Gets a value given a `key`
   * @method get
   * @memberof Trie
   * @param {Buffer|String} key - the key to search for
   * @param {Function} cb A callback `Function` which is given the arguments `err` - for errors that may have occured and `value` - the found value in a `Buffer` or if no value was found `null`
   */
  async get (key, cb) {
    key = ethUtil.toBuffer(key)
    key = bufferToNibbles(key)

    const rootNode = await this._getNode(this.root)

    let v = await this._get(rootNode, key)

    if (v.length === 0) {
      v = null
    }

    if (typeof cb !== 'undefined') {
      return cb(null, v)
    }

    return v
    // async.nextTick(cb, v)
  }

  async _get (node, key) {
    const type = node.type()
    if (type === NODE_TYPE_NULL) {
      return NULL_NODE.value()
    } else if (type === NODE_TYPE_BRANCH) {
      if (key.length === 0) {
        return node.value()
      }

      const nextNode = await this._getNode(node.nextNode(key[0]))
      return this._get(nextNode, key.slice(1))
    } else if (type === NODE_TYPE_EXTENSION) {
      const curKey = node.nibbles()
      if (matchingNibbleLength(key, curKey) === 0) {
        return NULL_NODE.value()
      }

      const nextNode = await this._getNode(node.value())
      return this._get(nextNode, key.slice(curKey.length))
    } else if (type === NODE_TYPE_LEAF) {
      const curKey = node.nibbles()
      if (doKeysMatch(key, curKey)) {
        return node.value()
      }

      return NULL_NODE.value()
    } else {
      throw new Error('Invalid node type')
    }
  }

  async put (key, value, cb) {
    if (value === null || typeof value === 'undefined') {
      return this.del(key)
    }

    key = ethUtil.toBuffer(key)
    value = ethUtil.toBuffer(value)

    key = bufferToNibbles(key)
    const rootNode = await this._getNode(this.root)

    const newNode = await this._put(rootNode, key, value)
    this.root = newNode.hash()
    if (this.root !== this.EMPTY_TRIE_ROOT) {
      this._persistRootNode(newNode)
    }

    if (typeof cb !== 'undefined') {
      process.nextTick(cb)
    }
  }

  async _persistRootNode(node) {
    const k = node.hash()
    const v = node.serialize()
    await this.putRawP(k, v)
  }

  async _put (node, key, value) {
    const type = node.type()
    if (type === NODE_TYPE_NULL) {
      return new LeafNode(key, value)
    } else if (type === NODE_TYPE_BRANCH) {
      if (key.length === 0) {
        node.setValue(value)
      } else {
        const nextNode = await this._getNode(node.nextNode(key[0]))
        const newNode = await this._put(nextNode, key.slice(1), value)
        const newNodeRef = await this._persistNode(newNode)
        node.setBranch(key[0], newNodeRef)
      }
      return node
    } else if (type === NODE_TYPE_EXTENSION) {
      return this._putExtension(node, key, value)
    } else if (type === NODE_TYPE_LEAF) {
      return this._putLeaf(node, key, value)
    } else {
      throw new Error('Invalid node type')
    }
  }

  async _putExtension (node, key, value) {
    const curKey = node.nibbles()
    const [commonPrefix, keyRemainder, curKeyRemainder] = consumeCommonPrefix(key, curKey)
    let newNode
    if (keyRemainder.length === 0 && curKeyRemainder.length === 0) {
      const nextNode = await this._getNode(node.value())
      newNode = await this._put(nextNode, keyRemainder, value)
    } else if (curKeyRemainder.length === 0) {
      const nextNode = await this._getNode(node.value())
      newNode = await this._put(nextNode, keyRemainder, value)
    } else {
      newNode = new BranchNode()
      if (curKeyRemainder.length === 1) {
        newNode.setBranch(curKeyRemainder[0], node.value())
      } else {
        const otherNode = new ExtensionNode(curKeyRemainder.slice(1), node.value())
        const otherNodeRef = await this._persistNode(otherNode)
        newNode.setBranch(curKeyRemainder[0], otherNodeRef)
      }

      if (keyRemainder.length > 0) {
        const finalNode = new LeafNode(keyRemainder.slice(1), value)
        const finalNodeRef = await this._persistNode(finalNode)
        newNode.setBranch(keyRemainder[0], finalNodeRef)
      } else {
        newNode.setValue(value)
      }
    }

    if (commonPrefix.length > 0) {
      const newNodeRef = await this._persistNode(newNode)
      return new ExtensionNode(commonPrefix, newNodeRef)
    } else {
      return newNode
    }
  }

  async _putLeaf (node, key, value) {
    const curKey = node.nibbles()
    const [commonPrefix, keyRemainder, curKeyRemainder] = consumeCommonPrefix(key, curKey)
    let newNode
    if (keyRemainder.length === 0 && curKeyRemainder.length === 0) {
      node.setValue(value)
      return node
    } else if (curKeyRemainder.length === 0) {
      const nextNode = new LeafNode(keyRemainder.slice(1), value)
      const nextNodeRef = await this._persistNode(nextNode)
      newNode = new BranchNode()
      newNode.setValue(node.value())
      newNode.setBranch(keyRemainder[0], nextNodeRef)
    } else {
      newNode = new BranchNode()
      const otherNode = new LeafNode(curKeyRemainder.slice(1), node.value())
      const otherNodeRef = await this._persistNode(otherNode)
      newNode.setBranch(curKeyRemainder[0], otherNodeRef)

      if (keyRemainder.length > 0) {
        const finalNode = new LeafNode(keyRemainder.slice(1), value)
        const finalNodeRef = await this._persistNode(finalNode)
        newNode.setBranch(keyRemainder[0], finalNodeRef)
      } else {
        newNode.setValue(value)
      }
    }

    if (commonPrefix.length > 0) {
      const newNodeRef = await this._persistNode(newNode)
      return new ExtensionNode(commonPrefix, newNodeRef)
    } else {
      return newNode
    }
  }

  async del (key, cb) {
    key = ethUtil.toBuffer(key)
    key = bufferToNibbles(key)

    const rootNode = await this._getNode(this.root)

    const newNode = await this._del(rootNode, key)
    this.root = newNode.hash()
    if (this.root !== this.EMPTY_TRIE_ROOT) {
      this._persistNode(newNode)
    }

    if (typeof cb !== 'undefined') {
      cb()
    }
  }

  async _del (node, key) {
    const type = node.type()

    if (type === NODE_TYPE_NULL) {
      return NULL_NODE
    } else if (type === NODE_TYPE_BRANCH) {
      if (key.length === 0) {
        node.setValue(NULL_NODE.value())
        return this._normalizeBranchNode(node)
      }

      const nodeToDelete = await this._getNode(node.nextNode(key[0]))
      const nextNode = await this._del(nodeToDelete, key.slice(1))
      const nextNodeRef = await this._persistNode(nextNode)

      if (nodeRefEq(nextNodeRef, node.nextNode(key[0]))) {
        return node
      }

      node.setBranch(key[0], nextNodeRef)
      if (nextNodeRef.length === 0) {
        return this._normalizeBranchNode(node)
      }

      return node
    } else if (type === NODE_TYPE_EXTENSION) {
      const curKey = node.nibbles()
      if (matchingNibbleLength(key, curKey) === 0) {
        return node
      }

      const nextNode = await this._getNode(node.value())
      const newNextNode = await this._del(nextNode, key.slice(curKey.length))
      const newNextNodeRef = await this._persistNode(newNextNode)

      if (nodeRefEq(newNextNodeRef, node.value())) {
        return node
      }

      if (newNextNode.type() === NODE_TYPE_NULL) {
        return NULL_NODE
      } else if (newNextNode.type() === NODE_TYPE_BRANCH) {
        return new ExtensionNode(curKey, newNextNode.hash())
      } else if (newNextNode.type() === NODE_TYPE_EXTENSION) {
        return new ExtensionNode([...curKey, ...newNextNode.nibbles()], newNextNode.value())
      } else if (newNextNode.type() === NODE_TYPE_LEAF) {
        return new LeafNode([...curKey, ...newNextNode.nibbles()], newNextNode.value())
      } else {
        throw new Error('Invalid node type')
      }
    } else if (type === NODE_TYPE_LEAF) {
      const curKey = node.nibbles()
      if (doKeysMatch(key, curKey)) {
        return NULL_NODE
      }

      return node
    } else {
      throw new Error('Invalid node type')
    }
  }

  async _normalizeBranchNode (node) {
    if (node.branchCount() > 1) {
      return node
    }

    if (node.value().length > 0) {
      return new LeafNode([], node.value())
    }

    let [nextIdx, nextRef] = node.getNextBranch()
    if (nextRef === null) {
      throw new Error('Branch node has no non-null branch')
    }

    const nextNode = await this._getNode(nextRef)
    const nextNodeType = nextNode.type()

    if (nextNodeType === NODE_TYPE_EXTENSION) {
      return new ExtensionNode([nextIdx, ...nextNode.nibbles()], nextNode.value())
    } else if (nextNodeType === NODE_TYPE_LEAF) {
      return new LeafNode([nextIdx, ...nextNode.nibbles()], nextNode.value())
    } else if (nextNodeType === NODE_TYPE_BRANCH) {
      const nextNodeRef = await this._persistNode(nextNode)
      return new ExtensionNode([nextIdx], nextNodeRef)
    } else {
      throw new Error('Invalid node type')
    }
  }

  async _getNode (hash) {
    if (hash === NULL_NODE.hash() || hash.length === 0) {
      return NULL_NODE
    }

    let encoded
    if (hash.length < 32) {
      encoded = hash
    } else {
      try {
        encoded = await this.getRawP(hash)
        if (typeof encoded === 'undefined') {
          throw new Error('Node not in db')
        }
      } catch (err) {
        throw err
      }
    }

    return decodeNode(encoded)
  }

  async _persistNode (node) {
    const v = node.serialize()
    if (v.length < 32) {
      return node.raw()
    }

    const k = node.hash()
    await this.putRawP(k, v)

    return k
  }

  /**
   * Retrieves a raw value in the underlying db
   * @method getRaw
   * @memberof Trie
   * @param {Buffer} key
   * @param {Function} callback A callback `Function`, which is given the arguments `err` - for errors that may have occured and `value` - the found value in a `Buffer` or if no value was found `null`.
   */
  getRaw (key, cb) {
    key = ethUtil.toBuffer(key)

    function dbGet (db, cb2) {
      db.get(key, {
        keyEncoding: 'binary',
        valueEncoding: 'binary'
      }, (err, foundNode) => {
        if (err || !foundNode) {
          cb2(null, null)
        } else {
          cb2(null, foundNode)
        }
      })
    }

    asyncFirstSeries(this._getDBs, dbGet, cb)
  }

  /**
   * Writes a value directly to the underlining db
   * @method putRaw
   * @memberof Trie
   * @param {Buffer|String} key The key as a `Buffer` or `String`
   * @param {Buffer} value The value to be stored
   * @param {Function} callback A callback `Function`, which is given the argument `err` - for errors that may have occured
   */
  // TODO: remove the proxy method when changing the caching
  _putRaw (key, val, cb) {
    function dbPut (db, cb2) {
      db.put(key, val, {
        keyEncoding: 'binary',
        valueEncoding: 'binary'
      }, cb2)
    }

    async.each(this._putDBs, dbPut, cb)
  }

  /**
   * Removes a raw value in the underlying db
   * @method delRaw
   * @memberof Trie
   * @param {Buffer|String} key
   * @param {Function} callback A callback `Function`, which is given the argument `err` - for errors that may have occured
   */
  delRaw (key, cb) {
    function del (db, cb2) {
      db.del(key, {
        keyEncoding: 'binary'
      }, cb2)
    }

    async.each(this._putDBs, del, cb)
  }
}
