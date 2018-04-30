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
		for (let key in LocationsGetter.maps) {
			let currentMap = LocationsGetter.maps[key];
			
			LocationsGetter.markerMap[$scope.locationData.slug + key] && LocationsGetter.markerMap[$scope.locationData.slug + key].setOptions({opacity:1, icon: 'https://s3-us-west-2.amazonaws.com/climbcation-front/assets/primary.png', zIndex: 101});
		}
	});
	$($element).mouseleave(function(){
		for (let key in LocationsGetter.maps) {
			let currentMap = LocationsGetter.maps[key];
			LocationsGetter.markerMap[$scope.locationData.slug + key] && LocationsGetter.markerMap[$scope.locationData.slug + key].setOptions({opacity:.5, icon: '', zIndex: 100});
		}
	});
});
