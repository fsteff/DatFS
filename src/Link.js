const DataObject = require('./DataObject')
const Entity = require('./Entity')
const Encoding = require('./Encoding')

const PREFIX = 'dat://'
const DATAOBJECT = PREFIX + 'dataobject#'
const ENTITY = PREFIX + 'entity#'

class Link {
  constructor (obj) {
    this.link = null
    if (obj && typeof obj === 'string') {
      if (obj.startsWith(DATAOBJECT) || obj.startsWith(ENTITY)) {
        this.link = obj
      } else {
        throw new Error('invalid link string: ' + obj)
      }
    } else {
      throw new Error('invalid parameter obj: has to be a string')
    }
  }

  serialize () {
    return this.link
  }

  create (storage) {
    if (this.link.startsWith(DATAOBJECT)) {
      const key = this.link.substring(DATAOBJECT.length)
      return new DataObject(storage, key)
    }
    if (this.link.startsWith(ENTITY)) {
      const key = this.link.substring(ENTITY.length)
      return new Entity(storage, key)
    }
  }

  static fromObject (obj) {
    let name = null
    if (obj instanceof Entity) {
      name = ENTITY
    } else if (obj instanceof DataObject) {
      name = DATAOBJECT
    } else {
      throw new Error('not instance of Entity or DataObject')
    }
    return obj.getKey().then(key => new Link(name + key.toString('hex')))
  }
}

Encoding.registerConstructor(str => new Link(str), 'Link')

module.exports = Link
