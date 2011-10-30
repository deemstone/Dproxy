var http = require('http');
var sys  = require('sys');

var sifter = require('./sifter.js');
var online = require('./methods/online.js');  //这是整个过滤流程的最后一步
var roll = require('./roll.js');  //用这个模块处理所有网络请求的信息滚动
var service = require('./service.js');  //程序的service layer

//设置sifter可用的Handler
var methods = {
	local: require('./methods/local.js'),  //用本地文件相应请求
	remote: require('./methods/remote.js')  //代理到其他测试服务器取文件
};

//启动服务
exports.server = http.createServer(function(request, response) {
	//console.log('['+ request.connection.remoteAddress + '] --> : new Request - ', request.url);
	var pipe = roll.add();
	pipe.cmds.push('transport');
	pipe.write('new', {
		method: request.method,
		url: request.url,
		headers: request.headers,
		httpVersion: request.httpVersion
	});
	//TODO: 发送new的消息时候,应该带上handler的相关信息

	//在sifter中检查
	var handler = sifter.check(request.url);
	if(handler){
		//找到了匹配的handler
		if(handler.method in methods){
			var param = { pipe: pipe };
			for (var property in handler) { //TODO: 工具库里面应该支持extend方法!!!
				param[property] = handler[property];
			}
			methods[handler.method].serve(request, response, param);
		}else{
			//没有这个模块.. 可能是配置文件写错了
			var error = new Error('没有这个类型的handler: '+ m);
			response.writeHead(500, {"Content-Type": "text/plain"});
			response.write("调试代理服务器配置错误\n");
			response.end();

			//向管道补充一条response更新
			pipe.write('error', error);
		}
	}else{
		//没有匹配到,直接online
		//not shot the list , get it frome online
		online.serve(request, response, pipe);
	}
	return true;
});

//滚动信息的输出
roll.output(function(msg){
	//TODO: 输出给各UI的适配器
	service.write(msg);
});
//设置输出定向
exports.output = function(fn){
	service.output(fn);
};
//调用service的request
exports.request = function(){
	service.request.apply(service, arguments);
};

/* ----------- 接口定义 ------------- */

//列出所有分组
service.command('/sifter/group/list', function(cmd, done){
	var rs = {
		cmds: ['sifter', 'group', 'list'],
		appendix: sifter.listGroups()
	};
	
	done(rs);
});
//启用一个分组
service.command('/sifter/group/enable', function(cmd, done){
	var groupname = cmd.param;
	sifter.enableGroup( groupname );
	done(cmd);
});
//停用一个分组
service.command('/sifter/group/disable', function(cmd, done){
	var groupname = cmd.param;
	sifter.disableGroup( groupname );
	done(cmd);
});
//添加一条规则
service.command('/sifter/rule/add', function(cmd, done){
	//cmd是标准命令格式

	//执行过后用done返回结果
	done(m);
});
//显示一个分组的详细内容
service.command('/sifter/group/show', function(cmd, done){
	var groupname = cmd.param;
	var table = sifter.getGroupContent(groupname);
	cmd.appendix = table;
	done(cmd);
});
//取得routeList内容
service.command('/sifter/rule/list', function(cmd, done){
	cmd.appendix = sifter.getRouteList();
	done(cmd);
});
