var elasticsearch = require('elasticsearch')
var ESClient = require('./services/elasticsearch.service.js').getDatabaseInstance()

var ElasticController = {}

ElasticController.createIndex = function (applicationId) {
  var application_id = req.client.application_id

  // Create index for a store

  ESClient.indices.create({
    index: application_id,
    body: {
      settings: {
        number_of_shards: 1,
      },
      mappings: {
        product: {
          properties: {
            name: { type: 'text', fielddata: true },
            deleted: { type: 'boolean' },
          },
        },
      },
    },
  })
    .then((response) => {
      if (response.acknowledged === true) {
        console.log(`ES index "${response.index}" successfully created`);
      } else {
        console.log('Error creating index products');
        console.log(response);
      }
    });
}

ElasticController.deleteIndex() {
  ESClient.indices.delete({
    index: 'products',
  }, (err) => {
    if (err) {
      debug(err.message);
    } else {
      debug('Indexes have been deleted!');
    }
  });
}
