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
	var emptySubsection = {'title':'','subsectionDescriptions':[{'desc':''}]};
	$scope.accommodations = [];
	$scope.climbingTypes = [];
	$scope.months =[];
	$scope.grades = [];
	$scope.existingLocations = [];
	
	$scope.$watch('locationForm.$valid', function(){

		console.log(locationForm.$valid)
	});
	emptySection.clone = function(){
		return jQuery.extend(true, {}, this);
	};
	emptySubsection.clone = function(){
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

	$scope.previewSection = function(section){
		section.previewOff = !section.previewOff;
	}

	$scope.notDefaultSection = function(section){
		if(section.title == 'Getting in' || section.title == 'Accommodation' || section.title == 'Cost' || section.title == 'Transportation'){
			return false;
		}
		else{
			return true;
		}
	}

	$scope.addSection = function(section){
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

	$scope.removeSection = function(section,sections){
		index = sections.indexOf(section);
		sections.splice(index,1);
	}

	$scope.addSubsection = function(subsection,section){
		//$scope.sections.push({'title':title,'description':description,'subsections':subsections})
		section['subsections'].push(subsection);
		section['subsections'][0] = emptySubsection.clone();
		//section['subsections'][0]['descriptions'] = ['']
	}

	$scope.removeSubsection = function(subsection,subsections){
		index = subsections.indexOf(subsection);
		subsections.splice(index,1);
	};

	$scope.addSubsectionDesc = function(description, subsectionDescArray){
		subsectionDescArray.push(description);
		subsectionDescArray[0] = {'text':''};
	}

	$scope.removeSubsectionDesc = function(description, subsectionDescArray){
		index = subsectionDescArray.indexOf(description);
		subsectionDescArray.splice(index,1);
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

	$scope.sectionDescriptionPlaceholder = function(section){
		if(section.title == 'Getting in'){
			return 'ex: You\'ll need to drive in since there are no nearby airports';
		}
		else if(section.title == 'Accommodation'){
			return 'ex: Smith boasts one of the best campsites out there';
		}
		else if(section.title == 'Cost'){
			return 'ex: You can dirtbag it in the campground and make it a really cheap stay';
		}
		else if(section.title == 'Transportation'){
			return 'ex: If you\'re at the Bivy campsite you can walk to the park but you\'ll probably want to hitchhike into town to get food(very easily done since you can meet plenty of people at the Bivy). A bicycle is ideal if you\'re camping';
		}
		else{
			return 'Section Description';
		}
	}

	$scope.subsectionTitlePlaceholder = function(section){
		if(section.title == 'Getting in'){
			return 'ex: Flying';
		}
		else if(section.title == 'Accommodation'){
			return 'ex: Camping';
		}
		else if(section.title == 'Cost'){
			return 'ex: Food';
		}
		else if(section.title == 'Transportation'){
			return 'ex: Hitchhiking';
		}
		else{
			return 'Subsection Title';
		}
	}

	$scope.subsectionDescriptionPlaceholder = function(section){
		if(section.title == 'Getting in'){
			return 'ex: The closest airport is Los angeles(LAX) so you will need to drive or take a bus';
		}
		else if(section.title == 'Accommodation'){
			return 'ex: The campsite is $5/night';
		}
		else if(section.title == 'Cost'){
			return 'ex: You\'ve got safeway, trader joes, costco, etc... nearby.';
		}
		else if(section.title == 'Transportation'){
			return 'ex: if you\'re staying at the bivy, catching a ride in town with a fellow climber will be very easy';
		}
		else{
			return 'Subsection Description';
		}
	}

	$scope.addDefaultSections = function(){
		var defaultSectionAdd = emptySection.clone();
		defaultSectionAdd.title = "Getting in"
		$scope.addSection(defaultSectionAdd);

		var defaultSectionAdd = emptySection.clone();
		defaultSectionAdd.title = "Accommodation"
		$scope.addSection(defaultSectionAdd);

		var defaultSectionAdd = emptySection.clone();
		defaultSectionAdd.title = "Cost"
		$scope.addSection(defaultSectionAdd);

		var defaultSectionAdd = emptySection.clone();
		defaultSectionAdd.title = "Transportation"
		$scope.addSection(defaultSectionAdd);
	}
	$scope.addDefaultSections();

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
	          
	          return false;
	        }
	        if( locations.indexOf(viewValue) == -1){
	        	ctrl.$setValidity('valid',true);
	        	return true;
	        }
	        else{
		        ctrl.$setValidity('invalid',false);
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