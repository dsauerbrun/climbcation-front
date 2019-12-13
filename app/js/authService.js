var authService = angular.module('authService', []);

authService.service('authService', function($rootScope, $http) {

	this.getUser = async function() {
		if (this.user) {
			return this.user;
		} else {
			let user = await $http.get('/api/user');

		}
	}

	this.logout = function() {
		
	}
	this.user = null;
});