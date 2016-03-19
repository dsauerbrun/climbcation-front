var home = angular.module('app', ['helperService','filter-directives','location-list-item-directives','location-section-directives','section-form-directive','ngRoute','facebookComments','ezfb','ui.bootstrap','customFilters']);
home.config(['$routeProvider', function($routeProvider) {
	$routeProvider
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
home.controller('LocationPageController',function($scope,$rootScope,$q,$http,$routeParams,$location,$anchorScroll,$timeout, LocationsGetter){
	slug = $routeParams.slug;
	$scope.name = 'hello';
	$scope.gmap;
	$scope.origin_airport = 'BER';
	var deferred = $q.defer();
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
	$http.get('api/location/'+slug).success(function(data){
		deferred.resolve(data);
	});
	deferred.promise.then(
		function(success){
			$scope.longitude = success['location']['longitude'];
			$scope.latitude = success['location']['latitude'];
			//processSectionsByPair(success['sections']);
			$scope.sections = success['sections'];
			$scope.tableOfContents = processTableContents($scope.sections);
			$scope.locationData = success['location']
			$scope.nearby = success['nearby'];
			$scope.gmap = createMap('map-canvas',$scope.latitude,$scope.longitude,6);
			addCloseLocations($scope.gmap,success['nearby']);
			addMarker($scope.gmap,$scope.latitude,$scope.longitude,success['location']['title'],'<p>'+success['location']['title']+'</p>',false);

			$scope.$watch('origin_airport', function() {
				LocationsGetter.getFlightQuotes([$scope.locationData.slug], $scope.origin_airport).then(function(promiseQuotes) {
					$timeout(function(){
						setLocationHighchart(promiseQuotes,$scope.origin_airport);
					});
				});
			})
			
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

	

});

home.controller('LocationsController',function($scope, $timeout,LocationsGetter){
	var locations = this;
	$scope.locationData = [];
	$scope.LocationsGetter = LocationsGetter;
	$scope.origin_airport = "BER";
	$scope.slugArray = [];
	

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
					setHighcharts(promiseQuotes,$scope.origin_airport);
				});
			}
		);

	});

	$scope.$watch('origin_airport', function(){
		if($scope.origin_airport != null){
			LocationsGetter.getFlightQuotes($scope.slugArray,$scope.origin_airport);
		}
	});

	$scope.$watch('LocationsGetter.locationsPromise', function(){
		LocationsGetter.locationsPromise.then(
			function(promiseLocations){
				$scope.locationData = promiseLocations;
				$scope.slugArray = []
				$.each(promiseLocations, function(){
					$scope.slugArray.push(this['slug'])
				});
				LocationsGetter.getFlightQuotes($scope.slugArray,$scope.origin_airport);
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
	$scope.filterMap = createMap('mapFilter',40.3427932,-105.6858329,3);
	LocationsGetter.markerMap = {};
	$scope.filterMap.addListener('dragend', function() {
		LocationsGetter.mapFilter['northeast']['longitude'] = $scope.filterMap.getBounds().getNorthEast().lng();
		LocationsGetter.mapFilter['northeast']['latitude'] = $scope.filterMap.getBounds().getNorthEast().lat();
		LocationsGetter.mapFilter['southwest']['longitude'] = $scope.filterMap.getBounds().getSouthWest().lng();
		LocationsGetter.mapFilter['southwest']['latitude'] = $scope.filterMap.getBounds().getSouthWest().lat();
		LocationsGetter.page_num = 1;
		LocationsGetter.getLocations();
	});
	$scope.filterMap.addListener('zoom_changed', function() {
		LocationsGetter.mapFilter['northeast']['longitude'] = $scope.filterMap.getBounds().getNorthEast().lng();
		LocationsGetter.mapFilter['northeast']['latitude'] = $scope.filterMap.getBounds().getNorthEast().lat();
		LocationsGetter.mapFilter['southwest']['longitude'] = $scope.filterMap.getBounds().getSouthWest().lng();
		LocationsGetter.mapFilter['southwest']['latitude'] = $scope.filterMap.getBounds().getSouthWest().lat();
		LocationsGetter.page_num = 1;
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
	LocationsGetter.mapFilter = {};
	LocationsGetter.markerMap = {};
	LocationsGetter.page_num = 1
	filter['climbing_types'] = [];
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
		LocationsGetter.page_num = 1;
		LocationsGetter.getLocations();
	
	};
	LocationsGetter.pageChange = function(page){
		LocationsGetter.page_num = page;
		if(LocationsGetter.page_num < 1)
			LocationsGetter.page_num = 1;
		LocationsGetter.getLocations();
	}

	LocationsGetter.filterByMonth = function(startMonth, endMonth) {
		filter['start_month'] = startMonth;
		filter['end_month'] = endMonth;
		LocationsGetter.getLocations();
	}

	LocationsGetter.filterByQuery = function(eventItem){
		filter['search'] = eventItem;
		LocationsGetter.page_num = 1;
		LocationsGetter.getLocations();
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
		/*$('#highchart'+slug).highcharts({
	        chart: {
	            type: 'line',
	            height: '100',
	            showAxes: false
	        },
	        title: {
	            text: 'One Way cost from '+origin_airport+' to '+destinationAirport
	        },
	        subtitle: {
	            text: 'Source: Skyscanner.com(prices subject to change)'
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
	    });*/
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
		/*$('#highchart'+slug).highcharts({
	        chart: {
	            type: 'line',
	            height: '100',
	            showAxes: false
	        },
	        title: {
	            text: 'One Way cost from '+origin_airport+' to '+destinationAirport
	        },
	        subtitle: {
	            text: 'Source: Skyscanner.com(prices subject to change)'
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
	    });*/
	});
}