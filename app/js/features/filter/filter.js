var filterDir = angular.module('filter-directives', []);

filterDir.directive('filter', function(){
	return {	
		restrict: 'E',
		templateUrl: 'features/filter/filter.tpl.html',
		controller: function($http, $scope, LocationsGetter){
			$scope.endMonth = 12;
			$scope.startMonth = 1;
			$scope.endMonthName = 'December';
			$scope.startMonthName = 'January';

			$scope.$watch('endMonth', function() {
				LocationsGetter.filterByMonth($scope.startMonth, $scope.endMonth);
			});
			$scope.$watch('startMonth', function() {
				LocationsGetter.filterByMonth($scope.startMonth, $scope.endMonth);
			});
			var filter = this;
			this.fixVar = 'this is not a test';
			this.loading = true;
			$http.get('/api/filters').success(function(data){
				filter.climbTypes = data['climbTypes'];
				filter.accommodations = data.accommodations;
			});
		},
		controllerAs: 'filter'
	};
});
