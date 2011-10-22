/*
 * Dproxy入口程序
 * 处理启动参数,用户界面
 */
var proxy = require('./proxy.js');

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

proxy.server.listen(7070);
console.log('--> : Proxy Server listening port 7070 !!');
