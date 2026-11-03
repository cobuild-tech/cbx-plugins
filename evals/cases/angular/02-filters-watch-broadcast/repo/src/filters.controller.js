angular.module('catalog').controller('FiltersCtrl', ['$scope', '$rootScope', '$timeout', '$location',
function ($scope, $rootScope, $timeout, $location) {
  $scope.filters = angular.extend({ q: '', brands: [], inStock: false }, $location.search());
  var pending;
  $scope.$watch('filters', function (nv, ov) {
    if (nv === ov) return;
    $timeout.cancel(pending);
    pending = $timeout(function () {
      $location.search(nv);            // keeps URL shareable
      $rootScope.$broadcast('filters:changed', angular.copy(nv));
    }, 300);
  }, true); // deep watch
}]);
