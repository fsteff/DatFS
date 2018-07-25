const Entity = require('../src/Entity')
const tape = require('tape')
const ram = require('random-access-memory')
const cryptoLib = require('hypercore-encrypted').CryptoLib.getInstance()

tape('create and open', t => {
  t.plan(1)
  const a = new Entity(ram, null, {noEncryption: true, valueEncoding: 'utf-8'})
  const b = new Entity(ram, null, {noEncryption: true, valueEncoding: 'utf-8'})

  let nwa, nwb

  a.getOutboxFor(b, ram)
    .then(writeToBox)
    .then(readFromBox)
    .catch(err => {
      throw err
    })
    .done()

  function writeToBox (box) {
    return box.joinNetwork().then(nw => {
      nwa = nw
      return box.append('hello')
    })
  }

  function readFromBox () {
    cryptoLib._books = {}
    return b.getOutboxFrom(a, ram).then(box => {
      return box.joinNetwork().then(nw => {
        nwb = nw
        return box.get(0).then(data => {
          t.same(data, 'hello')
          cleanup()
        })
      })
    })
  }

  function cleanup () {
    nwa.close()
    nwb.close()
  }
})
