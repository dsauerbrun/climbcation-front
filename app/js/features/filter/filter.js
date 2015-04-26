var filterDir = angular.module('filter-directives', []);

filterDir.directive('filter', function(){
	return {	
		restrict: 'E',
		templateUrl: 'features/filter/filter.tpl.html',
		controller: ['$http',function($http){
			var store = this;
			store.products = [];
			this.fixVar = 'this is not a test'
			$http.get('http://localhost:3000/angtest').success(function(data){
				store.fixVar = data;
			});
		}],
		controllerAs: 'filter'
	};
});
