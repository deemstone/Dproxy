var http = require('http');
var sys  = require('sys');

var sifter = require('./sifter.js');
var online = require('./methods/online.js');  //这是整个过滤流程的最后一步
var roll = require('./roll.js');  //用这个模块处理所有网络请求的信息滚动

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
			for (var property in handler) {
				param[property] = handler[property];
			}

			methods[handler.method].serve(request, response, param);
		}else{
			//没有这个模块.. 可能是配置文件写错了
			console.log('没有这个类型的handler: ', m);
			response.writeHead(500, {"Content-Type": "text/plain"});
			response.write("调试代理服务器配置错误\n");
			response.end();

			//向管道补充一条response更新
			pipe.write('error', { handler: 'error' });
		}
	}else{
		//没有匹配到,直接online
		//not shot the list , get it frome online
		online.serve(request, response, pipe);
	}
	return true;
});

//滚动信息的输出
roll.output(function(m){
	//TODO: 输出给各UI的适配器
	write(m);
});

//输出定向
var _output = function(m){
	console.info('<proxy-output>', m); //默认直接打印到console
};
exports.output = function(fn){
	_output = fn;
};
//向外部写出一条消息
function write(msg){
	_output(msg);
}


//
exports.command = function(cmd, fun){

};

//接受外来的消息
