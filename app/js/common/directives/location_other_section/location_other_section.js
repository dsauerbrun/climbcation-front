var locationOtherSection = angular.module('location-other-section-directives', []);

locationOtherSection.controller('locationOtherSectionController', function($scope, $http){
	$scope.togglePreview = function(section){
		section.previewOff = !section.previewOff;
	}

	$scope.saveChanges = function() {
		$http.post('api/locations/' + $scope.locationId +'/sections',
			{
				locationId: $scope.locationId,
				section: {
						id: $scope.section.id,
						title: $scope.section.title,
						body: $scope.section.body
					}
			}
		).then(function(response) {
			if (response.status == 200) {
					console.log(response)
					$scope.section.id = response.data.new_id;
					$scope.oldBody = $scope.section.body;
					$scope.oldTitle = $scope.section.title;
					$scope.togglePreview($scope.section);
			}
		});
	}
	$scope.oldBody = $scope.section.body;
	$scope.oldTitle = $scope.section.title;
	console.log($scope.section)
});

locationOtherSection.directive('locationothersection', function(){
	return {
		restrict: 'E',
		scope: {
			editable: '=',
			locationId: '=',
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

