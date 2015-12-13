var sectionForm = angular.module('section-form-directive', ['ngFileUpload','location-section-directives']);

sectionForm.directive('sectionform', function(){
	return {
		restrict: 'E',
		templateUrl: 'common/directives/section_form/section_form.tpl.html',
		controller: 'SectionFormController'
	};
});


sectionForm.controller('SectionFormController', function($scope,$q,$http,Upload,$location){
	$scope.locationObj = {'submitter_email':'','name':'','country':'','continent':'','airport':'','price_floor':'','price_ceiling':'','months':{},'accommodations':{},'climbingTypes':{},'grade':'', 'sections':[]};
	var emptySection = {'previewOff':true, 'title':'','body':'','subsections':[{'title':'','subsectionDescriptions':[{'desc':''}]}]}
	
	$scope.accommodations = [];
	$scope.climbingTypes = [];
	$scope.months =[];
	$scope.grades = [];
	$scope.existingLocations = [];
	
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