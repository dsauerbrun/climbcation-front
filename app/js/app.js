var home = angular.module('app', ['ngToast','ngSanitize','trackScroll','infinite-scroll','ui.bootstrap','helperService','filter-directives','location-list-item-directives','section-form-directive','ngRoute','facebookComments','ezfb','ui.bootstrap','duScroll','customFilters', 'ngAnimate', 'mgcrea.ngStrap', 'LocalStorageModule', 'angularMoment']);

home.config(['$routeProvider', '$locationProvider', 'localStorageServiceProvider', function($routeProvider, $locationProvider, localStorageServiceProvider) {
	//localStorageServiceProvider.setStorageType('sessionStorage');
	localStorageServiceProvider.setPrefix('climbcation');

	$routeProvider
	.when('/', {
		redirectTo: function(current, path, search) {
			if (search.goto) {
				// if we were passed in a search param, and it has a path
				// to redirect to, then redirect to that path
				return "/" + search.goto
			} else {
				// else just redirect back to this location
				// angular is smart enough to only do this once.
				return "/home"
			}
        }
	})
	.when('/home', {
		templateUrl: 'views/home/home.tpl.html',
	})
	.when('/new-location', {
		templateUrl: 'views/new_location/submitpage.tpl.html',
	})
	.when('/location/:slug', {
		templateUrl: 'views/location/location.tpl.html',
		controller: 'LocationPageController',
	})
	.otherwise({
		redirectTo: '/home'
	});

	$locationProvider.html5Mode(true);

}]);

home.config(function(ezfbProvider){
	ezfbProvider.setInitParams({
		appId: '604556333018328',
		version: 'v2.5'
	})
})

home.filter('removeSpaces', function () {
	return function (text) {
		var str = text.replace(/\s+/g, '');
		return str;
	};
});

home.controller('LocationPageController',function(ngToast,$scope,$rootScope,$q,helperService,$http,$routeParams,$location,$anchorScroll,$timeout, LocationsGetter){
	slug = $routeParams.slug;
	var editMessage = 'Your edit has been submitted and will be approved by a moderator shortly!';
	$scope.name = 'hello';
	$scope.gmap;
	$scope.nearbyShow = false;
	$scope.editingAccommodation = false;
	$scope.editingGettingIn = false;
	$scope.editingFoodOptions = false;
	$scope.helperService = helperService;
	helperService.setAirportApiKey();

	$scope.getAirport = function(item, model, label, event) {
		helperService.originAirportCode = item.iata;
		helperService.originAirport = item.name;
		LocationsGetter.getFlightQuotes([$scope.locationData.slug], helperService.originAirportCode).then(function(promiseQuotes) {
			$timeout(function(){
				setLocationHighchart(promiseQuotes, helperService.originAirportCode);
			});
		});
	}

	$scope.toggleEditAccommodation = function() {
		$scope.editingAccommodation = !$scope.editingAccommodation;
	}
	$scope.toggleEditGettingIn = function() {
		$scope.editingGettingIn = !$scope.editingGettingIn;
	}
	$scope.toggleEditFoodOptions = function() {
		$scope.editingFoodOptions = !$scope.editingFoodOptions;
	}

	var emptySectionTemplate = {previewOff: false, newSection: true, title:'', body: '', subsections: [{title:'', subsectionDescriptions:[{desc:''}]}]}
	emptySectionTemplate.clone = function(){
		return jQuery.extend(true, {}, this);
	};

	$scope.emptySection = {previewOff: false, newSection: true, title:'', body: '', subsections: [{title:'', subsectionDescriptions:[{desc:''}]}]}
	$scope.scrollTo = function(id){
		$('html,body').animate({
			scrollTop: $('#'+id.replace(/\s+/g, '')).offset().top
		}, 1000);
	};
	$http.get('api/location/'+slug).then(
		function(success){
			if (success.status == 200) {
				success = success.data;
				$scope.longitude = success['location']['longitude'];
				$scope.latitude = success['location']['latitude'];
				$scope.sections = success['sections'];
				$scope.tableOfContents = processTableContents($scope.sections);
				$scope.locationData = success['location']
				$scope.nearby = success['nearby'];
				$scope.gmap = createMap('map-canvas',$scope.latitude,$scope.longitude,4);
				addCloseLocations($scope.gmap,success['nearby']);
				addMarker($scope.gmap,$scope.latitude,$scope.longitude,success['location']['title'],'<p>'+success['location']['title']+'</p>',false);

				populateEditables($scope.locationData);

				LocationsGetter.getFlightQuotes([$scope.locationData.slug], helperService.originAirportCode).then(function(promiseQuotes) {
					$timeout(function(){
						setLocationHighchart(promiseQuotes, helperService.originAirportCode);
					});
				});
			}
		}
	);

	$scope.toggleNearby = function() {
		$scope.nearbyShow = !$scope.nearbyShow;
	}

	// EDITING FUNCTIONALITY BELOW

	$scope.locationObj = {
		submitter_email: '',
		name: '',
		country: '',
		continent: '',
		airport: '',
		price_floor: '',
		price_ceiling: '',
		months: {},
		accommodations: {},
		climbingTypes: {},
		grades: '',
		sections: [],
		closestAccommodation: '<1 mile',
		foodOptions: {},
		transportations: {},
		foodOptionDetails: {}
	};

	$scope.submitAccommodationChanges = function() {
		if (!$scope.saving) {
			$('.submit-button').addClass('disabled');
			$scope.saving = true;
			$http.post('api/locations/' + $scope.locationData.id +'/accommodations',
				{location: $scope.locationObj}
			).then(function(response) {
				if (response.status == 200) {
					$http.get('api/location/'+slug).then(function(response) {
						$scope.locationData.accommodations = response.data.location.accommodations;
						$scope.locationData.accommodation_notes = response.data.location.accommodation_notes;
						$scope.locationData.closest_accommodation = response.data.location.closest_accommodation;
						$scope.toggleEditAccommodation();
						ngToast.create({
							additionalClasses: 'climbcation-toast',
							content: editMessage
						});
					});
				}
				$scope.saving = false;
				$('.submit-button').removeClass('disabled');
			});
		}
	}

	$scope.selectAccommodation = function(accommodation) {
		var accommodationExists = $scope.locationObj.accommodations[accommodation.id];

		if (accommodationExists) {
			//remove it from list of accommodations
			$scope.locationObj.accommodations[accommodationExists.id] = null;
		} else {
			//mark the id and create a cost range field
			$scope.locationObj.accommodations[accommodation.id] = {id: accommodation.id, cost: ''};
		}
	};

	$scope.submitGettingInChanges = function() {
		if (!$scope.saving) {
			$('.submit-button').addClass('disabled');
			$scope.saving = true;
			$http.post('api/locations/' + $scope.locationData.id +'/gettingin',
				{location: $scope.locationObj}
			).then(function(response) {
				if (response.status == 200) {
					$http.get('api/location/'+slug).then(function(response) {
						$scope.locationData.transportations = response.data.location.transportations;
						$scope.locationData.getting_in_notes = response.data.location.getting_in_notes;
						$scope.locationData.best_transportation = response.data.location.best_transportation;
						$scope.locationData.walking_distance = response.data.location.walking_distance;
						$scope.toggleEditGettingIn();
						ngToast.create({
							additionalClasses: 'climbcation-toast',
							content: editMessage
						});
					});
				}
				$('.submit-button').removeClass('disabled');
				$scope.saving = false;
			});
		}
	}

	$scope.selectBestTransportation = function(id) {
		// set the best transportation
		$scope.locationObj.bestTransportationId = id;
		$scope.locationObj.bestTransportationCost = null;
		//set ranges
		
		var bestTransportation = _.find($scope.transportations, function(transportation) {
			return transportation.id == id;
		})
		$scope.bestTransportationName = bestTransportation.name;
		$scope.bestTransportationCostOptions = [];
		_.forEach(bestTransportation.ranges, function(range) {
			var rangeObj = {
				cost: range,
				active: false
			}
			$scope.bestTransportationCostOptions.push(rangeObj);
		});
	}

	$scope.selectBestTransportationCost = function(cost) {
		// reset active
		_.forEach($scope.bestTransportationCostOptions, function(costOption) {
			costOption.active = false;
			if ( costOption.cost == cost || costOption.cost == cost.cost) {
				costOption.active = true;
				$scope.locationObj.bestTransportationCost = cost.cost || cost;
			}
		});		
	}

	$scope.submitFoodOptionsChanges = function() {
		if (!$scope.saving) {
			$('.submit-button').addClass('disabled');
			$scope.saving = true;
			$http.post('api/locations/' + $scope.locationData.id +'/foodoptions',
				{location: $scope.locationObj}
			).then(function(response) {
				if (response.status == 200) {
					$http.get('api/location/'+slug).then(function(response) {
						$scope.locationData.food_options = response.data.location.food_options;
						$scope.locationData.common_expenses_notes = response.data.location.common_expenses_notes;
						$scope.locationData.saving_money_tip = response.data.location.saving_money_tip;
						$scope.toggleEditFoodOptions();
						ngToast.create({
							additionalClasses: 'climbcation-toast',
							content: editMessage
						});
					});
				}
				$('.submit-button').removeClass('disabled');
				$scope.saving = false;
			});
		}
	}

	$scope.selectFoodOptionDetail = function(id, range) {
		$scope.locationObj.foodOptionDetails[id] = {};
		$scope.locationObj.foodOptionDetails[id].id = id;
		$scope.locationObj.foodOptionDetails[id].cost = range;
	}

	$scope.cleanFoodOptionDetails = function() {
		_.forEach($scope.locationObj.foodOptions, function(foodOption, key) {
			if (!foodOption) {
				$scope.locationObj.foodOptionDetails[key] = null;
			} else if (!$scope.locationObj.foodOptionDetails[key]) {
				$scope.locationObj.foodOptionDetails[key] = {};
				$scope.locationObj.foodOptionDetails[key].id = key;
				$scope.locationObj.foodOptionDetails[key].cost = null;
			}
		});
	}

	$scope.addSection = function() {
		$scope.sections.new = {title: '', body: '', previewOff: true};
	}
	
	function populateEditables(location) {
		$http.get('api/get_attribute_options').then(function(data){
			var respData = data.data
			$scope.accommodations = respData['accommodations'];
			$scope.climbingTypes = respData['climbing_types'];
			$scope.months = respData['months'];
			$scope.grades = respData['grades'];
			$scope.foodOptions = respData['food_options'];
			$scope.transportations = respData['transportations'];
		}).then(function() {
			_.forEach(location.accommodations, function(accommodation) {
				$scope.locationObj.accommodations[accommodation.id] = { id: accommodation.id, cost: accommodation.cost};
			})
			$scope.locationObj.accommodationNotes = location.accommodation_notes;
			$scope.locationObj.closestAccommodation = location.closest_accommodation;

			_.forEach(location.transportations, function(transportation) {
				$scope.locationObj.transportations[transportation.id] = true;
			});
			location.best_transportation.id && $scope.selectBestTransportation(location.best_transportation.id);
			location.best_transportation.cost && $scope.selectBestTransportationCost(location.best_transportation.cost)
			$scope.locationObj.gettingInNotes = location.getting_in_notes;
			$scope.locationObj.walkingDistance = location.walking_distance;

			_.forEach(location.food_options, function(foodOption) {
				$scope.locationObj.foodOptions[foodOption.id] = true;
				foodOption.cost && $scope.selectFoodOptionDetail(foodOption.id, foodOption.cost);
			});
			$scope.locationObj.commonExpensesNotes = location.common_expenses_notes
			$scope.locationObj.savingMoneyTips = location.saving_money_tip;
		});
	}

	$scope.stopPropagation = function($event) {
		$event.stopPropagation();
	};

});

home.controller('LocationsController',function($rootScope, $scope, $timeout,LocationsGetter, $location, $document, $http, helperService){
	var locations = this;
	$scope.locationData = [];
	$scope.LocationsGetter = LocationsGetter;
	$scope.slugArray = [];
	$scope.helperService = helperService;
	$scope.largeMapEnabled = false;
	LocationsGetter.locations = LocationsGetter.locations || [];
	helperService.setAirportApiKey();
	
	// if we are returning to the front page we want to reset the locations and clear the filters
	if(LocationsGetter.locations.length > 0) {
		LocationsGetter.locations = [];
		LocationsGetter.clearFilters();
		LocationsGetter.setFilterTimer(0);
	}

	$scope.toggleLargeMap = function () {
		$scope.largeMapEnabled = !$scope.largeMapEnabled;
		LocationsGetter.reloadMapMarkers();


		$timeout(function() {
			setHighcharts(LocationsGetter.flightQuotes, helperService.originAirportCode);
      if ($scope.largeMapEnabled) {
      	$('html, body').animate({
          scrollTop: $("#infinite-scroll-container").offset().top - 10
      	}, 500);
      }
      
    });
	}

	$scope.getAirportPrices = function(item, model, label, event) {
		helperService.originAirportCode = item.iata;
		$rootScope.loadingQuotes = true;
		// clear out lowest price so we show loading symbol
		_.forEach($scope.locationData,function(location) {
			location.lowestPrice = {};
		});
		LocationsGetter.getFlightQuotes($scope.slugArray, item.iata, function(){
			$scope.loadingQuotes = false;
		});
	}

	$scope.getAirportPricesCode = function(code) {
		if (code.length == 3 || code.length == 4) {
			helperService.originAirportCode = code;
			$rootScope.loadingQuotes = true;
			// clear out lowest price so we show loading symbol
			_.forEach($scope.locationData,function(location) {
				location.lowestPrice = {};
			});
			LocationsGetter.getFlightQuotes($scope.slugArray, code, function(){
				$scope.loadingQuotes = false;
			});
		}
		
	}

	$scope.$watch('LocationsGetter.flightQuotes', function(){
		//set the lowest price and date for location
		_.forEach($scope.locationData,function(location) {
			location.lowestPrice = {};
		});

		_.forEach(LocationsGetter.flightQuotes, function(locationQuote, key) {
			var locationId = locationQuote.id;
			var location = _.find($scope.locationData, function(locationIter) {
				return locationIter.location.id == locationId;
			});

			location.referral = locationQuote.referral;

			var lowestPrice = 9999999;
			var lowestPriceDate = '';
			_.forEach(locationQuote.quotes, function(monthArray, month) {
				_.forEach(monthArray, function(cost, day) {
					if (lowestPrice > cost) {
						lowestPrice = cost;
						lowestPriceDate = month + '/' + day;
					}
				});
			});

			location.lowestPrice = {};
			location.lowestPrice.date = lowestPriceDate;
			location.lowestPrice.cost = lowestPrice;
			
		});
		$timeout(function(){
			setHighcharts(LocationsGetter.flightQuotes, helperService.originAirportCode);
		});
	});

	$scope.$watch('LocationsGetter.locations.length', function() {
		$scope.locationData = LocationsGetter.locations;
		$scope.slugArray = [];
		_.forEach($scope.locationData, function(promiseLocation, key){
			$scope.slugArray.push(promiseLocation.slug);
		});
		$scope.loadingQuotes = true;
		LocationsGetter.getFlightQuotes($scope.slugArray, helperService.originAirportCode, function() {
			$scope.loadingQuotes = false;
		});
	})

	$scope.goToFilter = function(preset) {
		var presets = {
			alpine: {climbingTypes: ['Alpine'], months: {start: 6, end: 9} },
			euroSport: {climbingTypes: ['Sport'], map: {zoom: 2, center: {latitude: 55.875310835696816, longitude: 11.162109375}, northeast: {longitude: 82.529296875, latitude: 71.69129271864}, southwest: {longitude: -60.205078125, latitude: 29.38217507514534}} },
			summerNA: {months: {start: 6, end: 9}, map: {zoom: 2, center: {latitude: 46.80005944678737, longitude: -100.986328125}, northeast: {longitude: -29.619140625, latitude: 67.067433351083}, southwest: {longitude: -172.353515625, latitude: 17.30868788677006}}}
		}
		
		var filter = angular.element(document.getElementById('filter'));
		$document.scrollToElement(filter, 0, 500);

		if (presets[preset]) {
			var presetObj = presets[preset];
			LocationsGetter.clearFilters();
			
			if (presetObj.map) {				
				LocationsGetter.maps.small.map.setCenter(presetObj.map.center.latitude, presetObj.map.center.longitude);
				LocationsGetter.maps.small.map.setZoom(presetObj.map.zoom);

				$timeout(function() {
					LocationsGetter.mapFilter.northeast.longitude = presetObj.map.northeast.longitude;
					LocationsGetter.mapFilter.northeast.latitude = presetObj.map.northeast.latitude;
					LocationsGetter.mapFilter.southwest.longitude = presetObj.map.southwest.longitude;
					LocationsGetter.mapFilter.southwest.latitude = presetObj.map.southwest.latitude;
					LocationsGetter.setFilterTimer(1.5);
				})
				
			}

			if (presetObj.months) {
				LocationsGetter.filterByMonth(presetObj.months.start, presetObj.months.end);
			}
			if (presetObj.climbingTypes) {
				presetObj.climbingTypes.forEach(function(type) {
					LocationsGetter.toggleFilterButton('climbing_types', type);
				})
			}
		}
	}

});

home.directive('mapFilter', function() {
	return {	
		restrict: 'E',
		templateUrl: 'views/directives/map.tpl.html',
		//transclude: true,
		scope: {
			filterType: '@',
			//locationsGetter: '='
		},
		controller: function($rootScope,$scope, $timeout, $window, LocationsGetter) {
			var filterId;
			var mapDefaults = {};
			if ($window.innerWidth < 768) {
				filterId = 'mapFilterMobile';
				mapDefaults.latitude = 70;
				mapDefaults.longitude = -160;
				mapDefaults.zoom = 2;
			} else {
				if ($scope.filterType == 'small') {
					filterId = 'mapFilter';
					mapDefaults.latitude = 70;
					mapDefaults.longitude = -160;
					mapDefaults.zoom = 2;
				} else {
					filterId = 'mapFilterLarge';
					mapDefaults.latitude = 30;
					mapDefaults.longitude = -40;
					mapDefaults.zoom = 3;
				}
				
			}
			$scope.mapFilterEnabled = true;
			LocationsGetter.maps[$scope.filterType] = {map: createMap(filterId, mapDefaults.latitude, mapDefaults.longitude, mapDefaults.zoom), firstMapLoad: true};

			LocationsGetter.markerMap = {};

			LocationsGetter.maps[$scope.filterType].map.addListener('dragend', function() {
				LocationsGetter.mapFilter['northeast']['longitude'] = LocationsGetter.maps[$scope.filterType].map.getBounds().getNorthEast().lng();
				LocationsGetter.mapFilter['northeast']['latitude'] = LocationsGetter.maps[$scope.filterType].map.getBounds().getNorthEast().lat();
				LocationsGetter.mapFilter['southwest']['longitude'] = LocationsGetter.maps[$scope.filterType].map.getBounds().getSouthWest().lng();
				LocationsGetter.mapFilter['southwest']['latitude'] = LocationsGetter.maps[$scope.filterType].map.getBounds().getSouthWest().lat();
				
				$scope.mapFilterEnabled && LocationsGetter.setFilterTimer(1.5);
			});
			LocationsGetter.maps[$scope.filterType].map.addListener('zoom_changed', function() {
				if (!LocationsGetter.maps[$scope.filterType].firstMapLoad) {
					$timeout(function (){
						LocationsGetter.mapFilter['northeast']['longitude'] = LocationsGetter.maps[$scope.filterType].map.getBounds().getNorthEast().lng();
						LocationsGetter.mapFilter['northeast']['latitude'] = LocationsGetter.maps[$scope.filterType].map.getBounds().getNorthEast().lat();
						LocationsGetter.mapFilter['southwest']['longitude'] = LocationsGetter.maps[$scope.filterType].map.getBounds().getSouthWest().lng();
						LocationsGetter.mapFilter['southwest']['latitude'] = LocationsGetter.maps[$scope.filterType].map.getBounds().getSouthWest().lat();
								
						$scope.mapFilterEnabled && LocationsGetter.setFilterTimer(1.5);
					})
				} else {
					LocationsGetter.maps[$scope.filterType].firstMapLoad = false;
				}
				
			});
		}
	}
});

home.service('LocationsGetter', ['$q', '$http', '$timeout', '$rootScope', 'localStorageService', 'moment', function($q,$http, $timeout, $rootScope, localStorageService, moment) {
	var LocationsGetter = this;
	var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	//var LocationsGetter = {};
	LocationsGetter.flightQuotes = null;
	LocationsGetter.maps = {};
	var filter = {};
	LocationsGetter.locations = [];
	LocationsGetter.unpaginatedLocations = [];
	LocationsGetter.pageNum = 1;
	LocationsGetter.filterTimer = null;
	LocationsGetter.mapFilter = {};
	LocationsGetter.markerMap = {};
	LocationsGetter.filter = filter;
	LocationsGetter.scrollLock = false;
	filter['climbing_types'] = [];
	filter.grades = {};
	filter['accommodations'] = [];

	filter['continents'] = [];
	filter['sort'] = [];
	filter['search'] = '';
	filter.start_month = 1;
	filter.end_month = 12;

	filter.start_month_name = monthNames[filter.start_month - 1];
	filter.end_month_name = monthNames[filter.end_month - 1];;
	LocationsGetter.mapFilter['northeast'] = {};
	LocationsGetter.mapFilter['northeast']['longitude'] = null;
	LocationsGetter.mapFilter['northeast']['latitude'] = null;
	LocationsGetter.mapFilter['southwest'] = {};
	LocationsGetter.mapFilter['southwest']['longitude'] = null;
	LocationsGetter.mapFilter['southwest']['latitude'] = null;
	LocationsGetter.loading = false;

	var sort = {};
	sort['grade'] = [];

	LocationsGetter.isButtonActive = function(filterArray, filterValue) {
		if (filterValue == 'empty') {
			return filter[filterArray] && filter[filterArray].length == 0
		} else {
			return filter[filterArray] && filter[filterArray].indexOf(filterValue) > -1;
		}
		
	}

	LocationsGetter.reloadMapMarkers = function() {
		if (LocationsGetter.unpaginatedLocations.length != 0) {
			//redo map points
			LocationsGetter.markerMap = {};
			for (let key in LocationsGetter.maps) {
				let currentMap = LocationsGetter.maps[key];
				currentMap.map.removeMarkers();
			
				LocationsGetter.unpaginatedLocations.forEach(function(unpagLocation) {
					var clickFunc = null;
					if (key == 'large') {
						clickFunc = async function(e) {
							await LocationsGetter.addSingleLocation(unpagLocation.slug);
							$('#infinite-scroll-container').animate({
				          scrollTop: $('#location-item-' + unpagLocation.id).offset().top - $('#infinite-scroll-container').offset().top  + $('#infinite-scroll-container').scrollTop()
				      }, 1000);
						}
					}
					LocationsGetter.markerMap[unpagLocation['slug'] + key] = addMarker(currentMap.map, unpagLocation['latitude'], unpagLocation['longitude'], unpagLocation['name'], '<p><a href="/location/'+unpagLocation['slug']+'">'+unpagLocation['name']+'</a></p>',true, clickFunc);
					
					let options = {opacity: .5};
					

					LocationsGetter.markerMap[unpagLocation['slug'] + key].setOptions(options);
				});

				// we set firstMapLoad to false when the zoom_changed watch catches the fitBounds call 
				if (currentMap.firstMapLoad && key == 'small') {
					var allowedBounds = new google.maps.LatLngBounds(
					    new google.maps.LatLng(85, -180),           // top left corner of map
						new google.maps.LatLng(-85, 180)            // bottom right corner
					);

					var k = 5; 
					var n = allowedBounds.getNorthEast().lat() - k; 
					var e = allowedBounds.getNorthEast().lng() - k; 
					var s = allowedBounds.getSouthWest().lat() + k; 
					var w = allowedBounds.getSouthWest().lng() + k; 
					var neNew = new google.maps.LatLng( n, e ); 
					var swNew = new google.maps.LatLng( s, w ); 
					boundsNew = new google.maps.LatLngBounds();
					boundsNew.extend(neNew);
					boundsNew.extend(swNew); 
					currentMap.map.fitBounds(allowedBounds);
				}
			}
		}
	}

	LocationsGetter.setCachedFilter = function(cachedFilter, cachedMapFilter) {
		LocationsGetter.clearFilters();
		let retVal = false;
		if (cachedFilter && moment(cachedFilter.date).diff(moment(), 'days') < 1) {
			filter = cachedFilter;
			LocationsGetter.filter = filter;
			retVal = true;
		}

		if (cachedMapFilter && moment(cachedMapFilter.date).diff(moment(), 'days') < 1) {
			//LocationsGetter.mapFilter = cachedMapFilter;
			//retVal = true;
		}
		LocationsGetter.setFilterTimer(0);
		
		return true;
	}

	LocationsGetter.setFilterTimer = function(seconds) {
		LocationsGetter.cancelFilterTimer();
		LocationsGetter.filterTimer = $timeout(function() {
			filter.date = moment().format('YYYY-MM-DD');
			mapFilter.date = moment().format('YYYY-MM-DD');
			localStorageService.set('filter', filter);
			localStorageService.set('mapFilter', mapFilter);
			LocationsGetter.pageNum = 1;
			LocationsGetter.locations = [];
			LocationsGetter.getNextPage();
		}, seconds*1000);
	}

	LocationsGetter.cancelFilterTimer = function() {
		LocationsGetter.filterTimer && $timeout.cancel(LocationsGetter.filterTimer);
	}

	LocationsGetter.clearFilters = function() {
		this.mapFilter = {};
		this.markerMap = {};
		this.pageNum = 1;
		filter['climbing_types'] = [];
		filter.grades = {};
		filter['accommodations'] = [];

		filter['continents'] = [];
		filter['sort'] = [];
		filter['search'] = '';
		filter['start_month'] = 1;
		filter['end_month'] = 12;
		filter.start_month_name = monthNames[filter.start_month - 1];
		filter.end_month_name = monthNames[filter.end_month - 1];;
		this.mapFilter['northeast'] = {};
		this.mapFilter['northeast']['longitude'] = null;
		this.mapFilter['northeast']['latitude'] = null;
		this.mapFilter['southwest'] = {};
		this.mapFilter['southwest']['longitude'] = null;
		this.mapFilter['southwest']['latitude'] = null;
		this.loading = false;

		sort['grade'] = [];
	};

	LocationsGetter.toggleFilterButton = function(filterArray,filterValue){
		if(filterValue != 'sort' && $.inArray(filterValue,filter[filterArray]) != -1){
			//remove item from filter
			filter[filterArray].splice($.inArray(filterValue,filter[filterArray]), 1);
		}
		else if( filterValue == 'All'){
			filter[filterArray] = [];
		}
		else{
			filter[filterArray].push(filterValue);
		}
		LocationsGetter.setFilterTimer(1);
	};

	LocationsGetter.filterByMonth = function(startMonth, endMonth) {
		filter.start_month = startMonth;
		filter.end_month = endMonth;
		filter.start_month_name = monthNames[filter.start_month - 1];
		filter.end_month_name = monthNames[filter.end_month - 1];;
		LocationsGetter.setFilterTimer(1.5);
	}

	LocationsGetter.filterByGrade = function(typeId, grades) {
		if (grades == null) {
			// resetting grade filter
			delete filter.grades[typeId];
		} else {
			filter.grades[typeId] = grades;
		}
		LocationsGetter.setFilterTimer(1);
	}

	LocationsGetter.filterByQuery = function(eventItem){
		filter['search'] = eventItem;
		LocationsGetter.setFilterTimer(0);
	}
	LocationsGetter.getFlightQuotes = function(slugs, originAirportCode, callback){
		return $http.post('/api/collect_locations_quotes', {slugs: slugs, origin_airport: originAirportCode}).then(function(response){
			LocationsGetter.flightQuotes = response.data;
			callback && callback();
			return response.data;
		});
	};

	LocationsGetter.getNextPage = function() {
		LocationsGetter.scrollLock = true;
		return LocationsGetter.getLocations().then(function(locations) {
			LocationsGetter.pageNum++;
			LocationsGetter.scrollLock = false;
			return locations;
		});
	};

	LocationsGetter.setSorting = function(sortBy, asc) {
		if (sortBy == 'distance') {
			navigator.geolocation.getCurrentPosition(
				function(position) {
					LocationsGetter.myLat = position.coords.latitude;
					LocationsGetter.myLong = position.coords.longitude;
					filter.sort ={distance: {latitude: LocationsGetter.myLat, longitude: LocationsGetter.myLong}};
					LocationsGetter.setFilterTimer(0);
				},
				function() {
					console.error('error getting location(probably blocked)');
					alert('Need location permission to sort by distance, ' +
						'if you arent given the option to grant permission, ' +
						'it is probably because your browser doesnt support non-ssl geolocation requests... the webmaster is a cheap bastard ' +
						'and doesnt want to spend $20/mo, go to https://climbcation.herokuapp.com and it should work just fine');
				}
			);
		} else {
			filter.sort = {};
			filter.sort[sortBy] = {asc: asc};
			LocationsGetter.setFilterTimer(0);
		}
		
	}

	LocationsGetter.getLocations = function() {
		LocationsGetter.loading = true;
		return $http.post('/api/filter_locations', {filter: filter, mapFilter: LocationsGetter.mapFilter, page: LocationsGetter.pageNum}).then(function(response) {
			LocationsGetter.loading = false;
			if (response.data.unpaginated.length != LocationsGetter.unpaginatedLocations.length && response.data.unpaginated.length != 0) {
				LocationsGetter.unpaginatedLocations = response.data.unpaginated;
			}
			var promiseLocations = response.data.paginated;
			LocationsGetter.locations || (LocationsGetter.locations = []);
			$.each(promiseLocations, function(key, promiseLocation) {
				LocationsGetter.addLocationToList(promiseLocation);
			});
			if (_.size(promiseLocations) == 0) {
				LocationsGetter.scrollEnded = true;
			} else {
				LocationsGetter.scrollEnded = false;
			}
			LocationsGetter.reloadMapMarkers();
			return response.data;
		});
	};

	LocationsGetter.addSingleLocation = function(slug) {
		return $http.get('/api/location/' + slug).then(function(resp) {
			LocationsGetter.addLocationToList(resp.data.location, true);
		});
	};

	LocationsGetter.addLocationToList = function(location, unshift) {
		var exists = LocationsGetter.locations.find(function(locationIter) {
			return locationIter.id == location.id;
		});
		if (unshift) {
			!exists && LocationsGetter.locations.unshift(location);
		} else {
			!exists && LocationsGetter.locations.push(location);
		}
		
	};

	
	//return LocationsGetter;

}]);

function createMap(mapId,latitude,longitude,zoom){
	var map = new GMaps({
		div: '#'+mapId,
		lat: latitude,
		lng: longitude,
		zoom: zoom,
		scrollwheel: false
	});
	$('body').on('click', function(element) {
		map.setOptions({scrollwheel:false});
	});

	$('#'+mapId).on('click', function (e) {
		e.stopPropagation();
		map.setOptions({scrollwheel:true});
		return;
	});

	return map;
}

function addCloseLocations(map,locationMap){
	$.each(locationMap,function(){
		addMarker(map, this['lat'], this['lng'], this['name'], '<p><a href="/location/'+this['slug']+'">'+this['name']+'</a></p>', true);
	});
}

function addMarker(map,lat,lng,title,infowindow,isSecondary, clickFunc = null){
		return map.addMarker({
			lat: lat,
			lng: lng,
			title: title,
			icon: isSecondary ? '' : 'https://s3-us-west-2.amazonaws.com/climbcation-front/assets/primary.png',
			infoWindow: {
				content: infowindow
			},
			click: clickFunc
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

function setHighcharts(locationQuoteData, origin_airport){
	_.forEach(locationQuoteData,function(location, slug){
		if($('#highchart' + slug).attr('origin') != origin_airport) {
			var destinationAirport = location.airport_code
			var quoteArray = [];
			var maxPrice = 0;
			_.keys(location.quotes).sort().forEach(function(monthKey) {
				_.forEach(location.quotes[monthKey], function(cost, dayKey){
					quoteArray.push([monthKey + '/' + dayKey, cost])
					if(cost > maxPrice) {
						maxPrice = cost;
					}
				});
			});

			$('#highchart'+slug).highcharts({
		        chart: {
		            type: 'line',
		            height: '100'
		        },
		        title: {
		        	useHTML: true,
		            text: '<a href="' + location.referral + '" target="_blank">One Way cost from ' + origin_airport + ' to ' + destinationAirport + '<img src="/images/skyscannerinline.png"></a>',
		            floating: false
		        },
		        xAxis: {
		        	visible: false,
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
		        	visible: false,
		            min: 0,
		            title: {
		                text: 'Price(USD)'
		            },
		            tickInterval: 50,
		            max: maxPrice

		        },
		        legend: {
		            enabled: false
		        },
		        tooltip: {
		            pointFormat: 'Price: <b>${point.y:.1f} </b>'
		        },
		        series: [{
		            name: 'Price',
		            data: quoteArray,
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
			$('#highchart'+slug).attr('origin', origin_airport)
		}
	});
	$('text:contains("Highcharts.com")').hide();
}

function setLocationHighchart(locationQuoteData, origin_airport){
	_.forEach(locationQuoteData,function(location, slug) {
		var destinationAirport = location.airport_code;
		var quoteArray = [];
		var maxPrice = 0;
		_.keys(location.quotes).sort().forEach(function(monthKey){
			_.forEach(location.quotes[monthKey], function(cost, dayKey){
				quoteArray.push([monthKey + '/' + dayKey, cost])
				if(cost > maxPrice) {
					maxPrice = cost;
				}
			});
		});
		$('#highchart'+slug).highcharts({
	        chart: {
	            type: 'line',
	            height: '200'
	        },
	        title: {
	        	useHTML: true,
	            text: '<a href="' + location.referral + '" target="_blank">One Way cost from '+origin_airport+' to '+destinationAirport + '</a><a href="' + location.referral + '" target="_blank"><img src="/images/skyscannerinline.png"></a>',
	            floating: false
	        },
	        xAxis: {
	        	visible: true,
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
	        	visible: true,
	            min: 0,
	            title: {
	                text: 'Price(USD)'
	            },
	            tickInterval: 50,
	            max: maxPrice

	        },
	        legend: {
	            enabled: false
	        },
	        tooltip: {
	            pointFormat: 'Price: <b>${point.y:.1f} </b>'
	        },
	        series: [{
	            name: 'Price',
	            data: quoteArray,
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
	});
}
