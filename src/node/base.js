const ethUtil = require('ethereumjs-util')

module.exports = class Node {
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
