/*
 * Remote Method
 *
 * 从指定远程服务器获取内容的Handler模块
 * @author jicheng.li
 */
var Proxy = require('../lib/http-proxy.js').HttpProxy;
var proxy = new Proxy();

//构造请求head 取回文件
exports.serve = function(req, res, vector){
	var pipe = vector.pipe;  //输出的管道
	var targetIP = vector.ip;
	var targetPort = vector.port;
	//var uri = req.url.replace(/http\:\/\/[^\/]+/,'');
	

	//开始请求
	var onStart = function(r){
		pipe.write('start', { });
	};

	//有header返回
	var onResponse = function(r){
		//向管道输出一条response更新
		pipe.write('response', {
			status: r.statusCode,
			headers: r.headers
		});
	};

	//本次请求完成
	var onEnd = function(r){
		if(r){
			pipe.write('end', r );
		}else{
			pipe.write('end', 'Normal');
		}
	};
	//代理请求过程中任意环节出错,导致请求无法完成的情况
	//onError之后不会再触发onEnd
	var onError = function(e){
		pipe.write('error', e );
	};

	var opt = {
		host: targetIP,
		//method: req.method,
		//headers: req.headers,
		//path: uri //p.pathname + p.search + p.hash
		onStart: onStart,
		onResponse: onResponse,
		onEnd: onEnd,
		onError: onError
	};
	if(targetPort) opt.port = vector.port;

/* == 设计,我希望这样使用 == */

//需要给用户反馈哪些信息
// * 收到这个请求(vector)
// * 向目标服务器发出请求(header)
// * 目标服务器开始返回(response)
// * 返回完成
// * 过程中出错,终止请求(error)
	var pr = proxy.proxyRequest(req, res, opt);

/* == 设计End == */


};
