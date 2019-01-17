const rlp = require('rlp')
const ethUtil = require('ethereumjs-util')
const { stringToNibbles, nibblesToBuffer } = require('./util/nibbles')
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
  
  v = rlp.decode(v)

  if (v.length === 17) {

  } else if (v.length === 2) {
    return new LeafNode(v[0], v[1])
  }

  console.log(v)
}

class Node {
  serialize () {
    return rlp.encode(this.raw)
  }

  hash () {
    return ethUtil.keccak256(this.serialize())
  }
}

class NullNode extends Node {
  type () {
    return NODE_TYPE_NULL
  }

  value () {
    return Buffer.from([])
  }

  serialize () {
    return Buffer.from([])
  }

  hash () {
    return ethUtil.KECCAK256_RLP
  }
}

class BranchNode extends Node {
  type () {
    return NODE_TYPE_BRANCH
  }

  serialize () {
  }
}

class ExtensionNode extends Node {
  type () {
    return NODE_TYPE_EXTENSION
  }

  serialize () {
  }
}

class LeafNode extends Node {
  constructor (key, value) {
    super()
    this._key = key
    this._value = value
  }

  static encodeKey (key) {
    return addHexPrefix(key, true)
  }

  type () {
    return NODE_TYPE_LEAF
  }

  value () {
    return this._value
  }

  serialize () {
    return rlp.encode([this._key, this._value])
  }
}

module.exports = class TrieNode {
  constructor (type, key, value) {
    if (Array.isArray(type)) {
      // parse raw node
      this.parseNode(type)
    } else {
      this.type = type
      if (type === 'branch') {
        var values = key
        this.raw = Array.apply(null, Array(17))
        if (values) {
          values.forEach(function (keyVal) {
            this.set.apply(this, keyVal)
          })
        }
      } else {
        this.raw = Array(2)
        this.setValue(value)
        this.setKey(key)
      }
    }
  }

  /**
   * Determines the node type.
   * @private
   * @returns {String} - the node type
   *   - leaf - if the node is a leaf
   *   - branch - if the node is a branch
   *   - extention - if the node is an extention
   *   - unknown - if something else got borked
   */
  static getNodeType (node) {
    if (node.length === 17) {
      return 'branch'
    } else if (node.length === 2) {
      var key = stringToNibbles(node[0])
      if (isTerminator(key)) {
        return 'leaf'
      }

      return 'extention'
    }
  }

  static isRawNode (node) {
    return Array.isArray(node) && !Buffer.isBuffer(node)
  }

  get value () {
    return this.getValue()
  }

  set value (v) {
    this.setValue(v)
  }

  get key () {
    return this.getKey()
  }

  set key (k) {
    this.setKey(k)
  }

  parseNode (rawNode) {
    this.raw = rawNode
    this.type = TrieNode.getNodeType(rawNode)
  }

  setValue (key, value) {
    if (this.type !== 'branch') {
      this.raw[1] = key
    } else {
      if (arguments.length === 1) {
        value = key
        key = 16
      }
      this.raw[key] = value
    }
  }

  getValue (key) {
    if (this.type === 'branch') {
      if (arguments.length === 0) {
        key = 16
      }

      var val = this.raw[key]
      if (val !== null && val !== undefined && val.length !== 0) {
        return val
      }
    } else {
      return this.raw[1]
    }
  }

  setKey (key) {
    if (this.type !== 'branch') {
      if (Buffer.isBuffer(key)) {
        key = stringToNibbles(key)
      } else {
        key = key.slice(0) // copy the key
      }

      key = addHexPrefix(key, this.type === 'leaf')
      this.raw[0] = nibblesToBuffer(key)
    }
  }

  getKey () {
    if (this.type !== 'branch') {
      var key = this.raw[0]
      key = removeHexPrefix(stringToNibbles(key))
      return (key)
    }
  }

  serialize () {
    return rlp.encode(this.raw)
  }

  hash () {
    return ethUtil.keccak256(this.serialize())
  }

  toString () {
    var out = this.type
    out += ': ['
    this.raw.forEach(function (el) {
      if (Buffer.isBuffer(el)) {
        out += el.toString('hex') + ', '
      } else if (el) {
        out += 'object, '
      } else {
        out += 'empty, '
      }
    })
    out = out.slice(0, -2)
    out += ']'
    return out
  }

  getChildren () {
    var children = []
    switch (this.type) {
      case 'leaf':
        // no children
        break
      case 'extention':
        // one child
        children.push([this.key, this.getValue()])
        break
      case 'branch':
        for (var index = 0, end = 16; index < end; index++) {
          var value = this.getValue(index)
          if (value) {
            children.push([
              [index], value
            ])
          }
        }
        break
    }
    return children
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
  decodeNode
}
