angular.module('billing').component('invoiceList', {
  bindings: { customerId: '<' },
  template:
    '<p ng-if="$ctrl.loading">Loading…</p>' +
    '<table><tr ng-repeat="i in $ctrl.invoices | orderBy:\'-issuedAt\'">' +
    '<td>{{i.number}}</td><td>{{i.issuedAt | date:\'mediumDate\'}}</td><td>{{i.balance | currency}}</td></tr></table>',
  controller: ['$http', function ($http) {
    var ctrl = this;
    ctrl.$onChanges = function () {
      ctrl.loading = true;
      $http.get('/api/customers/' + ctrl.customerId + '/invoices').then(function (r) {
        ctrl.invoices = r.data; ctrl.loading = false;
      });
    };
  }]
});
