/*
 * Dproxy入口程序
 * 处理启动参数,用户界面
 */
var proxy = require('./proxy.js');
var PORT = 7777;  //开发的时候用7777 , 应用中一般用7070

proxy.shutdown = function(){
	process.exit(0);
};

//把所有没处理的异常信息记录在文件里
var fs = require('fs');
var logFile = fs.openSync('./doc/error_log.txt', 'a');
//处理各种错误
process.on('uncaughtException', function(err)
{
	var logString = ['\n\n'];
	logString.push('============ A New Error : '+ new Date());
	logString.push('MemoryUsage: '+ JSON.stringify(process.memoryUsage()) );
	logString.push( JSON.stringify(err) );
	var i = fs.writeSync(logFile, logString.join('\n\n'));
});

//log工具
var _log_level = 0;
console.log1 = function(){
	if(_log_level < 1) return;
	console.info.apply(console, arguments)
};
console.log2 = function(){
	if(_log_level < 2) return;
	console.info.apply(console, arguments)
};
console.log3 = function(){
	if(_log_level < 3) return;
	console.info.apply(console, arguments)
};

/**
 * 启动时候的可选参数
 * port 代理监听的端口号
 * router 指定的路由配置文件
 * GUI外壳程序
 */

//命令行参数解析
var socketfile = process.argv[2];  //从命令行参数里取第三个参数,是否指定了socket文件

//如果有指定socketfile,启用支持GUI的IPC模式
if(socketfile){
	var IPC = require('./IPCAgent.js');

	//用制定的socketfile建立连接
	IPC.createConnection(socketfile);
	//程序的输出message直接写给IPC
	proxy.output(function(m){
		IPC.write(m);
	});
	//GUI发来信息
	IPC.on('message', function(m){
		//if(m == 'exit') process.exit(0);
		console.log('<Message> :', m);
		//var msg = IPC.parseCmd(m);
		//var resStr = '响应命令:'+ msg.cmd + IPC.parseAppendix(m).test; 
		//m.appendix.response = 'response recevived!!!';
		proxy.request(m);  //GUI程序发来的消息原封不动的请求proxy
		//处理的结果会直接通过service的output回传给GUI程序
	});
	
}else{  //没有指定socket,命令行模式
	var cli = require('./commandline.js');
	cli.init(proxy);
}

proxy.server.listen(PORT);
console.log('--> : Proxy Server listening port '+ PORT +' !!');
