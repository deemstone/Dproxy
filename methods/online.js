var http = require('http');
var url = require('url');

exports.serve = function(req, res){
	//直接从线上取回来给用户
	console.log("<-- : [Online] " + req.method + " " + req.url);

	//这里不知道为什么 keep-alive的话 hdn的图片加载不出来
	req.headers['proxy-connection'] = 'close';

	var uri = req.url.replace(/http\:\/\/[^\/]+/,'');
	var p = url.parse(req.url);
	console.log(uri);
	//console.log(p.pathname + p.search + p.hash);

	var options = {
		host: req.headers['host'],
		method: req.method,
		headers: req.headers,
		path: uri //p.pathname + p.search + p.hash
	};
	var p_request = http.request(options, function(p_response){
		p_response.on('data', function(chunk) {
			res.write(chunk, 'binary');
		});
		p_response.on('end', function() {
			res.end();
		});
		res.writeHead(p_response.statusCode, p_response.headers);
	});

	req.on('data', function(chunk){
		p_request.write(chunk, 'binary');
	});
	req.on('end', function(){
		p_request.end();
	});
}
	
