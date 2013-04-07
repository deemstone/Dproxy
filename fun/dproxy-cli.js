//解析命令行参数
require('./options-parser.js');
//初始化配置和运行环境参数
var env = require('./settings.js');
var paths = env.paths;
var config = env.config;

var PORT = config.port || 7070;  //开发的时候用7777 , 应用中一般用7070

//log工具
var _log_level = process.options.level || 0;  //支持命令行制定运行级别
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
/*
 * Dproxy入口程序
 * 处理启动参数,用户界面
 */
var proxy = require('./proxy.js');
proxy.shutdown = function(){
	process.exit(0);
};



//让服务器开始监听PORT端口
try{
	proxy.server.listen(PORT);
	console.log('--> : Proxy Server listening port '+ PORT +' !!');
}catch(e){
	console.log('Error: Proxy Server Cant\'t Listen to PORT '+ PORT +'!');
	process.exit(1);
}

//把所有没处理的异常信息记录在文件里
var fs = require('fs');
var path = require('path');
var dir_log = paths.conf +'/log';  //如果全局安装--gloabl，普通用户运行权限无法操作basedir下的文件，所以改到.dproxy下存放log
if( !fs.existsSync( dir_log ) ){
	fs.mkdirSync( dir_log );
}
var logFile = fs.openSync( dir_log +'/error_log.txt', 'a'); //TODO: log路径改到 /log/error_log.txt
//处理各种错误
process.on('uncaughtException', function(err)
{
	var logString = [];
	logString.push('============ Error : '+ new Date());
	logString.push('MemoryUsage: '+ JSON.stringify(process.memoryUsage()) );  //TODO: 需要更详细的信息
	logString.push( err.stack );
	logString.push('\n\n');

	var i = fs.writeSync(logFile, logString.join('\n\n'));
});


/**
 * 启动时候的可选参数
 * port 代理监听的端口号
 * router 指定的路由配置文件
 * GUI外壳程序
 */

//如果有指定socketfile,启用支持GUI的IPC模式
if(process.options.sock){
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

