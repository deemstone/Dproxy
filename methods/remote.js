var http = require('http');
var fs = require('fs');

//构造请求head 取回文件
exports.serve = function(req, res, vector){
	var targetIP = vector.handler.asset;
	//构造请求head
	console.log(req.connection.remoteAddress + "--> : " + req.method + " " + req.url);
	var proxy = http.createClient(80, targetIP);
	var proxy_request = proxy.request(req.method, req.url, req.headers);

	req.addListener('data', function(chunk) {
		proxy_request.write(chunk, 'binary');
	});
	req.addListener('end', function() {
		proxy_request.end();
	});

	proxy_request.addListener('response', function(proxy_response) {
		proxy_response.addListener('data', function(chunk) {
			res.write(chunk, 'binary');
		});
		proxy_response.addListener('end', function() {
			res.end();
		});
		res.writeHead(proxy_response.statusCode, proxy_response.headers);
	});
};
