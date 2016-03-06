var sectionForm = angular.module('section-form-directive', ['ngFileUpload','location-section-directives']);

sectionForm.directive('sectionform', function(){
	return {
		restrict: 'E',
		templateUrl: 'common/directives/section_form/section_form.tpl.html',
		controller: 'SectionFormController'
	};
});


sectionForm.controller('SectionFormController', function($scope,$q,$http,Upload,$location){
	$scope.locationObj = {'submitter_email':'','name':'','country':'','continent':'','airport':'','price_floor':'','price_ceiling':'','months':{},'accommodations':{},'climbingTypes':{},'grade':'', 'sections':[], closestAccommodation: '2-5 miles'};
	var emptySection = {'previewOff':true, 'title':'','body':'','subsections':[{'title':'','subsectionDescriptions':[{'desc':''}]}]}
	
	$scope.accommodations = [];
	$scope.climbingTypes = [];
	$scope.months =[];
	$scope.grades = [];
	$scope.existingLocations = [];
	$scope.currentPage = 3;
	$scope.progressBar;

	$scope.stopPropagation = function($event) {
		$event.stopPropagation();
	};

	$scope.selectAccommodation = function(accommodation) {
		var accommodationExists = $scope.locationObj.accommodations[accommodation.id];

		if (accommodationExists) {
			console.log('in exists')
			//remove it from list of accommodations
			$scope.locationObj.accommodations[accommodationExists.id] = null;
		} else {
			//mark the id and create a cost range field
			$scope.locationObj.accommodations[accommodation.id] = {id: accommodation.id, cost: ''};
		}
	};

	$scope.setAccommodationCost = function (accommodation, range) {
		var accommodationExists = _.find($scope.locationObj.accommodations, function(accommodationObj) {
			return accommodation.id == accommodationObj.id;
		});
		if (accommodationExists) {
			accommodationExists.cost = range;
		}
	};

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

	$scope.updateProgressBar = function() {
		switch($scope.currentPage) {
			case 1:
				$scope.progressBar = 8.7;
				break;
			case 2:
				$scope.progressBar = 25.4;
				break;
			case 3:
				$scope.progressBar = 42;
				break;
			case 4:
				$scope.progressBar = 58.6;
				break;
			case 5:
				$scope.progressBar = 75.4;
				break;
			case 6:
				$scope.progressBar = 92;
				break;

		}
	}
		$scope.updateProgressBar();


	$scope.$watch('locationForm.$valid', function(){
		console.log('locationform validation changed')
		console.log($scope.locationForm.$valid)
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

	

	$scope.submitLocation = function(){
		//run validation method, 
		//upload
		Upload.upload({
			url:'api/submit_new_location',
			fields: {location: $scope.locationObj},
			file: $scope.image}).
			success(function(data, status, headers, config){
				$('#successModal').modal()
				console.log(data);
			}).
			error(function(data, status, headers, config){
				console.log('error submitting locationSection')
			});

	}

	

	$scope.addDefaultSections = function(){
		var defaultSectionAdd = emptySection.clone();
		defaultSectionAdd.title = "Getting in"
		$scope.saveSection(defaultSectionAdd);

		var defaultSectionAdd = emptySection.clone();
		defaultSectionAdd.title = "Accommodation"
		$scope.saveSection(defaultSectionAdd);

		var defaultSectionAdd = emptySection.clone();
		defaultSectionAdd.title = "Cost"
		$scope.saveSection(defaultSectionAdd);

		var defaultSectionAdd = emptySection.clone();
		defaultSectionAdd.title = "Transportation"
		$scope.saveSection(defaultSectionAdd);
	}
	$scope.addDefaultSections();

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
	var locations;
	$http.get('api/location/name/all').then(function(locationList){
		locations = locationList.data;
	})
   return {
      require: 'ngModel',
      link: function(scope, elem, attr, ctrl) {

          
          
          ctrl.$validators.locationExists = function(modelValue, viewValue){
          	if (ctrl.$isEmpty(modelValue)) {
	          // consider empty models to be valid
	          console.log('empty to setting to invalid')

	          return false;
	        }
	        var exists = _.find(locations, function(location){
	        	return location.toLowerCase() == viewValue.toLowerCase();
	        })
	        if( !exists){
	        	ctrl.$setValidity('valid',true);
	        	console.log('setting valid')
	        	console.log(ctrl)
	        	return true;
	        }
	        else{
		        ctrl.$setValidity('valid',false);
		        console.log('setting invalid')
		        return false;	
	    	}

        	
          }
          //For DOM -> model validation
         /* ngModel.$parsers.unshift(function(value) {
             var valid = locations.indexOf(value) === -1;
             ngModel.$setValidity('locationExists', valid);
             return valid ? value : undefined;
          });

          //For model -> DOM validation
          ngModel.$formatters.unshift(function(value) {
             ngModel.$setValidity('locationExists', locations.indexOf(value) === -1);
             return value;
          });*/
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