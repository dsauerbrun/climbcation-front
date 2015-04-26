var home = angular.module('app', ['filter-directives']);
home.controller('StoreController', ['$http',function($http){
	var store = this;
	store.products = [];
	store.test = 'iiii';

	$http.get('http://localhost:3000/angtest').success(function(data){
		store.products = data;
	});
}]);
