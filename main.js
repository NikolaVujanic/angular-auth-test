/**
 * Created by nikolavujanic on 5/5/15.
 */
var angularApp = angular.module('angularAuth', ['ui.router', 'ui.bootstrap.modal']);

angularApp.config(function($stateProvider, $urlRouterProvider, $httpProvider) {

    $urlRouterProvider.otherwise("/home");
    $stateProvider
        .state("home", {
            url: "/home",
            template: "<h2>Home</h2>"
        })
        .state("state1", {
            url: "/state1",
            templateUrl: "partials/state1.html"
        })
        .state("state1.list", {
            url: "/list",
            templateUrl: "partials/state1.list.html",
            controller: function($scope) {
                $scope.items = ['angular', 'react', 'ember', 'knockout', 'extjs']
            }
        })
        .state("state2", {
            url: "/state2",
            templateUrl: "partials/state2.html"
        })
        .state("app", {
          //abstract: true,
            url: "/app",
            templateUrl: "partials/app.html",
            requireLogin: true
        })
        .state("app.dashboard", {
            //url: "/dashboard",
            //templateUrl: "partials/app.dashboard.html"
        });

    $httpProvider.interceptors.push(function ($timeout, $q, $injector) {
        var loginModal, $http, $state;

        // this trick must be done so that we don't receive
        // `Uncaught Error: [$injector:cdep] Circular dependency found`
        $timeout(function () {
            loginModal = $injector.get('loginModal');
            $http = $injector.get('$http');
            $state = $injector.get('$state');
        });

        return {
            responseError: function (rejection) {
                if (rejection.status !== 401) {
                    return rejection;
                }

                var deferred = $q.defer();

                loginModal()
                    .then(function () {
                        deferred.resolve( $http(rejection.config) );
                    })
                    .catch(function () {
                        $state.go('home');
                        deferred.reject(rejection);
                    });

                return deferred.promise;
            }
        };
    });
});

angularApp.run(function($rootScope, $state, loginModal) {
    $rootScope.$on('$stateChangeStart', function(event, toState, toParams) {
        var requireLogin = toState.requireLogin;

        if (requireLogin && typeof $rootScope.currentUser === "undefined") {
            event.preventDefault();

            loginModal()
                .then(function () {
                    return $state.go(toState.name, toParams);
                })
                .catch(function () {
                    return $state.go('home');
                });
        }
    })
});

angularApp.service('loginModal', function ($modal, $rootScope) {

    function assignCurrentUser (user) {
        $rootScope.currentUser = user;
        return user;
    }

    return function() {
        var instance = $modal.open({
            templateUrl: 'views/loginModalTemplate.html',
            controller: 'LoginModalCtrl',
            controllerAs: 'LoginModalCtrl'
        })

        return instance.result.then(assignCurrentUser);
    };

});

angularApp.controller('LoginModalCtrl', function ($scope/*, $UsersApi*/) {

    this.cancel = $scope.$dismiss;

    this.submit = function (email, password) {
        UsersApi.login(email, password).then(function (user) {
            $scope.$close(user);
        });
    };

});
