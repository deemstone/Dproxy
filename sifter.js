/*
 * 读取配置文件,并监视这个文件
 * 对其他模块提供 判断是否有记录的方法
 * 编辑配置
 * 保存配置
 */
var url = require('url');  //用来处理url
var routeList = require('./routeList.js');  //开发临时使用的列表数据结构

//可用的Methods
var methods;
exports.setMethods = function(ms){
	methods = ms;
};

/*
 * 分发url,如果test成功
 * 返回true 并直接处理这个request
 */
exports.check = function(req, res, pipe){
	//匹配
	var vector = null;  //后面检测到匹配后 会把contentHandler存到这里
	//var uri = url.parse( req.url ).pathname;
	var uri = req.url.replace(/http\:\/\/[^\/]+/,'');

	/*
	 * vector结构
	 * {handler: [handler, argument], path: '', uri: ''}
	 */
	if( req.url in routeList.exact ){ //首先检查是否有完全匹配项
		vector = {
			handler: routeList.exact[req.url],
			uri: uri
		};

	}else{ //然后检测域名范围的设置
		var host = req.headers.host;
		//首先判断这个host下是否有定义的转发列表
		if( !(host in routeList.sections) ) return false; //没有的话那就没有特殊路由了,返回false从线上代理回来
		//该域名下的配置
		var section = routeList.sections[host];

		//如果有rewrite设置,先处理url
		if(section.rewrite){
			uri = rewrite(uri, section.rewrite);
		}

		//如果是正则匹配的条目,后续处理的contentHandler会收到一些额外的信息 通过正则匹配的结果
		var wildcard = section.location || {};
		for(l in wildcard){
			//TODO: 判断l是否~ 是否使用正则

			//matcher = { regex: , tags: []};
			var regex = makeRegex( l );
			if( regex.test( uri ) ){
				var path = uri.split(l);  //从uri上取回路径的剩余部分
				path = path[ path.length - 1 ];

				vector = {
					handler: wildcard[l],
					uri: uri,
					path: path
				};
				break;

				//TODO: 以下是location表达式的高级功能,需要makeRegex的支持
				//if(matcher.tags){
				//	var br = {};  //backreference 反向引用
				//	matcher.tags.forEach(function(v,i){
				//		br[v] = RegExp['$'+ (i+1)];
				//	});
				//	vector.tags = br;
				//}
			}
		}
	}
	
	//如果找到了对应的设置,处理这个请求,可以依赖req res vector
	if(vector){
		//开始特殊的处理
		contentHandler(vector);
		return true;

	}else if(section.domain){  //还没完呢,如果没有匹配的location,判断是否有domain的设置
		vector = {
			handler: section.domain,
			uri: uri
		};
		contentHandler(vector);
		return true;

	}else{  //没有找到任何匹配
		pipe.write('process', { handler: 'online' });
		return false;
	}

	/*
	 * 最终传递给handler的vector结构
	 *
	 * {
	 *  	uri: ,
	 *  	path: ,
	 *  	handler: 'handler类型的名字',
	 *  	argument: '传递给handler的参数',
	 *  	pipe: '输出管道'
	 * }
	 */
	function contentHandler(vector){
		vector.pipe = pipe;

		//分发给对应的模块处理
		var h = vector.handler;
		console.log(vector);
		var m = h[0];
		vector.handler = m;
		vector.argument = h[1];
		if(m in methods){
			methods[m].serve(req, res, vector);

			//告诉大家已经选择了处理方式
			pipe.write('process', { handler: m });
		}else{
			//没有这个模块.. 可能是配置文件写错了
			console.log('没有这个类型的handler: ', m);
			res.writeHead(500, {"Content-Type": "text/plain"});
			res.write("调试代理服务器配置错误\n");
			res.end();

			//向管道补充一条response更新
			pipe.write('error', { handler: 'error' });
		}
	}
};

//实现nginx类似的rewrite
function rewrite(uri, rule){

	var rs = uri.match( rule[0] );
	if(rs){
		uri = rule[1].replace(/\$\d/g, function(n){
			return rs[ n[1] ];  //n是$2类似的字符串
		});
	}

	return uri;
}

//从Location的条目生成正则表达式
//目前实现的是 所有都匹配开头的字符 /^xxxx/
function makeRegex(expression){
	//TODO: 自定义标签的高级功能
	//替换各种标签 %path%
	//'llssl/dkls/%path%/%uri%/%http%/lslsl'.replace(/%(path|uri)%/g, function(w){console.log(w); return '(.*)'});
	//var tags = [];
	//var str = expression.replace( /%(path)%/g, function(tag){
	//	tags.push(tag);
	//	return '(.*)';
	//});
	var str = '^'+ expression;
	var regex = new RegExp( str );

	//var matcher = {regex: regex};
	//if(tags.length) matcher.tags = tags;

	return regex;
}
