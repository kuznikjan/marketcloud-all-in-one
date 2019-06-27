var Resource = require('../libs/resource.js')
var Types = require('../models/types.js')

var Promise = require('bluebird')
var mongoskin = require('mongoskin')
Object.keys(mongoskin).forEach(function (key) {
  var value = mongoskin[key]
  if (typeof value === 'function') {
    Promise.promisifyAll(value)
    Promise.promisifyAll(value.prototype)
  }
})
Promise.promisifyAll(mongoskin)

var resource = Resource({
  singularResourceName: 'content',
  pluralResourceName: 'contents',
  validator: Types.Content,
  hooks: {
    afterGetById: populateProducts,
    afterList: populateProductsList,
    beforeUpdate: rmemovePopulatedProperties
  }
})

function rmemovePopulatedProperties (req, res, next) {
  var propertiesToRemove = ['products']

  propertiesToRemove.forEach(function (p) {
    delete req.body[p]
  })

  next()
}

function populateProductsList (req, res, next) {
  const promises = []

  for (let i = 0; i < req.toSend.length; i++) {
    if (req.toSend[i].items && req.toSend[i].items.length > 0) {
      const promise = req.app.get('mongodb').collection('products').find({id: {$in: req.toSend[i].items}}).toArrayAsync()
      promises.push(promise)
    } else {
      promises.push(Promise.resolve([]))
    }
  }

  return Promise.all(promises)
  .then((res) => {
    for (let i = 0; i < req.toSend.length; i++) {
      req.toSend[i].products = res[i]
    }
    next()
  })
}

function populateProducts (req, res, next) {
  if (req.toSend.items && req.toSend.items.length > 0) {
    req.app.get('mongodb')
      .collection('products')
      .find({
        id: {
          $in: req.toSend.items
        }
      })
      .toArray(function (err, docs) {
        if (err) {
          throw err
        }

        req.toSend.products = docs
        next()
      })
  } else {
    next()
  }
}

module.exports = resource.router
