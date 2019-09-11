const tape = require('tape')
const promisify = require('util.promisify')
const rlp = require('rlp')
const { decodeMultiproof, decodeInstructions, verifyMultiproof, makeMultiproof, Instruction, Opcode } = require('../dist/multiproof')
const { Trie } = require('../dist/baseTrie')
const { LeafNode } = require('../dist/trieNode')
const { stringToNibbles } = require('../dist/util/nibbles')

tape('decode instructions', (t) => {
  const raw = Buffer.from('d0c20201c20405c603c403030303c28006', 'hex')
  const expected = [
    { kind: Opcode.Leaf, value: 1 },
    { kind: Opcode.Add, value: 5 },
    { kind: Opcode.Extension, value: [3, 3, 3, 3] },
    { kind: Opcode.Branch, value: 6 }
  ]
  const res = decodeInstructions(rlp.decode(raw))
  t.deepEqual(expected, res)
  t.end()
})

tape('decode multiproof', (t) => {
  const raw = Buffer.from('ebe1a00101010101010101010101010101010101010101010101010101010101010101c483c20102c3c20280', 'hex')
  const expected = {
    hashes: [Buffer.alloc(32, 1)],
    instructions: [{ kind: Opcode.Leaf, value: 0 }],
    keyvals: [Buffer.from('c20102', 'hex')]
  }
  const proof = decodeMultiproof(raw)
  t.deepEqual(expected, proof) 

  t.end()
})

tape('multiproof tests', (t) => {
  t.skip('hash before nested nodes in branch', (st) => {
    // TODO: Replace with valid multiproof
    const raw = Buffer.from('f876e1a01bbb8445ba6497d9a4642a114cb06b3a61ea8e49ca3853991b4f07b7e1e04892f845b843f8419f02020202020202020202020202020202020202020202020202020202020202a00000000000000000000000000000000000000000000000000000000000000000ccc20180c28001c2021fc20402', 'hex')
    const expectedRoot = Buffer.from('0d76455583723bb10c56d34cfad1fb218e692299ae2edb5dd56a950f7062a6e0', 'hex')
    const expectedInstructions = [
      { kind: Opcode.Hasher, value: 0 },
      { kind: Opcode.Branch, value: 1 },
      { kind: Opcode.Leaf, value: 31 },
      { kind: Opcode.Add, value: 2 },
    ]
    const proof = decodeMultiproof(raw)
    st.deepEqual(proof.instructions, expectedInstructions)
    st.assert(verifyMultiproof(expectedRoot, proof))
    st.end()
  })

  t.skip('two values', (st) => {
    // TODO: Replace with valid multiproof
    const raw = Buffer.from('f8c1e1a09afbad9ae00ded5a066bd6f0ec67a45d51f31c258066b997e9bb8336bc13eba8f88ab843f8419f01010101010101010101010101010101010101010101010101010101010101a00101010101010101010101010101010101010101010101010101010101010101b843f8419f02020202020202020202020202020202020202020202020202020202020202a00000000000000000000000000000000000000000000000000000000000000000d2c2021fc28001c2021fc20402c20180c20408', 'hex')
    const expectedRoot = Buffer.from('32291409ceb27a3b68b6beff58cfc41c084c0bde9e6aca03a20ce9aa795bb248', 'hex')
    const expectedInstructions = [
      { kind: Opcode.Leaf, value: 31 },
      { kind: Opcode.Branch, value: 1 },
      { kind: Opcode.Leaf, value: 31 },
      { kind: Opcode.Add, value: 2 },
      { kind: Opcode.Hasher, value: 0 },
      { kind: Opcode.Add, value: 8 }
    ]
    const proof = decodeMultiproof(raw)
    st.deepEqual(proof.instructions, expectedInstructions)
    st.assert(verifyMultiproof(expectedRoot, proof))
    st.end()
  })

  t.end()
})

tape('make multiproof', (t) => {
  t.test('trie with one leaf', async (st) => {
    const t = new Trie()
    const put = promisify(t.put.bind(t))
    const lookupNode = promisify(t._lookupNode.bind(t))
    const key = Buffer.from('1'.repeat(40), 'hex')
    await put(key, Buffer.from('ffff', 'hex'))
    const leaf = await lookupNode(t.root)

    const proof = await makeMultiproof(t, [key])
    st.deepEqual(proof, {
      hashes: [],
      keyvals: [leaf.serialize()],
      instructions: [{ kind: Opcode.Leaf, value: 40 }]
    })
    st.assert(verifyMultiproof(t.root, proof))
    st.end()
  })

  t.test('prove one of two leaves in trie', async (st) => {
    const t = new Trie()
    const put = promisify(t.put.bind(t))
    const lookupNode = promisify(t._lookupNode.bind(t))
    const key1 = Buffer.from('1'.repeat(40), 'hex')
    const key2 = Buffer.from('2'.repeat(40), 'hex')
    await put(key1, Buffer.from('f'.repeat(64), 'hex'))
    await put(key2, Buffer.from('e'.repeat(64), 'hex'))

    const proof = await makeMultiproof(t, [key1])
    st.equal(proof.hashes.length, 1)
    st.equal(proof.keyvals.length, 1)
    st.equal(proof.instructions.length, 4)
    st.assert(verifyMultiproof(t.root, proof))
    st.end()
  })

  t.test('prove two of three leaves in trie', async (st) => {
    const t = new Trie()
    const put = promisify(t.put.bind(t))
    const lookupNode = promisify(t._lookupNode.bind(t))
    const key1 = Buffer.from('1'.repeat(40), 'hex')
    const key2 = Buffer.from('2'.repeat(40), 'hex')
    const key3 = Buffer.from('3'.repeat(40), 'hex')
    await put(key1, Buffer.from('f'.repeat(64), 'hex'))
    await put(key2, Buffer.from('e'.repeat(64), 'hex'))
    await put(key3, Buffer.from('d'.repeat(64), 'hex'))

    const proof = await makeMultiproof(t, [key3, key1])
    st.assert(verifyMultiproof(t.root, proof))
    st.end()
  })

  t.test('prove two of three leaves (with extension) in trie', async (st) => {
    const t = new Trie()
    const put = promisify(t.put.bind(t))
    const lookupNode = promisify(t._lookupNode.bind(t))
    const key1 = Buffer.from('1'.repeat(40), 'hex')
    const key2 = Buffer.from('2'.repeat(40), 'hex')
    const key3 = Buffer.from('1'.repeat(10).concat('3'.repeat(30)), 'hex')
    await put(key1, Buffer.from('f'.repeat(64), 'hex'))
    await put(key2, Buffer.from('e'.repeat(64), 'hex'))
    await put(key3, Buffer.from('d'.repeat(64), 'hex'))

    const proof = await makeMultiproof(t, [key3, key1])
    st.assert(verifyMultiproof(t.root, proof))
    st.end()
  })

  t.test('two embedded leaves in branch', async (st) => {
    const t = new Trie()
    const put = promisify(t.put.bind(t))
    const lookupNode = promisify(t._lookupNode.bind(t))
    const key1 = Buffer.from('1'.repeat(40), 'hex')
    const key2 = Buffer.from('2'.repeat(40), 'hex')
    await put(key1, Buffer.from('f'.repeat(4), 'hex'))
    await put(key2, Buffer.from('e'.repeat(4), 'hex'))

    const proof = await makeMultiproof(t, [key1])
    st.assert(verifyMultiproof(t.root, proof))
    st.end()
  })
})

tape('multiproof generation/verification with official jeff tests', async (t) => {
  const jsonTest = require('./fixture/trietest.json').tests.jeff
  const inputs = jsonTest.in
  const expect = jsonTest.root

  const trie = new Trie()
  for (let input of inputs) {
    for (i = 0; i < 2; i++) {
      if (input[i] && input[i].slice(0, 2) === '0x') {
        input[i] = Buffer.from(input[i].slice(2), 'hex')
      }
    }
    await promisify(trie.put.bind(trie))(Buffer.from(input[0]), input[1])
  }
  t.assert(trie.root.equals(Buffer.from(expect.slice(2), 'hex')))

  const keys = [
    Buffer.from('000000000000000000000000ec4f34c97e43fbb2816cfd95e388353c7181dab1', 'hex'),
    Buffer.from('000000000000000000000000697c7b8c961b56f675d570498424ac8de1a918f6', 'hex'),
    Buffer.from('0000000000000000000000000000000000000000000000000000000000000046', 'hex')
  ]
  const proof = await makeMultiproof(trie, keys)
  t.assert(verifyMultiproof(trie.root, proof))
  t.end()
})
