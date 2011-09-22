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
	var host = req.headers.host;
	//var uri = url.parse( req.url ).pathname;
	var uri = req.url.replace(/http\:\/\/[^\/]+/,'');
	
	//首先判断这个host下是否有定义的转发列表
	if( !(host in routeList) ) return false;
	//该域名下的配置
	var section = routeList[host];

	/*
	 * vector结构
	 * {handler: '', path: '', uri: ''}
	 */
	//首先检查是否有完全匹配项
	if( section.exact && uri in section.exact ){
		vector = {
			handler: section.exact[uri],
			uri: uri
		};

	//然后逐个检测是否有正则匹配的项
	}else{
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
	
	//处理这个请求,可以依赖req res vector
	if(vector){
		//开始特殊的处理
		contentHandler(vector);
		return true;

	}else if(section.domain){  //domain策略
		vector = {
			handler: section.domain,
			uri: uri
		};
		contentHandler(vector);
		return true;

	}else{
		pipe.write('process', {
			handler: 'online'
		});
		return false;  //没有找到任何匹配
	}

	function contentHandler(vector){
		//解析handler那段字符串
		vector.handler = parseHandler(vector.handler);
		vector.pipe = pipe;

		//console.log('-~~~- : processing ... ', vector.handler.method);
		//分发给对应的模块处理
		var m = vector.handler.method;
		if(m in methods){
			methods[m].serve(req, res, vector);

			//告诉大家已经选择了处理方式
			pipe.write('process', {
				handler: m
			});
		}else{
			//没有这个模块.. 可能是配置文件写错了
			console.log('没有这个类型的handler: ', m);
			res.writeHead(500, {"Content-Type": "text/plain"});
			res.write("调试代理服务器配置错误\n");
			res.end();

			//向管道补充一条response更新
			pipe.write('error', {
				handler: 'error'
			});
		}
	}
};

//从设置的handler字符串中取出method(第一个冒号之前的那个单词)
function parseHandler(handler){
	var method = handler.substr(0, handler.indexOf(':'));
	method = {
		'local': 'local',
		'http': 'online',
		'remote': 'remote',
		'fastcgi': 'fastcgi'
	}[method];

	//冒号之后的部分
	var direction = handler.substr( handler.indexOf(':') + 1 );

	return {
		method: method,
		handler: handler,  //配置文件里写的那段原始字符串
		asset: direction  //内容的地址
	};
}

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
