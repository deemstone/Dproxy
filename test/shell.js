/*
 * 做个shell应用
 */
var roll = require('./roll.js');

var readline = require('readline'),
  rl = readline.createInterface(process.stdin, process.stdout),
  prefix = 'shell> ';

rl.on('line', function(line) {
  switch(line.trim()) {
    case 'on':
	  rl.setPrompt('', 0);
      roll.on();
      break;

    default:
      console.log('Say what? I might have heard `' + line.trim() + '`');
      break;
  }
  rl.setPrompt(prefix, prefix.length);
  rl.prompt();
}).on('close', function() {
  roll.off();
  console.log('回到命令模式!');
  rl.setPrompt(prefix, prefix.length);
  rl.prompt();
  return false;
  //process.exit(0);
});
console.log(prefix + '现在是off状态,试试on.');
rl.setPrompt(prefix, prefix.length);
rl.prompt();

setInterval(function(){
	roll.info('lala');
	rl.prompt();
}, 1000)
