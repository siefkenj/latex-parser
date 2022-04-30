# unified-latex-builder

**unified-latex-builder** is a utility to create new latex abstract syntax trees
with [hyperscript](https://github.com/dominictarr/hyperscript)-like syntax.

## Install

## Use

```js
import {u} from 'unist-builder'

var tree = u('root', [
  u('subtree', {id: 1}),
  u('subtree', {id: 2}, [
    u('node', [u('leaf', 'leaf 1'), u('leaf', 'leaf 2')]),
    u('leaf', {id: 3}, 'leaf 3'),
    u('void', {id: 4})
  ])
])

console.dir(tree, {depth: null})
```

results in the following tree:

```js
{
  type: 'root',
  children: [
    {type: 'subtree', id: 1},
    {
      type: 'subtree',
      id: 2,
      children: [
        {
          type: 'node',
          children: [
            {type: 'leaf', value: 'leaf 1'},
            {type: 'leaf', value: 'leaf 2'}
          ]
        },
        {type: 'leaf', id: 3, value: 'leaf 3'},
        {type: 'void', id: 4}
      ]
    }
  ]
}
```

## API

This package exports the following identifiers: `u`.
There is no default export.

### `u(type[, props][, children|value])`

Creates a node from `props`, `children`, and optionally `value`.

###### Signatures

*   `u(type[, props], children)` — create a [parent][]
*   `u(type[, props], value)` — create a [literal][]
*   `u(type[, props])` — create a void node

###### Parameters

*   `type` (`string`) — node [type][]
*   `props` (`Object`) — other values assigned to `node`
*   `children` ([`Array.<Node>`][node]) — children of `node`
*   `value` (`*`) — value of `node` (cast to string)

###### Returns

`Node`

## Related

## Contribute

## License

[MIT][license] © Jason Siefken
