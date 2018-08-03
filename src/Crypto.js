const Q = require('q')
const deferred = Q.defer()
let crypto
let isNative = false
try {
  if (typeof window === 'undefined') {
    crypto = require('sodium-native')
    isNative = true
  } else throw Error('inside browser')
} catch (e) {
  crypto = require('libsodium-wrappers')
}

// the two apis are different...
if (isNative) {
  const oldConvertPk = crypto.crypto_sign_ed25519_pk_to_curve25519
  crypto.crypto_sign_ed25519_pk_to_curve25519 = function (key) {
    let pk = Buffer.alloc(crypto.crypto_box_PUBLICKEYBYTES)
    oldConvertPk(pk, key)
    return pk
  }

  const oldConvertSk = crypto.crypto_sign_ed25519_sk_to_curve25519
  crypto.crypto_sign_ed25519_sk_to_curve25519 = function (key) {
    const sk = Buffer.alloc(crypto.crypto_box_SECRETKEYBYTES)
    oldConvertSk(sk, key)
    return sk
  }

  let oldBox = crypto.crypto_box_seal
  crypto.crypto_box_seal = function (buffer, key) {
    let cipherBuffer = Buffer.alloc(crypto.crypto_box_SEALBYTES + buffer.length)
    oldBox(cipherBuffer, buffer, key)
    return cipherBuffer
  }

  let oldBoxOpen = crypto.crypto_box_seal_open
  crypto.crypto_box_seal_open = function (sealedBuf, pk, sk) {
    const msgBuf = Buffer.alloc(sealedBuf.length - crypto.crypto_box_SEALBYTES)
    let succ = oldBoxOpen(msgBuf, sealedBuf, pk, sk)
    if (!succ) {
      throw new Error('could not decrypt the sealed box')
    }
    return msgBuf
  }
}

if (isNative) {
  deferred.resolve(crypto)
} else {
  crypto.ready.then(() => {
    deferred.resolve(crypto)
  })
}

module.exports = deferred.promise
