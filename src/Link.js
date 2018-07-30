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
      this.link = obj
    } else {
      throw new Error('invalid parameter obj: has to be a string')
    }
  }

  serialize () {
    return this.link
  }

  getKey (toBuffer) {
    let key = null
    if (this.link.startsWith(DATAOBJECT)) {
      key = this.link.substring(DATAOBJECT.length)
    } else if (this.link.startsWith(ENTITY)) {
      key = this.link.substring(ENTITY.length)
    } else {
      throw new Error('cannot get Key, does not refer to a DataObject')
    }
    if (toBuffer && key) {
      return Buffer.from(key, 'hex')
    } else {
      return key
    }
  }

  create (storage) {
    if (this.link.startsWith(DATAOBJECT)) {
      const key = this.link.substring(DATAOBJECT.length)
      return new DataObject(storage, key)
    } else if (this.link.startsWith(ENTITY)) {
      const key = this.link.substring(ENTITY.length)
      return new Entity(storage, key)
    } else {
      throw new Error('cannot instantiate, link does not refer to a DataObject')
    }
  }

  isDataObject () {
    return this.link.startsWith(DATAOBJECT) || this.link.startsWith(ENTITY)
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
