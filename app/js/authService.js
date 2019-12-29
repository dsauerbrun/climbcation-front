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
		await this.getUser();
	}

	this.signUp = async function(email, username, password) {
		try {
			let user = await $http.post('/api/signup', {email: email, username: username, password: password});
			this.user = user && user.data;
		} catch (err) {
			throw err.data || 'Error signing up.';
		}
		

	}

	this.resetPassword = async function(email) {
		try {
			await $http.post('/api/resetpassword', {email: email});
		} catch (err) {
			throw 'Error sending reset password email.';
		}
	}

	this.changePassword = async function(password, id) {
		try {
			await $http.post('/api/changepassword', {password: password, id: id});
		} catch (err) {
			throw err.data || 'Error changing password';
		}
		
	}

	this.logout = function() {
		
	}
	this.user = null;
});