const DataObject = require('./DataObject')
const Outbox = require('./Outbox')
const debug = require('debug')('Entity')
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

  /**
   *
   * @param {Entity} other
   * @param {random-access-*} storage
   * @returns {Promise<Outbox>}
   */
  getOutboxFor (other, storage) {
    const self = this
    let name = null
    let key = null
    if (!storage) {
      throw new Error('getOubox* needs a storage specified')
    }
    return other.getKey().then(calc)

    function calc (k) {
      key = k
      return self._calcOutboxSecret(key).then(onSecret)
    }

    function onSecret (secret) {
      name = secret.toString('hex')
      return self.get('/outbox/' + name).then(onCipher)
    }

    function onCipher (cipher) {
      if (cipher && Array.isArray(cipher) && cipher.length > 0) cipher = cipher[0].value
      else cipher = null
      const box = new Outbox(self, other, storage, cipher)

      if (cipher) {
        return box
      } else {
        return box.getSealedBox().then(data => {
          self.put('/outbox/' + name, data)
        }).then(() => {
          return box
        })
      }
    }
  }

  getOutboxFrom (other, storage) {
    return other.getOutboxFor(this, storage)
  }

  _calcOutboxSecret (entityKey) {
    const def = Q.defer()
    let secretKey
    this.getDb().then(onDb, error).done()
    return def.promise

    function onDb (db) {
      secretKey = db.source.secretKey
      let secret = Buffer.alloc(crypto.crypto_scalarmult_BYTES)
      crypto.crypto_scalarmult(secret, secretKey, entityKey)
      def.resolve(secret)
    }

    function error (err) {
      if (err) def.reject(err)
    }
  }
}

module.exports = Entity
