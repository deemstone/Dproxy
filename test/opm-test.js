var opm = require('../methods/opm.js');
var roll = require('../lib/roll.js');  //用这个模块处理所有网络请求的信息滚动
var http = require('http');

console.log('连续请求很多个文件,验证opm模块的稳定性!! ');

var static_files = [
	'http://s.xnimg.cn/webpager/im.js',
	'http://s.xnimg.cn/n/core/base-all2.js',
	'http://a.xnimg.cn/webpager/buddy.tpl.js',
	'http://s.xnimg.cn/n/core/js/home-frame2.js',
	'http://s.xnimg.cn/apps/home/compatible/home.js',
	'http://s.xnimg.cn/apps/vip/checkin/memberChannel.js',
	'http://s.xnimg.cn/n/apps/photo/modules/seed/photoSeed.js',
	'http://s.xnimg.cn/n/apps/photo/modules/photo-view/js/photoViewerCtr.js',
	'http://s.xnimg.cn/apps/radio/js/radio-home.js',
	'http://s.xnimg.cn/apps/home/home-all-min.css',
	'http://s.xnimg.cn/n/core/home-frame2-all-min.css',
	'http://s.xnimg.cn/apps/radio/css/radio-home-v6.css',
	'http://s.xnimg.cn/n/core/webpager-std-min.css',
	'http://s.xnimg.cn/webpager/webpager-std-min.css'
];

//屏蔽滚动信息
roll.output(function(msg){
	//TODO: 输出给各UI的适配器
	//service.write(msg);
});

console.log1 = console.log2 = function(){};  //console.log;

var testServer = http.createServer(function(req, res) {
	var pipe = roll.add();
	console.log('request Recived: ', req.url);
	var vector = {
		port: '8080',
		ip: '127.0.0.1',
		root: '/Users/Lijicheng/htdocs/xn.static/',
		pipe: pipe,
		uri: req.url
	};
	opm.serve(req, res, vector);
});
testServer.listen('9000');

//请求计数
var time_start = new Date();
var n = static_files.length;
var ok = function(){
	n--;
	if(!n){
		var time_cost = new Date() - time_start;
		console.log('共发送 '+ static_files.length +' 个opm请求,耗时 '+ time_cost +'ms');
		process.exit(0);
	}
};

static_files.forEach(function(url, i){
	
	f = url.replace(/http\:\/\/[^\/]+/,'');
	console.log('requesting...', f);
	var options = {
		host: '127.0.0.1',
		port: '9000',
		method: 'GET',
		path: f //p.pathname + p.search + p.hash
	};
	var qqqqqq = http.request(options, function(response){

		console.log('response:>>> ', response.statusCode);
		response.on('end', function(){
			ok();
		});
		//res.writeHead(proxy_response.statusCode, proxy_response.headers);
	});
	qqqqqq.end();
	
});
console.log('All files requests send.');  //, qqqqqq)


/*
 * 尝试使用HTTPParser解析opm返回的数据
 * 没有成功,返回的不是标准HTTP信息
 */
//var head = new Buffer('HTTP/1.1 200 OK\n Status: 200 OK\n Content-Type: text/javascript\n Content-Length: 264868\n\n lalalalalalalalalalal');
//var HTTPParser = process.binding("http_parser").HTTPParser;
//var parser = new HTTPParser(HTTPParser.RESPONSE); //http.parsers.alloc();
//parser.onHeaders = function(info) {
//	console.log('info:', info)
//	var skipBody = false; // response to HEAD or CONNECT
//	return skipBody;
//};
//parser.onMessageComplete = function(info) {
//	console.log('message:', info)
//}
//
//parser.onHeaderField = function (b, start, len) {
//	console.log('htparser Header有输出!!!!!! ');
//};
//
//parser.onHeaderValue = function (b, start, len) {
//	console.log('htparser Header Value有输出!!!!!! ');
//};
//
//parser.onHeadersComplete = function (info) {
//	console.log('htparser Header Complete有输出!!!!!! ');
//	console.log(info);
//}
//parser.onBody = function(buffer, start, len) {
//	console.log('htparser也有输出!!!! ');
//	_current.resp.write(buffer.slice(start, start + len));
//}
//var lala = parser.execute(head, 0, head.length);
//console.log(lala);
