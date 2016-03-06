var locationOtherSection = angular.module('location-other-section-directives', []);

locationOtherSection.controller('locationOtherSectionController', function($scope){
	console.log('here i am')
});

locationOtherSection.directive('locationothersection', function(){
	return {
		restrict: 'E',
		scope: {
			section: '=',
			sectionsLength: '=',
			indexIterator: '=',
			saveSection: '&',
			removeSection: '&'
		},
		templateUrl: 'common/directives/location_other_section/location_other_section.tpl.html',
		controller: 'locationOtherSectionController'
	};
});

