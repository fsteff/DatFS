const DataObject = require('./DataObject')
const debug = require('debug')('Entity')
const multihashes = require('multihashes')
const crypto = require('sodium-universal')
const Q = require('q')

class Entity extends DataObject {
  constructor (storage, key, opts) {
    super(storage, key, opts)

    this.getKey().then(key => debug('created Entity ' + key.toString('hex')))
  }

  getProfile () {
    return this.get('/profile').then(decode)

    function decode (str) {
      if (str && typeof str === 'string') {
        let json = JSON.parse(str)
        return json
      } else {
        throw new Error('invalid profile')
      }
    }
  }

  getName () {
    const self = this
    return this.getProfile().then(extract)

    function extract (data) {
      if (data && data.name) {
        return data.name
      } else {
        return self.getKey().then(key => key.toString('hex'))
      }
    }
  }

  getOutboxNames () {
    return this.get('/outbox').then(extract)

    function extract (data) {
      let names = []
      if (data && Array.isArray(data)) {
        data.forEach(node => {
          names.push(node.key)
        })
      }
      return names
    }
  }

  getOutboxFor (key) {
    const def = Q.defer()
    if (key instanceof DataObject) {
      key.getKey().then(calc)
    } else {
      calc()
    }
    return def.promise

    function calc () {
      // TODO: find more secure than just the hash
       let buf = new Buffer(crypto.crypto_generichash_BYTES)
       let val = crypto.crypto_generichash(buf, key)
       def.resolve(buf.toString('hex'))
    }
  }
}

module.exports = Entity
