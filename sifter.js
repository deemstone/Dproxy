/*
 * 读取配置文件,并监视这个文件
 * 对其他模块提供 判断是否有记录的方法
 */

var fs = require('fs');
//var iniReader = require('inireader');

var local = require('./methods/local.js');  //用本地文件相应请求
var remote = require('./methods/remote.js');  //代理到其他测试服务器取文件

var routeList = require('./routeList.js');  //开发临时使用的列表数据结构

/*
 * 分发url,如果test成功
 * 返回true 并直接处理这个request
 */
exports.check = function(req, res){
	//匹配
	var vector = null;  //后面检测到匹配后 会把contentHandler存到这里
	var host = req.headers.host;
	var uri = req.url;
	
	//首先判断这个host下是否有定义的转发列表
	if(host in routeList){
		var section = routeList[host];  //该域名下的配置
		//首先检查是否有完全匹配项
		if( uri in section.exact ){
			vector = {};
			vector.handler = section.exact[url];

		//然后逐个检测是否有正则匹配的项
		}else{
			//如果有rewrite设置,先处理url
			if(section.rewrite){
				uri = rewrite(section.rewrite);
			}
			//然后判断是否有then中匹配的
			//todo...

			//如果是正则匹配的条目,后续处理的contentHandler会收到一些额外的信息 通过正则匹配的结果
			var wildcard = section.location;
			for(i in wildcard){
				//matcher = { regex: , tags: []};
				var matcher = makeRegex(wildcard[i]);
				if( matcher.regex.test( uri ) ){
					vector = {};
					vector.handler = wildcard[i];
					if(matcher.tags){
						var br = {};  //backreference 反向引用
						matcher.tags.forEach(function(v,i){
							br[v] = RegExp['$'+ (i+1)];
						});
						vector.tags = br;
					}
				}
			}
		}
	}

	function makeRegex(expression){
		//替换各种标签 %path%
		//'llssl/dkls/%path%/%uri%/%http%/lslsl'.replace(/%(path|uri)%/g, function(w){console.log(w); return '(.*)'});
		var tags = [];
		var str = expression.replace( /%(path)%/g, function(tag){
			tags.push(tag);
			return '(.*)';
		});
		var regex = new RegExp( str );

		var matcher = {regex: regex};
		if(tags.length) matcher.tags = tags;

		return matcher;
	}
	
	//处理这个请求,可以依赖req res vector
	if(vector){
		//按照配置 处理这个请求
		//setTimeout(function(){  //
			//开始特殊的处理
			contentHandler(vector);
		//});
		return true;
	}else{
		return false;
	}

	function contentHandler(vector){
		var method = getMethod(vector.handler);
		console.log('-~~~- : processing ... ', method);
		//分发给对应的模块处理
		switch (method){

			case 'file':
				var path = getDirection( vector.handler );
				local.serve(req, res, path);
				break;

			default: 
				console.log('没有这个类型的handler: ', method);
				res.writeHead(500, {"Content-Type": "text/plain"});
				res.write("调试代理服务器配置错误\n");
				res.end();
		}
	}
};

//从设置的handler字符串中取出method(第一个冒号之前的那个单词)
function getMethod(handler){
	var method = handler.substr(0, handler.indexOf(':'));
	return method;
}

//冒号之后的部分
function getDirection(handler){
	var direction = handler.substr( handler.indexOf(':') + 1 );
	return direction;
}

//初始化,读取列表 并监视文件
exports.init = function(){
	//
	//加载上一次保存的设置
	var loadConfig = function(){
		//加载文件 
		//var fp = './map.conf';
		//var config = fs.readFileSync(fp);
		////解析文件
		//config = parseConfig(config);
		//return config;
		var cfg = new iniReader.IniReader();
		cfg.load('./map.cfg');
		return cfg.getBlock();
		
	};

	var parseConfig = function(config){
		//按照格式解析配置 把结果的数据结构存储在全局的map里面 其他方法使用
		
		//匹配出所有块的声明行  localhost {}
		//
		//循环处理每个块
		//
		//存储到redis库里  localhost/jspro/base.js  xnimg.cn/jspro/base.js -> ip:uri
	};
	config = loadConfig();

	//初始化一种 列表
	this.vlist = new VectorList(config);
	//开始接受服务
	//fs.watchFile(fp, function(c,p) { update_iplist(); });
}
