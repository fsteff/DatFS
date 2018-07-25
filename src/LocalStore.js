const DataObject = require('./DataObject')
const Link = require('./Link')
const rad = require('random-access-directory')


class LocalStore {
  constructor (storage) {
    this.storage = rad(storage)
    this.db = new DataObject(this.storage('localstore'))

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

  link (path, db) {
    const self = this
    if (typeof path !== 'string') throw new Error('path has to be of type string')
    if (!(db instanceof Link) && !(db instanceof DataObject)) throw new Error('db is invalid')
    if (!(db instanceof Link)) return Link.fromObject(db).then(link => self.link(path, link)).done()

    if (!path.startsWith('/')) path = '/' + path
    let split = path.split('/')

    this._insertLink(split, db)
    this.db.put('/links' + path, db)
  }

  _insertLink (split, link) {
    let current = this.links
    for (let i = 0; i < split.length; i++) {
      if (split[i].length === 0) continue
      if (current[split[i]]) {
        current = current[split[i]]
      } else {
        current[split[i]] = {}
        current = current[split[i]]
      }
    }
    current = link
  }
}

module.exports = LocalStore
