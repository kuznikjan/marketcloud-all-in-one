'use strict'

var Errors = require('../models/errors.js')
var Types = require('../models/types.js')
var Resource = require('../libs/resource.js')
var mongodb = require('../services/mongodb.service.js')

var resource = Resource({
  singularResourceName: 'category',
  pluralResourceName: 'categories',
  validator: Types.Category,
  hooks: {
    beforeCreate: initializeCategoryPath,
    beforeUpdate: initializeCategoryPath,
    afterList: fetchSubcategories,
    afterGetById: fetchSubcategories
  }
})

/* Does an additional trasform of the resource instance */
function initializeCategoryPath (req, res, next) {
  if (!req.body.parent_id) {
    req.body.path = '/' + req.body.name
    return next()
  }

  // Returns all categories (current and parents)
  if (req.body.parent_id) {
    findCategoryTree(req.body, function (err, categories) {
      if (err) {
        return next(err)
      }
      var path = ''
      categories.forEach(function (cat) {
        path += `/${cat.name}`
      })
      req.body.path = path + `/${req.body.name}`

      return next()
    })
  }
}

function findParent (currentId, done) {
  mongodb.getDatabaseInstance()
    .collection('categories')
    .findOne({
      id: currentId
    }, function (err, document) {
      if (err) {
        return done(err)
      }

      if (document === null) {
        return done(new Errors.NotFound('Unable to find parent category with id ' + document.parent_id))
      }

      if (!document.parent_id) {
        return done(null, [document])
      }

      findCategoryTree(document, function (err, cats) {
        if (err) {
          return done(err)
        }

        var _cats = cats
        _cats.push(document)
        return done(null, _cats)
      })
    })
}

function findCategoryTree (category, done) {
  findParent(category.parent_id, function (err, _cats) {
    if (err) {
      return done(err)
    }

    return done(null, _cats)
  })
}

/*
*   Looks for fetch_subcategories query parameter and if it is truthy
    fetches subcategories
*/
function fetchSubcategories (req, res, next) {
  if (!req.query.fetch_subcategories) {
    return next()
  }

  var payload = req.toSend

  var categoryIds = []

  if (Array.isArray(payload)) {
    categoryIds = payload.map(category => category.id)
  } else {
    categoryIds = [payload.id]
  }

  var mongodb = req.app.get('mongodb')

  mongodb.collection('categories').find({
    application_id: req.client.application_id,
    parent_id: {
      $in: categoryIds
    }
  })
    .toArray((err, subcategories) => {
      if (err) {
        return next(err)
      }

      if (Array.isArray(payload)) {
        payload.forEach((category) => {
          category.subcategories = subcategories.filter(subcategory => subcategory.parent_id === category.id)
        })
      } else {
        payload.subcategories = subcategories.filter(subcategory => subcategory.parent_id === payload.id)
      }

      return res.ok(payload)
    })
}

module.exports = resource.router
