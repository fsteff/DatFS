const Proxy = require('discovery-proxy/client')
const defaults = require('./SwarmDefaults')
const Q = require('q')
const websocket = require('websocket-stream')
var nativeSwarm
if (typeof window === 'undefined') {
  nativeSwarm = require('discovery-swarm')
}

class Swarm {
  constructor (stream, opts) {
    const self = this
    opts = Object.assign({}, opts)
    let config = defaults(opts)
    this.joined = []

    if (nativeSwarm) { // eslint-disable-line
      config.native.stream = stream
      this.swarm = nativeSwarm(config.native)
      this.swarm.once('error', () => self.swarm.listen(0))
      this.swarm.listen(opts.port || 3282)
    } else {
      for (let i = 0; (!this.swarm) && i < config.proxy.server.length; i++) {
        let ws
        try {
          if (typeof WebSocket !== 'undefined') { // eslint-disable-line
            // in the browser
            let socket = new WebSocket(config.proxy.server[i]) // eslint-disable-line
            socket.binaryType = 'arraybuffer'
            ws = websocket(socket)
          } else {
            // in node
            ws = websocket(config.proxy.server[i])
          }
          config.proxy.stream = stream
          config.proxy.connection = ws
          this.swarm = new Proxy(config.proxy)
        } catch (err) {
          console.error(err)
        }
      }
    }
  }

  join (key, opts, cb) {
    this.joined.push(key)
    this.swarm.join(key, opts, cb)
  }

  leave (key, port) {
    this.swarm.leave(key, port)
  }

  close () {
    const def = Q.defer()
    const self = this
    this.joined.forEach(key =>
      self.leave(key))
    // destroy is only available on native
    if (typeof this.swarm.destroy === 'function') {
      this.swarm.destroy(function () {
        delete this.swarm
        def.resolve()
      })
    }
    return def.promise
  }
}

module.exports = Swarm
