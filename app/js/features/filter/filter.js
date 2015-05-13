var filterDir = angular.module('filter-directives', []);

filterDir.directive('filter', function(){
	return {	
		restrict: 'E',
		templateUrl: 'features/filter/filter.tpl.html',
		controller: ['$http',function($http){
			var filter = this;
			this.fixVar = 'this is not a test'
			this.filterClick = function(element){
				console.log(element);
				//toggle active state
				if(element.hasClass('all')){
					resetButtonGroup(element.parent());
				}
				toggleButtonActive(element);
				numberActives=numberOfButtonGroupActive(element.parent());
				if(numberActives==0){
					//if all inactive make all active
					toggleButtonActive(element.parent().find('.all'));
				}
				else if(numberActives>1){
					//if more than one item active make all inactive
					element.parent().find('.all').removeClass('active');	
				}
				filterLocations();
			}
			$http.get('/api/filters').success(function(data){
				filter.fixVar = data;
				console.log(data['continents'])
				filter.continents = data['continents'];
				filter.climbTypes = data['climbTypes']
			});
		}],
		controllerAs: 'filter'
	};
});


//if no actives, make all active, if all clicked, reset other active states, if filter clicked make all inactive
function maintainActivenessFilter(){
	$('.sort-button').on('click',function(){
		
		resetButtonGroup($(this).parent());
		toggleButtonActive($(this));
		numberActives=numberOfButtonGroupActive($(this).parent());
		console.log(numberActives);
		if(numberActives==0){
			//if all inactive make all active
			toggleButtonActive($(this).parent().find('.all'));
		}
		filterLocations();
	});
	$('.filter-button').on('click',function(){
		//toggle active state
		if($(this).hasClass('all')){
			resetButtonGroup($(this).parent());
		}
		toggleButtonActive($(this));
		numberActives=numberOfButtonGroupActive($(this).parent());
		if(numberActives==0){
			//if all inactive make all active
			toggleButtonActive($(this).parent().find('.all'));
		}
		else if(numberActives>1){
			//if more than one item active make all inactive
			$(this).parent().find('.all').removeClass('active');	
		}
		filterLocations();
	});
}

function filterLocations(){
	var filterMap = {};
	$('.btn-group-filter').each(function(){
		currentGroup= $(this).attr('data');
		filterMap[currentGroup] = [];
		$(this).children('button').each(function(){
			if($(this).hasClass('active'))
				filterMap[currentGroup].push($(this).attr('data'));
		});
	});
	//send ajax request
	$.ajax({
		type: 'GET',
		url: '/filter_locations',
		data: {filters: filterMap, sort: $('.sort-button.active').attr('data')}
	}).done(function(data){
		console.log(data);
		$('.list').html(buildLocations(data));
	});	

}

function buildLocations(locations){
	allLocations='';
	$.each(locations, function(id, location){
		allLocations += buildLocationHtml(location["home_thumb"],location["location"]["name"],location["location"]["country"],location["location"]["price_range_floor_cents"],location["location"]["price_range_ceiling_cents"],location["climbing_types"],location["accommodations"],location["seasons"],location["grade"]["us"]);
	});
	return allLocations;
}

function buildLocationHtml(home_thumb_url,name,country,price_range_floor,price_range_ceiling,climbing_type_urls,accommodation_urls,season_urls,grade){
	locationHtml='';
	locationHtml+='<div class="row location-row"><div class="col-md-1"></div><div class="col-md-2">';
	locationHtml+='<img class="img-circle" height="192" width="192" src="'+home_thumb_url+'" /> ';	
	locationHtml+='	</div><div class="col-md-8"><h3>'+name+', '+country+'<small> $'+price_range_floor+ ' - $' +price_range_ceiling+' / day</small></h3><div class="icon-row row"><h4 class="col-md-4">Why Should I go?</h4><div class="col-md-2">';
	$.each(climbing_type_urls, function(index, val){
		locationHtml += '<img class="icon" src="'+val+'" >';
	});
	locationHtml+='</div><h4 class="col-md-4">Where am I going to sleep?</h4><div class="col-md-2">';
	$.each(accommodation_urls, function(index,val){
		locationHtml += '<img class="icon" src="'+val+'" >';
	});
	locationHtml +='</div></div><div class="icon-row row"><h4 class="col-md-4">When Should I go?</h4><div class="col-md-2">';
	$.each(season_urls, function(index,val){
		locationHtml += '<img class="icon" src="'+val+'" >';
	});
	locationHtml += '</div><h4 class="col-md-4">How hard should I climb?</h4><div class="col-md-2"><h4>'+grade+'</h4></div></div></div></div>';
	return locationHtml;
}

function numberOfButtonGroupActive(buttonGroup){
	var count=0;
	buttonGroup.children('button').each(function(){
		if($(this).hasClass('active')){
			count++;
		}
	});
	return count;
}
