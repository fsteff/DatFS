const hypercore = require('hypercore-encrypted')
const Q = require('q')

const CryptoBook = hypercore.CryptoBook
const cryptoLib = hypercore.CryptoLib.getInstance()

class CryptoLibUtils {
  static getBook (key) {
    const keyStr = typeof key === 'string' ? key : key.toString('hex')
    const def = Q.defer()

    const book = cryptoLib.getBook(keyStr, true)
    if (book) {
      onBook(book)
    } else {
      cryptoLib._onBookNotFound.forEach(handler => call(handler))
    }

    function call (handler) {
      try {
        const retval = handler(keyStr, onBook)
        // handler can return nothing (-> then cb is used), a CryptoBook, or a Promise
        if (retval instanceof CryptoBook) onBook(retval)
        else if (typeof retval === 'object') retval.then(onBook).done()
      } catch (err) {
        console.error(err)
      }
    }

    function onBook (book) {
      // TODO: can this work?
      if (book && !(book instanceof Error)) def.resolve(book)
      else if (book instanceof Error) throw book
    }

    return def.promise
  }
}

module.exports = CryptoLibUtils
