var locationSection = angular.module('location-section-directives', []);

locationSection.directive('locationsection', function(){
	return {
		restrict: 'E',
		templateUrl: 'common/directives/location_section/location_section.tpl.html',
	};
});
