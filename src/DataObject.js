const DB = require('hyperdb-encrypted')
const PublicDB = require('hyperdb')
const hypercore = require('hypercore-encrypted')
const Q = require('q')

class DataObject {
  constructor (storage, key, opts) {
    opts = opts || {}
    this.encrypted = !opts.noEncryption
    const create = opts.noEncryption ? PublicDB : DB

    this.db = create(storage, key, opts)
  }

  getDb () {
    return this.db
  }

  put (key, value, opts) {
    const def = Q.defer()
    this.db.put(key, value, opts, (err) => {
      if (err) def.reject(err)
      else def.resolve()
    })
    return def.promise
  }

  get (key, opts) {
    const def = Q.defer()
    this.db.get(key, opts, (err, data) => {
      if (err) def.reject(err)
      else def.resolve(data)
    })
    return def.promise
  }

  del (key) {
    const def = Q.defer()
    this.db.del(key, (err) => {
      if (err) def.reject(err)
      else def.resolve()
    })
    return def.promise
  }
}

module.exports = DataObject
