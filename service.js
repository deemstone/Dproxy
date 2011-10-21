/*
 * 实现类似express的命令到逻辑的映射
 */
var cmds = {};  //所有注册的命令都存在这个表里

//定义一个心的命令
//cmd 命令字符串 processer 请求来了怎么处理
//processer执行时会接收到两个参数
//cmd(标准cmd格式) done(用来返回执行结果)
exports.command = function(cmd, processer){
	cmds[cmd] = processer;
};

//cmd 标准命令数据结构  callback 回调
//为了实现cli里 支持异步调用的service 设计了这个callback
//如果没有传入callback,直接写到标准输出
exports.request = function(cmd, callback){
	var query = '/'+ cmd.cmds.join('/');
	if(query && typeof query == 'string' && query in cmds){
		//调用对应的processer
		var processer = cmds[query];
		processer(cmd, cb);
		return true;
	}else{
		cb(false);  //不对劲儿了
	}
	
	//processer执行完后把结果输出
	function cb(msg){
		//processer处理完之后,如果没有callback才写到标准输出中
		if(!callback || typeof callback != 'function'){
			callback(msg);
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
function write(msg){
	_output(msg);
}
