/*
 * 做个shell应用
 */

//这个设置保证由我自己控制Ctrl-C的行为,屏蔽了系统默认行为
var tty = require('tty');
tty.setRawMode(true);

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




var readline = require('readline'),
  rl = readline.createInterface(process.stdin, process.stdout),
  prefix = 'shell> ';

rl.on('line', function(line) {
  switch(line.trim()) {
    case 'on':
      roll.on();
      break;
	case 'off':
	  roll.off();
	  break;

    default:
      console.log('Say what? I might have heard `' + line.trim() + '`');
  }
  rl.setPrompt(prefix, prefix.length);
  rl.prompt();
});

process.stdin.on('keypress', function(char, key) {
  if (key && key.ctrl && key.name == 'c') {
    if(roll._on){
		roll.off();
		rl.close();
		startAnother();
	}else{
		process.exit(0);
	}
    return false;
  }
});

console.log(prefix + '现在是off状态,试试on.');
rl.setPrompt(prefix, prefix.length);
rl.prompt();

setInterval(function(){
	roll.info('lala');
	//rl.prompt();
}, 1000)


function startAnother(){
  rl = readline.createInterface(process.stdin, process.stdout),
  prefix = 'shell2> ';
  rl.setPrompt(prefix, prefix.length);
  rl.prompt();
}
