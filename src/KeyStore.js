const DataObject = require('./DataObject')
const hypercore = require('hypercore-encrypted')
const Q = require('q')

/**
 * @type {CryptoLib}
 */
const cryptoLib = hypercore.CryptoLib.getInstance()
const CryptoBook = hypercore.CryptoBook

class KeyStore extends DataObject {
  constructor (storage, key, opts) {
    super(storage, key, opts)

    const self = this
    this.getDb().then(db => db.on('ready', function(err) {
      if (err) throw err

      cryptoLib.registerOnBookNotFound(tryRegisterKey)
    }))

    function tryRegisterKey (id, cb) {
      self.get(id).then((book) => {
        if (book){ 
          cryptoLib.addBook(id, book)
          cb(book)
        }
      })
    }
  }
}
