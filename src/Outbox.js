const _crypto = require('./Crypto')
// TODO: add libsodium-wrappers, sodium-javascript does not include sealed boxes
const hypercore = require('hypercore-encrypted')
const Swarm = require('./Swarm')
const CryptoBook = hypercore.CryptoBook
const cryptoLib = hypercore.CryptoLib.getInstance()
const utils = require('./CryptoLibUtils')
const Q = require('q')
const debug = require('debug')('Outbox')
let crypto = null

class Outbox {
  /**
   *
   * @param {Entity} from parent entity
   * @param {Buffer} to recipient entity
   * @param {random-access-*} storage for the outbox
   * @param {string} sealedbox Base64 encoded sealed box
   */
  constructor (from, to, storage, sealedbox) {
    this._feed = null
    this._feedPromise = Q.defer()
    this.to = to
    this.from = from
    this.key = null

    const self = this

    function onCrypto () {
      if (sealedbox) {
        self._openSealedBox(sealedbox).then(create, error)
      } else {
        create()
      }
    }

    _crypto.then(sodium => {
      crypto = sodium
    }).then(onCrypto).done()

    function create () {
      const core = hypercore(storage, self.key, {valueEncoding: 'utf-8'})
      core.ready(function (err) {
        if (err) return error(err)
        self._feed = core
        self._feedPromise.resolve(core)
        debug('outbox ' + toHex(core.key) + ' is ready')
      })
    }

    function error (err) {
      if (err) self._feedPromise.reject(err)
      debug(err.toString())
    }
  }

  getFeed () {
    const def = Q.defer()
    if (this._feed) def.resolve(this._feed)
    else {
      this._feedPromise.promise.then(
        feed => def.resolve(feed),
        err => def.reject(err)).done()
    }
    return def.promise
  }

  getKey () {
    const def = Q.defer()
    this.getFeed().then(feed => def.resolve(feed.key), err => def.reject(err)).done()
    return def.promise
  }

  getDiscoveryKey () {
    const def = Q.defer()
    this.getFeed().then(feed => def.resolve(feed.discoveryKey), err => def.reject(err)).done()
    return def.promise
  }

  append (data) {
    const def = Q.defer()
    this.getFeed().then(onFeed, error).catch(error).done()
    return def.promise

    function onFeed (feed) {
      feed.append(data, err => {
        if (err) error(err)
        def.resolve()
      })
    }

    function error (err) {
      if (err) def.reject(err)
      debug(err.toString())
    }
  }

  get (index) {
    const def = Q.defer()
    this.getFeed().then(onFeed, error).catch(error).done()
    return def.promise

    function onFeed (feed) {
      feed.get(index, (err, data) => {
        if (err) error(err)
        def.resolve(data)
      })
    }

    function error (err) {
      if (err) def.reject(err)
      debug(err.toString())
    }
  }

  getSealedBox () {
    const def = Q.defer()
    const self = this
    this.getFeed().then(onFeed, error).done()
    let feed = null
    let toKey = null
    return def.promise

    function onFeed (f) {
      feed = f
      return self.to.getKey()
        .then(onKey)
        .then(getBook)
    }

    function getBook () {
      return utils.getBook(feed.key)
        .then(onBook, error)
        .catch(error)
        .done()
    }

    function onKey (key) {
      // need to convert key from ed25519 to curve25519
      toKey = crypto.crypto_sign_ed25519_pk_to_curve25519(key)
    }

    function onBook (b) {
      let book = b.serialize()
      let data = {}
      data.book = book
      data.key = toHex(feed.key)
      let serialized = JSON.stringify(data)
      let msgBuffer = Buffer.from(serialized)
      let cipherBuffer = crypto.crypto_box_seal(msgBuffer, toKey)
      let cipherStr = toHex(cipherBuffer)
      def.resolve(cipherStr)
    }

    function error (err) {
      if (err) def.reject(err)
    }
  }

  _openSealedBox (sealedbox) {
    if (typeof sealedbox !== 'string') { sealedbox = sealedbox.toString() }
    const sealedBuf = Buffer.from(sealedbox, 'hex')
    const self = this
    return this.to.getDb().then(onDb)

    function onDb (db) {
      // need to convert keys from ed25519 to curve25519
      const pk = crypto.crypto_sign_ed25519_pk_to_curve25519(db.source.key)

      const sk = crypto.crypto_sign_ed25519_sk_to_curve25519(db.source.secretKey)

      if (!sk) throw new Error('Entity´s secret key not available')

      const msgBuf = crypto.crypto_box_seal_open(sealedBuf, pk, sk)
      if (!msgBuf || isZero(msgBuf)) {
        throw new Error('could not decrypt the sealed box')
      }
      const msgStr = toString(msgBuf)
      return onData(msgStr)
    }

    function isZero (buf) {
      for (let i = 0; i < buf.length; i++) {
        if (buf[i] !== 0) return false
      }
      return true
    }

    function onData (str) {
      const data = JSON.parse(str)
      if (!data.key || !data.book) {
        throw new Error('invalid sealedBox data - does not contain .key and/or .book')
      }

      self.key = Buffer.from(data.key, 'hex')
      // let the book register itself to the cryptoLib
      let book = new CryptoBook(data.book)
      cryptoLib.addBook(self.key, book)
      // TODO: add to local keystore?
    }
  }

  joinNetwork (opts) {
    opts = Object.assign({}, opts)

    const def = Q.defer()
    this.getFeed().then(createStream).done()

    function createStream (feed) {
      const stream = function (peer) {
        var stream = feed.replicate({
          upload: !(opts.upload === false),
          download: opts.download, // TODO: ok like that?
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
      swarm.join(feed.discoveryKey, { announce: !(opts.upload === false) }, () => {
        debug('got a connection')
      })

      def.resolve(swarm)
    }
    return def.promise
  }
}

function toHex (buffer) {
  if (typeof window !== 'undefined') {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('')
  } else {
    return buffer.toString('hex')
  }
}

function toString (buffer) {
  if (!buffer) {
    throw new Error('nullpointer buffer')
  }
  if (typeof window !== 'undefined') {
    let encodedString = String.fromCharCode.apply(null, buffer)
    let decodedString = decodeURIComponent(escape(encodedString))
    return decodedString
  } else {
    return buffer.toString('utf8')
  }
}

module.exports = Outbox
