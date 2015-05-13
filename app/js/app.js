var home = angular.module('app', ['filter-directives','location-list-item-directives','location-section-directives','ngRoute']);
home.config(['$routeProvider', function($routeProvider) {
	$routeProvider
	.when('/home', {
		templateUrl: 'views/home/home.tpl.html',
	})
	.when('/location/:slug', {
		templateUrl: 'views/location/location.tpl.html',
		controller: 'LocationPageController',
	})
	.otherwise({
		redirectTo: '/home'
	});

}]);
home.filter('removeSpaces', function () {
	return function (text) {
		var str = text.replace(/\s+/g, '');
		return str;
	};
});
home.controller('LocationPageController',function($scope,$q,$http,$routeParams,$location,$anchorScroll,$timeout){
	slug = $routeParams.slug;
	$scope.name = 'hello';
	$scope.gmap;
	var deferred = $q.defer();
	$scope.scrollTo = function(id){
		$('html,body').animate({
			scrollTop: $('#'+id.replace(/\s+/g, '')).offset().top
		}, 1000);
	};
	$http.get('http://localhost:3000/location/'+slug).success(function(data){
		deferred.resolve(data);
	});
	deferred.promise.then(
		function(success){
			$scope.longitude = success['location']['longitude'];
			$scope.latitude = success['location']['latitude'];
			processSectionsByPair(success['sections']);
			$scope.sections = success['sections'];
			$scope.locationData = success['location']
			$scope.nearby = success['nearby'];
			$scope.gmap = createMap($scope.latitude,$scope.longitude);
			addCloseLocations($scope.gmap,success['nearby']);
			addMarker($scope.gmap,$scope.latitude,$scope.longitude,success['location']['title'],'<p>'+success['location']['title']+'</p>',false);
		}
	);
});
home.controller('LocationsController',function($scope, LocationsGetter){
	var locations = this;
	$scope.locationData = [];
	$scope.LocationsGetter = LocationsGetter;
	$scope.$watch('LocationsGetter.locationsPromise', function(){
		LocationsGetter.locationsPromise.then(
			function(promiseLocations){
				console.log(promiseLocations);
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
	filter['sort'] = [];
	var sort = {};
	sort['price'] = [];
	sort['grade'] = [];
	LocationsGetter.toggleFilterButton = function(eventItem,filterArray,filterValue){
		toggleButtonActive(angular.element(eventItem.currentTarget));

		if(filterValue != 'sort' && $.inArray(filterValue,filter[filterArray]) != -1){
			//remove item from filter
			filter[filterArray].splice($.inArray(filterValue,filter[filterArray]), 1);
		}
		else if( filterValue == 'All'){
			filter[filterArray] = [];
			resetButtonsGroup(angular.element(eventItem.currentTarget).parent());
		}
		else{
			filter[filterArray].push(filterValue);
			inactivateGroupAll(angular.element(eventItem.currentTarget).parent());
			//only one sorter can be active at a time so we have special cases for it
			if(filterArray == 'sort'){
				resetButtonsGroup(angular.element(eventItem.currentTarget).parent());
				toggleButtonActive(angular.element(eventItem.currentTarget));
				inactivateGroupAll(angular.element(eventItem.currentTarget).parent());
			}
		}
		LocationsGetter.getLocations();
	
	};
	LocationsGetter.getLocations = function(){
		locationData = []
		var deferred = $q.defer();
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
		if($(this).hasClass('all')){
			$(this).addClass('active');
		}
	});
}
function inactivateGroupAll(buttonGroup){
	buttonGroup.children('button').each(function(){
		if($(this).hasClass('all')){
			$(this).removeClass('active');
		}
	});

}

function createMap(latitude,longitude){
	var map =new GMaps({
		div: '#map-canvas',
		lat: latitude,
		lng: longitude,
		zoom: 8
	});
	return map;
}

function addCloseLocations(map,locationMap){
	$.each(locationMap,function(){
		addMarker(map,this['lat'],this['lng'],this['name'],'<p><a href="/#location/'+this['slug']+'">'+this['name']+'</a></p>',true);
	})
}

function addMarker(map,lat,lng,title,infowindow,isSecondary){
		map.addMarker({
			lat: lat,
			lng: lng,
			title: title,
			icon: isSecondary?'':'https://s3-us-west-2.amazonaws.com/climbcation-front/assets/primary.png',
			infoWindow:{
				content: infowindow
			}
		});
}
function processSectionsByPair(sectionMap){
	pairMap = {};
	var counter = 0;
	var sectCounter = 0;
	$.each(sectionMap, function(){
		counter = 0;
		if(this['data'] != null){
			pairMap = {};
			$.each(this['data'],function(key,value){
				pairIndex = parseInt(counter/2);
				if(counter % 2 == 0){
					pairMap[pairIndex] = {}
				}
				//pairMap[pairIndex][counter%2] = value;
				pairMap[pairIndex][key] = value;
				counter++;
			});
			this['data'] = pairMap;
		}
		sectCounter++;
	});
}
