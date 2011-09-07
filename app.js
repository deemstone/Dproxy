var http = require('http');
var sys  = require('sys');

var sifter = require('./sifter.js');

var online = require('./methods/online.js');  //这是整个过滤流程的最后一步

//初始化列表维护相关服务
//sifter.init();

//启动服务
var server = http.createServer(function(request, response) {
	console.log('['+ request.connection.remoteAddress + '] --> : new Request - ', request.url);
	//check if this request is listed in the sifter
	if( sifter.check(request, response) ) return;
	
	//not shot the list , get it frome online
	online.serve(request, response);
	return true;

});
server.listen(7070);

sys.log('--> : Proxy Server listening port 7070 !!');

//处理各种错误
process.on('uncaughtException', function(err)
{
    console.log("\nError!!!!");
    console.log(err);
});


/**
 * 启动时候的可选参数
 * port 代理监听的端口号
 * router 指定的路由配置文件
 * GUI外壳程序
 */
