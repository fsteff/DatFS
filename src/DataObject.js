const DB = require('hyperdb-encrypted')
const PublicDB = require('hyperdb')
const Q = require('q')
const utils = require('./CryptoLibUtils')

// KeyStore is lazy loaded to avoid cyclic references
let KeyStore = null

class DataObject {
  constructor (storage, key, opts) {
    opts = opts || {}
    this.encrypted = !opts.noEncryption
    const create = opts.noEncryption ? PublicDB : DB
    const self = this
    this._db = null
    this._dbPromise = Q.defer()

    const keyStr = key ? key.toString('hex') : null
    if (key && this.encrypted) {
      utils.getBook(keyStr).then(createNow)
    } else {
      createNow()
    }

    function createNow () {
      if (!self._db) {
        const db = create(storage, key, opts)
        db.on('ready', () => {
          self._db = db
          self._dbPromise.resolve(self._db)
        })
      }
    }
  }

  getDb () {
    const self = this
    if (this._db) return Q.fcall(() => { return self._db })
    else return this._dbPromise.promise
  }

  put (key, value, opts) {
    const def = Q.defer()
    this.getDb().then(db => db.put(key, value, opts, (err) => {
      if (err) def.reject(err)
      else def.resolve()
    }))
    return def.promise
  }

  get (key, opts) {
    const def = Q.defer()
    this.getDb().then(db => 
      db.get(key, opts, (err, data) => {
        if (err) def.reject(err)
        else def.resolve(data)
    }))
    return def.promise
  }

  del (key) {
    const def = Q.defer()
    this.getDb().then(db => db.del(key, (err) => {
      if (err) def.reject(err)
      else def.resolve()
    }))
    return def.promise
  }

  createKeyStore (storage, noEncryption) {
    noEncryption = noEncryption || false

    // lazy load KeyStore
    if (!KeyStore) KeyStore = require('./KeyStore')

    const store = new KeyStore(storage, null, {noEncryption: noEncryption})
    this.getDb().then(db => {
      db.feeds.forEach(feed => {
        const key = feed.key.toString('hex')
        utils.getBook(key).then(book => store.put(key, book))
      })
    })
    return store
  }
}

module.exports = DataObject
