[merkle-patricia-tree](../README.md) › ["secure"](../modules/_secure_.md) › [SecureTrie](_secure_.securetrie.md)

# Class: SecureTrie

You can create a secure Trie where the keys are automatically hashed
using **keccak256** by using `require('merkle-patricia-tree/secure')`.
It has the same methods and constructor as `Trie`.

**`class`** SecureTrie

**`extends`** Trie

## Hierarchy

  ↳ [CheckpointTrie](_checkpointtrie_.checkpointtrie.md)

  ↳ **SecureTrie**

## Index

### Constructors

* [constructor](_secure_.securetrie.md#constructor)

### Properties

* [EMPTY_TRIE_ROOT](_secure_.securetrie.md#empty_trie_root)
* [_checkpoints](_secure_.securetrie.md#_checkpoints)
* [_mainDB](_secure_.securetrie.md#_maindb)
* [_scratch](_secure_.securetrie.md#_scratch)
* [db](_secure_.securetrie.md#db)

### Accessors

* [isCheckpoint](_secure_.securetrie.md#ischeckpoint)
* [root](_secure_.securetrie.md#root)

### Methods

* [_commitChanges](_secure_.securetrie.md#private-_commitchanges)
* [_createInitialNode](_secure_.securetrie.md#_createinitialnode)
* [_deleteNode](_secure_.securetrie.md#_deletenode)
* [_enterCpMode](_secure_.securetrie.md#private-_entercpmode)
* [_exitCpMode](_secure_.securetrie.md#private-_exitcpmode)
* [_findDbNodes](_secure_.securetrie.md#_finddbnodes)
* [_formatNode](_secure_.securetrie.md#private-_formatnode)
* [_lookupNode](_secure_.securetrie.md#_lookupnode)
* [_putNode](_secure_.securetrie.md#_putnode)
* [_saveStack](_secure_.securetrie.md#private-_savestack)
* [_updateNode](_secure_.securetrie.md#private-_updatenode)
* [_walkTrie](_secure_.securetrie.md#private-_walktrie)
* [batch](_secure_.securetrie.md#batch)
* [checkRoot](_secure_.securetrie.md#checkroot)
* [checkpoint](_secure_.securetrie.md#checkpoint)
* [commit](_secure_.securetrie.md#commit)
* [copy](_secure_.securetrie.md#copy)
* [del](_secure_.securetrie.md#del)
* [findPath](_secure_.securetrie.md#findpath)
* [get](_secure_.securetrie.md#get)
* [put](_secure_.securetrie.md#put)
* [revert](_secure_.securetrie.md#revert)
* [setRoot](_secure_.securetrie.md#setroot)
* [fromProof](_secure_.securetrie.md#static-fromproof)
* [prove](_secure_.securetrie.md#static-prove)
* [verifyProof](_secure_.securetrie.md#static-verifyproof)

## Constructors

###  constructor

\+ **new SecureTrie**(...`args`: any): *[SecureTrie](_secure_.securetrie.md)*

*Overrides [CheckpointTrie](_checkpointtrie_.checkpointtrie.md).[constructor](_checkpointtrie_.checkpointtrie.md#constructor)*

*Defined in [secure.ts:12](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/secure.ts#L12)*

**Parameters:**

Name | Type |
------ | ------ |
`...args` | any |

**Returns:** *[SecureTrie](_secure_.securetrie.md)*

## Properties

###  EMPTY_TRIE_ROOT

• **EMPTY_TRIE_ROOT**: *Buffer*

*Inherited from [Trie](_basetrie_.trie.md).[EMPTY_TRIE_ROOT](_basetrie_.trie.md#empty_trie_root)*

*Defined in [baseTrie.ts:41](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L41)*

___

###  _checkpoints

• **_checkpoints**: *Buffer[]*

*Inherited from [CheckpointTrie](_checkpointtrie_.checkpointtrie.md).[_checkpoints](_checkpointtrie_.checkpointtrie.md#_checkpoints)*

*Defined in [checkpointTrie.ts:9](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/checkpointTrie.ts#L9)*

___

###  _mainDB

• **_mainDB**: *DB*

*Inherited from [CheckpointTrie](_checkpointtrie_.checkpointtrie.md).[_mainDB](_checkpointtrie_.checkpointtrie.md#_maindb)*

*Defined in [checkpointTrie.ts:7](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/checkpointTrie.ts#L7)*

___

###  _scratch

• **_scratch**: *ScratchDB | null*

*Inherited from [CheckpointTrie](_checkpointtrie_.checkpointtrie.md).[_scratch](_checkpointtrie_.checkpointtrie.md#_scratch)*

*Defined in [checkpointTrie.ts:8](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/checkpointTrie.ts#L8)*

___

###  db

• **db**: *DB*

*Inherited from [Trie](_basetrie_.trie.md).[db](_basetrie_.trie.md#db)*

*Defined in [baseTrie.ts:42](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L42)*

## Accessors

###  isCheckpoint

• **get isCheckpoint**(): *boolean*

*Inherited from [CheckpointTrie](_checkpointtrie_.checkpointtrie.md).[isCheckpoint](_checkpointtrie_.checkpointtrie.md#ischeckpoint)*

*Defined in [checkpointTrie.ts:24](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/checkpointTrie.ts#L24)*

Is the trie during a checkpoint phase?

**Returns:** *boolean*

___

###  root

• **get root**(): *Buffer*

*Inherited from [Trie](_basetrie_.trie.md).[root](_basetrie_.trie.md#root)*

*Defined in [baseTrie.ts:108](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L108)*

**Returns:** *Buffer*

• **set root**(`value`: Buffer): *void*

*Inherited from [Trie](_basetrie_.trie.md).[root](_basetrie_.trie.md#root)*

*Defined in [baseTrie.ts:104](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L104)*

**Parameters:**

Name | Type |
------ | ------ |
`value` | Buffer |

**Returns:** *void*

## Methods

### `Private` _commitChanges

▸ **_commitChanges**(`scratchDb?`: ScratchDB): *void*

*Inherited from [CheckpointTrie](_checkpointtrie_.checkpointtrie.md).[_commitChanges](_checkpointtrie_.checkpointtrie.md#private-_commitchanges)*

*Defined in [checkpointTrie.ts:121](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/checkpointTrie.ts#L121)*

Commits changes based on the state updates since checkpoint.

**`method`** _commitChanges

**Parameters:**

Name | Type |
------ | ------ |
`scratchDb?` | ScratchDB |

**Returns:** *void*

___

###  _createInitialNode

▸ **_createInitialNode**(`key`: Buffer, `value`: Buffer): *void*

*Inherited from [Trie](_basetrie_.trie.md).[_createInitialNode](_basetrie_.trie.md#_createinitialnode)*

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

*Inherited from [Trie](_basetrie_.trie.md).[_deleteNode](_basetrie_.trie.md#_deletenode)*

*Defined in [baseTrie.ts:474](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L474)*

**Parameters:**

Name | Type |
------ | ------ |
`k` | Buffer |
`stack` | TrieNode[] |

**Returns:** *void*

___

### `Private` _enterCpMode

▸ **_enterCpMode**(): *void*

*Inherited from [CheckpointTrie](_checkpointtrie_.checkpointtrie.md).[_enterCpMode](_checkpointtrie_.checkpointtrie.md#private-_entercpmode)*

*Defined in [checkpointTrie.ts:96](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/checkpointTrie.ts#L96)*

Enter into checkpoint mode.

**Returns:** *void*

___

### `Private` _exitCpMode

▸ **_exitCpMode**(`commitState`: boolean): *void*

*Inherited from [CheckpointTrie](_checkpointtrie_.checkpointtrie.md).[_exitCpMode](_checkpointtrie_.checkpointtrie.md#private-_exitcpmode)*

*Defined in [checkpointTrie.ts:105](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/checkpointTrie.ts#L105)*

Exit from checkpoint mode.

**Parameters:**

Name | Type |
------ | ------ |
`commitState` | boolean |

**Returns:** *void*

___

###  _findDbNodes

▸ **_findDbNodes**(): *FoundNode[]*

*Inherited from [Trie](_basetrie_.trie.md).[_findDbNodes](_basetrie_.trie.md#_finddbnodes)*

*Defined in [baseTrie.ts:258](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L258)*

**Returns:** *FoundNode[]*

___

### `Private` _formatNode

▸ **_formatNode**(`node`: TrieNode, `topLevel`: boolean, `opStack`: BatchDBOp[], `remove`: boolean): *Buffer‹› | null | Buffer‹› | Buffer‹›[][]*

*Inherited from [CheckpointTrie](_checkpointtrie_.checkpointtrie.md).[_formatNode](_checkpointtrie_.checkpointtrie.md#private-_formatnode)*

*Overrides [Trie](_basetrie_.trie.md).[_formatNode](_basetrie_.trie.md#private-_formatnode)*

*Defined in [checkpointTrie.ts:153](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/checkpointTrie.ts#L153)*

Formats node to be saved by db.batch.

**`method`** _formatNode

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`node` | TrieNode | - | the node to format |
`topLevel` | boolean | - | if the node is at the top level |
`opStack` | BatchDBOp[] | - | the opStack to push the node's data |
`remove` | boolean | false | whether to remove the node (only used for CheckpointTrie) |

**Returns:** *Buffer‹› | null | Buffer‹› | Buffer‹›[][]*

- the node's hash used as the key or the rawNode

___

###  _lookupNode

▸ **_lookupNode**(`node`: Buffer | Buffer[]): *TrieNode | null*

*Inherited from [Trie](_basetrie_.trie.md).[_lookupNode](_basetrie_.trie.md#_lookupnode)*

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

*Inherited from [Trie](_basetrie_.trie.md).[_putNode](_basetrie_.trie.md#_putnode)*

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

*Inherited from [Trie](_basetrie_.trie.md).[_saveStack](_basetrie_.trie.md#private-_savestack)*

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

*Inherited from [Trie](_basetrie_.trie.md).[_updateNode](_basetrie_.trie.md#private-_updatenode)*

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

*Inherited from [Trie](_basetrie_.trie.md).[_walkTrie](_basetrie_.trie.md#private-_walktrie)*

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

*Inherited from [Trie](_basetrie_.trie.md).[batch](_basetrie_.trie.md#batch)*

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

*Inherited from [Trie](_basetrie_.trie.md).[checkRoot](_basetrie_.trie.md#checkroot)*

*Defined in [baseTrie.ts:671](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L671)*

Checks if a given root exists.

**Parameters:**

Name | Type |
------ | ------ |
`root` | Buffer |

**Returns:** *boolean*

___

###  checkpoint

▸ **checkpoint**(): *void*

*Inherited from [CheckpointTrie](_checkpointtrie_.checkpointtrie.md).[checkpoint](_checkpointtrie_.checkpointtrie.md#checkpoint)*

*Defined in [checkpointTrie.ts:33](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/checkpointTrie.ts#L33)*

Creates a checkpoint that can later be reverted to or committed.
After this is called, no changes to the trie will be permanently saved
until `commit` is called.

**Returns:** *void*

___

###  commit

▸ **commit**(): *void*

*Inherited from [CheckpointTrie](_checkpointtrie_.checkpointtrie.md).[commit](_checkpointtrie_.checkpointtrie.md#commit)*

*Defined in [checkpointTrie.ts:49](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/checkpointTrie.ts#L49)*

Commits a checkpoint to disk, if current checkpoint is not nested. If
nested, only sets the parent checkpoint as current checkpoint.

**`method`** commit

**`throws`** If not during a checkpoint phase

**Returns:** *void*

___

###  copy

▸ **copy**(): *[SecureTrie](_secure_.securetrie.md)*

*Overrides [CheckpointTrie](_checkpointtrie_.checkpointtrie.md).[copy](_checkpointtrie_.checkpointtrie.md#copy)*

*Defined in [secure.ts:27](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/secure.ts#L27)*

**Returns:** *[SecureTrie](_secure_.securetrie.md)*

___

###  del

▸ **del**(`key`: Buffer): *void*

*Overrides [Trie](_basetrie_.trie.md).[del](_basetrie_.trie.md#del)*

*Defined in [secure.ts:52](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/secure.ts#L52)*

**Parameters:**

Name | Type |
------ | ------ |
`key` | Buffer |

**Returns:** *void*

___

###  findPath

▸ **findPath**(`key`: Buffer): *Path*

*Inherited from [Trie](_basetrie_.trie.md).[findPath](_basetrie_.trie.md#findpath)*

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

*Overrides [Trie](_basetrie_.trie.md).[get](_basetrie_.trie.md#get)*

*Defined in [secure.ts:33](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/secure.ts#L33)*

**Parameters:**

Name | Type |
------ | ------ |
`key` | Buffer |

**Returns:** *Buffer | null*

___

###  put

▸ **put**(`key`: Buffer, `val`: Buffer): *void*

*Overrides [Trie](_basetrie_.trie.md).[put](_basetrie_.trie.md#put)*

*Defined in [secure.ts:43](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/secure.ts#L43)*

For a falsey value, use the original key
to avoid double hashing the key.

**Parameters:**

Name | Type |
------ | ------ |
`key` | Buffer |
`val` | Buffer |

**Returns:** *void*

___

###  revert

▸ **revert**(): *void*

*Inherited from [CheckpointTrie](_checkpointtrie_.checkpointtrie.md).[revert](_checkpointtrie_.checkpointtrie.md#revert)*

*Defined in [checkpointTrie.ts:65](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/checkpointTrie.ts#L65)*

Reverts the trie to the state it was at when `checkpoint` was first called.
If during a nested checkpoint, sets root to most recent checkpoint, and sets
parent checkpoint as current.

**Returns:** *void*

___

###  setRoot

▸ **setRoot**(`value?`: Buffer): *void*

*Inherited from [Trie](_basetrie_.trie.md).[setRoot](_basetrie_.trie.md#setroot)*

*Defined in [baseTrie.ts:112](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L112)*

**Parameters:**

Name | Type |
------ | ------ |
`value?` | Buffer |

**Returns:** *void*

___

### `Static` fromProof

▸ **fromProof**(`proofNodes`: Buffer[], `proofTrie?`: [Trie](_basetrie_.trie.md)): *[Trie](_basetrie_.trie.md)*

*Inherited from [Trie](_basetrie_.trie.md).[fromProof](_basetrie_.trie.md#static-fromproof)*

*Defined in [baseTrie.ts:65](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/baseTrie.ts#L65)*

**Parameters:**

Name | Type |
------ | ------ |
`proofNodes` | Buffer[] |
`proofTrie?` | [Trie](_basetrie_.trie.md) |

**Returns:** *[Trie](_basetrie_.trie.md)*

___

### `Static` prove

▸ **prove**(`trie`: [SecureTrie](_secure_.securetrie.md), `key`: Buffer): *Buffer[]*

*Overrides [Trie](_basetrie_.trie.md).[prove](_basetrie_.trie.md#static-prove)*

*Defined in [secure.ts:17](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/secure.ts#L17)*

**Parameters:**

Name | Type |
------ | ------ |
`trie` | [SecureTrie](_secure_.securetrie.md) |
`key` | Buffer |

**Returns:** *Buffer[]*

___

### `Static` verifyProof

▸ **verifyProof**(`rootHash`: Buffer, `key`: Buffer, `proof`: Buffer[]): *Buffer | null*

*Overrides [Trie](_basetrie_.trie.md).[verifyProof](_basetrie_.trie.md#static-verifyproof)*

*Defined in [secure.ts:22](https://github.com/ethereumjs/merkle-patricia-tree/blob/master/src/secure.ts#L22)*

**Parameters:**

Name | Type |
------ | ------ |
`rootHash` | Buffer |
`key` | Buffer |
`proof` | Buffer[] |

**Returns:** *Buffer | null*
