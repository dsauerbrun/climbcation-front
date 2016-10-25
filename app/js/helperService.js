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
		return $http.jsonp('https://www.air-port-codes.com/search/?callback=JSON_CALLBACK&limit=5&key=b9ad07b1f2&term=' + encodeURIComponent(airport).replace(/%20/g, "+")).then(function(response) {
			that.loadingAirports = false;
			return response.data.airports.map(function(airport){
				return {
					name: airport.name,
					iata: airport.iata
				};
			})
		})
	};

	this.originAirport = 'Denver International Airport';
	this.originAirportCode = 'DEN';
});