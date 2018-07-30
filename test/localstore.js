const Entity = require('../src/Entity')
const LocalStore = require('../src/LocalStore')
const tape = require('tape')
const ram = require('random-access-memory')
const rad = require('random-access-directory')

tape('link & read', t => {
  t.plan(3)
  const dir = rad(ram)
  const store = new LocalStore(dir)
  const db = new Entity(dir)
  store.link('/a/', db)
    .then(put)
    .then(check)
    .then(get)
    .done()

  function put () {
    return store.put('/a/hello', 'world')
  }

  function check () {
    const child = store.getDb('/a/hello')
    t.same(child.relpath, '/a/')
    return child.db.get('hello').then(val => {
      t.same(val[0].value, 'world')
    })
  }

  function get () {
    return store.get('/a/hello').then(val => {
      t.same(val[0].value, 'world')
    })
  }
})
