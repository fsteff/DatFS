const DataObject = require('../index').DataObject
const cryptoLib = require('hypercore-encrypted').CryptoLib.getInstance()
// const KeyStore = require('../index').KeyStore
const CryptoBook = require('hypercore-encrypted').CryptoBook
const tape = require('tape')
const ram = require('random-access-memory')
const utils = require('../src/CryptoLibUtils')

tape('keystore from object', t => {
  t.plan(4)
  const obj = new DataObject(ram, null, {valueEncoding: 'utf-8'})
  const keys = obj.createKeyStore(ram)
  obj.getLocalKey().then(onDb, err)

  function onDb(local){
    t.ok(local instanceof Buffer)
    keys.getKeyBook(local).then(onKey, err)
  }

  function onKey (key) {
    let book = new CryptoBook(key)
    t.ok(book instanceof CryptoBook)
    obj.getLocalKey().then(local => {
        let fromLib = cryptoLib.getBook(local.toString('hex'))
        let serialized = JSON.stringify(fromLib.serialize())
        t.same(serialized, key)
        flushLib(local, serialized)
    }, err)
    
  }

  function flushLib(local, actual){
      cryptoLib._books = {}
      // check if KeyStore is registered as onBookNotFoundHandler
      utils.getBook(local.toString('hex')).then((book)=>{
        let serialized = JSON.stringify(book.serialize())
        t.same(actual, serialized)
      },err)
      
  }

  function err (msg) {
    t.fail(msg)
    throw msg
  }
})
