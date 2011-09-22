var http = require('http');
var sys  = require('sys');

var IPC = require('./IPCAgent.js');
var sifter = require('./sifter.js');
var online = require('./methods/online.js');  //这是整个过滤流程的最后一步
var roll = require('./roll.js');

//设置sifter可用的Handler
var methods = {
	local: require('./methods/local.js'),  //用本地文件相应请求
	remote: require('./methods/remote.js')  //代理到其他测试服务器取文件
};
sifter.setMethods(methods);

//启动服务
var server = http.createServer(function(request, response) {
	//console.log('['+ request.connection.remoteAddress + '] --> : new Request - ', request.url);
	var pipe = roll.add();
	pipe.cmds.push('transport');
	pipe.write('new', {
		method: request.method,
		url: request.url,
		headers: request.headers,
		httpVersion: request.httpVersion
	});

	//check if this request is listed in the sifter
	if( sifter.check(request, response, pipe) ) return;

	//not shot the list , get it frome online
	online.serve(request, response, pipe);

	return true;
});

//处理各种错误
//process.on('uncaughtException', function(err)
//{
//    console.log("\nError!!!!");
//    console.log(err);
//});

/*
 * 默认的输出管道,直接打印到命令行
 */
roll.output(function(m){
	if( m.cmds.shift() == 'transport' ){  //这是一条代理传输的信息
		switch( m.cmds.shift() ){
			case 'new':
				console.log( '['+ m.param +']('+ m.appendix.method +') --> '+ m.appendix.url);
				break;
			case 'response':
				console.log( '['+ m.param +'] - '+ m.appendix.status +' <-- '+ (m.appendix.file || m.appendix.headers['content-type']) );  //local - file | remote - headers
				break;
			case 'process':
				console.log( '['+ m.param +'] -~~~- '+ m.appendix.handler);
				break;
			default:
				console.log('<transport>', m);
		}
	}
});

/**
 * 启动时候的可选参数
 * port 代理监听的端口号
 * router 指定的路由配置文件
 * GUI外壳程序
 */
var socketfile = process.argv[2];  //从命令行参数里取第三个参数,是否指定了socket文件
if(socketfile){
	IPC.createConnection(socketfile);
	roll.output(function(m){
		IPC.write(m);
	});
}

IPC.on('message', function(m){
	//if(m == 'exit') process.exit(0);
	console.log('<Message> :', m);
	//var msg = IPC.parseCmd(m);
	//var resStr = '响应命令:'+ msg.cmd + IPC.parseAppendix(m).test; 
	m.appendix.response = 'response recevived!!!';
	IPC.write(m);
});

//开启服务
server.listen(7070);
console.log('--> : Proxy Server listening port 7070 !!');
