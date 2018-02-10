var helperService = angular.module('helperService', []);

helperService.service('helperService', function($rootScope, $http, $sce) {

	this.setAirportApiKey = function() {
		var that = this;
		if (that.airportApiKey) {
			return Promise.resolve(null);
		}
		return $http.get('/api/airportsapikey')
			.then(function(key) {
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
			var url = 'https://www.air-port-codes.com/search/?limit=5&key=' + that.airportApiKey + '&term=' + encodeURIComponent(airport).replace(/'/g, '').replace(/%20/g, "+");
			var trustedUrl = $sce.trustAsResourceUrl(url);

			return $http.jsonp(trustedUrl, {jsonpCallbackParam: 'callback'}).then(function(response) {
				that.loadingAirports = false;
				return response.data.airports.map(function(airport){
					return {
						name: airport.name,
						iata: airport.iata
					};
				})
			}).catch(function(err) {
				console.log(err);
			})
		})
		
	};

	this.getRatingName = function(rating) {
		if (rating == 1) {
			return 'Worth a Stop.';
		} else if (rating == 2) {
			return 'Worth a Detour.';
		} else if (rating == 3) {
			return 'Worth Its Own Trip.'
		}
	}

	this.originAirport = 'Denver International Airport';
	this.originAirportCode = 'DEN';
});