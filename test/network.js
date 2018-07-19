const DataObject = require('../index').DataObject
const tape = require('tape')
const ram = require('random-access-memory')

function create (key, opts) {
  opts = opts || {valueEncoding: 'utf-8'}
  opts = Object.assign({}, opts)
  return new DataObject(ram, key, opts)
}

tape('replicate with discovery', t => {
  t.plan(3)
  const obj = create()
  let clone = null
  let swarm1, swarm2
  obj.put('hello', 'world').then(() => {
    obj.getDb().then(db => {
      clone = create(db.key)
    }).then(network)
  })

  function network () {
    obj.joinNetwork().then((swarm) => {
      swarm1 = swarm
      clone.joinNetwork().then(readClone)
    })
  }

  function readClone (swarm) {
    swarm2 = swarm
    t.ok(swarm)
    clone.get('hello')
      .then(
        (data) => t.same(data[0].value, 'world'),
        (err) => t.fail(err))
      .then(cleanup)
  }
  function cleanup () {
    swarm1.close()
      .then(() => swarm2.close()
        .then(() => t.pass()))
  }
})
