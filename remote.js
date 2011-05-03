var http = require('http');
var fs = require('fs');


//如果匹配测试服务器列表,取回来返回去
exports.getfile = function(request, response, next){
	console.log("--> : remote"+ request.url);
	next();
};
