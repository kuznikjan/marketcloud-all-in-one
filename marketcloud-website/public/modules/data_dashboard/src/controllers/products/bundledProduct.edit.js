angular.module('DataDashboard').controller('EditBundledProductController', ['$scope', '$marketcloud', 'product', '$http',
  function (scope, $marketcloud, product, $http) {
    scope.customPropertiesData = {}
    scope.itemsToAdd = []
    // Injecting resolve data into the controller
    scope.product = product.data.data
    // scope.product.included_products = scope.product.included_products

    if (!scope.product.hasOwnProperty()) {
      var product_ids = []
    }

    scope.product.included_products.forEach(function (product, idx) {
      if (product.has_variants) {
        var tempProd = product.variants.find(function (item) {
          return product.selected_variant_id === item.variant_id
        })
        product.selectedVariant = {}
        console.log(product)
        Object.keys(product.variantsDefinition).forEach(function (k) {
          product.selectedVariant[k] = tempProd[k]
        })
      }
    })

    // Lists is not currenty used
    // scope.product.lists.forEach(function (list) {
    //   var this_list_ids = list.items.map(function (item) {
    //     return item.product_id
    //   })
    //   product_ids = product_ids.concat(this_list_ids)
    // })

    scope.addProductsCardConfig = {
      additionalFields: []
    }
    scope.addNewList = function () {
      scope.product.lists.unshift({
        name: '',
        required: false,
        items: []
      })
    }

    scope.removeList = function (index) {
      scope.product.lists.splice(index, 1)
    }

    scope.showAddProductsToListModal = function (list) {
      scope.currentList = list
      $('#addProductsToListModal').modal('show')
    }

    $marketcloud.products.list({
      id: product_ids.join(',')
    })
      .then(function (response) {
        var p_map = {}

        response.data.data.forEach(function (i) {
          p_map[i.id] = i
        })

        // We fetch the products data, then we must add the properties
        // related to them being in the bundled product
        scope.product.lists.map(function (opt) {
          opt.items = opt.items.map(function (item) {
            return p_map[item.product_id]
          })
          return opt
        })
      })
      .catch(function (error) {
        notie.alert(3, 'An error has occurred', 1.5)
      })

    // mapping non-core attributes into scope.customPropertiesData
    // var coreProperties = Models.Product.getPropertyNames()
    // coreProperties.push('product_id', 'variant_id', 'display_price', 'display_price_discount', 'lists')
    // for (var k in scope.product) {
    //   if (coreProperties.indexOf(k) < 0) {
    //     scope.customPropertiesData[k] = scope.product[k]
    //     delete scope.product[k]
    //   }
    // }

    function getSlugFromString(v) {
      return v
        .split(' ')
        .map(function (item) { return item.replace(/\W/g, '') })
        .map(function (item) { return item.toLowerCase() })
        .join('-')
    }
    scope.unsafeSlug = false

    scope.updateSlug = function () {
      scope.product.slug = getSlugFromString(scope.product.name)
    }

    // This method must be implemented in order to
    // make the media manager work
    scope.getImagesContainer = function () {
      return scope.product.images
    }

    scope.removeImage = function (i) {
      scope.product.images.splice(i, 1)
    }

    scope.categories = []

    $marketcloud.categories.list()
      .then(function (response) {
        scope.categories = response.data.data
      })
      .catch(function () {
        notie.alert(2, 'An error has occurred while loading categories', 1.5)
      })

    scope.brands = []
    // Loading brands

    $marketcloud.brands.list()
      .then(function (response) {
        scope.brands = response.data.data
      })
      .catch(function () {
        notie.alert(2, 'An error has occurred while loading brands', 1.5)
      })

    scope.newAttribute = {
      name: null,
      value: null,
      type: null
    }
    scope.newAttribute.type = 'string'
    scope.availableTypes = [
      { name: 'String', value: 'string' },
      { name: 'Number', value: 'number' },
      { name: 'Boolean', value: 'boolean' }
    ]

    scope.filterNotNullProperties = function (item) {
      var result = {}
      for (var k in item) {
        if (item[k]) {
          result[k] = item[k]
        }
      }
      return result
    }


    scope.updateSelectedVariantForProduct = function (idx, key, value) {
      var selectedVariantData = scope.product.included_products[idx].selectedVariant
      var productVariants = scope.product.included_products[idx].variants

      var selectedVariant = findObjectWithKeyValue(productVariants, selectedVariantData)

      scope.product.included_items[idx].variant_id = selectedVariant.variant_id
    }

    var findObjectWithKeyValue = function (array, object) {
      var current = array
      var result

      Object.keys(object).forEach(function (k) {
        var value = object[k]

        current = current.filter(function (val) {
          return val[k] === value
        })

        if (current.length === 1) {
          result = current[0]
        }
      })

      return result
    }

    scope.prepareRegex = function () {
      scope.query.name.$options = 'i'
    }

    scope.loadProducts = function (query) {
      query = query || scope.query

      $marketcloud.products.list(query)
        .then(function (response) {
          scope.products = response.data.data
          scope.products
            .filter(function (item) {
              return scope.itemsToAdd
                .map(function (i) {
                  return i.id
                })
                .indexOf(item.id) < 0
            })
        })
        .catch(function (response) {
          notie.alert(3, 'An error has occurred. Please try again')
        })
    }

    scope.removeProduct = function (idx) {
      scope.product.included_products.splice(idx, 1);
      scope.product.included_items.splice(idx, 1);
    }

    scope.addProduct = function (product) {
      if (product.type !== 'bundled_product') {
        product.quantity = 1

        var newProduct = {
          product_id: product.id,
          quantity: product.quantity
        }

        if (product.has_variants) {
          newProduct.variant_id = 1
        }

        scope.product.included_items.push(newProduct)

        if (product.has_variants) {
          product.selectedVariant = {};
          Object.keys(product.variantsDefinition).forEach(function (k) {
            product.selectedVariant[k] = product.variantsDefinition[k][0]
          })
        }

        scope.product.included_products.push(product)
      } else {
        notie.alert(3, 'You can not include a bundled product in a bundled product.')
      }

      scope.query.name.$regex = ''
      scope.products = []
    }

    scope.updateProduct = function () {
      var update = angular.copy(scope.product)

      delete update.included_products
      delete update.selectedVariant
      // let's re-assemble the product first.
      for (var k in scope.customPropertiesData) {
        update[k] = scope.customPropertiesData[k]
      }

      update.lists.forEach(function (list) {
        list.items = list.items.map(function (item) {
          return { product_id: item.id }
        })
      })

      $marketcloud.products.update(update.id, update)
        .then(function (response) {
          notie.alert(1, 'Update Succeded', 1.5)
        })
        .catch(function (response) {
          notie.alert(3, 'Update failed', 1.5)
        })
    }

    scope.showTheList = false
    scope.showList = function () {
      scope.showTheList = true
    }
    scope.hideList = function () {
      window.setTimeout(function () {
        scope.showTheList = false
        scope.$apply()
      }, 200)
    }
  }
])
