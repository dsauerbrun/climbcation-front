var home = angular.module('app', ['ngToast','ngSanitize','trackScroll','infinite-scroll','ui.bootstrap','helperService','authService','filter-directives','location-list-item-directives','section-form-directive', 'UserManagement', 'ngRoute','facebookComments','ezfb','ui.bootstrap','duScroll','customFilters', 'ngAnimate', 'mgcrea.ngStrap', 'LocalStorageModule', 'angularMoment']);

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
	.when('/resetpass', {
		templateUrl: 'views/user_management/reset_password.tpl.html',
	})
	.when('/profile', {
		templateUrl: 'views/user_management/profile.tpl.html',
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

home.filter('removeSpaces', function () {
	return function (text) {
		var str = text.replace(/\s+/g, '');
		return str;
	};
});

home.controller('LocationPageController',['ngToast', '$scope', '$rootScope', 'helperService', '$http', '$routeParams', '$location', '$anchorScroll', '$timeout', 'LocationsGetter', 'localStorageService', 'moment', 'authService', function(ngToast,$scope,$rootScope,helperService,$http,$routeParams,$location,$anchorScroll,$timeout, LocationsGetter, localStorageService, moment, authService){
	slug = $routeParams.slug;
	var editMessage = 'Your edit has been submitted and will be approved by a moderator shortly!';
	$scope.name = 'hello';
	$scope.gmap;
	$scope.nearbyShow = false;
	$scope.editingAccommodation = false;
	$scope.editingGettingIn = false;
	$scope.editingFoodOptions = false;
	$scope.helperService = helperService;
	$rootScope.hoveredLocation = {location: null};
	$scope.moment = moment;
	$scope.posts = [];
	$scope.newPost = null;
	$scope.postingComment = false;
	$scope.authService = authService;

	$scope.showSignUp = $rootScope.showSignUp;
	

	$scope.getAirport = function(item, model, label, event) {
		helperService.originAirportCode = item.iata;
		helperService.originAirport = item.name;
		localStorageService.set('airport', item);
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

	init = async () => {
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
					$scope.gmap = createMap('nearby-map',$scope.latitude,$scope.longitude,4, $rootScope);
					addCloseLocations($scope.gmap, success['nearby'], $location, $rootScope);
					addMarker($scope.gmap, $scope.latitude, $scope.longitude, success['location'], false);

					populateEditables($scope.locationData);

					LocationsGetter.getFlightQuotes([$scope.locationData.slug], helperService.originAirportCode).then(function(promiseQuotes) {
						$timeout(function(){
							setLocationHighchart(promiseQuotes, helperService.originAirportCode);
						});
					});
					$timeout(function() {FB.XFBML.parse()});
				}
			}
		);

		$scope.posts = (await $http.get(`api/threads/${slug}?destination_category=true`)).data;
	}

	init();
	

	$scope.toggleNearby = function() {
		$scope.nearbyShow = !$scope.nearbyShow;
	}

	$scope.submitComment = async function() {
		if ($scope.postingComment) {
			$scope.commentError = "You have already submitted a comment";
			return;
		}

		if (!$scope.newPost || $scope.newPost.length < 3) {
			$scope.commentError = "Your post must be at least 3 characters long";
			return;
		}

		$scope.commentError = null;
		$scope.postingComment = true;
		try {
			let threadId = $scope.posts && $scope.posts.length && $scope.posts[0].forum_thread_id;
			threadId = threadId || slug;
			let resp = await $http.post(`api/threads/${threadId}/posts`, {content: $scope.newPost});
			$scope.posts = (await $http.get(`api/threads/${slug}?destination_category=true`)).data;
			$scope.postingComment = false;
			$scope.newPost = null;
		} catch (err) {
			console.log(err);
			$scope.commentError = err.data;
			$scope.postingComment = false;
		}

		$scope.$apply();
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

	$scope.saveSection = function(section) {
		if (!$scope.sections[section.id]) {
			$scope.sections[section.id] = section;
			delete $scope.sections.new;
		}
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

}]);

home.controller('LocationsController', ['authService','$rootScope', '$scope', '$timeout', 'LocationsGetter', '$location', '$document', '$http', 'helperService', function(authService, $rootScope, $scope, $timeout,LocationsGetter, $location, $document, $http, helperService){
	var locations = this;
	$scope.locationData = [];
	$scope.LocationsGetter = LocationsGetter;
	$scope.slugArray = [];
	$scope.helperService = helperService;
	$scope.largeMapEnabled = false;
	LocationsGetter.locations = LocationsGetter.locations || [];
	$rootScope.hoveredLocation = {location: null};
	
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

	$scope.clearFilters = function() {
		LocationsGetter.clearFilters();
		LocationsGetter.setFilterTimer(0);
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
	};

}]);

home.controller('HeaderController', ['authService','$rootScope', '$scope', '$timeout', 'LocationsGetter', '$location', '$document', '$http', 'helperService', '$routeParams', 'ngToast', function(authService, $rootScope, $scope, $timeout,LocationsGetter, $location, $document, $http, helperService, $routeParams, ngToast){
	$scope.authService = authService;
	$rootScope.showSignUp = function() {
		$('#loginModal').modal('show');
		$rootScope.signUpEnabled = true;
	}

	$rootScope.showLogin = function() {
		$rootScope.signUpEnabled = false;
		$('#loginModal').modal('show');
	}

	$scope.resetPassword = async function(email) {
		try {
			await authService.resetPassword(email);
			ngToast.create({
				additionalClasses: 'climbcation-toast',
				content: 'A link to reset your password has been sent to your email!'
			});
		} catch (err) {
		}
		$scope.$apply();
	}
}]);

home.controller('AuthController', ['ngToast', 'authService','$rootScope', '$scope', '$timeout', 'LocationsGetter', '$location', '$document', '$http', 'helperService', function(ngToast, authService, $rootScope, $scope, $timeout,LocationsGetter, $location, $document, $http, helperService){
	$scope.username = null;
	$scope.password = null;
	$rootScope.signUpEnabled = false;
	$scope.authError = null;
	$scope.signingIn = false;

	$scope.getState = function() {
		return encodeURIComponent($location.url());
	}

	$scope.showSignUp = function() {
		$rootScope.signUpEnabled = true;
	}

	$scope.showLogin = function() {
		$rootScope.signUpEnabled = false;
	}

	$scope.signin = async function() {
		$scope.signingIn = true;
		this.authError = null;
		try {
			await authService.login($scope.username, $scope.password);
			$scope.signingIn = false;
			$('#loginModal').modal('hide');
			$scope.$apply();
		} catch (err) {
			if (err.status == 400) {
				$scope.authError = 'Invalid Username or Password';
				$scope.signingIn = false;
				$scope.$apply();
			} else {
				$scope.authError = `Unknown Error: ${err.data}`;
			}
		}
		
	}

	$scope.signUpValid = function() {
		function emailIsValid (email) {
		  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
		}

		let invalidString = '';
		if (!$scope.password || $scope.password.length < 6) {
			invalidString += `Password must be at least 6 characters <br />`;
		}
		if (!$scope.username || $scope.username.length < 3) {
			invalidString += `Username must be at least 3 characters <br />`;
		}

		if (!$scope.email || !emailIsValid($scope.email)) {
			invalidString += `Must enter a valid email <br />`;
		}

		if (invalidString == '') {
			return true;
		} else {
			return invalidString;
		}
	}

	$scope.signUp = async function() {
		$scope.authError = null;
		$scope.signingIn = true;
		let signUpValid = $scope.signUpValid();
		if (signUpValid === true) {
			try {
				await authService.signUp($scope.email, $scope.username, $scope.password);
				ngToast.create({
					additionalClasses: 'climbcation-toast',
					content: 'A link to verify your account has been sent to your email!'
				});
				$('#loginModal').modal('hide');
			} catch (err) {
				$scope.authError = err;
			}
			
			$scope.signingIn = false;
		} else {
			// form not valid
			$scope.authError = signUpValid;
			$scope.signingIn = false;
		}
		
		$scope.$apply();
	}

	$scope.resetPassword = async function() {
		$scope.authError = null;
		$scope.signingIn = true;
		try {
			await authService.resetPassword($scope.username);
			ngToast.create({
				additionalClasses: 'climbcation-toast',
				content: 'A link to reset your password has been sent to your email!'
			});
			$('#loginModal').modal('hide');
		} catch (err) {
			$scope.authError = err;
		}
		$scope.signingIn = false;
		$scope.$apply();
	}

	async function init() {
		await authService.getUser();
	}

	init();
}]);

home.directive('mapFilter', function() {
	return {	
		restrict: 'E',
		templateUrl: 'views/directives/map.tpl.html',
		//transclude: true,
		scope: {
			filterType: '@',
		},
		controller: ['$rootScope', '$scope', '$timeout', '$window', 'LocationsGetter', function($rootScope,$scope, $timeout, $window, LocationsGetter) {
			var filterId;
			var mapDefaults = {};
			$scope.hoveredLocation = $rootScope.hoveredLocation;
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
			LocationsGetter.maps[$scope.filterType] = {map: createMap(filterId, mapDefaults.latitude, mapDefaults.longitude, mapDefaults.zoom, $rootScope), firstMapLoad: true};

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
		}]
	}
});

home.service('LocationsGetter', ['$http', '$timeout', '$rootScope', 'localStorageService', 'moment', '$location', function($http, $timeout, $rootScope, localStorageService, moment, $location) {
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
	LocationsGetter.appliedFilters = [];
	filter['climbing_types'] = [];
	filter.grades = {};
	filter['accommodations'] = [];

	filter['continents'] = [];
	filter['sort'] = [];
	filter['search'] = '';
	filter.solo_friendly = null;
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
	let filterKeys = {}

	

	LocationsGetter.setAppliedFilters = async function() {
		if (!filterKeys.climbTypes) {
			await $http.get('/api/filters').then(function(resp){
				var data = resp.data;
				filterKeys.climbTypes = data.climbTypes;
				filterKeys.accommodations = data.accommodations;
				filterKeys.grades = data.grades;
			});
		}
		let filterList = [];
		let filter = LocationsGetter.filter;
		filter.accommodations && filter.accommodations.forEach(function(accommodation) {
			let title = _.findKey(filterKeys.accommodations, function(accommodationId) {return accommodationId == accommodation});
			filterList.push({title: title, id: accommodation, type: 'accommodations'});
		});

		filter.climbing_types && filter.climbing_types.forEach(function(climbingType) {
			filterList.push({title: climbingType, id: climbingType, type: 'climbing_types'});
		});

		if (filter.grades) {
			for (let grade in filter.grades) {
				let climbingType = _.findKey(filterKeys.grades, function(type) {return type.type.id == grade});
				let climbingTypeObj = filterKeys.grades[climbingType];
				let maxGradeId = filter.grades[grade].reduce(function(a, b) {
				    return Math.max(a, b);
				});
				let maxGrade = climbingTypeObj.grades.find(x => x.id == maxGradeId);
				filterList.push({title: `${climbingType}: ${maxGrade.grade}`, id: grade, type: 'grades'});
			}
		}

		if (filter.search && filter.search != '') {
			filterList.push({title: `Keyword: ${filter.search}`, id: 'search', type: 'search'});
		}

		if (filter.start_month != 1 || filter.end_month != 12) {
			filterList.push({title: `${filter.start_month_name.substring(0, 3)} - ${filter.end_month_name.substring(0,3)}`, id: 'months', type: 'months'})
		}

		if (filter.solo_friendly && filter.solo_friendly === true) {
			filterList.push({title: `Solo Traveler Friendly`, id: 'solo_friendly', type: 'solo_friendly'});
		}

		LocationsGetter.appliedFilters = filterList;
		$rootScope.$apply();
	}

	LocationsGetter.removeAppliedFilter = function(appliedFilter) {
		if (appliedFilter.type == 'accommodations' || appliedFilter.type == 'climbing_types') {
			LocationsGetter.filter[appliedFilter.type] = LocationsGetter.filter[appliedFilter.type].filter(x => x != appliedFilter.id);
		} else if (appliedFilter.type == 'grades') {
			delete LocationsGetter.filter.grades[appliedFilter.id];
		} else if (appliedFilter.type == 'search') {
			LocationsGetter.filter.search = '';
		} else if (appliedFilter.type == 'months') {
			LocationsGetter.filter.end_month = 12;
			LocationsGetter.filter.start_month = 1;
			LocationsGetter.filter.end_month_name = 'December';
			LocationsGetter.filter.start_month_name = 'January';
		} else if (appliedFilter.type == 'solo_friendly') {
			LocationsGetter.filter.solo_friendly = null;
		}

		let appliedFilterIndex = LocationsGetter.appliedFilters.findIndex(x => x.id == appliedFilter.id && x.type == appliedFilter.type);
		LocationsGetter.appliedFilters.splice(appliedFilterIndex, 1);
		LocationsGetter.setFilterTimer(0);
	}

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
			for (let key in LocationsGetter.maps) {
				let currentMap = LocationsGetter.maps[key];
				
				let existingMarkerIds = currentMap.map.markers.map(x => x.details.location.id);
				LocationsGetter.unpaginatedLocations.filter(x => existingMarkerIds.indexOf(x.id) == -1).forEach(function(unpagLocation) {
					var clickFunc = null;
					if (key == 'large') {
						clickFunc = async function(e) {
							var exists = LocationsGetter.locations.find(x => x.id == unpagLocation.id);
							!exists && await LocationsGetter.addSingleLocation(unpagLocation.slug);
							$('#infinite-scroll-container').animate({
				          scrollTop: $('#location-item-' + unpagLocation.id).offset().top - $('#infinite-scroll-container').offset().top  + $('#infinite-scroll-container').scrollTop()
				      }, 1000);
						}
					} else {
						clickFunc = async function(e) {
							$location.path('/location/' + e.details.location.slug);
							$rootScope.$apply();
						}
					}
					LocationsGetter.markerMap[unpagLocation['slug'] + key] = addMarker(currentMap.map, unpagLocation['latitude'], unpagLocation['longitude'], unpagLocation, true, clickFunc);
					
					let options = {opacity: .5};
					

					LocationsGetter.markerMap[unpagLocation['slug'] + key].setOptions(options);
				});

				currentMap.map.markers.filter(x => LocationsGetter.unpaginatedLocations.map(y => y.id).indexOf(x.details.location.id) == -1).forEach(function(marker) {
					currentMap.map.removeMarker(marker);
				})

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
			LocationsGetter.setAppliedFilters();
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
		filter.solo_friendly = null;
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

function createMap(mapId,latitude,longitude,zoom, $rootScope){
	var map = new GMaps({
		div: '#'+mapId,
		lat: latitude,
		lng: longitude,
		zoom: zoom,
		scrollwheel: false,
		gestureHandling: 'greedy',
	});

	let overlay = new google.maps.OverlayView();
	overlay.draw = function () {};
	overlay.setMap(map.map);
	map.overlay = overlay;
	map.hoveredLocation = $rootScope.hoveredLocation;
	map.$apply = $rootScope.$apply;
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

function addCloseLocations(map, locationMap, $location, $rootScope){
	$.each(locationMap,function(){
		let clickFunc = function(e) {
			console.log('here i am')
			$location.path('/location/' + e.details.location.slug);
			$rootScope.$apply();
		}
		addMarker(map, this['lat'], this['lng'], this, true, clickFunc);
	});
}

function getPixelLocation(currentLatLng, map) {

    var scale = Math.pow(2, map.getZoom());
    // The NorthWest corner of the current viewport corresponds
    // to the upper left corner of the map.
    // The script translates the coordinates of the map's center point
    // to screen coordinates. Then it subtracts the coordinates of the
    // coordinates of the map's upper left corner to translate the 
    // currentLatLng location into pixel values in the <div> element that hosts the map.
    var nw = new google.maps.LatLng(
        map.getBounds().getNorthEast().lat(),
        map.getBounds().getSouthWest().lng()
    );
    // Convert the nw location from geo-coordinates to screen coordinates
    var worldCoordinateNW = map.getProjection().fromLatLngToPoint(nw);
    // Convert the location that was clicked to screen coordinates also
    var worldCoordinate = map.getProjection().fromLatLngToPoint(currentLatLng);
    var currentLocation = new google.maps.Point(
        Math.floor((worldCoordinate.x - worldCoordinateNW.x) * scale),
        Math.floor((worldCoordinate.y - worldCoordinateNW.y) * scale)
    );

    return currentLocation;
}

function addMarker(map,lat,lng,location,isSecondary, clickFunc = null){
	return map.addMarker({
		lat: lat,
		lng: lng,
		title: location.title || location.name,
		details: {location: location},
		icon: isSecondary ? '' : 'https://s3-us-west-2.amazonaws.com/climbcation-front/assets/primary.png',
		click: clickFunc,
		mouseover: function(event) {
			let point = map.overlay.getProjection().fromLatLngToContainerPixel(this.position);
			
			var offsetCalcY = 0;
			var offsetCalcX = 0;
			var bottomOffset = 0;
			if (map.getDiv().id == 'mapFilterLarge') {
				offsetCalcY = 50;
				offsetCalcX = 24;
				bottomOffset = 50;
			} else if (map.getDiv().id == 'mapFilter') {
				offsetCalcY = 30;
				offsetCalcX = 10;
				bottomOffset = 50;
			} else if (map.getDiv().id == 'nearby-map') {
				offsetCalcY = 60;
				offsetCalcX = 425;
				bottomOffset = 50;
				$('.map-info-window > .location-card').addClass('left-arrow');
			}
			
			let infoWindowWidth = $('.map-info-window').outerWidth();
			let infoWindowHeight = $('.map-info-window').outerHeight();

			$('.map-info-window').show();
			$('.map-info-window > .location-card').addClass('map-info-window-arrow-bottom');
			$('.map-info-window > .location-card').removeClass('map-info-window-arrow-top');
			$('.map-info-window').css('top', (point.y - infoWindowHeight - offsetCalcY) + 'px');
			$('.map-info-window').css('left', (point.x - infoWindowWidth + offsetCalcX) + 'px');

			if (!$('.map-info-window').visible()) {
				$('.map-info-window').css('top', (point.y - infoWindowHeight - offsetCalcY + (infoWindowHeight + bottomOffset)) + 'px');
				$('.map-info-window > .location-card').removeClass('map-info-window-arrow-bottom');
				$('.map-info-window > .location-card').addClass('map-info-window-arrow-top');
			}
			map.hoveredLocation.location = this.details.location;
			map.$apply();
		},
		mouseout: function() {
			$('.map-info-window').hide();
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
