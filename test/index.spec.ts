const Buffer = require('buffer').Buffer // needed for karma

import * as tape from 'tape'
import * as rlp from 'rlp'
import { KECCAK256_NULL } from 'ethereumjs-util'
import { CheckpointTrie } from '../src'

tape('simple save and retrive', function (tester) {
  const it = tester.test

  it('should not crash if given a non-existant root', function (t) {
    const root = Buffer.from(
      '3f4399b08efe68945c1cf90ffe85bbe3ce978959da753f9e649f034015b8817d',
      'hex',
    )
    const trie = new CheckpointTrie(null, root)
    const value = trie.get(Buffer.from('test'))
    t.equal(value, null)
    t.end()
  })

  const trie = new CheckpointTrie()

  it('save a value', function (t) {
    trie.put(Buffer.from('test'), Buffer.from('one'))
    t.end()
  })

  it('should get a value', function (t) {
    const value = trie.get(Buffer.from('test'))
    t.equal(value!.toString(), 'one')
    t.end()
  })

  it('should update a value', function (t) {
    trie.put(Buffer.from('test'), Buffer.from('two'))
    const value = trie.get(Buffer.from('test'))
    t.equal(value!.toString(), 'two')
    t.end()
  })

  it('should delete a value', function (t) {
    trie.del(Buffer.from('test'))
    const value = trie.get(Buffer.from('test'))
    t.notok(value)
    t.end()
  })

  it('should recreate a value', function (t) {
    trie.put(Buffer.from('test'), Buffer.from('one'))
    t.end()
  })

  it('should get updated a value', function (t) {
    const value = trie.get(Buffer.from('test'))
    t.equal(value!.toString(), 'one')
    t.end()
  })

  it('should create a branch here', function (t) {
    trie.put(Buffer.from('doge'), Buffer.from('coin'))
    t.equal(
      'de8a34a8c1d558682eae1528b47523a483dd8685d6db14b291451a66066bf0fc',
      trie.root.toString('hex'),
    )
    t.end()
  })

  it('should get a value that is in a branch', function (t) {
    const value = trie.get(Buffer.from('doge'))
    t.equal(value!.toString(), 'coin')
    t.end()
  })

  it('should delete from a branch', function (t) {
    trie.del(Buffer.from('doge'))
    const value = trie.get(Buffer.from('doge'))
    t.equal(value, null)
    t.end()
  })

  tape('storing longer values', function (tester) {
    const it = tester.test
    const trie = new CheckpointTrie()
    const longString = 'this will be a really really really long value'
    const longStringRoot = 'b173e2db29e79c78963cff5196f8a983fbe0171388972106b114ef7f5c24dfa3'

    it('should store a longer string', function (t) {
      trie.put(Buffer.from('done'), Buffer.from(longString))
      trie.put(Buffer.from('doge'), Buffer.from('coin'))
      t.equal(longStringRoot, trie.root.toString('hex'))
      t.end()
    })

    it('should retreive a longer value', function (t) {
      const value = trie.get(Buffer.from('done'))
      t.equal(value!.toString(), longString)
      t.end()
    })

    it('should when being modiefied delete the old value', function (t) {
      trie.put(Buffer.from('done'), Buffer.from('test'))
      t.end()
    })
  })

  tape('testing extensions and branches', function (tester) {
    const it = tester.test
    const trie = new CheckpointTrie()

    it('should store a value', function (t) {
      trie.put(Buffer.from('doge'), Buffer.from('coin'))
      t.end()
    })

    it('should create extension to store this value', function (t) {
      trie.put(Buffer.from('do'), Buffer.from('verb'))
      t.equal(
        'f803dfcb7e8f1afd45e88eedb4699a7138d6c07b71243d9ae9bff720c99925f9',
        trie.root.toString('hex'),
      )
      t.end()
    })

    it('should store this value under the extension', function (t) {
      trie.put(Buffer.from('done'), Buffer.from('finished'))
      t.equal(
        '409cff4d820b394ed3fb1cd4497bdd19ffa68d30ae34157337a7043c94a3e8cb',
        trie.root.toString('hex'),
      )
      t.end()
    })
  })

  tape('testing extensions and branches - reverse', function (tester) {
    const it = tester.test
    const trie = new CheckpointTrie()

    it('should create extension to store this value', function (t) {
      trie.put(Buffer.from('do'), Buffer.from('verb'))
      t.end()
    })

    it('should store a value', function (t) {
      trie.put(Buffer.from('doge'), Buffer.from('coin'))
      t.end()
    })

    it('should store this value under the extension', function (t) {
      trie.put(Buffer.from('done'), Buffer.from('finished'))
      t.equal(
        '409cff4d820b394ed3fb1cd4497bdd19ffa68d30ae34157337a7043c94a3e8cb',
        trie.root.toString('hex'),
      )
      t.end()
    })
  })
})

tape('testing deletion cases', function (tester) {
  const it = tester.test
  const trie = new CheckpointTrie()

  it('should delete from a branch->branch-branch', function (t) {
    trie.put(Buffer.from([11, 11, 11]), Buffer.from('first'))
    trie.put(Buffer.from([12, 22, 22]), Buffer.from('create the first branch'))
    trie.put(Buffer.from([12, 34, 44]), Buffer.from('create the last branch'))

    trie.del(Buffer.from([12, 22, 22]))
    const val = trie.get(Buffer.from([12, 22, 22]))
    t.equal(null, val)
    t.end()
  })

  it('should delete from a branch->branch-extension', function (t) {
    trie.put(Buffer.from([11, 11, 11]), Buffer.from('first'))
    trie.put(Buffer.from([12, 22, 22]), Buffer.from('create the first branch'))
    trie.put(Buffer.from([12, 33, 33]), Buffer.from('create the middle branch'))
    trie.put(Buffer.from([12, 34, 44]), Buffer.from('create the last branch'))

    trie.del(Buffer.from([12, 22, 22]))
    const val = trie.get(Buffer.from([12, 22, 22]))
    t.equal(null, val)
    t.end()
  })

  it('should delete from a extension->branch-extension', function (t) {
    trie.put(Buffer.from([11, 11, 11]), Buffer.from('first'))
    trie.put(Buffer.from([12, 22, 22]), Buffer.from('create the first branch'))
    trie.put(Buffer.from([12, 33, 33]), Buffer.from('create the middle branch'))
    trie.put(Buffer.from([12, 34, 44]), Buffer.from('create the last branch'))

    // delete the middle branch
    trie.del(Buffer.from([11, 11, 11]))
    const val = trie.get(Buffer.from([11, 11, 11]))
    t.equal(null, val)
    t.end()
  })

  it('should delete from a extension->branch-branch', function (t) {
    trie.put(Buffer.from([11, 11, 11]), Buffer.from('first'))
    trie.put(Buffer.from([12, 22, 22]), Buffer.from('create the first branch'))
    trie.put(Buffer.from([12, 33, 33]), Buffer.from('create the middle branch'))
    trie.put(Buffer.from([12, 34, 44]), Buffer.from('create the last branch'))
    // delete the middle branch
    trie.del(Buffer.from([11, 11, 11]))
    const val = trie.get(Buffer.from([11, 11, 11]))
    t.equal(null, val)
    t.end()
  })
})

tape('it should create the genesis state root from ethereum', function (tester) {
  const it = tester.test
  const trie4 = new CheckpointTrie()

  const g = Buffer.from('8a40bfaa73256b60764c1bf40675a99083efb075', 'hex')
  const j = Buffer.from('e6716f9544a56c530d868e4bfbacb172315bdead', 'hex')
  const v = Buffer.from('1e12515ce3e0f817a4ddef9ca55788a1d66bd2df', 'hex')
  const a = Buffer.from('1a26338f0d905e295fccb71fa9ea849ffa12aaf4', 'hex')

  let stateRoot = Buffer.alloc(32)
  stateRoot.fill(0)

  let startAmount = Buffer.alloc(26)
  startAmount.fill(0)
  startAmount[0] = 1

  const account = [startAmount, 0, stateRoot, KECCAK256_NULL]
  const rlpAccount = rlp.encode(account)
  const cppRlp =
    'f85e9a010000000000000000000000000000000000000000000000000080a00000000000000000000000000000000000000000000000000000000000000000a0c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470'

  const genesisStateRoot = '2f4399b08efe68945c1cf90ffe85bbe3ce978959da753f9e649f034015b8817d'
  tester.equal(cppRlp, rlpAccount.toString('hex'))

  it('shall match the root', function (t) {
    trie4.put(g, rlpAccount)
    trie4.put(j, rlpAccount)
    trie4.put(v, rlpAccount)
    trie4.put(a, rlpAccount)
    t.equal(trie4.root.toString('hex'), genesisStateRoot)
    t.end()
  })
})
