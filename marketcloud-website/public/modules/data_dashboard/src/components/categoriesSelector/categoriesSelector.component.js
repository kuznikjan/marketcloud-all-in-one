'use strict'

angular
  .module('DataDashboard')
  .controller('CategoriesSelectorController', CategoriesSelectorController)
  .component('categoriesSelector', {
    templateUrl: '/modules/data_dashboard/src/components/categoriesSelector/categoriesSelector.component.html',
    controller: 'CategoriesSelectorController',
    bindings: {
      enableCreateCategory: '@',
      category: '=',
      onError: '&',
      onChange: '&',
      clearInput: '&'
    }
  })

CategoriesSelectorController.$inject = ['$marketcloud', '$scope', '$element']

function CategoriesSelectorController($marketcloud, scope, $elem) {

  var ctrl = null
  this.$onInit = function() {
    ctrl = this
    scope.ctrl = this;
    scope.newCategory = {}
    ctrl.modal = $($elem).find('.modal')[0];

    scope.clearInput = ctrl.clearInput || false;
    scope.enableCreateCategory = ctrl.enableCreateCategory || true;


    scope.ctrl.query = {
      name: {
        $regex: "",
        $options: 'i'
      }
    }

  }

  scope.showModal = function() {
    $(ctrl.modal).modal('show')
  }

  function initializeData() {
    // Initial fetch of categories
    $marketcloud.categories.list()
    .then(function(response) {
      ctrl.categories = response.data.data;

      var currentCategory = null;
      // Look for the currently selected category, if any
      ctrl.categories.forEach( function(category){
        if (category.id === scope.ctrl.category)
          currentCategory = category;
      })

      // If found, we initialize the current category
      if (null !== currentCategory && !scope.clearInput) {
        scope.category = currentCategory;
      } else {
        // Otherwise we must fetch it
        return $marketcloud.categories.getById(scope.ctrl.category);
      }

    })
    .then(function(response){
      if (response.data.data && !scope.clearInput){
        scope.category = response.data.data;
      }
    })
    .catch(function(response) {
      ctrl.onError(response)
    })

  }

  initializeData();

  scope.setSelectedCategory = function(category) {
    scope.category = category;
    scope.ctrl.category = category.id;
    scope.ctrl.onChange({
      category: category.id
    })

    /**
     * FIXME: Handle multiple or single categories per product
     * Currently, for sake of Epoteka integration we are saving multiple categories as a string
     * e.g. 1523,6523,3123
     * In future, this should be handled in an array!!!!
     * FIXME:
     */

    console.log(scope.clearInput);
    if (scope.clearInput) {
      delete scope.category
    }

    /**
     * Emiting the selected category to the parent component and handling it there
     * TODO: Transfer entire logic to categories selector component
     */

    scope.$emit('selectedCategory', {
      text: category.path,
      category_id: category.id
    });
  }

  // Uses the input box in the component to filter the wanted category
  scope.filterCategories = function() {
    $marketcloud.categories.list(scope.ctrl.query)
      .then(function (response) {
        ctrl.categories = response.data.data;
      })
      .catch(function (error) {
        notie.alert(2, 'An error has occurred while fetching categories, please retry.', 2)
      })
  }

  // Saves a new category
  scope.saveCategory = function() {
    $marketcloud.categories.save(scope.newCategory)
      .then(function (response) {
        ctrl.categories.push(response.data.data)
        scope.newCategory = {}

        scope.$emit('selectedCategory', {
          text: response.data.data.path,
          category_id: response.data.data.id
        });
        return $marketcloud.categories.list()
      })
      .then(function (response) {
        ctrl.categories = response.data.data
        $(ctrl.modal).modal('hide')
      })
      .catch(function (response) {
        $(ctrl.modal).hide()
        notie.alert(3, 'An error has occurred. Category not saved', 1)
      })
  }
}