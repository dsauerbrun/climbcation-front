var home = angular.module('app', ['filter-directives','location-list-item-directives']);
home.controller('StoreController', ['$http',function($http){
	var store = this;
	store.products = [];
	store.test = 'iiii';

	$http.get('http://localhost:3000/angtest').success(function(data){
		store.products = data;
	});
}]);

home.controller('LocationsController',['$scope','LocationsGetter',function($scope, LocationsGetter){
	var locations = this;
	$scope.locationData = [];
	LocationsGetter.getLocations().then(
			function(promiseLocations){
				$scope.locationData = promiseLocations;
				console.log('first');
				console.log($scope.locationData)
			},
			function(failure){
				locations.locationData = failure;
			},
			function(notify){
				locations.locationData = notify;
			}
		);
}]);

home.factory("LocationsGetter",function($q,$http){
	var getLocations = function(){
		locationData = []
		var deferred = $q.defer();
		$http.get('http://localhost:3000/filter_locations').success(function(data){
			deferred.resolve(data);
		});
		return deferred.promise;
	};
	return {
		getLocations: getLocations
	};

});
