// discovery-proxy is not ready for this usecase
// const Proxy = require('discovery-proxy/client')
const defaults = require('./SwarmDefaults')
const Q = require('q')
// const websocket = require('websocket-stream')
var nativeSwarm
try {
  nativeSwarm = require('discovery-swarm')
} catch (err) {
  console.log('native tcp/utp discovery-swarm not supported')
}

class Swarm {
  constructor (stream, opts) {
    const self = this
    opts = Object.assign({}, opts)
    let config = defaults(opts)
    this.joined = []

    if (nativeSwarm) {
      config.native.stream = stream
      this.swarm = nativeSwarm(config.native)
      this.swarm.once('error', () => self.swarm.listen(0))
      this.swarm.listen(opts.port || 3282)
    } else {
      console.error('discovery-proxy not supported (for now)')
    }

    /* else{
            for(let i = 0; (! this.swarm) && i < config.proxy.server.length; i++){
                let ws;
                try{
                    if(WebSocket){
                        // in the browser
                        let socket = new WebSocket(config.proxy.server[i])
                        socket.binaryType = 'arraybuffer'
                        ws = websocket(socket)
                    }else{
                        // in node
                        ws = websocket(config.proxy.server[i])
                    }
                    let dss = new Proxy({
                        connection: ws,
                    })
                }

            }
        } */
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
    this.swarm.destroy(function () {
      delete this.swarm
      def.resolve()
    })
    return def.promise
  }
}

module.exports = Swarm
