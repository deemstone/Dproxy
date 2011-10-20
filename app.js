/*
 * Dproxy入口程序
 * 处理启动参数,用户界面
 */
var IPC = require('./IPCAgent.js');
var sifter = require('./sifter.js');
var roll = require('./roll.js');
var server = require('./proxy.js').server;
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
//TODO: 完整的命令shell方案
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
	
	rl = readline.createInterface(process.stdin, process.stdout); //function(p){ return [ [p+'test', p+'lala', p+'dudu'], p]; }
	//TODO: 命令行Tab自动补全
	
	function prompt(){
		rl.setPrompt(prefix, prefix.length);
		rl.prompt();
	}

	rl.on('line', function(line) {
		var args = line.trim().split(' ');
		switch(args[0]) {
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
				var usage = process.memoryUsage();
				var info = ['Memory usage:'];
				for(var i in usage){
					info.push(i +': '+ usage[i]/1048576 +' MB');
				}
				console.info(info.join('\n'))

				break;

			case 'enable':
				//启用一个分组
				if(args[1]){
					if(args[1] == 'all'){
						sifter.enableGroup('*')
					}else{
						sifter.enableGroup(args[1]);
					}
				}else{
					console.info('Need groupName or all');
				}
				
				break;
			case 'disable':
				//禁用一个分组
				if(args[1]){
					if(args[1] == 'all'){
						sifter.disable('*');
					}else{
						sifter.disable(args[1]);
					}
				}else{
					console.info('Need groupName or all');
				}

				break;
			case 'show':
				//默认打印当前路由表
				if(args.length < 2){
					printRouteList();
				}else{
					printRouteList(args[1]);
				}
				//如果指定,打印指定分组
				
				break;
			case 'groups':
				var list = sifter.listGroups();
				var str = [];
				for(var g in list){
					if( list[g] ){
						str.push('* '+ g);
					}else{
						str.push('  '+ g);
					}
				}
				console.info( '\033[36m'+ str.join('\n') +'\033[39m' );
				break;

			case 'exit':
				console.info('Bye! ^_^');
				process.exit(0);
				break;
			default:
				console.info('No command named `' + line.trim() + '`');
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

	//开始cmdLoop
	prompt();

	//用于打印route的两个函数
	function printRouteList(group){
		if(group){
			var g = sifter.groupContent(group);
			if(!g){
				console.log('No group named %s', group);
				return;
			}
			var sections = g.sections;
			var exact = g.exact;
		}else{
			var sections = sifter.sections;
			var exact = sifter.exact;
		}
		//打印exact
		for(var r in exact){
			console.info( r +' -> '+ exact[r] );
		}
		//打印sections
		for(var domain in sections){
			s = sections[domain];
			printSections(domain, s);
		}
	}

	function printSections(domain, s){
		console.info('======== '+ domain +' =========');
		for(var type in s){
			if( type == 'location' ) continue;
			console.info('<%s> : %s',  type, s[type].slice(0,2).join('  '));
		}

		//打印location列表
		var list = s.location;
		for(var l in list){
			console.info( l +' -> '+ list[l].slice(0,2).join(':') );
		}
	}
}

server.listen(7070);
console.log('--> : Proxy Server listening port 7070 !!');
