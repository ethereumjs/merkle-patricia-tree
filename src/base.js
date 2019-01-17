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
const { decodeNode, NODE_TYPE_NULL, NODE_TYPE_BRANCH,
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
    console.log('get root', this.root, rootNode)

    const v = await this._get(rootNode, key)
    return v
    // async.nextTick(cb, v)
  }

  async _get (node, key) {
    console.log('_get', node, key)
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
      console.log(nextNode)
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
    key = ethUtil.toBuffer(key)
    value = ethUtil.toBuffer(value)

    key = bufferToNibbles(key)
    const rootNode = await this._getNode(this.root)

    const newNode = await this._put(rootNode, key, value)
    this.root = newNode.hash()
    if (this.root !== this.EMPTY_TRIE_ROOT) {
      console.log('put setting root', this.root)
      this._persistNode(newNode)
    }
  }

  async _put (node, key, value) {
    console.log('_put', node, key, value)
    const type = node.type()
    if (type === NODE_TYPE_NULL) {
      return new LeafNode(key, value)
    } else if (type === NODE_TYPE_BRANCH) {
      if (key.length === 0) {
        node.value = value
      } else {
        const nextNode = await this._getNode(node.nextNode(key[0]))
        const newNode = await this._put(nextNode, key.slice(1), value)
        await this._persistNode(newNode)
        node.setBranch(key[0], newNode.hash())
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
    console.log(commonPrefix, keyRemainder, curKeyRemainder)
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
        await this._persistNode(otherNode)
        newNode.setBranch(curKeyRemainder[0], otherNode.hash())
      }

      if (keyRemainder.length > 0) {
        const finalNode = new LeafNode(keyRemainder.slice(1), value)
        await this._persistNode(finalNode)
        newNode.setBranch(keyRemainder[0], finalNode.hash())
      } else {
        newNode.setValue(value)
      }
    }

    if (commonPrefix.length > 0) {
      await this._persistNode(newNode)
      return new ExtensionNode(commonPrefix, newNode.hash())
    } else {
      return newNode
    }
  }

  async _putLeaf (node, key, value) {
    console.log('_putLeaf', node, key, value)
    const curKey = node.nibbles()
    const [commonPrefix, keyRemainder, curKeyRemainder] = consumeCommonPrefix(key, curKey)
    console.log(commonPrefix, keyRemainder, curKeyRemainder)
    let newNode
    if (keyRemainder.length === 0 && curKeyRemainder.length === 0) {
      node.setValue(value)
      return node
    } else if (curKeyRemainder.length === 0) {
      const nextNode = new LeafNode(keyRemainder.slice(1), value)
      await this._persistNode(nextNode)
      newNode = new BranchNode()
      newNode.setValue(node.value())
      newNode.setBranch(keyRemainder[0], nextNode.hash())
    } else {
      newNode = new BranchNode()
      const otherNode = new LeafNode(curKeyRemainder.slice(1), node.value())
      await this._persistNode(otherNode)
      newNode.setBranch(curKeyRemainder[0], otherNode.hash())

      if (keyRemainder) {
        const finalNode = new LeafNode(keyRemainder.slice(1), value)
        await this._persistNode(finalNode)
        newNode.setBranch(keyRemainder[0], finalNode.hash())
      } else {
        newNode.value = value
      }
    }

    if (commonPrefix) {
      await this._persistNode(newNode)
      return new ExtensionNode(commonPrefix, newNode.hash())
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
  }

  async _del (node, key) {
    const type = node.type()

    if (type === NODE_TYPE_NULL) {
      return NULL_NODE
    } else if (type === NODE_TYPE_BRANCH) {
    } else if (type === NODE_TYPE_EXTENSION) {
    } else if (type === NODE_TYPE_LEAF) {
      return NULL_NODE
    } else {
      throw new Error('Invalid node type')
    }
  }

  async _getNode (hash) {
    console.log('_getNode', hash)
    if (hash === NULL_NODE.hash()) {
      return NULL_NODE
    }

    try {
      const v = await this.getRawP(hash)
      if (typeof v === 'undefined') {
        throw new Error('Node not in db')
      }
      const node = decodeNode(v)
      return node
    } catch (err) {
      throw err
    }
  }

  async _persistNode (node) {
    const k = node.hash()
    const v = node.serialize()
    console.log('persist', node, k, v)
    await this.putRawP(k, v)
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
