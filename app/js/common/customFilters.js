var filters = angular.module('customFilters', []);

filters.filter('parseUrlFilter', function ($sce) {
    var urlPattern = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/gi;
    return function (text, target) {
        return $sce.trustAsHtml(text.replace(urlPattern, '<a target="' + target + '" href="$&">$&</a>'));
    };
});

filters.filter('bestTransportationOptions', function() {
  return function(transportations, selectedTransportations) {
  	var selectedArray = [];
  	_.forEach(selectedTransportations, function(selected, key) {
  		if (selected) {
  			selectedArray.push(key)
  		}
  	});

  	var retTrans = _.filter(transportations, function(transportation) {
  		return selectedArray.indexOf(transportation.id.toString()) > -1;
  	});
  	return retTrans;
  };
});

filters.filter('accommodationChosen', function() {
  return function(accommodations, accommodation) {
  	var found = _.find(accommodations, function(accommodationObj) {
  		return accommodationObj && accommodation.id == accommodationObj.id;
  	});
  	return Boolean(found);
  };
});