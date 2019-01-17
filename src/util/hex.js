/**
 * Prepends hex prefix to an array of nibbles.
 * @method addHexPrefix
 * @param {Array} Array of nibbles
 * @returns {Array} - returns buffer of encoded data
 **/
function addHexPrefix (key, terminator) {
  let res = key.slice()
  // odd
  if (res.length % 2) {
    res.unshift(1)
  } else {
    // even
    res.unshift(0)
    res.unshift(0)
  }

  if (terminator) {
    res[0] += 2
  }

  return res
}

/**
 * Removes hex prefix of an array of nibbles.
 * @method removeHexPrefix
 * @param {Array} Array of nibbles
 * @private
 */
function removeHexPrefix (val) {
  let res = val.slice()

  if (res[0] % 2) {
    res = res.slice(1)
  } else {
    res = res.slice(2)
  }

  return res
}

/**
 * Returns true if hexprefixed path is for a terminating (leaf) node.
 * @method isTerminator
 * @param {Array} key - an hexprefixed array of nibbles
 * @private
 */
function isTerminator (key) {
  return key[0] > 1
}

module.exports = {
  addHexPrefix,
  removeHexPrefix,
  isTerminator
}
