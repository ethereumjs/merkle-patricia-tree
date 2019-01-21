const ethUtil = require('ethereumjs-util')
const Node = require('./base')

const NODE_TYPE_NULL = 'null'

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

module.exports = {
  NullNode,
  NODE_TYPE_NULL
}
