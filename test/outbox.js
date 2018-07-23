const Entity = require('../src/Entity')
const tape = require('tape')
const ram = require('random-access-memory')

tape('create and open', t => {
  t.plan(1)
  const a = new Entity(ram, null, {noEncryption: true, valueEncoding: 'utf-8'})
  const b = new Entity(ram, null, {noEncryption: true, valueEncoding: 'utf-8'})

  a.getOutboxFor(b, ram)
    .then(writeToBox)
    .then(readFromBox)
    .catch(err => {
      throw err
      t.fail(err)
    })
    .done()

  function writeToBox (box) {
    return box.joinNetwork().then(() => box.append('hello'))
  }

  function readFromBox () {
    return b.getOutboxFrom(a).then(box => {
      return box.joinNetwork().then(() => {
        return box.get(0).then(data => {
            t.same(data, 'hello')
        })
      })
    })
  }
})
