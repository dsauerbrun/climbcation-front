var authService = angular.module('authService', []);

authService.service('authService', function($rootScope, $http) {

	this.getUser = async function() {
		if (this.user) {
			return this.user;
		} else {
			let user = await $http.get('/api/user');
			this.user = user && user.data;
			return this.user;
		}
	}

	this.login = async function(username, password) {
		let resp = await $http.post('/api/login', {username: username, password: password});
	}

	this.signUp = async function(email, username, password) {
		try {
			let user = await $http.post('/api/signup', {email: email, username: username, password: password});
			this.user = user && user.data;
		} catch (err) {
			throw 'Error signing up.';
		}
		

	}

	this.logout = function() {
		
	}
	this.user = null;
});