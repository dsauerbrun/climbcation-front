var home = angular.module('app', ['ui.bootstrap','helperService','filter-directives','location-list-item-directives','location-section-directives','section-form-directive','ngRoute','facebookComments','ezfb','ui.bootstrap','duScroll','customFilters']);
home.config( function($routeProvider, $locationProvider) {
	$routeProvider
	.when('/', {
		redirectTo: function(current, path, search) {
          if(search.goto){
            // if we were passed in a search param, and it has a path
            // to redirect to, then redirect to that path
            return "/" + search.goto
          }
          else{
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

});

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
home.controller('LocationPageController',function($scope,$rootScope,$q,helperService,$http,$routeParams,$location,$anchorScroll,$timeout, LocationsGetter){
	slug = $routeParams.slug;
	$scope.name = 'hello';
	$scope.gmap;
	$scope.originAirport = 'Los Angeles International';
	$scope.originAirportCode = 'LAX';
	$scope.nearbyShow = false;
	$scope.editingAccommodation = false;
	$scope.editingGettingIn = false;
	$scope.editingFoodOptions = false;
	$scope.helperService = helperService;

	$scope.getAirport = function(item, model, label, event) {
		$scope.originAirportCode = item.iata;
		$scope.originAirport = item.name;
		LocationsGetter.getFlightQuotes([$scope.locationData.slug], $scope.originAirportCode).then(function(promiseQuotes) {
			$timeout(function(){
				setLocationHighchart(promiseQuotes,$scope.originAirportCode);
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
				$scope.gmap = createMap('map-canvas',$scope.latitude,$scope.longitude,6);
				addCloseLocations($scope.gmap,success['nearby']);
				addMarker($scope.gmap,$scope.latitude,$scope.longitude,success['location']['title'],'<p>'+success['location']['title']+'</p>',false);

				populateEditables($scope.locationData);

				LocationsGetter.getFlightQuotes([$scope.locationData.slug], $scope.originAirportCode).then(function(promiseQuotes) {
					$timeout(function(){
						setLocationHighchart(promiseQuotes,$scope.originAirportCode);
					});
				});
			}
		}
	);

	$scope.updateSection = function(sectionId, section){
		section.isSaving = true;
		$http.post('/api/infosection/'+sectionId,{section: section}).then(function(response){
			section.isSaving = false;
			$('#saveSuccessModal').modal()
		})
	};

	$scope.saveSection = function(locationId, section){
		section.isSaving = true;
		$http.post('/api/infosection/',{locationId: locationId, section: section}).then(function(response){
			section.isSaving = false;
			$('#saveSuccessModal').modal()
			$scope.emptySection = emptySectionTemplate.clone();
		})
	};

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
		grade: '',
		sections: [],
		closestAccommodation: '<1 mile',
		foodOptions: {},
		transportations: {},
		foodOptionDetails: {}
	};

	$scope.submitAccommodationChanges = function() {
		$http.post('api/locations/' + $scope.locationData.id +'/accommodations',
			{location: $scope.locationObj}
		).then(function(response) {
			if (response.status == 200) {
				$http.get('api/location/'+slug).then(function(response) {
					$scope.locationData.accommodations = response.data.location.accommodations;
					$scope.locationData.accommodation_notes = response.data.location.accommodation_notes;
					$scope.locationData.closest_accommodation = response.data.location.closest_accommodation;
					$scope.toggleEditAccommodation();
				});
			}
		});
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

				});
			}
		});
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
		console.log('best trans', $scope.bestTransportationCostOptions, cost)
		_.forEach($scope.bestTransportationCostOptions, function(costOption) {
			costOption.active = false;
			if ( costOption.cost == cost || costOption.cost == cost.cost) {
				costOption.active = true;
				$scope.locationObj.bestTransportationCost = cost.cost || cost;
			}
		});		
	}

	$scope.submitFoodOptionsChanges = function() {
		$http.post('api/locations/' + $scope.locationData.id +'/foodoptions',
			{location: $scope.locationObj}
		).then(function(response) {
			if (response.status == 200) {
				$http.get('api/location/'+slug).then(function(response) {
					$scope.locationData.food_options = response.data.location.food_options;
					$scope.locationData.common_expenses_notes = response.data.location.common_expenses_notes;
					$scope.locationData.saving_money_tip = response.data.location.saving_money_tip;
					$scope.toggleEditFoodOptions();

				});
			}
		});
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

			console.log(location);
			console.log($scope.locationObj)
		})
		
		
	}

	$scope.stopPropagation = function($event) {
		$event.stopPropagation();
	};

});

home.controller('LocationsController',function($scope, $timeout,LocationsGetter, $location, $document, $http, helperService){
	var locations = this;
	$scope.locationData = [];
	$scope.LocationsGetter = LocationsGetter;
	$scope.originAirport = "Los Angeles International";
	$scope.originAirportCode = "LAX"
	$scope.slugArray = [];
	$scope.helperService = helperService;
	
	LocationsGetter.clearFilters();

	$scope.getAirportPrices = function(item, model, label, event) {
		$scope.originAirportCode = item.iata;
		LocationsGetter.getFlightQuotes($scope.slugArray, item.iata);
	}

	$scope.$watch('LocationsGetter.flightQuotesPromise', function(){
		LocationsGetter.flightQuotesPromise.then(
			function(promiseQuotes){
				//set the lowest price and date for location
				_.forEach(promiseQuotes, function(quote, key) {
					var splitKey = key.split('-');
					var locationId = splitKey[splitKey.length - 1];
					var location = _.find($scope.locationData, function(locationIter) {
						return locationIter.location.id == locationId;
					});

					var lowestPrice = 9999999;
					var lowestPriceDate = '';
					_.forEach(quote, function(monthArray, month) {
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
					setHighcharts(promiseQuotes,$scope.originAirportCode);
				});
			}
		);

	});

	$scope.$watch('LocationsGetter.locationsPromise', function(){
		LocationsGetter.locationsPromise.then(
			function(promiseLocations){
				$scope.locationData = promiseLocations;
				$scope.slugArray = []
				$.each(promiseLocations, function(){
					$scope.slugArray.push(this['slug'])
				});
				LocationsGetter.getFlightQuotes($scope.slugArray,$scope.originAirportCode);
			},
			function(failure){
				$scope.locationData = failure;
			},
			function(notify){
				$scope.locationData = notify;
			}
		);

	});
	$scope.goToFilter = function() {
		var filter = angular.element(document.getElementById('filter'));
		$document.scrollToElement(filter, 0, 500);
	}

});

home.controller('MapFilterController',function($scope,LocationsGetter, $timeout){
	$scope.mapFilterEnabled = true;
	$scope.filterMap = createMap('mapFilter',40.3427932,0,1);
	LocationsGetter.markerMap = {};
	$scope.filterMap.addListener('dragend', function() {
		LocationsGetter.mapFilter['northeast']['longitude'] = $scope.filterMap.getBounds().getNorthEast().lng();
		LocationsGetter.mapFilter['northeast']['latitude'] = $scope.filterMap.getBounds().getNorthEast().lat();
		LocationsGetter.mapFilter['southwest']['longitude'] = $scope.filterMap.getBounds().getSouthWest().lng();
		LocationsGetter.mapFilter['southwest']['latitude'] = $scope.filterMap.getBounds().getSouthWest().lat();
		$scope.mapFilterEnabled && LocationsGetter.setFilterTimer(1.5);
	});
	$scope.filterMap.addListener('zoom_changed', function() {
		LocationsGetter.mapFilter['northeast']['longitude'] = $scope.filterMap.getBounds().getNorthEast().lng();
		LocationsGetter.mapFilter['northeast']['latitude'] = $scope.filterMap.getBounds().getNorthEast().lat();
		LocationsGetter.mapFilter['southwest']['longitude'] = $scope.filterMap.getBounds().getSouthWest().lng();
		LocationsGetter.mapFilter['southwest']['latitude'] = $scope.filterMap.getBounds().getSouthWest().lat();
		$scope.mapFilterEnabled && LocationsGetter.setFilterTimer(1.5);
	});
	$scope.$watch('LocationsGetter.locationsPromise', function(){
		LocationsGetter.locationsPromise.then(
			function(promiseLocations){
				//redo map points
				$scope.filterMap.removeMarkers();
				LocationsGetter.markerMap = {};
				$.each(promiseLocations,function(){
					LocationsGetter.markerMap[this['slug']] = addMarker($scope.filterMap,this['latitude'],this['longitude'],this['name'],'<p><a href="/location/'+this['slug']+'">'+this['name']+'</a></p>',true);
					LocationsGetter.markerMap[this['slug']].setOptions({opacity: .5})
				});
			},
			function(failure){
				
			},
			function(notify){
				
			}
		);
	});

});

home.factory("LocationsGetter",function($q,$http, $timeout){
	var LocationsGetter = {};
	var filter = {};
	LocationsGetter.filterTimer = null;
	LocationsGetter.mapFilter = {};
	LocationsGetter.markerMap = {};
	filter['climbing_types'] = [];
	filter['accommodations'] = [];

	filter['continents'] = [];
	filter['price_max'] = [];
	filter['sort'] = [];
	filter['search'] = '';
	filter['start_month'] = 1;
	filter['end_month'] = 12;
	LocationsGetter.mapFilter['northeast'] = {};
	LocationsGetter.mapFilter['northeast']['longitude'] = null;
	LocationsGetter.mapFilter['northeast']['latitude'] = null;
	LocationsGetter.mapFilter['southwest'] = {};
	LocationsGetter.mapFilter['southwest']['longitude'] = null;
	LocationsGetter.mapFilter['southwest']['latitude'] = null;
	LocationsGetter.loading = false;

	var sort = {};
	sort['price'] = [];
	sort['grade'] = [];

	LocationsGetter.setFilterTimer = function(seconds) {
		LocationsGetter.cancelFilterTimer();
		LocationsGetter.filterTimer = $timeout(LocationsGetter.getLocations, seconds*1000);
	}

	LocationsGetter.cancelFilterTimer = function() {
		console.log('canceling filter')
		LocationsGetter.filterTimer && $timeout.cancel(LocationsGetter.filterTimer);
	}

	LocationsGetter.clearFilters = function() {
		this.mapFilter = {};
		this.markerMap = {};
		this.page_num = 1
		filter['climbing_types'] = [];
		filter['accommodations'] = [];

		filter['continents'] = [];
		filter['price_max'] = [];
		filter['sort'] = [];
		filter['search'] = '';
		filter['start_month'] = 1;
		filter['end_month'] = 12;
		this.mapFilter['northeast'] = {};
		this.mapFilter['northeast']['longitude'] = null;
		this.mapFilter['northeast']['latitude'] = null;
		this.mapFilter['southwest'] = {};
		this.mapFilter['southwest']['longitude'] = null;
		this.mapFilter['southwest']['latitude'] = null;
		this.loading = false;

		sort['price'] = [];
		sort['grade'] = [];
	};

	LocationsGetter.toggleFilterButton = function(eventItem,filterArray,filterValue){
		toggleButtonActive(angular.element(eventItem.currentTarget));
		angular.element(eventItem.currentTarget).blur();
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
		LocationsGetter.setFilterTimer(1);
	};

	LocationsGetter.filterByMonth = function(startMonth, endMonth) {
		filter['start_month'] = startMonth;
		filter['end_month'] = endMonth;
		LocationsGetter.setFilterTimer(1.5);
	}

	LocationsGetter.filterByQuery = function(eventItem){
		filter['search'] = eventItem;
		LocationsGetter.setFilterTimer(1);
	}
	LocationsGetter.getFlightQuotes = function(slugs,originAirportCode){
		var deferred = $q.defer();
		$http.post('/api/collect_locations_quotes', {slugs: slugs, origin_airport: originAirportCode}).success(function(data){
			deferred.resolve(data);
		});
		LocationsGetter.flightQuotesPromise = deferred.promise;
		return deferred.promise;
	}
	LocationsGetter.getLocations = function(){
		var deferred = $q.defer();
		LocationsGetter.loading = true;
		$http.post('/api/filter_locations', {filter: filter, mapFilter: LocationsGetter.mapFilter, page: LocationsGetter.page_num}).success(function(data){
			deferred.resolve(data);
			$timeout(function() {
				LocationsGetter.loading = false;
			}, 1000)
		});
		LocationsGetter.locationsPromise = deferred.promise;
		return deferred.promise;
	};
	LocationsGetter.getLocations();
	LocationsGetter.getFlightQuotes([],null);
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
		addMarker(map,this['lat'],this['lng'],this['name'],'<p><a href="/location/'+this['slug']+'">'+this['name']+'</a></p>',true);
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

function setHighcharts(locationQuoteData, origin_airport){
	$.each(locationQuoteData,function(slug,months){
		destinationAirport = slug.split("-")[0]
		quote_array = [];
		var maxPrice = 0;
		$.each(this,function(monthKey,value){
			$.each(value, function(dayKey,cost){
				quote_array.push([monthKey+'/'+dayKey,cost])
				if(cost > maxPrice)
					maxPrice = cost;
			})

		});
		$('#highchart'+slug).highcharts({
	        chart: {
	            type: 'line',
	            height: '100'
	        },
	        title: {
	            text: 'One Way cost from '+origin_airport+' to '+destinationAirport + '(source: Skyscanner)',
	            floating: true
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
	            data: quote_array,
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

function setLocationHighchart(locationQuoteData, origin_airport){
	$.each(locationQuoteData,function(slug,months){
		destinationAirport = slug.split("-")[0]
		quote_array = [];
		var maxPrice = 0;
		$.each(this,function(monthKey,value){
			$.each(value, function(dayKey,cost){
				quote_array.push([monthKey+'/'+dayKey,cost])
				if(cost > maxPrice)
					maxPrice = cost;
			})

		});
		$('#highchart'+slug).highcharts({
	        chart: {
	            type: 'line',
	            height: '200'
	        },
	        title: {
	            text: 'One Way cost from '+origin_airport+' to '+destinationAirport + '(source: Skyscanner)',
	            floating: true
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
	            data: quote_array,
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
