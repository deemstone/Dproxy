var http = require('http');
var sys  = require('sys');
var config = require('./config.js');

//var local = require('./local.js');  //过滤器,匹配指定的本地文件
//var remote = require('./remote.js');  //过滤器 匹配其他测试服务器
//var online = require('./online.js');  //这是整个过滤流程的最后一步

config.init();

var filters = [local, remote, online]
http.createServer(function(request, response) {
	sys.log('--> : init');

	//按照地址,检查应该从哪里取文件
	var rs = config.testURL(request.url);
	if(rs.domain){
		if(rs.domain == 'local'){
			//直接local取文件
			local(request, response);
		}else{
			//构造请求head 从其他服务器请求文件
			remote(request, response);
		}
	}else{
		//正常代理 从线上取文件
		online(request, response);
	}
	//检查各种过滤器匹配
	//var n = filters.length;
	//var i = -1;
	//
	//(function next(){
	//	i++;
	//	filters[i].getfile(request, response, arguments.callee);
	//})();

}).listen(80);
