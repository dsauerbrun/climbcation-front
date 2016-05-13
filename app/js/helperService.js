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

	this.getAirports = function(airport) {
		console.log('calling')
		return $http.jsonp('http://www.air-port-codes.com/search/?callback=JSON_CALLBACK&limit=5&key=72e3b3e842&term=' + encodeURIComponent(airport)).then(function(response) {
			return response.data.airports.map(function(airport){
				return {
					name: airport.name,
					iata: airport.iata
				};
			})
		})
	};
});