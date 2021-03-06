/*
 * 命令行UI程序
 * 依赖shell
 */
var shell = require('../lib/shell.js');
var env = require('./settings.js');
var exec = require('child_process').exec;

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
				shell.print( '['+ m.param +']('+ m.appendix.method +'|'+ m.appendix.handler.method +') --> '+ m.appendix.url);
				break;
			case 'response':
				var info = false;
				var ms = m.appendix;
				if(ms.file){
					info = m.appendix.file;
				}else if(ms.headers){
					info =  ms.headers['content-type'];
				}else if(ms.opm){
					info = ms.opm['host'] +':'+ ms.opm['port'];
				}
				if(info)
					shell.print( '['+ m.param +'] - '+ m.appendix.status +' <-- '+ info );  //local - file | remote - headers
				break;
			case 'process':
				shell.print( '['+ m.param +'] -~~~- '+ m.appendix.handler);
				break;
			case 'error':
				shell.print( '['+ m.param +'] -XXX- Error:'+ m.appendix.message);  //这里appendix是一个Error对象
				break;
			default:
				shell.print('<transport>', m);
				break;
		}
	}else{
		//其他预料之外的消息,暂时直接打印出来
		console.log1('<message>:', m);
	}
};

//取groups列表用于自动补全功能
//把proxy的异步调用转换成同步返回的方法
function auto_groups(){
	var ret = null;
	proxy.request('/sifter/group/list', function(rs){
		var ls = rs.appendix;
		var gs = [];
		for(var g in ls){
			gs.push( g );
		}
		ret = gs;  //传递给外层函数
	});

	if(ret == null){
		console.log1('取所有分组列表,预期的同步执行,现在不好用了!!!');
	}
	return ret;
}

//直接向shell输出的类型
shell.command('status', function(args, next){
	//打印系统运行状况
	shell.print('Platform: '+ process.platform);
	shell.print('ConfigFile: '+ env.paths.configfile);
	shell.print('ConfigPath: '+ env.paths.conf);
	//console.log('Has running: %s min', process.uptime()/60 );
	var usage = process.memoryUsage();
	var info = ['Memory usage:'];
	for(var i in usage){
		info.push(i +': '+ usage[i]/1048576 +' MB');  //换算成兆
	}
	shell.print( info.join('\n') );
	next();
});
//结束程序
shell.command('exit', function(args, next){
	shell.print('Bye! ^_^');
	proxy.shutdown();
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
//启用一个分组
shell.command('up', function(args, next){
	if(!args.length){ //必须指定分组名
		shell.print( '必须指定分组名' );
		next();
		return;
	}
	proxy.request('/sifter/group/enable', args[0], function(rs, err){
		next('groups');
	});
}, auto_groups);
//停用一个分组
shell.command('down', function(args, next){
	if(!args.length){ //必须指定分组名
		shell.print( '必须指定分组名' );
		next();
		return;
	}
	proxy.request('/sifter/group/disable', args[0], function(rs, err){
		if(err) shell.print(err);
		next('groups');
	});
}, auto_groups);
//编辑某个分组,用默认编辑器打开对应的rule文件
shell.command('edit', function(args, next){
	if(!args.length){ //必须指定分组名
		shell.print( '必须指定分组名' );
		next();
		return;
	}
	if(!env.config.editor){
		shell.print( '配置文件中没有指定editor' );
		next();
		return;
	}
	//调用默认编辑器
	var cmdStr = env.config.editor +' '+ env.getRpath( args[0] );  //editor /path/to/.rule
	exec(cmdStr, {cwd: env.paths.conf});  //在配置目录下执行编辑命令
}, auto_groups);
//查看规则列表
shell.command('ls', function(args, next){
	//处理参数args
	if(!args.length){  //打印所有已经启用的规则
		proxy.request('/sifter/rule/list', function(rs, err){
			if(err){
				shell.print(err);
				next();
				return;
			}

			var output = printRouteList(rs.appendix);
			shell.print( output.join('\n') );
			next();
		});
	}else{
		proxy.request('/sifter/group/content', args[0], function(rs, err){
			if(err){
				shell.print(err);
				next();
				return;
			}

			var table = rs.appendix;
			var output = printGroupContent(table);
			shell.print( output.join('\n') );
			next();
		});
	}
}, auto_groups);
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
function printGroupContent(table){
	var rules = table.rules;
	var handlers = table.handlers;

	var scopes = {};
	var r, list;
	for(var unid in rules){  //遍历rules列表,转换成以域名分类的键值表
		r = rules[unid];
		list = getScope( r.domain );
		list.unshift([r.patten, r.handler]);
	}

	//没有就新建
	function getScope(domain){
		if( !(domain in scopes) ){
			scopes[domain] = [];
		}
		return scopes[domain];
	}
	
	//打印
	var output = [];
	var s, l; //循环中临时存放点
	
	output.push('Handler列表: =================');
	for(var h in handlers){
		output.push(' '+ h +': '+ JSON.stringify( handlers[h] ) );
	}
	output.push('');

	output.push('Rule列表: =================');
	for(var domain in scopes){
		output.push('<'+ domain +'>');
		scopes[domain].forEach(function(r){
			output.push(' '+ r[0] +'  --  '+ r[1]);
		});
	}

	return output;
}

//
function printRouteList(table){
	var rules = {};
	for(var domain in table){  //把分单个domain的列表转换成groupContent里面一样的rules  unid -> rule
		table[domain].forEach(function(r){
			rules[r.unid] = r;
		});
	}

	var scopes = {};
	var r, list;
	for(var unid in rules){  //遍历rules列表,转换成以域名分类的键值表
		r = rules[unid];
		list = getScope( r.domain );
		list.unshift(r);
	}

	//没有就新建
	function getScope(domain){
		if( !(domain in scopes) ){
			scopes[domain] = [];
		}
		return scopes[domain];
	}

	var output = [];
	var s, l; //循环中临时存放点
	output.push('RouteList: =================');
	for(var domain in scopes){
		output.push('<'+ domain +'>');
		scopes[domain].forEach(function(r){
			output.push(' ['+ r.unid +']'+ r.patten +'  --  '+ r.groupname +'>'+ r.handler);
		});
	}

	return output;
}
