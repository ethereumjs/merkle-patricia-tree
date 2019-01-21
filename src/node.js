const rlp = require('rlp')
const ethUtil = require('ethereumjs-util')
const { bufferToNibbles, stringToNibbles, nibblesToBuffer } = require('./util/nibbles')
const { isTerminator, addHexPrefix, removeHexPrefix } = require('./util/hex')

const NODE_TYPE_NULL = 'null'
const NODE_TYPE_BRANCH = 'branch'
const NODE_TYPE_EXTENSION = 'extention'
const NODE_TYPE_LEAF = 'leaf'

/**
 * Returns node instance given encoded RLP value.
 */
function decodeNode (v) {
  if (v.length === 0) {
    return NULL_NODE
  }

  if (!(v instanceof Array)) {
    v = rlp.decode(v)
  }

  if (v.length === 17) {
    return BranchNode.fromArray(v)
  } else if (v.length === 2) {
    const key = bufferToNibbles(v[0])
    if (isTerminator(key)) {
      return new LeafNode(LeafNode.decodeKey(key), v[1])
    }

    return new ExtensionNode(ExtensionNode.decodeKey(key), v[1])
  }
}

function nodeRefEq (r1, r2) {
  if (typeof r1 !== typeof r2) return false
  if (r1.length !== r2.length) return false

  if (Buffer.isBuffer(r1) && Buffer.isBuffer(r2)) {
    return r1.equals(r2)
  } else if (Array.isArray(r1) && Array.isArray(r2)) {
    for (let i in r1) {
      if (r1[i] !== r2[i]) {
        return false
      }
    }
    return true
  }

  return false
}

class Node {
  value () {
    return this._value
  }

  setValue (v) {
    this._value = v
  }

  hash () {
    return ethUtil.keccak256(this.serialize())
  }
}

class NullNode extends Node {
  constructor () {
    super()
    this._value = Buffer.from([])
  }

  type () {
    return NODE_TYPE_NULL
  }

  serialize () {
    return Buffer.from([])
  }

  raw () {
    return this._value
  }

  hash () {
    return ethUtil.KECCAK256_RLP
  }
}

class BranchNode extends Node {
  constructor () {
    super()
    this._branches = Array.apply(null, Array(16)) //Array(16).fill(Buffer.from([]))
    this._value = null //Buffer.from([])
  }

  static fromArray (arr) {
    const node = new BranchNode()
    node._branches = arr.slice(0, 16)
    node._value = arr[16]
    return node
  }

  type () {
    return NODE_TYPE_BRANCH
  }

  setBranch (i, v) {
    this._branches[i] = v
  }

  raw () {
    return [...this._branches, this._value]
  }

  serialize () {
    return rlp.encode(this.raw())
  }

  nextNode (i) {
    return this._branches[i]
  }

  branchCount () {
    let c = 0
    for (let i in this._branches) {
      let b = this._branches[i]
      if (typeof b !== 'undefined' && b !== null && b.length > 0) {
        c++
      }
    }

    return c
  }

  getNextBranch () {
    for (let i in this._branches) {
      i = parseInt(i)
      let b = this._branches[i]
      if (typeof b !== 'undefined' && b !== null && b.length > 0) {
        return [i, b]
      }
    }

    return [0, null]
  }
}

class ExtensionNode extends Node {
  constructor (nibbles, value) {
    super()
    this._nibbles = nibbles
    this._value = value
  }

  static encodeKey (key) {
    return addHexPrefix(key, false)
  }

  static decodeKey (key) {
    return removeHexPrefix(key)
  }

  type () {
    return NODE_TYPE_EXTENSION
  }

  nibbles () {
    return this._nibbles
  }

  encodedKey () {
    return ExtensionNode.encodeKey(this._nibbles)
  }

  raw () {
    return [nibblesToBuffer(this.encodedKey()), this._value]
  }

  serialize () {
    return rlp.encode(this.raw())
  }
}

class LeafNode extends Node {
  constructor (nibbles, value) {
    super()
    this._nibbles = nibbles
    this._value = value
  }

  static encodeKey (key) {
    return addHexPrefix(key, true)
  }

  static decodeKey (encodedKey) {
    return removeHexPrefix(encodedKey)
  }

  type () {
    return NODE_TYPE_LEAF
  }

  nibbles () {
    return this._nibbles
  }

  encodedKey () {
    return LeafNode.encodeKey(this._nibbles)
  }

  raw () {
    return [nibblesToBuffer(this.encodedKey()), this._value]
  }

  serialize () {
    return rlp.encode(this.raw())
  }
}

const NULL_NODE = new NullNode()

module.exports = {
  NODE_TYPE_NULL,
  NODE_TYPE_BRANCH,
  NODE_TYPE_EXTENSION,
  NODE_TYPE_LEAF,
  NULL_NODE,
  NullNode,
  BranchNode,
  ExtensionNode,
  LeafNode,
  decodeNode,
  nodeRefEq
}
