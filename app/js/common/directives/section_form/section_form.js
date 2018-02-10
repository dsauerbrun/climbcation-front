var sectionForm = angular.module('section-form-directive', ['ngFileUpload','location-other-section-directives']);

var locationNames;

sectionForm.directive('sectionform', function($http){
	return {
		restrict: 'E',
		templateUrl: 'common/directives/section_form/section_form.tpl.html',
		controller: 'SectionFormController'
	};

});


sectionForm.controller('SectionFormController', function($sce, $scope,$q,$http,Upload,$location, helperService, $route, $timeout){
	$scope.locationObj = {'submitter_email':'','name':'','country':'','continent':'','airport':'','price_floor':'','price_ceiling':'','months':{},'accommodations':{},'climbingTypes':{},'grade':{}, 'sections':[], closestAccommodation: ''};
	var emptySection = {'previewOff':true, 'title':'','body':''}
	$scope.existMessage= 'This location already exists. If you would like to edit it, please find it on the home page and edit it there';
	$scope.helperService = helperService;
	helperService.setAirportApiKey();

	$scope.accommodations = [];
	$scope.climbingTypes = [];
	$scope.months =[];
	$scope.grades = [];
	$scope.existingLocations = [];
	$scope.currentPage = 1;
	$scope.progressBar;
	$scope.locationObj.foodOptionDetails = {};

	$http.get('api/location/name/all').then(function(locationList){
		locationNames = locationList.data;
	});


	$scope.DICE_THRESHOLD = .75;

	$scope.diceCalc = function() {
		$scope.diceDistanceNum = 0;
		_.forEach(locationNames, function(location) {
			var newDiceCalc = clj_fuzzy.metrics.dice(location[0].toLowerCase(), $scope.locationObj.name.toLowerCase());
			if (newDiceCalc > $scope.diceDistanceNum) {
				$scope.diceDistanceNum = newDiceCalc;
			}
		});
	}

	var trustedHtml = {};
	$scope.existsMessage = function() {
		var exists = _.find(locationNames, function(location){
        	return location[0].toLowerCase() == $scope.locationObj.name.toLowerCase() || clj_fuzzy.metrics.dice(location[0].toLowerCase(), $scope.locationObj.name.toLowerCase()) > $scope.DICE_THRESHOLD;
        });

		if (exists && trustedHtml.existingLocation != exists[0]) {
			trustedHtml.existingLocation = exists[0];
			return trustedHtml.html = $sce.trustAsHtml('Did you mean ' + trustedHtml.existingLocation + '? <a class="btn btn-climbcation" href="/location/'+ exists[1] +'">Click here to edit it!</a>');
		} else {
			return trustedHtml.html
		}
	}

	$scope.getAirport = function(item, model, label, event) {
		$scope.locationObj.airportName = item.name;
		$scope.locationObj.airport = item.iata;
	}

	$scope.getIconUrl = function(page) {
		var url;
		if (page == $scope.currentPage) {
			return '/images/location-icon.png';
		} else if (page > $scope.currentPage) {
			return '';
		} else if (page < $scope.currentPage) {
			switch(page) {
				case 1:
					url = $scope.generalComplete()?'/images/check-icon.png':'/images/x-icon.png';
					break;
				case 2:
					url = $scope.gettingInComplete()?'/images/check-icon.png':'/images/warning-icon.png';
					break;
				case 3:
					url = $scope.accommodationComplete()?'/images/check-icon.png':'/images/warning-icon.png';
					break;
				case 4:
					url = $scope.costComplete()?'/images/check-icon.png':'/images/warning-icon.png';
					break;
				case 5:
					url = '/images/check-icon.png';
					break;
				case 6:
					url = '/images/check-icon.png';
					break;
			}
			return url;
		}
	}

	$scope.generalComplete = function() {
		var cleanTypes = helperService.cleanFalses($scope.locationObj.climbingTypes);
		var cleanMonths = helperService.cleanFalses($scope.locationObj.months);
		var name = $scope.locationObj.name != '';
		// check grades
		var grade = true;
		// TODO: FIXME: kind of done as a hack due to time constraint
		// go through each climbing type to get the typeID, check to see if that type's grade exists
		_.forEach($scope.locationObj.climbingTypes, function(enabled, climbingTypeId) {
			if(enabled && !$scope.locationObj.grade[climbingTypeId]) {
				grade = false;
			}
		});
		var types = _.size(cleanTypes) > 0;
		var months = _.size(cleanMonths) > 0;
		if(name && grade && types && months) {
			return true;
		} else {
			return false;
		}
	}

	$scope.gettingInComplete = function() {
		return Boolean($scope.locationObj.bestTransportationCost);
	};

	$scope.accommodationComplete = function() {
		return _.size($scope.locationObj.accommodations) > 0;
	};

	$scope.costComplete = function() {
		return _.size($scope.locationObj.foodOptionDetails) > 0;
	}

	$scope.stopPropagation = function($event) {
		$event.stopPropagation();
	};

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
		})
	}

	$scope.selectBestTransportationCost = function(cost) {
		// reset active
		_.forEach($scope.bestTransportationCostOptions, function(costOption) {
			costOption.active = false;
		})
		cost.active = true;
		$scope.locationObj.bestTransportationCost = cost.cost
	}

	$scope.nextPage = function() {
		if ($scope.currentPage < 6) {
			$scope.currentPage++;
			$scope.updateProgressBar();
		}
		
	}
	$scope.prevPage = function() {
		if ($scope.currentPage > 1) {
			$scope.currentPage--;
			$scope.updateProgressBar();
		}
	}
	$scope.changePage = function(pageNum) {
		$scope.currentPage = pageNum;
		$scope.updateProgressBar();
	}

	$scope.updateProgressBar = function() {
		switch($scope.currentPage) {
			case 1:
				$scope.progressBar = 8.35;
				break;
			case 2:
				$scope.progressBar = 25;
				break;
			case 3:
				$scope.progressBar = 41.7;
				break;
			case 4:
				$scope.progressBar = 58.35;
				break;
			case 5:
				$scope.progressBar = 75;
				break;
			case 6:
				$scope.progressBar = 100;
				break;

		}
	}
	$scope.updateProgressBar();


	$scope.$watch('locationForm.$valid', function(){
	});
	emptySection.clone = function(){
		return jQuery.extend(true, {}, this);
	};
	
	$scope.locationObj.sections.push(emptySection.clone())
	//get options for seasons, climbing types, accommodations etc...
	$http.get('api/get_attribute_options').then(function(data){
		var respData = data.data
		$scope.accommodations = respData['accommodations'];
		$scope.climbingTypes = respData['climbing_types'];
		$scope.months = respData['months'];
		$scope.grades = respData['grades'];
		$scope.foodOptions = respData['food_options'];
		$scope.transportations = respData['transportations'];
	});

	$scope.findClimbingType = function(typeId) {
		return $scope.climbingTypes.find(function(type) {
			return typeId == type.id;
		});
	}	

	$scope.closeSuccessModal = function(){
		$('#successModal').modal('hide')
		$location.path('#home')
	}


	$scope.saveSection = function(section){
		//adding default to build page in beginning
		if(section){
			$scope.locationObj.sections.push(emptySection.clone());
			var sectionsLength =$scope.locationObj.sections.length;
			$scope.locationObj.sections[sectionsLength-2] = section;
		}
		//adding a user custom section
		else{
			$scope.locationObj.sections.push(emptySection.clone())
		}
	}

	$scope.removeSection = function(section){
		var sections = $scope.locationObj.sections;
		index = sections.indexOf(section);
		sections.splice(index,1);
	}

	$scope.submitEmail = function() {
		$http.post('api/locations/' + $scope.locationId + '/email', {email: $scope.locationObj.submitterEmail})
			.then(function(response) {
				$scope.emailThankYou = true;
			})
	}

	$scope.submitLocation = function(){
		//run validation method
		if(!$scope.generalComplete()){
			// show an error modal
			$('#errorModal').modal();
		} else {
			//upload
			if (!$scope.loading) {
				var tmpGrade = $scope.locationObj.grade;
				$scope.locationObj.grade = [];
				_.forEach(tmpGrade, function(grade) {
					$scope.locationObj.grade.push(grade.id);
				});
				$('#publish-button').addClass('disabled');
				$scope.loading = true;
				$http.post('api/submit_new_location', {location: $scope.locationObj})
					.then(function(response) {
						if (response.status == 200) {
							$scope.nextPage();
							$scope.locationId = response.data.id;
							$scope.locationSlug = response.data.slug;
						} else {
							console.log('error submitting locationSection');
						}
						$scope.locationObj.grade = tmpGrade;
						$('#publish-button').removeClass('disabled');
						$scope.loading = false;
					});
			}
		}

	}

	$scope.startNewLocation = function() {
		$timeout(function() {
			$route.reload();
		}, 0)
		
	}

});

sectionForm.directive('validationMessage', function () { 
	return{
	    restrict: 'A',
	    template: '<input tooltip tooltip-placement="bottom" >',
	    replace: true,
	    require: 'ngModel',
	    link: function (scope, element, attrs, ctrl) {

	      ctrl.$parsers.unshift(function(viewValue) {
	        var valid = ctrl.$valid;
	        if (valid) {
	          attrs.$set('tooltip', "");
	        } else {
	          attrs.$set('tooltip', attrs.validationMessage);
	          scope.tt_isOpen = true; // doesn't work!?
	        }
	        return viewValue;
	      });
	    }
	};
});

sectionForm.directive('locationExists', function ($http){ 
   return {
      require: 'ngModel',
      link: function(scope, elem, attr, ctrl) {
          
          ctrl.$validators.locationExists = function(modelValue, viewValue){
          	if (ctrl.$isEmpty(modelValue)) {
	          // consider empty models to be valid
	          return false;
	        }
	        var exists = _.find(locationNames, function(location){
	        	return location[0].toLowerCase() == viewValue.toLowerCase();
	        });
	        if(!exists){
	        	ctrl.$setValidity('valid',true);
	        	return true;
	        }
	        else{
		        ctrl.$setValidity('valid',false);
		        return false;	
	    	}
          }
      }
   };
});

sectionForm.directive('integer', function() {
	var INTEGER_REGEXP = /^\-?\d+$/;
  return {
    require: 'ngModel',
    link: function(scope, elm, attrs, ctrl) {
      ctrl.$validators.integer = function(modelValue, viewValue) {
        if (ctrl.$isEmpty(modelValue)) {
          // consider empty models to be valid
          
          return false;
        }

        if (INTEGER_REGEXP.test(viewValue)) {
          // it is valid
          	ctrl.$setValidity('valid',true);
        	return true;
        }

        // it is invalid
        ctrl.$setValidity('invalid',false);
        return false;
      };
    }
  };
});