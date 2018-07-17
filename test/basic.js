const DataObject = require('../index').DataObject
const cryptoLib = require('hypercore-encrypted').CryptoLib.getInstance()
const tape = require('tape')
const ram = require('random-access-memory')

function create (key) {
  return new DataObject(ram, key, {valueEncoding: 'utf-8'})
}

function replicate (a, b, opts) {
  opts = opts || {live: true}
  var stream = a.replicate(opts)
  return stream.pipe(b.replicate(opts)).pipe(stream)
}

tape('create', t => {
  t.plan(2)

  const obj = create()
  obj.put('hello', 'world').then(read)

  function read () {
    obj.get('hello').then((data) => t.same(data[0].value, 'world'))
    obj.getDb().then(findKey)
  }
  function findKey (db) {
    const key = db.local.key.toString('hex')
    t.ok(cryptoLib.getBook(key))
  }
})

tape('replicate & authorize', t => {
  t.plan(2)
  const obj = create()
  var clone = null
  obj.put('hello', 'world').then(() => {
    obj.getDb().then(db => {
      clone = create(db.local.key)
    }).then(dbs)
  })

  let a = null
  let b = null
  function dbs () {
    obj.getDb()
      .then(db => { a = db })
      .then(clone.getDb()
        .then(db => { b = db })
        .then(repl))
  }

  function repl () {
    replicate(a, b)
    clone.get('hello')
      .then(
          (data) => t.same(data[0].value, 'world'))
      .then(auth)
  }

  function auth () {
    a.authorize(b.local.key, onAuth)
  }

  function onAuth () {
    clone.put('hallo', 'welt').then(read)
  }

  function read () {
    obj.get('hallo').then((data) => t.same(data[0].value, 'welt'))
  }
})
