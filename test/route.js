var routeList = require('../routeList.js');

function printRouteList(group){
	if(group){
		var g = routeList.groupContent(group);
		if(!g){
			console.log('No group named %s', group);
			return;
		}
		var sections = g.sections;
		var exact = g.exact;
	}else{
		var sections = routeList.sections;
		var exact = routeList.exact;
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


	var readline = require('readline');
	var tty = require('tty');

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
		var args = line.trim().split(' ');
		switch(args[0]) {
			case 'enable':
				//启用一个分组
				if(args[1]){
					if(args[1] == 'all'){
						routeList.enable('*')
					}else{
						routeList.enable(args[1]);
					}
				}else{
					console.log('Need groupName or all');
				}
				
				break;
			case 'disable':
				//禁用一个分组
				if(args[1]){
					if(args[1] == 'all'){
						routeList.disable('*');
					}else{
						routeList.disable(args[1]);
					}
				}else{
					console.log('Need groupName or all');
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
				var list = routeList.listGroups();
				console.log( list.join('\n') );
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

	console.log = function(){
		console.info.apply(console, arguments);
		rl.prompt();
	};

	prompt();

function CmdShell(){
	this.cmds = [];
}

CmdShell.prototype = {
	command: function(schema, fun){
		this.cmds.push(schema);
	},

	onCmd: function(){
	
	},

	instant: function(mod){ //启用/关闭instant模式
		
	}
};
