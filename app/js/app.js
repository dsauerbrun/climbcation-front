var home = angular.module('app', ['filter-directives','location-list-item-directives']);
home.controller('ScopeParentTestController', function($scope,$http){
	var store = this;
	store.products = [];
	store.test = 'iiii';
	$scope.tester= 'erere';

	$http.get('http://localhost:3000/angtest').success(function(data){
		store.products = data;
	});
});
home.controller('ScopeTestController', function($scope,$http){
	console.log($scope.tester);

});

home.controller('LocationsController',function($scope, LocationsGetter){
	var locations = this;
	$scope.locationData = [];
	$scope.LocationsGetter = LocationsGetter;
	$scope.$watch('LocationsGetter.locationsPromise', function(){
		LocationsGetter.locationsPromise.then(
			function(promiseLocations){
				$scope.locationData = promiseLocations;
			},
			function(failure){
				$scope.locationData = failure;
			},
			function(notify){
				$scope.locationData = notify;
			}
		);
	});
});

home.factory("LocationsGetter",function($q,$http){
	var LocationsGetter = {};
	var filter = {};
	filter['climbing_types'] = [];
	filter['continents'] = [];
	filter['price_max'] = [];
	LocationsGetter.toggleFilterButton = function(eventItem,filterArray,filterValue){
		toggleButtonActive(angular.element(eventItem.currentTarget));

		if($.inArray(filterValue,filter[filterArray]) != -1){
			//remove item from filter
			filter[filterArray].splice($.inArray(filterValue,filter[filterArray]), 1);
		}
		else if( filterValue == 'All'){
			filter[filterArray] = [];
			resetButtonsGroup(angular.element(eventItem.currentTarget).parent());
		}
		else{
			filter[filterArray].push(filterValue);
		}
		LocationsGetter.getLocations();
	
	};
	LocationsGetter.getLocations = function(){
		locationData = []
		var deferred = $q.defer();
		console.log(filter)
		$http.post('http://localhost:3000/filter_locations', {filter: filter}).success(function(data){
			deferred.resolve(data);
		});
		LocationsGetter.locationsPromise = deferred.promise;
		return deferred.promise;
	};
	LocationsGetter.getLocations();
	return LocationsGetter;

});



function toggleButtonActive(clickedButton){
	if(clickedButton.hasClass('active')){
		clickedButton.removeClass('active');
	}
	else{
		clickedButton.addClass('active');
	}

}

function resetButtonsGroup(buttonGroup){
	buttonGroup.children('button').each(function(){
		$(this).removeClass('active');
		if($(this).hasClass('all'))
			$(this).addClass('active');
	});
}
