const DataObject = require('./DataObject')
const hypercore = require('hypercore-encrypted')
const CryptoBook = hypercore.CryptoBook
const Q = require('q')

/**
 * @type {CryptoLib}
 */
const cryptoLib = hypercore.CryptoLib.getInstance()

class KeyStore extends DataObject {
  constructor (storage, key, opts) {
    super(storage, key, opts)
    this._populated = Q.defer()

    const self = this
    this.getDb().then(() => {
      cryptoLib.registerOnBookNotFound(tryRegisterKey)
    })

    function tryRegisterKey (id, cb) {
      self.getKeyBook(id).then((book) => {
        if (book) {
          let deserialized = new CryptoBook(book)
          cryptoLib.addBook(id, deserialized)
          cb(deserialized)
        }
      }, err => { throw err })
    }
  }

  getKeyBook (id) {
    const def = Q.defer()
    const self = this
    id = typeof id === 'string' ? id : id.toString('hex')
    this.populated().then(get, error).done(null, error)
    return def.promise

    function get () {
      self.get(id).then(entry => {
        if (entry && entry.length > 0) {
          let book = entry[0].value
          def.resolve(book)
        } else {
          def.reject(new Error('KeyBook not found'))
        }
      }, (err) => {
        def.reject(err)
      })
    }

    function error (err) {
      def.reject(err)
    }
  }

  populated () {
    return this._populated.promise
  }

  setPopulated () {
    this._populated.resolve()
  }

  cancelPopulated () {
    this._populated.reject()
  }
}

module.exports = KeyStore
