var net = require('net'),
	util = require('util'),
	events = require('events'),
	//fs = require('fs'),
	path = require('path');

/**
 * 完成进程间通信任务的模块
 * IPCAgent
 * 可以是shell管道,也可以是socket
 * 对外提供 写数据方法 和 收到数据的事件
 */
var DelegatingSocket = function(){
	events.EventEmitter.call(this);
	var self = this;
	self.sConnection = null;  //用来保存socket连接对象

	//默认情况下(没有socket连接)触发message事件的是stdin
	var stdinListener = this._stdinListener = function(message){
		self.emit('message', message);
	};
	process.stdin.setEncoding('utf-8');
	process.stdin.on('data', stdinListener);
};
util.inherits(DelegatingSocket, events.EventEmitter);
module.exports = new DelegatingSocket();

/*
 * 默认状态下,没有socket连接
 * 所有输出写到标准输出
 */

/*
 * 向另一端进程写数据
 * @param message{string}
 */
module.exports.write = function(message){
	if(message instanceof Object){
		message = self.buildMsg( message );
	}
	console.log(message);
};

/*
 * 创建一个socket连接
 * 并且更改这个对象自己的行为
 */
module.exports.createConnection = function(socketfile){
	var self = this;

	if(!socketfile){
		throw new Error('Need special socket file!!');
	}

	console.log(socketfile);

	if( !path.existsSync(socketfile) ){
		throw new Error('socketfile Not Exist!');
	}

	//fs.mkdirSync(socketfile, '700')
	var sconn = this.sConnection = net.createConnection(socketfile);
	sconn.setEncoding('utf8');
	
	process.stdin.removeListener('data', this._stdinListener);
	sconn.on('data', function(msg){
		self.emit('message', self.parseMsg(msg) );
	});

	//有了socket连接之后 write方法设置为socket方式发送
	//接受object和string类型的参数, object会被自动转换成字符串发送
	self.write = function(message){
		if(message instanceof Object){
			message = self.buildMsg( message );
		}
		sconn.write(message);  //如果不是Object类型,直接发送过去
		console.log('write message: ', message);
	};
};

//从一个js对象,构建一条标准的message
module.exports.buildMsg = function(obj){
	var msg = ['$'];
	msg.push( obj.cmds.join(':$') );
	if(obj.param){
		msg.push( ':'+ obj.param );
	}
	if(obj.appendix){
		if(obj.appendix instanceof Object){
			var apInfo = JSON.stringify(obj.appendix); 
		}else{
			var apInfo = obj.appendix;
		}
		//msg.push( '::'+ encodeURIComponent(apInfo) );
		msg.push( '::'+ apInfo );
	}

	msg = msg.join('');
	return msg;
};

/*
 * 解析一条message
 * 返回结构:
 * {cmds: [所有cmd的数组], param: 仅有一个param, appendix: 附加信息解析JSON}
 */
module.exports.parseMsg = function(cStr){
	var self = this;
	if( cStr[0] != '$' ){  //至少有一个cmd
		return false;
	}

	var cmds = [];  //等会儿把所有的cmd都push到这里
	var param = null;  //等会儿把param存在这里
	var appendix = null;  //...你懂得
	
	cStr = cStr.split('::');
	var fragment = cStr.shift().split(':');  //第一个::出现之前的一段就是cmd和param $cmd1, $cmd2, .. ,parma, appendix
	if( cStr.length ){
		//var apInfo = decodeURIComponent( cStr.join('::') );  //这里的join是为了防止在上面split的时候拆散了不该拆开的appendix(可能是有点担心过度了)
		var apInfo = cStr.join('::');
		try{
			appendix = JSON.parse(apInfo);
		}catch(e){
			console.log('JSON解析出错 : ', apInfo);
		}
	}

	//开始解析所有的cmd 和 param
	while(fragment[0]){
		if(fragment[0][0] == '$'){  //他是个cmd
			cmds.push( fragment.shift().substr(1) );
		}else{
			param = fragment.shift();  //这样做的结果: 如果有多个没带$的字段,param只取最后一个(后来的会把前面的覆盖)
		}
	}

	return {
		cmds: cmds,
		param: param,
		appendix: appendix
	};
	
	//var p = cStr.indexOf(':');
	//var cmd = cStr.substr( 1, p - 1 );
	//var rest = cStr.substr( p + 1 );

	//var result = {
	//	cmd: cmd
	//};

	////如果剩下的那段开头不是$,那他就是个param,一并解出来返回
	//if(rest[0] != '$'){
	//	var param = rest.substr( 0, rest.indexOf('::') );
	//	result.param = param;
	//	result.appendix = self.parseAppendix(rest);
	//}else{
	//	result.message = rest;
	//}

	//return result;
};


/**
 * 协议:
 * 
 * 每条信息的结构: command:[[command2:] ... :]param::appendInfo
 * command可以有多层,同是表示了消息分发的路径,必须以$开头命名
 * param是一个基本类型,尽量简单
 * appendInfo附加的信息,可以携带复杂的数据(JSON)
 */
