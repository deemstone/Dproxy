var http = require('http');
var sys  = require('sys');

var sifter = require('./sifter.js');

var online = require('./methods/online.js');  //这是整个过滤流程的最后一步

//初始化列表维护相关服务
sifter.init();

//启动服务
var server = http.createServer(function(request, response) {
	sys.log('--> : init the http server');
	//check if this request is listed in the sifter
	if( sifter.check(request, response) ) return;
	
	//not shot the list , get it frome online
	online.serve(request, response);
	return true;

});
server.listen(80);

sys.log('--> : Proxy Server listening port 80 !!');
