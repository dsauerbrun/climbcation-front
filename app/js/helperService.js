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

		return $http.jsonp('https://www.air-port-codes.com/search/?callback=JSON_CALLBACK&limit=5&key=72e3b3e842&term=' + encodeURIComponent(airport).replace(/%20/g, "+")).then(function(response) {
			return response.data.airports.map(function(airport){
				return {
					name: airport.name,
					iata: airport.iata
				};
			})
		})
	};
});