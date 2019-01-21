const rlp = require('rlp')
const Node = require('./base')

const NODE_TYPE_BRANCH = 'branch'

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

module.exports = {
  BranchNode,
  NODE_TYPE_BRANCH
}
