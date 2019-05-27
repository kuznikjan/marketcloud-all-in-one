
angular.module('DataDashboard').controller('NewBundledProductController', [
  '$scope', '$http', '$location', '$marketcloud',
  function (scope, $http, location, $marketcloud) {
    scope.categories = []
    scope.catch = null
    scope.newCategory = {}
    scope.brands = []
    scope.newBrand = {}
    scope.itemsToAdd = []
    scope.selectedProducts = []

    // This method must be implemented in order to
    // make the media manager work
    scope.getImagesContainer = function () {
      return scope.product.images
    }

    scope.removeImage = function (i) {
      scope.product.images.splice(i, 1)
    }

    function getSlugFromString (v) {
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

    scope.addEmptyVariant = function () {
      console.log('ads')
    }

    scope.loadCategories = function () {
      $marketcloud.categories.list({})
        .then(function (response) {
          scope.categories = response.data.data
        })
        .catch(function () {
          console.log('An error has occurred while loading categories')
        })
    }

    // Initializing the categories array
    scope.loadCategories()

    scope.saveCategory = function () {
      $marketcloud.categories.save(scope.newCategory)
        .then(function (response) {
          $('#newCategoryModal').modal('hide')
          scope.categories.push(scope.newCategory)
          scope.newCategory = {}
        })
        .catch(function (response) {
          $('#newCategoryModal').hide()
          notie.alert(3, 'An error has occurred. Category not saved', 1)
        })
    }

    scope.loadBrands = function () {
      $marketcloud.brands.list({})
        .then(function (response) {
          scope.brands = response.data.data
        })
        .catch(function () {
          notie.alert(2, 'An error has occurred while loading brands', 1.5)
        })
    }
    // Initializing the brands array
    scope.loadBrands()

    scope.saveBrand = function () {
      $marketcloud.brands.save(scope.newBrand)
        .then(function (response) {
          $('#newBrandModal').modal('hide')
          scope.brands.push(scope.newBrand)
          scope.newBrand = {}
        })
        .catch(function (response) {
          $('#newBrandModal').hide()
          notie.alert(3, 'An error has occurred. Brand not saved', 1)
        })
    }

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

    scope.product = {
      type: 'bundled_product',
      name: '',
      description: '',
      stock_type: 'status',
      stock_status: 'in_stock',
      included_items: [],
      images: [],
      media: [],
      has_variants: false,
      published: true,
      lists: []
    }

    scope.productError = null
    scope.newCustomProperty = {}
    scope.customPropertiesData = {}

    // This contains validation Errors
    scope.Forms = {}

    scope.Forms.newCustomProperty = {
      name: null,
      value: null
    }

    // Array of new properties's names (strings)
    scope.customPropertiesNames = []

    scope.hideErrors = function () {
      scope.catch = null
      scope.catchField = null
    }

    scope.saveProduct = function (skipSaving) {
      console.log(scope.product)
      for (var k in scope.product) {
        if (scope.product[k] === null) {
          delete scope.product[k]
        }
      }

      scope.hideErrors()

      // Custom properties cannot be validated through Schematic.
      var props_to_validate = {}
      var known_props = Models.GroupedProduct.getPropertyNames()
      for (var k in scope.product) {
        if (known_props.indexOf(k) > -1) { props_to_validate[k] = scope.product[k] }
      }

      for (var k in scope.customPropertiesData) {
        scope.product[k] = scope.customPropertiesData[k]
      }

      for (var key in scope.product) {
        if (scope.product[key] === null) {
          delete scope.product[key]
        }
      }

      var to_save = angular.copy(scope.product)

      for (var k in to_save.lists) {
        to_save.lists[k].items = to_save.lists[k].items.map(function (item) {
          return { product_id: item.id }
        })
      }

      if (skipSaving === true) { return }
      $marketcloud.products.save(to_save)
        .then(function (response) {
          notie.alert(1, 'Product saved', 1.5)
          location.path('/products')
        })
        .catch(function (response) {
          notie.alert(2, 'An error has occurred. Product not saved', 1)
        })
    }

    scope.prepareRegex = function () {
      scope.query.name.$options = 'i'
    }

    scope.loadProducts = function (query) {
      query = query || scope.query

      $marketcloud.products.list(query)
        .then(function (response) {
          scope.products = response.data.data
            .filter(function (item) {
              return scope.itemsToAdd
                .map(function (i) {
                  return i.id
                })
                .indexOf(item.id) < 0
            })
        })
        .catch(function (response) {
          console.log(response);
          notie.alert(3, 'An error has occurred. Please try again')
        })
    }

    scope.updateSelectedVariantForProduct = function (idx, key, value) {
      var selectedVariantData = scope.selectedProducts[idx].selectedVariant

      var productVariants = scope.selectedProducts[idx].variants

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

    scope.removeProduct = function (idx) {
      scope.product.included_products.splice(idx, 1);
      scope.product.included_items.splice(idx, 1);
      console.log(scope.product);
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

        scope.selectedProducts.push(product)
      } else {
        notie.alert(3, 'You can not include a bundled product in a bundled product.')
      }
      scope.query.name.$regex = ''
      scope.products = []
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
