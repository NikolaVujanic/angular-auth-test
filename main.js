/**
 * Created by nikolavujanic on 5/5/15.
 */
var angularApp = angular.module('angularAuth', ['ui.router', 'ui.bootstrap.modal', 'facebook']);

angularApp.config(function($stateProvider, $urlRouterProvider, $httpProvider, FacebookProvider) {

    FacebookProvider.init('581844348584751');
    $urlRouterProvider.otherwise("/home");
    $stateProvider
        .state("home", {
            url: "/home",
            template: "<h2>Home</h2>"
        })
        .state("about", {
            url: "/about",
            templateUrl: "partials/about.html"
        })
        .state("about.list", {
            url: "/list",
            templateUrl: "partials/about.list.html",
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
        })
        .state("profile", {
            url: "/profile",
            templateUrl: "partials/profile.html"
        })
        .state("stats", {
            url: "/stats",
            templateUrl: "partials/stats.html"
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

angularApp.controller('mainCtrl', function ($scope, Facebook) {
    $scope.loginStatus = 'disconnected';
    $scope.facebookIsReady = false;
    $scope.user = null;
    $scope.login = function () {
        Facebook.login(function(response) {
            $scope.loginStatus = response.status;
        });
    };
    $scope.removeAuth = function () {
        Facebook.api({
            method: 'Auth.revokeAuthorization'
        }, function(response) {
            Facebook.getLoginStatus(function(response) {
                $scope.loginStatus = response.status;
            });
        });
    };
    $scope.api = function () {
        Facebook.api('/me', function(response) {
            $scope.user = response;
        });
    };
    $scope.getCoverImg = function () {
        Facebook.api('/me?fields=cover', function(response) {
            $scope.cover = response.cover.source;
        });
    }
    $scope.getImages = function () {
        Facebook.api('/me?fields=albums{photos{images{source}}}', function(response) {
            $scope.imgArray = [];
            for (i=0;i<response.albums.data.length;i++) {
                var album = response.albums.data[i];
                for (j=0;j<album.photos.data.length;j++) {
                    var albumPhoto = album.photos.data[j];
                    $scope.imgArray.push(albumPhoto.images[0].source);
                }
            }
        });
    }
    $scope.$watch(function() {
            return Facebook.isReady();
        }, function(newVal) {
            if (newVal) {
                $scope.facebookIsReady = true;
            }
        }
    );
});

angularApp.directive('chart', function () {
    return {
        replace: true,
        transclude: true,
        templateUrl: 'template/chart.html',
        controller: function ($scope, $element, $attrs) {
            var H = parseInt($attrs.height, 10),
                W = parseInt($attrs.width, 10),
                borderWidth = 30,
                numberOfTicks = 6;

            $scope.height = H;
            $scope.leftLimit = borderWidth;
            $scope.bottomLimit = H - borderWidth;
            $scope.rightLimit = W;

            var count = 0;

            this.getX = function (point) {
                if (typeof point.num === 'undefined') {
                    point.num = count++;
                    $scope.$broadcast('new-width');
                }

                var adjustment = point.radius + point.strokeWidth - 1;
                var widthSpacer = (W - borderWidth - adjustment) / (count - 1);
                return borderWidth + widthSpacer*point.num;
            };

            var highest = 0;

            this.getY = function (point) {
                if (point.d > highest) {
                    highest = point.d;
                    $scope.$broadcast('new-highest');
                }

                var adjustment = point.radius + point.strokeWidth - 1;
                var heightSpacer = (H - borderWidth - adjustment) / highest;

                $scope.ticks = [];

                var interval = highest / (numberOfTicks - 1);

                for (var i = 0; i < numberOfTicks; i++) {
                    $scope.ticks.push({
                        text: interval * i,
                        value: interval * i * heightSpacer + adjustment
                    });
                }

                return H - borderWidth - point.d*heightSpacer;
            };

            $scope.points = [];
            this.addPoint = function (point) {
                $scope.points.push(point);
            };
        }
    };
});

angularApp.directive('datapoint', function () {
    return {
        replace: true,
        require: '^chart',
        scope: {
            d: '@',
            label: '@'
        },
        template: '<circle ng-attr-cx="{{cx}}" ng-attr-cy="{{cy}}" ng-attr-r="{{radius}}" ng-attr-stroke-width="{{strokeWidth}}" fill="#ffffff" stroke="{{stroke}}" />',
        link: function (scope, element, attrs, ctrl) {
            scope.d = parseInt(scope.d, 10);
            scope.radius = 4;
            scope.strokeWidth = 3;
            scope.stroke = '#5B90BF';

            ctrl.addPoint(scope);

            setY();
            setX();

            scope.$on('new-highest', setY);
            scope.$on('new-width', setX);

            function setY () {
                scope.cy = ctrl.getY(scope);
            }

            function setX () {
                scope.cx = ctrl.getX(scope);
            }
        }
    };
});
