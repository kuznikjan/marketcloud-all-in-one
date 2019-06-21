var Resource = require('../libs/resource.js')
var Types = require('../models/types.js')

var resource = Resource({
  singularResourceName: 'content',
  pluralResourceName: 'contents',
  validator: Types.Content,
  hooks: {
    afterGetById: populateProducts,
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

function populateProducts (req, res, next) {
  if (req.toSend.items && req.toSend.items.length > 0) {
    // console.log(items);
    // var products = req.toSend.items.split(',')
    // var ids = products.map(function (id) {
    //   return parseInt(id)
    // })

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
