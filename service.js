/*
 * 实现类似express的命令到逻辑的映射
 */
var commands = {};  //所有注册的命令都存在这个表里

//定义一个心的命令
//query 命令字符串 processer 请求来了怎么处理
//processer执行时会接收到两个参数
//cmd(标准cmd格式) done(用来返回执行结果)
exports.command = function(query, processer){
	commands[query] = processer;
};

//cmd 标准命令数据结构  callback 回调
//为了实现cli里 支持异步调用的service 设计了这个callback
//如果没有传入callback,直接写到标准输出
//第二个参数可以是cmd的param
//第三个参数可以是cmd的appendix
exports.request = function(query, callback){
	console.log('service接收到请求:', arguments[0]);
	var cmds = query.split('/').slice(1);
	var cmd = {
		cmds: cmds
	};

	if(arguments[1] && typeof arguments[1] != 'function'){  //第二个参数 param
		cmd.param = arguments[1];
		callback = arguments[2];

		if(arguments[2] && typeof arguments[2] != 'function'){  //第三个参数 appendix
			cmd.appendix = arguments[2];
			callback = arguments[3];
		}
	}
	if(query && typeof query == 'string' && query in commands){
		//调用对应的processer
		var processer = commands[query];
		processer(cmd, cb);
		return true;
	}else{
		var err = new Error('没定义这个query: '+ query);
		cb(cmd, err);  //不对劲儿了
	}
	
	//processer执行完后把结果输出
	function cb(msg){
		//processer处理完之后,如果没有callback才写到标准输出中
		if(callback && typeof callback == 'function'){
			callback.apply('',arguments);
		}else{
			write(msg);
		}
	}
}

//输出定向
var _output = function(m){
	console.info('<proxy-output>', m); //默认直接打印到console
};
exports.output = function(fn){
	_output = fn;
};
//向外部写出一条消息
var write = exports.write = function(msg){
	_output(msg);
}
