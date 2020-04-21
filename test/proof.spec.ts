import * as tape from 'tape'
import { CheckpointTrie } from '../src'

tape('simple merkle proofs generation and verification', function (tester) {
  const it = tester.test

  it('create a merkle proof and verify it', (t) => {
    const trie = new CheckpointTrie()

    trie.put(Buffer.from('key1aa'), Buffer.from('0123456789012345678901234567890123456789xx'))
    trie.put(Buffer.from('key2bb'), Buffer.from('aval2'))
    trie.put(Buffer.from('key3cc'), Buffer.from('aval3'))

    let proof = CheckpointTrie.prove(trie, Buffer.from('key2bb'))
    let val = CheckpointTrie.verifyProof(trie.root, Buffer.from('key2bb'), proof)
    t.equal(val!.toString('utf8'), 'aval2')

    proof = CheckpointTrie.prove(trie, Buffer.from('key1aa'))
    val = CheckpointTrie.verifyProof(trie.root, Buffer.from('key1aa'), proof)
    t.equal(val!.toString('utf8'), '0123456789012345678901234567890123456789xx')

    proof = CheckpointTrie.prove(trie, Buffer.from('key2bb'))
    val = CheckpointTrie.verifyProof(trie.root, Buffer.from('key2'), proof)
    // In this case, the proof _happens_ to contain enough nodes to prove `key2` because
    // traversing into `key22` would touch all the same nodes as traversing into `key2`
    t.equal(val, null, 'Expected value at a random key to be null')

    let myKey = Buffer.from('anyrandomkey')
    proof = CheckpointTrie.prove(trie, myKey)
    val = CheckpointTrie.verifyProof(trie.root, myKey, proof)
    t.equal(val, null, 'Expected value to be null')

    myKey = Buffer.from('anothergarbagekey') // should generate a valid proof of null
    proof = CheckpointTrie.prove(trie, myKey)
    proof.push(Buffer.from('123456')) // extra nodes are just ignored
    val = CheckpointTrie.verifyProof(trie.root, myKey, proof)
    t.equal(val, null, 'Expected value to be null')

    trie.put(Buffer.from('another'), Buffer.from('3498h4riuhgwe'))

    // to fail our proof we can request a proof for one key
    proof = CheckpointTrie.prove(trie, Buffer.from('another'))
    // and use that proof on another key
    const result = CheckpointTrie.verifyProof(trie.root, Buffer.from('key1aa'), proof)
    t.equal(result, null)
    t.end()
  })

  it('create a merkle proof and verify it with a single long key', (t) => {
    const trie = new CheckpointTrie()

    trie.put(Buffer.from('key1aa'), Buffer.from('0123456789012345678901234567890123456789xx'))

    const proof = CheckpointTrie.prove(trie, Buffer.from('key1aa'))
    const val = CheckpointTrie.verifyProof(trie.root, Buffer.from('key1aa'), proof)
    t.equal(val!.toString('utf8'), '0123456789012345678901234567890123456789xx')

    t.end()
  })

  it('create a merkle proof and verify it with a single short key', (t) => {
    const trie = new CheckpointTrie()

    trie.put(Buffer.from('key1aa'), Buffer.from('01234'))

    const proof = CheckpointTrie.prove(trie, Buffer.from('key1aa'))
    const val = CheckpointTrie.verifyProof(trie.root, Buffer.from('key1aa'), proof)
    t.equal(val!.toString('utf8'), '01234')

    t.end()
  })

  it('create a merkle proof and verify it whit keys in the middle', (t) => {
    const trie = new CheckpointTrie()

    trie.put(Buffer.from('key1aa'), Buffer.from('0123456789012345678901234567890123456789xxx'))
    trie.put(Buffer.from('key1'), Buffer.from('0123456789012345678901234567890123456789Very_Long'))
    trie.put(Buffer.from('key2bb'), Buffer.from('aval3'))
    trie.put(Buffer.from('key2'), Buffer.from('short'))
    trie.put(Buffer.from('key3cc'), Buffer.from('aval3'))
    trie.put(Buffer.from('key3'), Buffer.from('1234567890123456789012345678901'))

    let proof = CheckpointTrie.prove(trie, Buffer.from('key1'))
    let val = CheckpointTrie.verifyProof(trie.root, Buffer.from('key1'), proof)
    t.equal(val!.toString('utf8'), '0123456789012345678901234567890123456789Very_Long')

    proof = CheckpointTrie.prove(trie, Buffer.from('key2'))
    val = CheckpointTrie.verifyProof(trie.root, Buffer.from('key2'), proof)
    t.equal(val!.toString('utf8'), 'short')

    proof = CheckpointTrie.prove(trie, Buffer.from('key3'))
    val = CheckpointTrie.verifyProof(trie.root, Buffer.from('key3'), proof)
    t.equal(val!.toString('utf8'), '1234567890123456789012345678901')

    t.end()
  })

  it('should succeed with a simple embedded extension-branch', (t) => {
    const trie = new CheckpointTrie()

    trie.put(Buffer.from('a'), Buffer.from('a'))
    trie.put(Buffer.from('b'), Buffer.from('b'))
    trie.put(Buffer.from('c'), Buffer.from('c'))

    let proof = CheckpointTrie.prove(trie, Buffer.from('a'))
    let val = CheckpointTrie.verifyProof(trie.root, Buffer.from('a'), proof)
    t.equal(val!.toString('utf8'), 'a')

    proof = CheckpointTrie.prove(trie, Buffer.from('b'))
    val = CheckpointTrie.verifyProof(trie.root, Buffer.from('b'), proof)
    t.equal(val!.toString('utf8'), 'b')

    proof = CheckpointTrie.prove(trie, Buffer.from('c'))
    val = CheckpointTrie.verifyProof(trie.root, Buffer.from('c'), proof)
    t.equal(val!.toString('utf8'), 'c')

    t.end()
  })
})
