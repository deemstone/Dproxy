var http = require('http');
var fs = require('fs');

//构造请求head 取回文件
exports.serve = function(request, response, rs){
	//构造请求head
	console.log(request.connection.remoteAddress + "--> : " + request.method + " " + request.url);
	var proxy = http.createClient(80, rs.ip);
	var proxy_request = proxy.request(request.method, request.url, request.headers);

	request.addListener('data', function(chunk) {
		proxy_request.write(chunk, 'binary');
	});
	request.addListener('end', function() {
		proxy_request.end();
	});

	proxy_request.addListener('response', function(proxy_response) {
		proxy_response.addListener('data', function(chunk) {
			response.write(chunk, 'binary');
		});
		proxy_response.addListener('end', function() {
			response.end();
		});
		response.writeHead(proxy_response.statusCode, proxy_response.headers);
	});
};
