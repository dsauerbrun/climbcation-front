var filterDir = angular.module('filter-directives', []);

filterDir.directive('filter', function(){
	return {	
		restrict: 'E',
		templateUrl: 'features/filter/filter.tpl.html',
		scope: {
			filterMapDisabled: '=',
			getAirportPrices: '='
		},
		controller: ['$http', '$window', '$timeout', '$scope', '$rootScope', 'LocationsGetter', 'helperService', 'localStorageService', function($http, $window, $timeout, $scope, $rootScope, LocationsGetter, helperService, localStorageService) {
			var filter = this;
			$scope.LocationsGetter = LocationsGetter;
			$scope.endMonth = 12;
			$scope.startMonth = 1;
			$scope.endMonthName = 'December';
			$scope.startMonthName = 'January';
			$scope.gradeFilter = {};
			$scope.helperService = helperService;

			if (localStorageService.get('filter') || localStorageService.get('mapFilter')) {
				LocationsGetter.setCachedFilter(localStorageService.get('filter'), localStorageService.get('mapFilter'));
			}
			
			$scope.clearFilters = function() {
				LocationsGetter.clearFilters();
				LocationsGetter.setFilterTimer(0);
			}

			$scope.getSelectedGrade = function(type) {
				let lastGradeIndex = LocationsGetter.filter.grades[type.type.id] && LocationsGetter.filter.grades[type.type.id].length - 1;
				if (lastGradeIndex) {
					let gradeId = LocationsGetter.filter.grades[type.type.id][lastGradeIndex];
					return filter.grades[type.type.name].grades.find(x => x.id == gradeId).grade;
				} else {
					return null;
				}
			}

			$scope.setGradeFilter = function(type, grade) {
				if (grade == 'all') {
					delete $scope.gradeFilter[type.id];
					var gradesToFilter = null;
				} else {
					$scope.gradeFilter[type.id] = grade;
					var gradeIndex = filter.grades[type.name].grades.indexOf(grade);
					var gradesToFilter = filter.grades[type.name].grades.slice(0, gradeIndex + 1);
					gradesToFilter = gradesToFilter.map(function(gradeIter) {
						return gradeIter.id;
					});
				}

				LocationsGetter.filterByGrade(type.id, gradesToFilter);
			}

			this.loading = true;
			$http.get('/api/filters').then(function(resp){
				var data = resp.data;
				filter.climbTypes = data.climbTypes;
				filter.accommodations = data.accommodations;
				filter.grades = data.grades;
			});

			$scope.toggleMapFilter = function() {
				$scope.mapFilterShown = !$scope.mapFilterShown;
				$timeout(function(){
					$scope.mapFilterShown && (LocationsGetter.maps.mobile.map.refresh());
				})
			};

			$scope.toggleFilters = function() {
				$scope.filtersShown = !$scope.filtersShown;
			};

			$scope.clearPristine = function() {
				if (helperService.originAirport == 'Denver International Airport') {
					helperService.originAirport = '';
				}
			};

			if ($window.innerWidth < 768) {
				$scope.mobile = true;
			} else {
				$scope.mobile = false;
			}
		}],
		controllerAs: 'filter'
	};
});
