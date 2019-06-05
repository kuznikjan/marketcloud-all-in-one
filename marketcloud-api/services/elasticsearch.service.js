'use strict'

var elasticsearch = require('elasticsearch')
var configuration = require('../config/default.js')

// Singleton instance
var ESClient = new elasticsearch.Client({
  host: configuration.elasticsearch.connectionString
})

module.exports = {
  updateOne: function (applicationId, product, done) {
    // variants empty definition fix
    if (product.variantsDefinition) {
      Object.keys(product.variantsDefinition).forEach(function (key) {
        if (key === '') {
          delete product.variantsDefinition[key]
        }
      })
    }
    ESClient.update({
      index: applicationId,
      type: '_doc',
      id: product.id,
      body: {
        doc: product,
        upsert: product
      }
    }, (err, result) => {
      if (err) {
        done(err)
      } else {
        done(null, result)
      }
    })
  },

  deleteById: function (applicationId, productId, done) {
    ESClient.delete({
      index: applicationId,
      type: '_doc',
      id: productId
    }, (err, result) => {
      if (err) {
        done(err)
      } else {
        done(null, result)
      }
    })
  }
}
