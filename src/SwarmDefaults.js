const datDefaults = require('dat-swarm-defaults')
const extend = require('xtend')

module.exports = function (opts) {
  opts = Object.assign({}, opts)
  opts.native = Object.assign({}, opts.native)
  opts.proxy = Object.assign({}, opts.proxy)
  return {
    native: datDefaults(opts.native),
    proxy: extend({
      server: ['ws://localhost:3495']
    }, opts.proxy)
  }
}
