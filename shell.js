/*
 * 一个标准的shell模块
 * 类似express编程体验的一个模块
 */
var readline = require('readline');
var tty = require('tty');
//tty.setRawMode(false);

var prefix = 'proxy> '; //命令行提示符
var rl;  //readline的实例
//所有定义了的命令
var commands = {
	//cname: function processer(){};
};
var commands_list = [];
var autoComplete = {};  //cname -> function  这个函数返回一个列表,提供给shell根据用户输入进行过滤

//定义一个命令
exports.command = function(cname, processer, auto){
	commands[cname] = processer;
	autoComplete[cname] = auto;  //自动补全程序
	commands_list.push(cname);  //后面自动补全能用得上
};

function prompt(){
	rl.setPrompt(prefix, prefix.length);
	rl.prompt();
}

//开始shell的命令循环
exports.start = function(){
	//缓存自动补全的列表
	//如果用户连续两次按tab键的cmd是一样的,不用再调用函数取列表了,直接用这个缓存的结果
	var _auto = {
		cmd: null,
		list: null
	};

	rl = readline.createInterface(process.stdin, process.stdout, 
		//自动补全的逻辑
		function(p){  //p是用户输入的字符串(包括前后的空格)

			//在一个列表中过滤出以p开头的所有字串
			function filter(p, arr, pre, post){
				var ret = [];
				var p = p || '';
				var pre = pre || '';
				var arr = arr.slice(0);  //拷贝一份出来处理
				var c;
				while(c = arr.shift()){
					if( c.indexOf(p) == 0){
						ret.push(pre + c + post);  //补全之后加个空格
					}
				}
				//console.log2('匹配到的列表: ', ret);
				return ret;
			}

			var args = p.trim().split(/\s+/);
			if(args[0] in commands){
				var auto = autoComplete[ args[0] ];
				if( auto ){  //调用该命令的补全逻辑
					//缓存逻辑
					if(_auto.cmd == args[0]){
						var list = _auto.list;
					}else{
						var list = auto() || [];
						_auto.cmd = args[0];  //缓存起来
						_auto.list = list;
					}
					var pre = args[0]+ ' ';
					return [filter(args[1], list, pre, ''), p];
					//这个数据结构的逻辑是: 在返回的列表中每个结果 从开头去掉p一段之后剩下的一部分循环显示
				}else{
					return null;
				}
			}else{
				//console.log(commands_list);
				return [ filter(p, commands_list, '', ' '), p]; 
			}
		}
	);
//TODO: 命令行Tab自动补全
	var _rq = [];　//记录调用命令的顺序,用来防止next()循环调用
	rl.on('line', function(line) {
		_rq = [];  //每次手动输入命令为起点,把_rq置空

		var args = line.trim().split(' ');
		var cname = args.shift();
		execute(cname, args);  //执行这个命令
	});

	//执行一个命令
	function execute(cname, args){
		if( !(cname in commands) ){  //没有这样的命令,给用户提示
			print('没有这样的命令: ' + cname );
			next();
			return;
		} 
		var args = args || [];  //args可以传空
		//调用对应的processer
		if(_rq.indexOf(cname) < 0){
			_rq.push(cname);  //记录命令调用的顺序
			commands[cname](args, next);
		}else{
			console.log1('命令循环调用了,到此为止: ', _rq);
			next();
		}
	}

	//一条命令执行结束,开始等待下一条
	function next(nc, args){  //可以指定 接着执行下一个命令
		if(!nc){
			prompt();
		}else{
			execute(nc, args);
		}
	};

	prompt();
};

//命令执行过程中向控制台输出的函数
var print = exports.print = function(content){
	console.log( content );
};


/* -- 即时模式 -- */
var instantProcesser;
var instantCallback;  //在即时模式关闭的时候调用
//开启/关闭keypress模式
exports.instantOn = function(cb){
	instantCallback = cb;
	if(!instantProcesser) return false;  //没指定处理函数
	//暂停readline,打开滚动,监听按键
	rl.pause();
	tty.setRawMode(true);
	process.stdin.on('keypress', onKeypress);
	console.log('Instant ON');
};
exports.instantOff = function(){
	if(instantCallback) instantCallback();

	process.stdin.removeListener('keypress', onKeypress);
	rl.resume();
	tty.setRawMode(false);
	console.log('Instant OFF');
	prompt();
};
//设置即时模式的消息处理函数
//processer是一个函数
exports.instantMod = function(processer){
	instantProcesser = processer;
};
function onKeypress(char, key){
//调用instantProcesser相应这个输入
	instantProcesser.apply(this, arguments);
		//TODO: 能不回显就好了
	
}
