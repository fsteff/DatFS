const DataObject = require('./DataObject')
const Link = require('./Link')
const rad = require('random-access-directory')
const Q = require('q')

class LocalStore {
  constructor (storage) {
    this.storage = rad(storage)
    this.db = new DataObject(this.storage('localstore'))

    this.children = {}
    this.links = {}

    const self = this
    this.db.get('/links').then(arr => {
      if (arr && Array.isArray(arr)) {
        arr.forEach(l => {
          let path = l.key.substring(6)
          let link = l.value
          self._insertLink(path, link)
        })
      }
    }).catch(err => {
      console.error('cannot load links: ' + err)
    }).done()
  }

  put (path, value) {
    const child = this.getDataObject(path)
    if (!child) throw new Error('invalid path')
    const rest = path.substring(child.relpath.length)
    return child.db.put(rest, value)
  }

  get (path) {
    const child = this.getDataObject(path)
    if (!child) throw new Error('invalid path')
    const rest = path.substring(child.relpath.length)
    return child.db.get(rest)
  }

  link (path, db) {
    const self = this
    const def = Q.defer()
    if (typeof path !== 'string') throw new Error('path has to be of type string')
    if (!(db instanceof Link) && !(db instanceof DataObject)) throw new Error('db is invalid')
    if (!(db instanceof Link)) onDb().catch(error).done()
    else createLink(path, db)
    return def.promise

    function createLink (path, link) {
      const split = self._splitPath(path)

      self._insertLink(split, link)
      self.db.put('/links' + path, link).then(() => {
        def.resolve()
      })
    }

    function onDb () {
      return db.getKey()
        .then(key => {
          self.children[key.toString('hex')] = db
        })
        .then(toLink)
        .catch(error)
    }

    function toLink () {
      return Link.fromObject(db)
        .then(link => createLink(path, link))
    }

    function error (err) {
      def.reject(err)
    }
  }

  getDataObject (path) {
    const split = this._splitPath(path)
    let current = this.links
    let retval = {db: this.db, relpath: ''}
    let i
    for (i = 0; i < split.length && !(current instanceof Link); i++) {
      if (split[i].length === 0) continue
      if (current[split[i]]) {
        current = current[split[i]]
      } else {
        return null
      }
    }
    if (current instanceof Link) {
      const key = current.getKey()
      if (key) {
        let relpath = '/'
        for (let i2 = 0; i2 < i; i2++) {
          relpath += split[i2] + '/'
        }
        retval = {relpath: relpath}
        if (this.children[key]) {
          retval.db = this.children[key]
        } else {
          retval.db = current.create(this.storage)
          this.children[key] = retval.db
        }
      }
    }
    return retval
  }

  _insertLink (split, link) {
    let current = this.links
    let i = 0
    for (; i < split.length - 1; i++) {
      if (current[split[i]]) {
        current = current[split[i]]
      } else {
        current[split[i]] = {}
        current = current[split[i]]
      }
    }
    current[split[i]] = link
  }

  _splitPath (path) {
    let split = path.split('/')
    for (let i = 0; i < split.length; i++) {
      if (split[i].length === 0) {
        split.splice(i, 1)
      }
    }
    return split
  }
}

module.exports = LocalStore
