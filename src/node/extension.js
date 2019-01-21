const rlp = require('rlp')
const Node = require('./base')
const { nibblesToBuffer } = require('../util/nibbles')
const { addHexPrefix, removeHexPrefix } = require('../util/hex')

const NODE_TYPE_EXTENSION = 'extention'

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

module.exports = {
  ExtensionNode,
  NODE_TYPE_EXTENSION
}
