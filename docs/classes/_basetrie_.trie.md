[merkle-patricia-tree](../README.md) › ["baseTrie"](../modules/_basetrie_.md) › [Trie](_basetrie_.trie.md)

# Class: Trie

Use `import { BaseTrie } from 'merkle-patricia-tree'` for the base interface.
In Ethereum applications use the Secure Trie Overlay: `import { SecureTrie } from 'merkle-patricia-tree'`.
The API for the base and the secure interface are about the same.

**`param`** You may pass in a [levelup](https://github.com/Level/levelup) instance to get loaded into memory.
If the db is `null` or left undefined, then the trie will be stored via an in-memory JavaScript map.

**`param`** A `Buffer` for the root of a previously stored trie

**`prop`** {Buffer} root - The current root of the `trie`

**`prop`** {Buffer} EMPTY_TRIE_ROOT - The root for an empty trie

## Hierarchy

* **Trie**

  ↳ [CheckpointTrie](_checkpointtrie_.checkpointtrie.md)

## Index

### Constructors

* [constructor](_basetrie_.trie.md#constructor)

### Properties

* [EMPTY_TRIE_ROOT](_basetrie_.trie.md#empty_trie_root)
* [db](_basetrie_.trie.md#db)

### Accessors

* [root](_basetrie_.trie.md#root)

### Methods

* [_createInitialNode](_basetrie_.trie.md#_createinitialnode)
* [_deleteNode](_basetrie_.trie.md#_deletenode)
* [_findDbNodes](_basetrie_.trie.md#_finddbnodes)
* [_formatNode](_basetrie_.trie.md#private-_formatnode)
* [_lookupNode](_basetrie_.trie.md#_lookupnode)
* [_putNode](_basetrie_.trie.md#_putnode)
* [_saveStack](_basetrie_.trie.md#private-_savestack)
* [_updateNode](_basetrie_.trie.md#private-_updatenode)
* [_walkTrie](_basetrie_.trie.md#private-_walktrie)
* [batch](_basetrie_.trie.md#batch)
* [checkRoot](_basetrie_.trie.md#checkroot)
* [copy](_basetrie_.trie.md#copy)
* [del](_basetrie_.trie.md#del)
* [findPath](_basetrie_.trie.md#findpath)
* [get](_basetrie_.trie.md#get)
* [put](_basetrie_.trie.md#put)
* [setRoot](_basetrie_.trie.md#setroot)
* [fromProof](_basetrie_.trie.md#static-fromproof)
* [prove](_basetrie_.trie.md#static-prove)
* [verifyProof](_basetrie_.trie.md#static-verifyproof)

## Constructors

###  constructor

\+ **new Trie**(`db?`: LevelUp | DBMap | null, `root?`: Buffer): *[Trie](_basetrie_.trie.md)*

*Defined in [baseTrie.ts:43](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L43)*

**Parameters:**

Name | Type |
------ | ------ |
`db?` | LevelUp &#124; DBMap &#124; null |
`root?` | Buffer |

**Returns:** *[Trie](_basetrie_.trie.md)*

## Properties

###  EMPTY_TRIE_ROOT

• **EMPTY_TRIE_ROOT**: *Buffer*

*Defined in [baseTrie.ts:41](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L41)*

___

###  db

• **db**: *DB*

*Defined in [baseTrie.ts:42](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L42)*

## Accessors

###  root

• **get root**(): *Buffer*

*Defined in [baseTrie.ts:108](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L108)*

**Returns:** *Buffer*

• **set root**(`value`: Buffer): *void*

*Defined in [baseTrie.ts:104](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L104)*

**Parameters:**

Name | Type |
------ | ------ |
`value` | Buffer |

**Returns:** *void*

## Methods

###  _createInitialNode

▸ **_createInitialNode**(`key`: Buffer, `value`: Buffer): *void*

*Defined in [baseTrie.ts:596](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L596)*

Creates the initial node from an empty tree

**Parameters:**

Name | Type |
------ | ------ |
`key` | Buffer |
`value` | Buffer |

**Returns:** *void*

___

###  _deleteNode

▸ **_deleteNode**(`k`: Buffer, `stack`: TrieNode[]): *void*

*Defined in [baseTrie.ts:474](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L474)*

**Parameters:**

Name | Type |
------ | ------ |
`k` | Buffer |
`stack` | TrieNode[] |

**Returns:** *void*

___

###  _findDbNodes

▸ **_findDbNodes**(): *FoundNode[]*

*Defined in [baseTrie.ts:258](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L258)*

**Returns:** *FoundNode[]*

___

### `Private` _formatNode

▸ **_formatNode**(`node`: TrieNode, `topLevel`: boolean, `opStack`: BatchDBOp[], `remove`: boolean): *Buffer | null | Buffer‹› | Buffer‹›[][]*

*Defined in [baseTrie.ts:612](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L612)*

Formats node to be saved by db.batch.

**`method`** _formatNode

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`node` | TrieNode | - | the node to format |
`topLevel` | boolean | - | if the node is at the top level |
`opStack` | BatchDBOp[] | - | the opStack to push the node's data |
`remove` | boolean | false | whether to remove the node (only used for CheckpointTrie) |

**Returns:** *Buffer | null | Buffer‹› | Buffer‹›[][]*

- the node's hash used as the key or the rawNode

___

###  _lookupNode

▸ **_lookupNode**(`node`: Buffer | Buffer[]): *TrieNode | null*

*Defined in [baseTrie.ts:174](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L174)*

Retrieves a node from db by hash

**Parameters:**

Name | Type |
------ | ------ |
`node` | Buffer &#124; Buffer[] |

**Returns:** *TrieNode | null*

___

###  _putNode

▸ **_putNode**(`node`: TrieNode): *void*

*Defined in [baseTrie.ts:192](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L192)*

Writes a single node to db

**Parameters:**

Name | Type |
------ | ------ |
`node` | TrieNode |

**Returns:** *void*

___

### `Private` _saveStack

▸ **_saveStack**(`key`: Nibbles, `stack`: TrieNode[], `opStack`: BatchDBOp[]): *void*

*Defined in [baseTrie.ts:445](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L445)*

saves a stack

**`method`** _saveStack

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`key` | Nibbles | the key. Should follow the stack |
`stack` | TrieNode[] | a stack of nodes to the value given by the key |
`opStack` | BatchDBOp[] | a stack of levelup operations to commit at the end of this funciton  |

**Returns:** *void*

___

### `Private` _updateNode

▸ **_updateNode**(`k`: Buffer, `value`: Buffer, `keyRemainder`: Nibbles, `stack`: TrieNode[]): *void*

*Defined in [baseTrie.ts:281](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L281)*

Updates a node

**`method`** _updateNode

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`k` | Buffer | - |
`value` | Buffer | - |
`keyRemainder` | Nibbles | - |
`stack` | TrieNode[] |   |

**Returns:** *void*

___

### `Private` _walkTrie

▸ **_walkTrie**(`root`: Buffer, `targetKey?`: Nibbles): *FoundNode[]*

*Defined in [baseTrie.ts:383](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L383)*

Walks a trie until finished.

**`method`** _walkTrie

**Parameters:**

Name | Type |
------ | ------ |
`root` | Buffer |
`targetKey?` | Nibbles |

**Returns:** *FoundNode[]*

- An array of nodes found

___

###  batch

▸ **batch**(`ops`: BatchDBOp[]): *void*

*Defined in [baseTrie.ts:655](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L655)*

The given hash of operations (key additions or deletions) are executed on the DB

**`method`** batch

**`memberof`** Trie

**`example`** 
const ops = [
   { type: 'del', key: Buffer.from('father') }
 , { type: 'put', key: Buffer.from('name'), value: Buffer.from('Yuri Irsenovich Kim') }
 , { type: 'put', key: Buffer.from('dob'), value: Buffer.from('16 February 1941') }
 , { type: 'put', key: Buffer.from('spouse'), value: Buffer.from('Kim Young-sook') }
 , { type: 'put', key: Buffer.from('occupation'), value: Buffer.from('Clown') }
]
trie.batch(ops)

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`ops` | BatchDBOp[] |   |

**Returns:** *void*

___

###  checkRoot

▸ **checkRoot**(`root`: Buffer): *boolean*

*Defined in [baseTrie.ts:671](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L671)*

Checks if a given root exists.

**Parameters:**

Name | Type |
------ | ------ |
`root` | Buffer |

**Returns:** *boolean*

___

###  copy

▸ **copy**(): *[Trie](_basetrie_.trie.md)*

*Defined in [baseTrie.ts:635](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L635)*

**Returns:** *[Trie](_basetrie_.trie.md)*

___

###  del

▸ **del**(`key`: Buffer): *void*

*Defined in [baseTrie.ts:166](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L166)*

Deletes a value given a `key`

**`method`** del

**`memberof`** Trie

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`key` | Buffer |   |

**Returns:** *void*

___

###  findPath

▸ **findPath**(`key`: Buffer): *Path*

*Defined in [baseTrie.ts:205](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L205)*

Tries to find a path to the node for the given key.
It returns a `stack` of nodes to the closet node.

**`method`** findPath

**`memberof`** Trie

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`key` | Buffer | the search key  |

**Returns:** *Path*

___

###  get

▸ **get**(`key`: Buffer): *Buffer | null*

*Defined in [baseTrie.ts:127](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L127)*

Gets a value given a `key`

**`method`** get

**`memberof`** Trie

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`key` | Buffer | the key to search for |

**Returns:** *Buffer | null*

- Returns `Buffer` if a value was found or `null` if no value was found.

___

###  put

▸ **put**(`key`: Buffer, `value`: Buffer): *void*

*Defined in [baseTrie.ts:143](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L143)*

Stores a given `value` at the given `key`

**`method`** put

**`memberof`** Trie

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`key` | Buffer | - |
`value` | Buffer |   |

**Returns:** *void*

___

###  setRoot

▸ **setRoot**(`value?`: Buffer): *void*

*Defined in [baseTrie.ts:112](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L112)*

**Parameters:**

Name | Type |
------ | ------ |
`value?` | Buffer |

**Returns:** *void*

___

### `Static` fromProof

▸ **fromProof**(`proofNodes`: Buffer[], `proofTrie?`: [Trie](_basetrie_.trie.md)): *[Trie](_basetrie_.trie.md)*

*Defined in [baseTrie.ts:65](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L65)*

**Parameters:**

Name | Type |
------ | ------ |
`proofNodes` | Buffer[] |
`proofTrie?` | [Trie](_basetrie_.trie.md) |

**Returns:** *[Trie](_basetrie_.trie.md)*

___

### `Static` prove

▸ **prove**(`trie`: [Trie](_basetrie_.trie.md), `key`: Buffer): *Buffer[]*

*Defined in [baseTrie.ts:86](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L86)*

**Parameters:**

Name | Type |
------ | ------ |
`trie` | [Trie](_basetrie_.trie.md) |
`key` | Buffer |

**Returns:** *Buffer[]*

___

### `Static` verifyProof

▸ **verifyProof**(`rootHash`: Buffer, `key`: Buffer, `proofNodes`: Buffer[]): *Buffer | null*

*Defined in [baseTrie.ts:94](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L94)*

**Parameters:**

Name | Type |
------ | ------ |
`rootHash` | Buffer |
`key` | Buffer |
`proofNodes` | Buffer[] |

**Returns:** *Buffer | null*
