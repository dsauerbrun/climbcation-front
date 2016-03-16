var helperService = angular.module('helperService', []);

helperService.service('helperService', function($rootScope) {
	this.cleanFalses = function(keyMap) {
		var returnMap = {};
		_.forEach(keyMap, function(value, key) {
			if (value) {
				returnMap[key] = true;
			}
		});
		return returnMap;
	}
});