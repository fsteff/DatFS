const DB = require('hyperdb-encrypted')
const PublicDB = require('hyperdb')
const Q = require('q')
const utils = require('./CryptoLibUtils')
const Swarm = require('./Swarm')
const debug = require('debug')('DataObject')

// KeyStore is lazy loaded to avoid cyclic references
let KeyStore = null

class DataObject {
  constructor (storage, key, opts) {
    opts = Object.assign({}, opts)
    this.encrypted = !opts.noEncryption
    const create = opts.noEncryption ? PublicDB : DB
    const self = this
    this._db = null
    this._dbPromise = Q.defer()

    const keyStr = key ? key.toString('hex') : null
    if (key && this.encrypted) {
      utils.getBook(keyStr).then(createNow, (error) => {
        debug('could not find any keys for ' + keyStr + ' because of: ' + error)
      })
    } else {
      createNow()
    }

    function createNow () {
      if (!self._db) {
        const db = create(storage, key, opts)
        debug('created hyperdb for ' + keyStr)
        db.ready(() => {
          debug('hyperdb for ' + keyStr + ' is ready')
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
    opts = Object.assign({}, opts)
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

  joinNetwork (opts) {
    opts = Object.assign({}, opts)

    const def = Q.defer()
    this.getDb().then(createStream)

    function createStream (db) {
      const stream = function (peer) {
        var stream = db.replicate({
          upload: !(opts.upload === false),
          download: opts.download, // ok like that?
          live: !opts.end
        })
        stream.on('close', function () {
          debug('Stream close')
        })
        stream.on('error', function (err) {
          debug('Replication error:', err.message)
        })
        stream.on('end', function () {
          debug('Replication stream ended')
        })
        return stream
      }

      const swarm = new Swarm(stream, opts)
      swarm.join(db.discoveryKey, { announce: !(opts.upload === false) })

      def.resolve(swarm)
    }
    return def.promise
  }
}

module.exports = DataObject
