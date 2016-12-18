var helperService = angular.module('helperService', []);

helperService.service('helperService', function($rootScope, $http) {

	this.setAirportApiKey = function() {
		var that = this;
		if (that.airportApiKey) {
			return Promise.resolve(null);
		}
		return $http.get('/api/airportsapikey')
			.then(function(key) {
				that.airportApiKey = key.data;
				return key;
			});
	};

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
		return Promise.resolve(that.airportApiKey || that.setAirportApiKey()).then(function() {
			return $http.jsonp('https://www.air-port-codes.com/search/?callback=JSON_CALLBACK&limit=5&key=' + that.airportApiKey + '&term=' + encodeURIComponent(airport).replace(/'/g, '').replace(/%20/g, "+")).then(function(response) {
				that.loadingAirports = false;
				return response.data.airports.map(function(airport){
					return {
						name: airport.name,
						iata: airport.iata
					};
				})
			})
		})
		
	};

	this.originAirport = 'Denver International Airport';
	this.originAirportCode = 'DEN';
});