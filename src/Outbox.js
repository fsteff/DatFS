const crypto = require('sodium-universal')
// TODO: add libsodium-wrappers, sodium-javascript does not include sealed boxes
const hypercore = require('hypercore-encrypted')
const Swarm = require('./Swarm')
const CryptoBook = hypercore.CryptoBook
const Base64 = require('js-base64').Base64
const utils = require('./CryptoLibUtils')
const Q = require('q')
const debug = require('debug')('Outbox')

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

    if (sealedbox) {
      this._openSealedBox(sealedbox).then(create, error)
    } else {
      create()
    }

    function create () {
      const core = hypercore(storage, self.key, {valueEncoding: 'utf-8'})
      core.ready(function (err) {
        if (err) return error(err)
        self._feed = core
        self._feedPromise.resolve(core)
        debug('outbox ' + core.key.toString('hex') + ' is ready')
      })
    }

    function error (err) {
      if (err) this._feedPromise.reject(err)
      debug(err.toString())
    }
  }

  getFeed () {
    const def = Q.defer()
    if (this._feed) def.resolve(this._feed)
    else this._feedPromise.promise.then(feed => def.resolve(feed), err => def.reject(err)).done()
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
      toKey = key
    }

    function onBook (b) {
      let book = b.serialize()
      let data = {}
      data.book = book
      data.key = feed.key.toString('hex')
      let serialized = JSON.stringify(data)
      let msgBuffer = Buffer.from(serialized)
      let cipherBuffer = Buffer.alloc(crypto.crypto_box_SEALBYTES + msgBuffer.length)
      crypto.crypto_box_seal(cipherBuffer, msgBuffer, toKey)
      let str = cipherBuffer.toString('hex')
      let cipherStr = str // Base64.btoa(str)
      //console.log(str + '\n -> ' + cipherStr + '\n #################################')
      def.resolve(cipherStr)
    }

    function error (err) {
      if (err) def.reject(err)
    }
  }

  _openSealedBox (sealedbox) {
    if (typeof sealedbox !== 'string') { sealedbox = sealedbox.toString() } // utf-8?
    const sealed64 = sealedbox // Base64.atob(sealedbox)
    //console.log(sealedbox + '\n -> ' + sealed64+ '\n #################################')
    const sealedBuf = Buffer.from(sealed64, 'hex')
    const self = this
    return this.to.getDb().then(onDb)

    function onDb (db) {
      const sk = db.source.secretKey
      const pk = db.key
      if (!sk) throw new Error('Entity´s secret key not available')

      const msgBuf = Buffer.alloc(sealedBuf.length - crypto.crypto_box_SEALBYTES)
      crypto.crypto_box_seal_open(msgBuf, sealedBuf, pk, sk)
      const msgStr = msgBuf.toString()
      return onData(msgStr)
    }

    function onData (str) {
      const data = JSON.parse(str)
      if (!data.key || !data.book) {
        throw new Error('invalid sealedBox data - does not contain .key and/or .book')
      }

      self.key = Buffer.from(data.key, 'hex')
      // let the book register itself to the cryptoLib
      return new CryptoBook(data.book)
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
      swarm.join(feed.discoveryKey, { announce: !(opts.upload === false) })

      def.resolve(swarm)
    }
    return def.promise
  }
}

module.exports = Outbox
