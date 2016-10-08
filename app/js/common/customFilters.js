var filters = angular.module('customFilters', []);

filters.filter('gradeFilter', function() {
  return function(grades, climbingType) {
    grades = grades.filter(function(grade) {
      return grade.type.id == climbingType;
    })
    return grades;
  };
});

filters.filter('parseUrlFilter', function ($sce) {
    var urlPattern = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/gi;
    return function (text, target) {
        return $sce.trustAsHtml(text.replace(urlPattern, '<a target="' + target + '" href="$&">$&</a>'));
    };
});

filters.filter('reverse', function() {
  return function(items) {
    return items.slice().reverse();
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

filters.filter('selectedFoodOptions', function() {
  return function(foodOptions, selectedFoodOptions) {
  	var selectedArray = [];
  	_.forEach(selectedFoodOptions, function(selected, key) {
  		if (selected) {
  			selectedArray.push(key)
  		}
  	});

  	var retTrans = _.filter(foodOptions, function(foodOption) {
  		return selectedArray.indexOf(foodOption.id.toString()) > -1;
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