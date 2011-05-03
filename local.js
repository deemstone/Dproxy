var config = require('./config');

exports.getfile = function(request, response, next){
	console.log("--> : local "+ request.url);
	next();
}
