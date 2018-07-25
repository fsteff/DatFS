const varint = require('varint')

const TYPE_BUFFER = 0
const TYPE_STRING = 1
const TYPE_SERIALIZEABLE = 2
global.__DatFSEncodingClasses = {}
const classes = global.__DatFSEncodingClasses

// TODO much untested

class Encoding {
  static encode (data) {
    let type
    let buf
    if (Buffer.isBuffer(data)) {
      type = TYPE_BUFFER
      buf = data
    } else if (typeof data === 'string') {
      type = TYPE_STRING
      buf = Buffer.from(data, 'utf8')
    } else if (data.serialize && typeof data.serialize === 'function' && data.constructor) {
      type = TYPE_SERIALIZEABLE
      try {
        const name = Buffer.from(data.constructor.name)
        let lenbuf = Buffer.from(varint.encode(name.byteLength))
        buf = Buffer.concat([lenbuf, Buffer.from(name), Buffer.from(data.serialize())])
      } catch (e) {
        throw new Error('object serialisation failed: ' + e)
      }
    }
    let typebuf = Buffer.from(varint.encode(type))
    return Buffer.concat([typebuf, buf])
  }

  static decode (data) {
    let type = varint.decode(data, 0)
    let offs = varint.decode.bytes
    switch (type) {
      case TYPE_BUFFER:
        return Buffer.from(data.buffer, offs + data.byteOffset, offs + data.byteOffset + data.byteLength)
      case TYPE_STRING:
        return data.toString('utf8', offs)
      case TYPE_SERIALIZEABLE:
        const len = varint.decode(data, offs)
        offs += varint.decode.bytes
        const name = data.toString('utf8', offs, offs + len).toString()
        if (!classes[name]) {
          throw new Error('cannot decode unknown class name: ' + name)
        }
        return classes[name](data.toString('utf8', offs + len))
      default:
        throw new Error('cannot decode unknown type: id=' + type)
    }
  }

  static registerConstructor (foo, name) {
    classes[name] = foo
  }
}

module.exports = Encoding
