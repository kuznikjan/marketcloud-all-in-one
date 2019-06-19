'use strict'

var elasticsearch = require('elasticsearch')
var configuration = require('../config/default.js')
var mysqlService = require('./mysql.service.js')
var mongoService = require('./mongodb.service.js')

// Singleton instance
var ESClient = new elasticsearch.Client({
  host: configuration.elasticsearch.connectionString
})

var mysql = mysqlService.getDatabaseInstance()
var mongo = mongoService.getDatabaseInstance()

module.exports = {
  updateAll: function (applicationId, done) {
    mongo.collection('products')
      .find({application_id: applicationId})
      .toArray(function (err, data) {
        if (err) {
          done(err)
        }

        const productsBulk = []
        data.map(data => {
          delete data._id
          productsBulk.push({
            update: {
              _index: applicationId,
              _type: '_doc',
              _id: String(data.id)
            }
          })
          productsBulk.push({ doc: data, upsert: data })
        })

        ESClient.bulk({
          body: productsBulk
        }, (err, result) => {
          if (err) {
            done(err)
          } else {
            done(null, result)
          }
        })
      })
  },
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
  },

  search: function (applicationId, filters, limit = 9999, skip = 0, sort = [], done) {
    if (!applicationId || !filters) {
      done('applicationId and filters are required')
    }

    // get fields and weights from DB
    const query = `SELECT es_weights, es_min_score FROM applications WHERE id = ${applicationId}`

    mysql.query(query, {
      type: mysql.QueryTypes.SELECT
    })
    .then(function (data) {
      const weights = data[0].es_weights
      const minScore = data[0].es_min_score

      // if weights empty then use defaults
      if (weights === '') {
        filters.must.query_string.fields = ['name^5', 'description']
      } else {
        filters.must.query_string.fields = weights.split(',').map(s => s.trim())
      }

      ESClient.search({
        index: applicationId,
        sort: sort,
        body: {
          size: limit,
          from: skip,
          min_score: minScore,
          query: {
            bool: filters
          }
        }
      }, (err, result) => {
        if (err) {
          done(err)
        } else {
          done(null, result)
        }
      })
    })
    .catch(err => done(err))
  }
}
