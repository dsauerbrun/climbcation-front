var helperService = angular.module('helperService', []);

helperService.service('helperService', function($rootScope, $http) {
	this.cleanFalses = function(keyMap) {
		var returnMap = {};
		_.forEach(keyMap, function(value, key) {
			if (value) {
				returnMap[key] = true;
			}
		});
		return returnMap;
	}

	this.loadingAirports = false;
	this.getAirports = function(airport) {
		var that = this;
		that.loadingAirports = true;

		return $http.get('/api/airports/?search=' + encodeURIComponent(airport).replace(/%20/g, "+"))
		.then(function(response) {
			that.loadingAirports = false;
			return response.data.map(function(airport){
				return {
					name: airport.name,
					iata: airport.code
				};
			})
		})
	};

	this.originAirport = 'Denver International Airport';
	this.originAirportCode = 'DEN';
});