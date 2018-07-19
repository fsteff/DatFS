const datDefaults = require('dat-swarm-defaults')
const extend = require('xtend')

module.exports = function (opts) {
  opts = Object.assign({}, opts)
  opts.native = opts.native || {}
  opts.proxy = opts.proxy || {}
  return {
    native: datDefaults(opts.native),
    proxy: extend({
      server: ['sw://localhost:3495']
    }, opts.proxy)
  }
}
