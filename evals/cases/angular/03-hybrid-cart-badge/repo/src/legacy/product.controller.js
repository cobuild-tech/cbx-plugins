// AngularJS, stays as is.
angular.module('shop').controller('ProductCtrl', ['cartService', function (cartService) {
  this.addToCart = function (sku) { cartService.add(sku); };
}]);
