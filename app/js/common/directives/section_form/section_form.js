var sectionForm = angular.module('section-form-directive', ['ngFileUpload']);

sectionForm.directive('sectionform', function(){
	return {
		restrict: 'E',
		templateUrl: 'common/directives/section_form/section_form.tpl.html',
		controller: 'SectionFormController'
	};
});


sectionForm.controller('SectionFormController', function($scope,$q,$http,Upload){
	$scope.locationObj = {'name':'','country':'','continent':'','airport':'','price_floor':'','price_ceiling':'','months':{},'accommodations':{},'climbingTypes':{},'grade':'', 'sections':[]};
	var emptySection = {'title':'','description':'','subsections':[{'title':'','descriptions':[{'name':''}]}]}
	var emptySubsection = {'title':'','descriptions':[{'name':''}]};
	$scope.accommodations = [];
	$scope.climbingTypes = [];
	$scope.months =[];
	$scope.grades = [];

	$scope.$watch('locationForm.$valid', function(){
	});
	emptySection.clone = function(){
		return jQuery.extend(true, {}, this);
	};
	emptySubsection.clone = function(){
		return jQuery.extend(true, {}, this);
	};
	$scope.locationObj.sections.push(emptySection.clone())
	var deferred = $q.defer();
	//get options for seasons, climbing types, accommodations etc...
	$http.get('api/get_attribute_options').success(function(data){
		deferred.resolve(data);
	});
	deferred.promise.then(
		function(success){
			$scope.accommodations = success['accommodations'];
			$scope.climbingTypes = success['climbing_types'];
			$scope.months = success['months'];
			$scope.grades = success['grades'];
		}
	);

	//$scope.locationObj.sections.push({'title':'section title2','description':'section2 description','subsections':[]})
	
	//$scope.locationObj.sections[0]['subsections'].push({'title':'subsection title','descriptions':[{'name':''}]});
	
	$scope.addSection = function(section){
		$scope.locationObj.sections.push(section);
		$scope.locationObj.sections[0] = emptySection.clone();
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
				console.log(data);
			}).
			error(function(data, status, headers, config){
				console.log('error submitting locationSection')
			});

	}

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