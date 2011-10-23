/*
 * 命令行UI程序
 * 依赖shell
 */
var shell = require('./shell.js');

//由app.js传进来的proxy实例
var proxy;

//这个模块的初始化
//参数是proxy模块的实例
exports.init = function(d){
	proxy = d;
	proxy.output(msgReceiver);
	shell.start();  //准备就绪 开启shell交互
};

//同一的消息处理程序
//接到消息,调用处理方法
//通过shell对象输出给终端用户
//TODO: 格式化输出的处理
//function output(m){ }


/*
 * 默认的输出管道
 * 直接格式化打印到命令行
 */
var _transportRolling = false;  //控制是否输出网络请求滚动
var msgReceiver = function(m){
	if( m.cmds.shift() == 'transport' ){  //这是一条代理传输的信息

		if(!_transportRolling) return;

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
	}else{
		//其他预料之外的消息,暂时直接打印出来
		console.log('<message>:', m);
	}
	//output(m);  //TODO: [待验证]交给同一的消息处理程序
};

//直接向shell输出的类型
shell.command('status', function(args, next){
	//打印系统运行状况
	shell.print('Platform: '+ process.platform);
	//console.log('Has running: %s min', process.uptime()/60 );
	var usage = process.memoryUsage();
	var info = ['Memory usage:'];
	for(var i in usage){
		info.push(i +': '+ usage[i]/1048576 +' MB');  //换算成兆
	}
	shell.print( info.join('\n') );
	next();
});
//需要调用proxy接口返回信息的类型
shell.command('groups', function(args, next){
	proxy.request('/sifter/group/list', function(rs){
		
		shell.print( '所有的分组列表:' );
		//rs是标准消息格式
		var ls = rs.appendix;
		var str = [];
		for(var g in ls){
			str.push( ' ['+ (ls[g] ? '*' : ' ') +']  '+ g);  //输出的应该是类似 [*] groupname
		}
		shell.print( str.join('\n') );
		next();
	});
});
//开启滚动
shell.command('roll', function(args){
	//打开shell的即时模式
	shell.instantOn(function(){
		//即时模式被关闭的时候执行回调
		_transportRolling = false;  //关闭输出
	});
	//打开transport的输出
	_transportRolling = true;
});

//进入滚屏模式(instant)即时相应用户的键盘事件
shell.instantMod(function(char, key){
	//响应按键
	switch(char){
		case 'q':
			//退出instant模式
			shell.instantOff();
			break;

		case 'a':
			//全部信息滚动
			break;

		case 't':
			//仅滚动被规则表命中了的请求
			break;

		default:
			//输出一个横线 + 状态信息
			shell.print('\n\n\n------------------------分割线-----------------------');

	}
});

/* ------------------- End ----------------- */
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
//rl.on('line', function(line) {
//	var args = line.trim().split(' ');
//	switch(args[0]) {
//		case 'roll':
//			//暂停readline,打开滚动,监听按键
//			rl.pause();
//			roll.turnOn();
//			tty.setRawMode(true);
//			return;
//
//		case 'status':
//			//打印系统运行状况
//			console.info('Platform: ', process.platform);
//			//console.log('Has running: %s min', process.uptime()/60 );
//			var usage = process.memoryUsage();
//			var info = ['Memory usage:'];
//			for(var i in usage){
//				info.push(i +': '+ usage[i]/1048576 +' MB');
//			}
//			console.info(info.join('\n'))
//
//			break;
//
//		case 'enable':
//			//启用一个分组
//			if(args[1]){
//				if(args[1] == 'all'){
//					sifter.enableGroup('*')
//				}else{
//					sifter.enableGroup(args[1]);
//				}
//			}else{
//				console.info('Need groupName or all');
//			}
//			
//			break;
//		case 'disable':
//			//禁用一个分组
//			if(args[1]){
//				if(args[1] == 'all'){
//					sifter.disable('*');
//				}else{
//					sifter.disable(args[1]);
//				}
//			}else{
//				console.info('Need groupName or all');
//			}
//
//			break;
//		case 'show':
//			//默认打印当前路由表
//			if(args.length < 2){
//				printRouteList();
//			}else{
//				printRouteList(args[1]);
//			}
//			//如果指定,打印指定分组
//			
//			break;
//		case 'exit':
//			console.info('Bye! ^_^');
//			process.exit(0);
//			break;
//		default:
//			console.info('No command named `' + line.trim() + '`');
//	}
//	prompt();
//});
