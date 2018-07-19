const DataObject = require('../index').DataObject
const cryptoLib = require('hypercore-encrypted').CryptoLib.getInstance()
const tape = require('tape')
const ram = require('random-access-memory')

function create (key, opts) {
  opts = opts || {valueEncoding: 'utf-8'}
  opts = Object.assign({}, opts)
  return new DataObject(ram, key, opts)
}

function replicate (a, b) {
  var stream = a.replicate({live: true})
  return stream.pipe(b.replicate({live: true})).pipe(stream)
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
  // const opts = {valueEncoding: 'utf-8', noEncryption: true}
  const obj = create(null, {valueEncoding: 'utf-8', noEncryption: true})
  var clone = null
  obj.put('hello', 'world').then(() => {
    obj.getDb().then(db => {
      clone = create(db.key, {valueEncoding: 'utf-8', noEncryption: true})
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

  function repl (val) {
    replicate(a, b, {live: true})
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
