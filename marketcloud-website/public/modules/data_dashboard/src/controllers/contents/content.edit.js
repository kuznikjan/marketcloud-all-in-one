var app = angular.module('DataDashboard')

app.controller('EditContentController', [
  '$scope',
  '$http',
  'content',
  '$location',
  '$marketcloud',
  'moment',
  '$utils',
  '$validation',
  '$models',
  function(scope, http, content, location, $marketcloud, $moment, $utils, $validation, $model) {
    scope.content = content.data.data

    scope.products = []
    scope.itemsToAdd = []

    scope.selectedProducts = []

    // Fetches items included in the content
    // TODO: Move to the API. This should be populated on the API
    if (scope.content.products && scope.content.products.length > 0) {
      const itemIds = scope.content.products.split(',')

      let itemPromises = []

      itemIds.forEach(function (itemId) {
        itemPromises.push($marketcloud.products.getById(itemId));
      })

      Promise.all(itemPromises)
      .then(function (itemsResponse) {
        scope.selectedProducts = itemsResponse.map(function (itemRes) {
          return itemRes.data.data
        })
      })
      .catch(function (err) {
        notie.alert(2, 'Something went wrong fetching the products', 1.5);
      })
    }

    scope.content.date = $moment(scope.content.date);

    // mapping non-core attributes into scope.customPropertiesData
    var coreProperties = Models.Content.getPropertyNames()

    coreProperties.push(
      'id',
      'locales',
      'seo',
      'application_id',
      'images',
      'slug',
      'published',
      'category',
      'date',
      'updated_at',
      'created_at',
      'type'
    )

    scope.customPropertiesData = {};


    for (var k in scope.content){
      if (coreProperties.indexOf(k) === -1){
        scope.customPropertiesData[k] = scope.content[k]
        delete scope.content[k];
      }
    }

    scope.removeProduct = function (idx) {
      scope.selectedProducts.splice(idx, 1);
    }

    scope.addProduct = function (product) {
      product.quantity = 1

      scope.selectedProducts.push(product)

      console.log(scope.selectedProducts)

      scope.query.name.$regex = ''
      scope.products = []
    }

    scope.showTheList = false
    scope.showList = function() {
      scope.showTheList = true
    }

    scope.hideList = function() {
      window.setTimeout(function() {
        scope.showTheList = false
        scope.$apply()
      }, 200)
    }

    scope.loadProducts = function(query) {
      query = query || scope.query

      $marketcloud.products.list(query)
        .then(function(response) {
          scope.products = response.data.data
            .filter(function(item) {
              return scope.itemsToAdd
                .map(function(i) {
                  return i.id
                })
                .indexOf(item.id) < 0
            })
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred. Please try again')
        })
    }

    scope.unsafeSlug = false
    scope.updateSlug = function() {
      scope.content.slug = $utils.getSlugFromString(scope.content.title)
    }

    scope.getImagesContainer = function() {
      return scope.content.author.images
    }

    scope.removeImage = function(i) {
      scope.content.author.images.splice(i, 1)
    }

    scope.updateContent = function() {
      var toSave = angular.copy(scope.content);

      for (var k in scope.customPropertiesData) {
        toSave[k] = scope.customPropertiesData[k];
      }


      var products = ''
      scope.selectedProducts.map(function (prod) { return prod.id }).forEach(function (product, idx) {
        products += product

        if (idx < scope.selectedProducts.length - 1) {
          products += ','
        }
      })

      if (products.length > 0) {
        toSave.products = products
      }

      $marketcloud.contents.update(scope.content.id, toSave)
        .then(function(response) {
          notie.alert(1, 'Content updated with success', 1.5)
        })
        .catch(function(response) {

          if (response.status === 400) {
            notie.alert(2, 'The data you entered has some errors', 1.5);

            var validation = response.data.errors[0];
            var selector = '[ng-model="content.' + validation.invalidPropertyName + '"]';

            if (angular.element(selector).length === 0)
              selector = '[validate-for="' + validation.invalidPropertyName + '"]'

            $validation.showErrorMessage(validation, $models.Content.schema, selector)
          } else
            notie.alert(3, 'An error has occurred.', 2)
        })
    }
  }
])