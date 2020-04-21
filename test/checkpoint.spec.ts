import * as tape from 'tape'
import { CheckpointTrie } from '../src'

tape('testing checkpoints', function (tester) {
  const it = tester.test

  let trie: CheckpointTrie
  let trieCopy: CheckpointTrie
  let preRoot: String
  let postRoot: String

  it('setup', function (t) {
    trie = new CheckpointTrie()
    trie.put(Buffer.from('do'), Buffer.from('verb'))
    trie.put(Buffer.from('doge'), Buffer.from('coin'))
    preRoot = trie.root.toString('hex')
    t.end()
  })

  it('should copy trie and get value before checkpoint', function (t) {
    trieCopy = trie.copy()
    t.equal(trieCopy.root.toString('hex'), preRoot)
    const res = trieCopy.get(Buffer.from('do'))
    t.ok(Buffer.from('verb').equals(Buffer.from(res!)))
    t.end()
  })

  it('should create a checkpoint', function (t) {
    trie.checkpoint()
    t.ok(trie.isCheckpoint)
    t.end()
  })

  it('should save to the cache', function (t) {
    trie.put(Buffer.from('test'), Buffer.from('something'))
    trie.put(Buffer.from('love'), Buffer.from('emotion'))
    postRoot = trie.root.toString('hex')
    t.end()
  })

  it('should get values from before checkpoint', function (t) {
    const res = trie.get(Buffer.from('doge'))
    t.ok(Buffer.from('coin').equals(Buffer.from(res!)))
    t.end()
  })

  it('should get values from cache', function (t) {
    const res = trie.get(Buffer.from('love'))
    t.ok(Buffer.from('emotion').equals(Buffer.from(res!)))
    t.end()
  })

  it('should copy trie and get upstream and cache values after checkpoint', function (t) {
    trieCopy = trie.copy()
    t.equal(trieCopy.root.toString('hex'), postRoot)
    t.equal(trieCopy._checkpoints.length, 1)
    t.ok(trieCopy.isCheckpoint)
    const res = trieCopy.get(Buffer.from('do'))
    t.ok(Buffer.from('verb').equals(Buffer.from(res!)))
    const res2 = trieCopy.get(Buffer.from('love'))
    t.ok(Buffer.from('emotion').equals(Buffer.from(res2!)))
    t.end()
  })

  it('should revert to the orginal root', function (t) {
    t.ok(trie.isCheckpoint)
    trie.revert()
    t.equal(trie.root.toString('hex'), preRoot)
    t.notOk(trie.isCheckpoint)
    t.end()
  })

  it('should not get values from cache after revert', function (t) {
    const res = trie.get(Buffer.from('love'))
    t.notOk(res)
    t.end()
  })

  it('should commit a checkpoint', function (t) {
    trie.checkpoint()
    trie.put(Buffer.from('test'), Buffer.from('something'))
    trie.put(Buffer.from('love'), Buffer.from('emotion'))
    trie.commit()
    t.equal(trie.isCheckpoint, false)
    t.equal(trie.root.toString('hex'), postRoot)
    t.end()
  })

  it('should get new values after commit', function (t) {
    const res = trie.get(Buffer.from('love'))
    t.ok(Buffer.from('emotion').equals(Buffer.from(res!)))
    t.end()
  })

  it('should commit a nested checkpoint', function (t) {
    trie.checkpoint()
    let root: Buffer
    trie.put(Buffer.from('test'), Buffer.from('something else'))
    root = trie.root
    trie.checkpoint()
    trie.put(Buffer.from('the feels'), Buffer.from('emotion'))
    trie.revert()
    trie.commit()
    t.equal(trie.isCheckpoint, false)
    t.equal(trie.root.toString('hex'), root.toString('hex'))
    t.end()
  })
})
