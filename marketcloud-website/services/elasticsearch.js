"use strict"

var elasticsearch = require('elasticsearch')
var configuration = require('../configuration/default.js')

// Singleton instance
var ESClient = new elasticsearch.Client({
  host: configuration.elasticsearch.connectionString
})

module.exports = {
  createIndex: function (applicationId, done) {
    // Create index for a store
    ESClient.indices.create({
      index: applicationId,
      body: {
        settings: {
          number_of_shards: 1
        },
        mappings: {
          product: {
            properties: {
              name: { type: 'text', fielddata: true },
              deleted: { type: 'boolean' }
            }
          }
        }
      }
    })
      .then((response) => {
        if (response.acknowledged === true) {
          done(null, true)
        } else {
          done(response)
        }
      });
  },
  deleteIndex: function (applicationId, done) {
    ESClient.indices.delete({
      index: applicationId
    }, (err) => {
      if (err) {
        done(err)
      } else {
        done(null, true)
      }
    })
  }
}