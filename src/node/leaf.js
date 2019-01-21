const rlp = require('rlp')
const Node = require('./base')
const { nibblesToBuffer } = require('../util/nibbles')
const { addHexPrefix, removeHexPrefix } = require('../util/hex')

const NODE_TYPE_LEAF = 'leaf'

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

module.exports = {
  LeafNode,
  NODE_TYPE_LEAF
}
