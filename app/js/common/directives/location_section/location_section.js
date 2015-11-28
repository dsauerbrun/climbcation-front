var locationSection = angular.module('location-section-directives', []);

locationSection.controller('locationSectionController', function($scope){
	var emptySubsection = {'title':'','subsectionDescriptions':[{'desc':''}]};
	emptySubsection.clone = function(){
		return jQuery.extend(true, {}, this);
	};

	$scope.notDefaultSection = function(section){
		if(section.title == 'Getting in' || section.title == 'Accommodation' || section.title == 'Cost' || section.title == 'Transportation'){
			return false;
		}
		else{
			return true;
		}
	}
	$scope.previewSection = function(section){
		section.previewOff = !section.previewOff;
	}

	$scope.addSubsection = function(subsection,section){
		//$scope.sections.push({'title':title,'description':description,'subsections':subsections})
		section['subsections'].push(subsection);
		section['subsections'][0] = emptySubsection.clone();
		//section['subsections'][0]['descriptions'] = ['']
	}

	$scope.removeSubsection = function(subsection,subsections){
		index = subsections.indexOf(subsection);
		subsections.splice(index,1);
	};

	$scope.addSubsectionDesc = function(description, subsectionDescArray){
		subsectionDescArray.push(description);
		subsectionDescArray[0] = {'text':''};
	}

	$scope.removeSubsectionDesc = function(description, subsectionDescArray){
		index = subsectionDescArray.indexOf(description);
		subsectionDescArray.splice(index,1);
	}

	$scope.sectionDescriptionPlaceholder = function(section){
		if(section.title == 'Getting in'){
			return 'ex: You\'ll need to drive in since there are no nearby airports';
		}
		else if(section.title == 'Accommodation'){
			return 'ex: Smith boasts one of the best campsites out there';
		}
		else if(section.title == 'Cost'){
			return 'ex: You can dirtbag it in the campground and make it a really cheap stay';
		}
		else if(section.title == 'Transportation'){
			return 'ex: If you\'re at the Bivy campsite you can walk to the park but you\'ll probably want to hitchhike into town to get food(very easily done since you can meet plenty of people at the Bivy). A bicycle is ideal if you\'re camping';
		}
		else{
			return 'Section Description';
		}
	}

	$scope.subsectionTitlePlaceholder = function(section){
		if(section.title == 'Getting in'){
			return 'ex: Flying';
		}
		else if(section.title == 'Accommodation'){
			return 'ex: Camping';
		}
		else if(section.title == 'Cost'){
			return 'ex: Food';
		}
		else if(section.title == 'Transportation'){
			return 'ex: Hitchhiking';
		}
		else{
			return 'Subsection Title';
		}
	}

	$scope.subsectionDescriptionPlaceholder = function(section){
		if(section.title == 'Getting in'){
			return 'ex: The closest airport is Los angeles(LAX) so you will need to drive or take a bus';
		}
		else if(section.title == 'Accommodation'){
			return 'ex: The campsite is $5/night';
		}
		else if(section.title == 'Cost'){
			return 'ex: You\'ve got safeway, trader joes, costco, etc... nearby.';
		}
		else if(section.title == 'Transportation'){
			return 'ex: if you\'re staying at the bivy, catching a ride in town with a fellow climber will be very easy';
		}
		else{
			return 'Subsection Description';
		}
	}

});

locationSection.directive('locationsection', function(){
	return {
		restrict: 'E',
		scope: {
			section: '=',
			sectionsLength: '=',
			indexIterator: '=',
			saveSection: '&',
			removeSection: '&'
		},
		templateUrl: 'common/directives/location_section/location_section.tpl.html',
		controller: 'locationSectionController'
	};
});

