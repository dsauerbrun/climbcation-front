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
	$http.get('api/location/'+slug).success(function(data){
		deferred.resolve(data);
	});
	deferred.promise.then(
		function(success){
			$scope.longitude = success['location']['longitude'];
			$scope.latitude = success['location']['latitude'];
			processSectionsByPair(success['sections']);
			$scope.sections = success['sections'];
			$scope.tableOfContents = processTableContents($scope.sections);
			$scope.locationData = success['location']
			$scope.nearby = success['nearby'];
			$scope.gmap = createMap('map-canvas',$scope.latitude,$scope.longitude,8);
			addCloseLocations($scope.gmap,success['nearby']);
			addMarker($scope.gmap,$scope.latitude,$scope.longitude,success['location']['title'],'<p>'+success['location']['title']+'</p>',false);
		}
	);
});
home.controller('LocationsController',function($scope, $timeout,LocationsGetter){
	var locations = this;
	$scope.locationData = [];
	$scope.LocationsGetter = LocationsGetter;


	



	$scope.$watch('LocationsGetter.locationsPromise', function(){
		LocationsGetter.locationsPromise.then(
			function(promiseLocations){
				$scope.locationData = promiseLocations;
				$timeout(function(){
					setHighcharts($scope.locationData);
				});
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

home.controller('MapFilterController',function($scope,LocationsGetter){
	$scope.filterMap = createMap('mapFilter',0,0,1);
	LocationsGetter.markerMap = {};
	$scope.filterMap.addListener('dragend', function() {
		LocationsGetter.mapFilter['northeast']['longitude'] = $scope.filterMap.getBounds().getNorthEast().lng();
		LocationsGetter.mapFilter['northeast']['latitude'] = $scope.filterMap.getBounds().getNorthEast().lat();
		LocationsGetter.mapFilter['southwest']['longitude'] = $scope.filterMap.getBounds().getSouthWest().lng();
		LocationsGetter.mapFilter['southwest']['latitude'] = $scope.filterMap.getBounds().getSouthWest().lat();
		LocationsGetter.getLocations();
	});
	$scope.filterMap.addListener('zoom_changed', function() {
		LocationsGetter.mapFilter['northeast']['longitude'] = $scope.filterMap.getBounds().getNorthEast().lng();
		LocationsGetter.mapFilter['northeast']['latitude'] = $scope.filterMap.getBounds().getNorthEast().lat();
		LocationsGetter.mapFilter['southwest']['longitude'] = $scope.filterMap.getBounds().getSouthWest().lng();
		LocationsGetter.mapFilter['southwest']['latitude'] = $scope.filterMap.getBounds().getSouthWest().lat();
		LocationsGetter.getLocations();
	});
	$scope.$watch('LocationsGetter.locationsPromise', function(){
		LocationsGetter.locationsPromise.then(
			function(promiseLocations){
				//redo map points
				$scope.filterMap.removeMarkers();
				LocationsGetter.markerMap = {};
				$.each(promiseLocations,function(){
					LocationsGetter.markerMap[this['slug']] = addMarker($scope.filterMap,this['latitude'],this['longitude'],this['name'],'<p><a href="/#location/'+this['slug']+'">'+this['name']+'</a></p>',true);
					LocationsGetter.markerMap[this['slug']].setOptions({opacity: .5})
				});
				console.log($scope.markerMap)

			},
			function(failure){
				
			},
			function(notify){
				
			}
		);
	});

});

home.factory("LocationsGetter",function($q,$http){
	var LocationsGetter = {};
	var filter = {};
	LocationsGetter.mapFilter = {};
	LocationsGetter.markerMap = {};

	filter['climbing_types'] = [];
	filter['continents'] = [];
	filter['price_max'] = [];
	filter['sort'] = [];
	LocationsGetter.mapFilter['northeast'] = {};
	LocationsGetter.mapFilter['northeast']['longitude'] = null;
	LocationsGetter.mapFilter['northeast']['latitude'] = null;
	LocationsGetter.mapFilter['southwest'] = {};
	LocationsGetter.mapFilter['southwest']['longitude'] = null;
	LocationsGetter.mapFilter['southwest']['latitude'] = null;
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
		$http.post('/api/filter_locations', {filter: filter, mapFilter: LocationsGetter.mapFilter}).success(function(data){
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

function createMap(mapId,latitude,longitude,zoom){
	var map =new GMaps({
		div: '#'+mapId,
		lat: latitude,
		lng: longitude,
		zoom: zoom
	});
	return map;
}

function addCloseLocations(map,locationMap){
	$.each(locationMap,function(){
		addMarker(map,this['lat'],this['lng'],this['name'],'<p><a href="/#location/'+this['slug']+'">'+this['name']+'</a></p>',true);
	});
}

function addMarker(map,lat,lng,title,infowindow,isSecondary){
		return map.addMarker({
			lat: lat,
			lng: lng,
			title: title,
			icon: isSecondary?'':'https://s3-us-west-2.amazonaws.com/climbcation-front/assets/primary.png',
			infoWindow:{
				content: infowindow
			}
		});
}
function processTableContents(sectionMap){
	var titleArray = [];
	var counter = 0;
	$.each(sectionMap,function(){
		index = parseInt(counter/3)
		if(!(index in titleArray)){
			titleArray[index] = [];
		}
		titleArray[index].push(this['title']);
		counter++;
	});
	return titleArray;

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

function setHighcharts(locationData){
	
	$.each(locationData,function(){
		//console.log(this['quotes']['5']);
		quote_array = [];
		$.each(this['quotes'],function(monthKey,value){
			$.each(value, function(dayKey,cost){
				quote_array.push([monthKey+'/'+dayKey,cost])

			})

		})
		$('#highchart'+this['slug']).highcharts({
	        chart: {
	            type: 'column'
	        },
	        title: {
	            text: 'One Way cost from ORIGINFILLER to DESTINATIONFILLER'
	        },
	        subtitle: {
	            text: 'Source: Skyscanner'
	        },
	        xAxis: {
	            type: 'category',
	            title: {
	            	text: 'Date'
	            },
	            labels: {
	                rotation: -45,
	                style: {
	                    fontSize: '13px',
	                    fontFamily: 'Verdana, sans-serif'
	                }
	            }
	        },
	        yAxis: {
	            min: 0,
	            title: {
	                text: 'Price(USD)'
	            }
	        },
	        legend: {
	            enabled: false
	        },
	        tooltip: {
	            pointFormat: 'Price: <b>${point.y:.1f} </b>'
	        },
	        series: [{
	            name: 'Price',
	            data: quote_array/*[
	                ['Shanghai', 23.7],
	                ['Lagos', 16.1],
	                ['Instanbul', 14.2],
	                ['Karachi', 14.0],
	                ['Mumbai', 12.5],
	                ['Moscow', 12.1],
	                ['São Paulo', 11.8],
	                ['Beijing', 11.7],
	                ['Guangzhou', 11.1],
	                ['Delhi', 11.1],
	                ['Shenzhen', 10.5],
	                ['Seoul', 10.4],
	                ['Jakarta', 10.0],
	                ['Kinshasa', 9.3],
	                ['Tianjin', 9.3],
	                ['Tokyo', 9.0],
	                ['Cairo', 8.9],
	                ['Dhaka', 8.9],
	                ['Mexico City', 8.9],
	                ['Lima', 8.9]
	            ]*/,
	            dataLabels: {
	                enabled: false,
	                rotation: -90,
	                color: '#FFFFFF',
	                align: 'right',
	                format: '{point.y:.1f}', // one decimal
	                y: 10, // 10 pixels down from the top
	                style: {
	                    fontSize: '13px',
	                    fontFamily: 'Verdana, sans-serif'
	                }
	            }
	        }]
	    });
console.log('high as chart')
	});
}
