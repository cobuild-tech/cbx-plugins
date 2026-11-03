angular.module('crm').directive('tagInput', function () {
  return {
    require: 'ngModel', restrict: 'E', scope: { max: '<' },
    template: '<span class="tag" ng-repeat="t in tags">{{t}} <a ng-click="remove($index)">×</a></span><input ng-keydown="key($event)">',
    link: function (scope, el, attrs, ngModel) {
      ngModel.$render = function () { scope.tags = (ngModel.$viewValue || []).slice(); };
      ngModel.$validators.maxTags = function (v) { return !v || v.length <= (scope.max || 5); };
      ngModel.$isEmpty = function (v) { return !v || v.length === 0; };
      function commit() { ngModel.$setViewValue(scope.tags.slice()); ngModel.$setTouched(); }
      scope.key = function (e) {
        if (e.key === 'Enter' && e.target.value.trim()) { e.preventDefault(); scope.tags.push(e.target.value.trim()); e.target.value = ''; commit(); }
      };
      scope.remove = function (i) { scope.tags.splice(i, 1); commit(); };
    }
  };
});
