var routeList = require('../routeList.js');

var sections = routeList.sections;
for(var domain in routeList.sections){
	var s = sections[domain];
	var dh = s.domain ? s.domain.join(':') : '' ; //domain Handler
	console.log('======== '+ domain +' '+ dh +' =========');
	printRoute(s);
}

function printRoute(s){
	for(var type in s){
		if( ['rewrite', 'domain'].indexOf(type) != -1 ) continue;
		for(var rule in s[type]){
			console.log( type +':'+ rule +' -> '+ s[type][rule]);
		}
	}
}
