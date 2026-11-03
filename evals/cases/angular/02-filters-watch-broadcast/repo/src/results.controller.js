// Stays AngularJS.
angular.module('catalog').controller('ResultsCtrl', ['$scope', 'ProductApi', function ($scope, ProductApi) {
  $scope.$on('filters:changed', function (e, f) {
    ProductApi.search(f).then(function (items) { $scope.items = items; });
  });
}]);
