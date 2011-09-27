/*
 * 做个shell应用
 */

//这个设置保证由我自己控制Ctrl-C的行为,屏蔽了系统默认行为
var readline = require('readline');
var tty = require('tty');
//tty.setRawMode(true);

/*
 * 滚动信息
 */
var roll = {};
roll._on = false; //是否滚动中
roll.info = function(){};

roll.on = function(){
	roll.info = function(message){
		console.log(message);
	};
	roll._on = true;
};

roll.off = function(){
  console.log('回到命令模式!');
	roll.info = function(){};
	roll._on = false;
};

setInterval(function(){
	roll.info('lala');
	//rl.prompt();
}, 1000)



rl = readline.createInterface(process.stdin, process.stdout, function(p){
	//console.log(p);
	return [ [p+'test', p+'lala', p+'dudu'], p];
	return ['on', 'off', 'quit'];
});
prefix = 'shell> ';

rl.on('line', function(line) {
	switch(line.trim()) {
		case 'on':
			rl.pause();
			roll.on();
			tty.setRawMode(true);
			break;
		case 'off':
			roll.off();
			startAnother();
			return;
			break;

		default:
			console.log('Say what? I might have heard `' + line.trim() + '`');
	}
	rl.setPrompt(prefix, prefix.length);
	rl.prompt();
});

//rl.on('close', function(){
//	console.log('get out?');
//	process.stdin.resume();
//});

process.stdin.on('keypress', function(char, key) {
  if (key && key.name == 'q') {
    if(roll._on){
		roll.off();
		rl.resume();
		tty.setRawMode(false);
	}
	return false;
  }
});

//console.log(prefix + '现在是off状态,试试on.');
rl.setPrompt(prefix, prefix.length);
rl.prompt();

function startAnother(){
	rl = readline.createInterface(process.stdin, process.stdout),
	prefix = 'shell2> ';
	rl.on('line', function(line) {
		console.log(line);
		switch(line.trim()) {
			case 'q':
				rl.close();
				startAnother();
				return;
		}
		rl.setPrompt(prefix, prefix.length);
		rl.prompt();
	});
	rl.setPrompt(prefix, prefix.length);
	rl.prompt();
}
