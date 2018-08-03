// const LocalStore = require('../../src/LocalStore')
const cryptoLib = require('hypercore-encrypted').CryptoLib.getInstance()
const Entity = require('../../src/Entity')
const tape = require('tape')
const ram = require('random-access-memory')

tape('network', t => {
  t.plan(1)
  const a = new Entity(ram)
  let b = null
  let swarma, swarmb
  a.getKey().then(key => {
    b = new Entity(ram, key)
    return a.joinNetwork().then(swarm => {
      swarma = swarm
      return b.joinNetwork().then(put)
    })
  }).done()

  function put (swarm) {
    swarmb = swarm
    return a.put('hello', 'world').then(check)
  }

  function check () {
    return b.get('hello').then(val => {
      t.same(val[0].value, 'world')
      cleanup()
    })
  }

  function cleanup () {
    swarma.close()
    swarmb.close()
  }
})

tape('outbox', t => {
  t.plan(2)
  const a = new Entity(ram)
  const b = new Entity(ram)
  let swarma, swarmb
  a.getOutboxFor(b, ram).then(box => {
    return box.joinNetwork().then(swarm => {
      swarma = swarm
    }).then(() => {
      return box.append(['hello', 'world']).then(check)
    })
  }).done()

  function check () {
    cryptoLib._books = {}
    return b.getOutboxFrom(a, ram).then(box => {
      return box.joinNetwork().then(swarm => {
        swarmb = swarm
      }).then(() => {
        return box.get(0).then(val => t.same(val, 'hello')).then(() => {
          return box.get(1).then(val => t.same(val, 'world'))
        }).then(cleanup)
      })
    })
  }

  function cleanup () {
    swarma.close()
    swarmb.close()
    document.getElementById('tests').innerHTML = 'tests done :D'
  }
})
