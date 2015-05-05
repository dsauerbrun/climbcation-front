var locationListItemDir = angular.module('location-list-item-directives', []);

locationListItemDir.directive('location', function(){
	return {
		restrict: 'E',
		templateUrl: 'common/directives/location_list_item/location_list_item.tpl.html',
	};
});
