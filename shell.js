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

//定义一个命令
exports.command = function(cname, processer){
	commands[cname] = processer;
};

function prompt(){
	rl.setPrompt(prefix, prefix.length);
	rl.prompt();
}

//开始shell的命令循环
exports.start = function(){
	rl = readline.createInterface(process.stdin, process.stdout); //function(p){ return [ [p+'test', p+'lala', p+'dudu'], p]; }
//TODO: 命令行Tab自动补全
	rl.on('line', function(line) {
		var args = line.trim().split(' ');
		var cname = args.shift();

		if( !(cname in commands) ){  //没有这样的命令,给用户提示
			print('没有这样的命令: ' + cname );
			next();
			return;
		} 
		//调用对应的processer
		commands[cname](args, next);
	});

	//一条命令执行结束,开始等待下一条
	function next(){
		prompt();
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
