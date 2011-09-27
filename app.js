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
	if( sifter.check(request, response, pipe) ) return false;

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


/**
 * 启动时候的可选参数
 * port 代理监听的端口号
 * router 指定的路由配置文件
 * GUI外壳程序
 */
var socketfile = process.argv[2];  //从命令行参数里取第三个参数,是否指定了socket文件
if(socketfile){
	IPC.createConnection(socketfile);
	//程序的输出message直接写给IPC
	roll.output(function(m){
		IPC.write(m);
	});
	IPC.on('message', function(m){
		//if(m == 'exit') process.exit(0);
		console.log('<Message> :', m);
		//var msg = IPC.parseCmd(m);
		//var resStr = '响应命令:'+ msg.cmd + IPC.parseAppendix(m).test; 
		m.appendix.response = 'response recevived!!!';
		IPC.write(m);
	});
	
}else{  //没有指定socket,命令行模式
	var readline = require('readline');
	var tty = require('tty');
	/*
	 * 默认的输出管道
	 * 直接格式化打印到命令行
	 */
	roll.output(function(m){
		if( m.cmds.shift() == 'transport' ){  //这是一条代理传输的信息
			switch( m.cmds.shift() ){
				case 'new':
					console.info( '['+ m.param +']('+ m.appendix.method +') --> '+ m.appendix.url);
					break;
				case 'response':
					console.info( '['+ m.param +'] - '+ m.appendix.status +' <-- '+ (m.appendix.file || m.appendix.headers['content-type']) );  //local - file | remote - headers
					break;
				case 'process':
					console.info( '['+ m.param +'] -~~~- '+ m.appendix.handler);
					break;
				default:
					console.info('<transport>', m);
			}
		}
	});

	var prefix = 'proxy> '; //命令行提示符
	
	rl = readline.createInterface(process.stdin, process.stdout, function(p){
		//console.log(p);
		return [ [p+'test', p+'lala', p+'dudu'], p];
	});
	function prompt(){
		rl.setPrompt(prefix, prefix.length);
		rl.prompt();
	}

	rl.on('line', function(line) {
		switch(line.trim()) {
			case 'roll':
				//暂停readline,打开滚动,监听按键
				rl.pause();
				roll.turnOn();
				tty.setRawMode(true);
				return;

			case 'status':
				//打印系统运行状况
				console.info('Platform: ', process.platform);
				//console.log('Has running: %s min', process.uptime()/60 );
				console.log('Memory usage: ', process.memoryUsage() );
				break;

			case 'exit':
				console.info('Bye! ^_^');
				process.exit(0);
				break;

			default:
				console.log('No command named `' + line.trim() + '`');
		}
		prompt();
	});

	process.stdin.on('keypress', function(char, key) {
		if (key && key.name == 'q') {
			if( roll.isRolling() ){
				roll.turnOff();
				rl.resume();
				tty.setRawMode(false);
				prompt();
			}
			return false;
			//TODO: 能不回显就好了
		}
	});
	console.log = function(){
		console.info.apply(console, arguments);
		rl.prompt();
	};

	prompt();
}

server.listen(7070);
console.log('--> : Proxy Server listening port 7070 !!');
