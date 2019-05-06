'use strict'

var express = require('express')
var router = express.Router()
var braintree = require('braintree')
var Errors = require('../models/errors.js')
var Cipher = require('../libs/cipher.js')
var Utils = require('../libs/util.js')

// Middleware
var setupBraintreeGateway = function (req, res, next) {
  // Controlla che l'integrazione sia attiva
  //
  // Prendere i dati dal db.
  // usarli nel gateway
  //

  var mongodb = req.app.get('mongodb')

  mongodb.collection('applications_integrations')
    .findOne({
      application_id: req.client.application_id
    }, function (err, document) {
      if (err) {
        return next(err)
      }
      if (document === null || !document.hasOwnProperty('spaceinvoices')) {
        return res.status(404).send({
          status: false,
          errors: [new Errors.NotFound('Unable to find application metadata for application with id ' + req.client.application_id + '. Ensure that the Braintree integration is active and configured properly.')]
        })
      }

      if (document.spaceinvoices.isActive !== true) {
        return res.status(400).send({
          status: false,
          errors: [new Errors.BadRequest('Braintree integration is not active. You must activate it first. You can do it from the Dashboard.')]
        })
      }

      var cipher = new Cipher()

      // Making sure that every key is correctly populated

      if (typeof document.braintree.merchantId !== 'string' || document.braintree.merchantId.length === 0) { return next(new Errors.BadRequest('The Braintree integration is misconfigured, please ensure that the Braintree merchantId is correctly set at https://marketcloud.studio404.net/applications/' + req.client.application_id + '/dashboard#/integrations/braintree')) }

      if (typeof document.braintree.publicKey !== 'string' || document.braintree.publicKey.length === 0) { return next(new Errors.BadRequest('The Braintree integration is misconfigured, please ensure that the Braintree publicKey is correctly set at https://marketcloud.studio404.net/applications/' + req.client.application_id + '/dashboard#/integrations/braintree')) }

      if (typeof document.braintree.privateKey !== 'string' || document.braintree.privateKey.length === 0) {
        return next(new Errors.BadRequest('The Braintree integration is misconfigured, please ensure that the Braintree privateKey is correctly set at https://marketcloud.studio404.net/applications/' + req.client.application_id + '/dashboard#/integrations/braintree'))
      }

      var decryptedMerchantId = cipher.decrypt(document.braintree.merchantId)
      var decryptedPublicKey = cipher.decrypt(document.braintree.publicKey)
      var decryptedPrivateKey = cipher.decrypt(document.braintree.privateKey)

      var braintreeEnvironment = null

      if (document.braintree.environment === 'Production') {
        braintreeEnvironment = braintree.Environment.Production
      } else {
        braintreeEnvironment = braintree.Environment.Sandbox
      }

      var gateway = braintree.connect({
        environment: braintreeEnvironment,
        merchantId: decryptedMerchantId,
        publicKey: decryptedPublicKey,
        privateKey: decryptedPrivateKey
      })

      // Gateway instance to be used for creating transactions
      req.gateway = gateway

      // a reference to the braintree configuration, useful for processing options
      req.braintreeConfiguration = document.braintree || {}
      next()
    })
}

router.post('/', function (req, res, next) {
  console.log('Creating new integration for spaceinvoices');
  next();
})

/*
*   @api {get} /integrations/braintree Request Braintree integration status for the current application
*   @apiName GetIntegration
*   @apiGroup Braintree
*
*   @apiSuccessExample {json} Success-Response:
*   {
*     "isActive" : true,
*     "environment": "sandbox"
*   }
*
*/
router.get('/', Utils.fetchApplicationIntegrations, function (req, res, next) {
  if (!req.integrationsData.hasOwnProperty('spaceinvoices')) {
    return next(new Errors.NotFound('The Integration "Spaceinvoices" is not installed. You can install this application using the dashboard.'))
  }

  // We don't leak sensitive data, only state of the integration.
  var spaceinvoicesIntegrationData = {
    environment: req.integrationsData.spaceinvoices.environment,
    isActive: req.integrationsData.spaceinvoices.isActive
  }

  return res.send({
    status: true,
    data: spaceinvoicesIntegrationData
  })
})

module.exports = router
