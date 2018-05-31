var locationOtherSection = angular.module('location-other-section-directives', ['ngToast']);

locationOtherSection.controller('locationOtherSectionController', function($scope, $http, ngToast){
	$scope.togglePreview = function(section){
		section.previewOff = !section.previewOff;
	}

	$scope.saveChanges = function() {
		if (!$scope.section.isSaving) {
			$scope.section.isSaving = true;
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
						if (response.data.new_id) {
							$scope.section.id = response.data.new_id
						} else {
							ngToast.create({
								additionalClasses: 'climbcation-toast',
								content: 'Your edit has been submitted and will be approved by a moderator shortly!'
							});
						}
						$scope.oldBody = $scope.section.body;
						$scope.oldTitle = $scope.section.title;
						$scope.togglePreview($scope.section);
						$scope.section.isSaving = false;
						$scope.saveCallback && $scope.saveCallback($scope.section);
				}
			});
		}
	}
	$scope.oldBody = $scope.section.body;
	$scope.oldTitle = $scope.section.title;
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
			saveCallback: '='
		},
		templateUrl: 'common/directives/location_other_section/location_other_section.tpl.html',
		controller: 'locationOtherSectionController'
	};
});

