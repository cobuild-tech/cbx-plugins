angular.module('billing').factory('authInterceptor', ['$q', '$injector', 'session', function ($q, $injector, session) {
  return {
    request: function (config) {
      config.headers.Authorization = 'Bearer ' + session.token();
      config.headers['X-Tenant'] = session.tenantId();
      return config;
    },
    responseError: function (res) {
      if (res.status === 401 && !res.config.__retried) {
        return session.refresh().then(function () {
          res.config.__retried = true;
          return $injector.get('$http')(res.config);
        });
      }
      return $q.reject(res);
    }
  };
}]);
