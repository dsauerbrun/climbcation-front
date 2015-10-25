var locationSection = angular.module('location-section-directives', []);

locationSection.directive('locationsection', function(){
	return {
		restrict: 'E',
		scope: {
			section: '='
		},
		templateUrl: 'common/directives/location_section/location_section.tpl.html',
	};
});
