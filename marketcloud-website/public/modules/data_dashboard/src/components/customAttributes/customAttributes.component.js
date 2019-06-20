var app = angular.module('DataDashboard')
app.controller('CustomAttributesFormController', [
  '$scope',
  '$element',
  '$attrs',
  'moment',
  function (scope, $element, $attrs, $moment) {
    this.$onInit = function () {
      scope.ctrl = this
      scope.inObject = false
      scope.btnText = 'Add'

      scope.resource = this.resource

      scope.properties = this.properties || {}
      scope.type = this.type || {}

      // Keeping a reference for nesting
      scope.rootObject = scope.properties

      scope.newAttribute = {
        name: null,
        value: null,
        type: null
      }

      // Initializing propertyTypes object
      computePropertiesTypes()

      scope.resetNewAttributeValue = function () {
        switch (scope.newAttribute.type) {
          case 'string':
            scope.newAttribute.value = ''
            return
          case 'number':
            scope.newAttribute.value = 0
            return
          case 'boolean':
            scope.newAttribute.value = true
        }
      }

      scope.newAttribute.type = 'string'

      scope.availableTypes = [{
        name: 'String',
        value: 'string'
      }, {
        name: 'Number',
        value: 'number'
      }, {
        name: 'Boolean',
        value: 'boolean'
      },
      {
        name: 'RichText',
        value: 'richtext'
      },
      {
        name: 'URL/Media',
        value: 'URL'
      },
      {
        name: 'List',
        value: 'list'
      }]
    }

    scope.containerForNewMediaAttribute = []

    scope.containersForExistingMediaAttributes = {}

    scope.$watchCollection('containerForNewMediaAttribute', function () {
      scope.newAttribute.value = scope.containerForNewMediaAttribute[scope.containerForNewMediaAttribute.length - 1]
    })

    scope.propertiesTypes = {}

    function computePropertiesTypes () {
      for (var k in scope.properties) {
        scope.propertiesTypes[k] = typeof scope.properties[k]

        if (scope.type[k] === 'list') {
          scope.properties[k] = scope.properties[k].split(',').map(item => item.trim())
          scope.propertiesTypes[k] = 'object'
        }

        if (scope.isNull(k) === true) {
          scope.propertiesTypes[k] = 'null'
        }

        if (scope.isRichText(scope.properties[k]) === true) {
          scope.propertiesTypes[k] = 'richtext'
        }

        if (scope.isURL(scope.properties[k]) === true) {
          scope.propertiesTypes[k] = 'URL'
          scope.containersForExistingMediaAttributes[k] = [scope.properties[k]]
          scope.$watchCollection('containersForExistingMediaAttributes.' + k, function () {
            // If the value is null, it means that we just deleted it, so we don't have to re-update it
            if (scope.properties[k] === null) {
              return
            }
            if (scope.containersForExistingMediaAttributes[k]) {
              scope.properties[k] = scope.containersForExistingMediaAttributes[k][scope.containersForExistingMediaAttributes[k].length - 1]
            }
          })
        }
      }
    }

    scope.isBoolean = function (d) {
      return typeof d === 'boolean'
    }

    scope.isString = function (d) {
      return typeof d === 'string' && !scope.isRichText(d) && !scope.isURL(d)
    }

    scope.isNull = function (key) {
      return scope.properties[key] === null
    }

    scope.isURL = function (d) {
      if (!d || typeof d.indexOf !== 'function') {
        return false
      }
      return d.indexOf('http://') === 0 || d.indexOf('https://') === 0
    }

    scope.isRichText = function (str) {
      if (typeof str !== 'string') { return false }

      var doc = new DOMParser().parseFromString(str, 'text/html')
      return [].slice.call(doc.body.childNodes).some(function (node) {
        return node.nodeType === 1
      })
    }

    scope.isNumber = function (d) {
      return typeof d === 'number'
    }

    scope.isObject = function (d) {
      if (d === null) { return false }

      return typeof d === 'object'
    }

    scope.typeof = function (o) {
      return typeof o
    }

    scope.hasCustomProperties = function () {
      return Object.keys(scope.properties).length > 0
    }

    scope.addCustomProperty = function () {
      scope.errorMessage = null
      if (scope.resource.hasOwnProperty(scope.newAttribute.name)) {
        // scope.productError = "CUSTOM_PROPERTY_NAME_ALREADY_EXISTS";
        scope.errorMessage = 'Name already exists'
      } else if (scope.newAttribute.name !== 0 && !scope.newAttribute.name) {
        scope.errorMessage = 'Please, enter a valid property name'
      } else if (scope.inObject && scope.properties.indexOf(scope.newAttribute.value) !== -1) {
        scope.errorMessage = 'Duplicated value'
      } else {
        scope.properties[scope.newAttribute.name] = scope.newAttribute.value
        scope.type[scope.newAttribute.name] = scope.newAttribute.type

        scope.newAttribute.value = null
        scope.newAttribute.name = null

        if (scope.inObject) {
          scope.newAttribute.name = scope.properties.length
        }
        scope.btnText = 'Add'
        // Re-calculating types
        computePropertiesTypes()
      }
    }

    scope.deleteCustomProperty = function (propertyName) {
      // delete scope.properties[propertyName]

      scope.properties[propertyName] = null
      // Re-calculating types
      if (scope.inObject) {
        scope.properties.splice(propertyName, 1)
        scope.newAttribute.name = scope.properties.length
      }
      computePropertiesTypes()
    }

    scope.editCustomProperty = function (propertyName) {
      scope.newAttribute.name = propertyName
      scope.newAttribute.value = scope.properties[propertyName]
      scope.newAttribute.type = scope.propertiesTypes[propertyName]
      scope.btnText = 'edit'
    }

    scope.propertiesStack = []

    // Goes inside the properties object to show nested properties
    scope.showRecursiveObjectEditor = function (propertyName) {
      // Pushing the new level into the stack
      scope.propertiesStack.push(propertyName)

      // Getting the pointer to the root of the object
      scope.properties = scope.rootObject

      // Digging into the object's nested properties to find the wanted
      for (var i = 0; i < scope.propertiesStack.length; i++) {
        if (scope.properties.hasOwnProperty(scope.propertiesStack[i])) {
          scope.properties = scope.properties[scope.propertiesStack[i]]
        } else {
          break
        }
      }

      scope.newAttribute.name = scope.properties.length
      scope.newAttribute.type = 'string'
      scope.inObject = true

      // Recalculating the propertiesTypes object for the current properties object
      computePropertiesTypes()
    }
    // Goes to a specific nested level
    scope.goToNestedStep = function (index) {
      // Getting the pointer to the root of the object
      scope.properties = scope.rootObject

      if (index === 0) {
        scope.inObject = false
        scope.newAttribute.name = null
        scope.btnText = 'Add'
      }

      // Adjusting the stack to the wanted level
      scope.propertiesStack = scope.propertiesStack.slice(0, index)

      for (var i = 0; i < index; i++) {
        if (scope.properties.hasOwnProperty(scope.propertiesStack[i])) { scope.properties = scope.properties[scope.propertiesStack[i]] } else { break }
      }
      // Re-calculating types
      computePropertiesTypes()
    }
  }
])

app
  .component('customAttributesForm', {
    templateUrl: '/modules/data_dashboard/src/components/customAttributes/customAttributes.component.html',
    controller: 'CustomAttributesFormController',
    bindings: {
      properties: '=',
      resource: '=',
      onError: '&',
      disableAdd: '=',
      removeCardFrame: '@?'
    }
  })
