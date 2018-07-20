// const crypto = require('sodium-universal')
const hypercore = require('hypercore-encrypted')
// const Base64 = require('js-base64').Base64
const utils = require('./CryptoLibUtils')
const Q = require('q')
const debug = require('debug')('Outbox')

class Outbox {
  constructor (from, to, storage, key, sealedbox) {
    this._feed = null
    this._feedPromise = Q.defer()
    this.from = from
    this.to = to
    this.key = key || null

    const self = this

    if (sealedbox) {
      this._openSealedBox(sealedbox).then(create, error)
    } else {
      create()
    }

    function create () {
      const core = hypercore(storage, key, {valueEncoding: 'utf-8'})
      core.ready(function (err) {
        if (err) return error(err)
        self._feed = core
        self._feedPromise.resolve(core)
        debug('outbox ' + core.key.toString('hex') + ' is ready')
      })
    }

    function error (err) {
      if (err) this._feedPromise.reject(err)
      debug(err)
    }
  }

  getFeed () {
    const def = Q.defer()
    if (this._feed) def.resolve(this._feed)
    else this._feedPromise.promise.then(feed => def.resolve(feed), err => def.reject(err))
    return def.promise
  }

  getKey () {
    const def = Q.defer()
    this.getFeed().then(feed => def.resolve(feed.key), err => def.reject(err))
    return def.promise
  }

  getDiscoveryKey () {
    const def = Q.defer()
    this.getFeed().then(feed => def.resolve(feed.discoveryKey), err => def.reject(err))
    return def.promise
  }

  getSealedBox () {
    const def = Q.defer()
    this.getFeed().then(onFeed, error)
    let feed = null
    return def.promise

    function onFeed (f) {
      feed = f
      utils.getBook(feed.key).then(onBook, error)
    }

    function onBook (b) {
      let book = b.serialize()
      let data = {}
      data.book = book
      data.key = feed.key
      // let serialized = JSON.stringify(data)
      // TODO: crypto_box
    }

    function error (err) {
      if (err) def.reject(err)
    }
  }

  _openSealedBox (sealedbox) {
    const def = Q.defer()
    // TODO
    return def.promise
  }
}

module.exports = Outbox
