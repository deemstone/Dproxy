var http = require('http');
var sys  = require('sys');

var IPC = require('./IPCAgent.js');
var sifter = require('./sifter.js');
var online = require('./methods/online.js');  //这是整个过滤流程的最后一步

//初始化列表维护相关服务
//sifter.init();
var unid = 1;
//启动服务
var server = http.createServer(function(request, response) {
	//console.log('['+ request.connection.remoteAddress + '] --> : new Request - ', request.url);
	var apInfo = JSON.stringify({
		method: request.method,
		url: request.url,
		headers: request.headers,
		httpVersion: request.httpVersion
	});
	IPC.write('$transport:$new:'+ unid++ +'::'+ apInfo);
	//check if this request is listed in the sifter
	if( sifter.check(request, response) ) return;
	
	//not shot the list , get it frome online
	online.serve(request, response);
	return true;

});

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
IPC.on('message', function(message){
	//if(message == 'exit') process.exit(0);
	console.log('<Message> :', message);
	//var msg = IPC.parseCmd(message);
	//var resStr = '响应命令:'+ msg.cmd + IPC.parseAppendix(message).test; 
	message.appendix.response = 'response recevived!!!';
	IPC.write(message);
});

var socketfile = process.argv[2];  //从命令行参数里取第三个参数,是否指定了socket文件
if(socketfile){
	IPC.createConnection(socketfile);
}
//console.log(IPC);
server.listen(7070);
console.log('--> : Proxy Server listening port 7070 !!');
