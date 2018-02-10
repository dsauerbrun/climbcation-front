var locationListItemDir = angular.module('location-list-item-directives', []);

locationListItemDir.directive('location', function(){
	return {
		restrict: 'E',
		templateUrl: 'common/directives/location_list_item/location_list_item.tpl.html',
		controller: 'LocationListItemController'
	};
});
locationListItemDir.controller('LocationListItemController',function($scope,$element,LocationsGetter, helperService){
	$scope.helperService = helperService;
	$($element).mouseenter(function(){
		LocationsGetter.markerMap[$scope.locationData.slug].setOptions({opacity:1});
	});
	$($element).mouseleave(function(){
		LocationsGetter.markerMap[$scope.locationData.slug].setOptions({opacity:.5});
	});
});
