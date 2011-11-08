var http = require('http');
var url = require('url');

exports.serve = function(req, res, pipe){
	//直接从线上取回来给用户

	//这里不知道为什么 keep-alive的话 hdn的图片加载不出来
	req.headers['proxy-connection'] = 'close';

	var uri = req.url.replace(/http\:\/\/[^\/]+/,'');
	//var p = url.parse(req.url);
	//console.log(uri);
	//console.log(p.pathname + p.search + p.hash);
	//req.headers.cookie += 'at=1; aca=1; wpsid=13150351602837; ';
//{{代理服务核心逻辑
	var options = {
		host: req.headers['host'],
		method: req.method,
		headers: req.headers,
		path: uri //p.pathname + p.search + p.hash
	};
	var p_request = http.request(options, function(p_response){
		res.writeHead(p_response.statusCode, p_response.headers);

		pipe.write('response', {
			status: p_response.statusCode,
			headers: p_response.headers
		});
		if('set-cookie' in p_response.headers){
			console.log2("<Set-Cookie>", p_response.headers['set-cookie']);
		}
		// `response.statusCode === 304`: No 'data' event and no 'end'
		if (p_response.statusCode === 304) {
			try {
				res.end();
			} catch (er) {
				console.error("res.end error: %s", er.message)
			}
			return;
		}
	
		p_response.on('data', function(chunk) {
			res.write(chunk, 'binary');
		});
		p_response.on('end', function() {
			res.end();
		});

		//if(p_response.statusCode == 302){
		//	console.log("<Request Headers> ", req.headers);
		//	console.log("<Response Headers> ", p_response.headers);
		//}

	});
	console.log2('<online p_request>', p_request);
	req.on('data', function(chunk){
		p_request.write(chunk, 'binary');
	});
	req.on('end', function(){
		p_request.end();
	});
//}}End

//{{错误处理
	//远端服务器错误
	p_request.on('error', function(e){
		res.end();
		//throw new Error('<ERROR-proxy> :'+ req.url, e);
		//这里不能直接抛异常,会导致当前的socket不能正常关闭
		//然后积累多了就会报错: (node) Hit max file limit. Increase "ulimit - n"
		pipe.write('error', e );
	});

	//客户端手动abort
	req.on('close', function(e){
		p_request.abort();
		//throw new Error('<ERROR-client> :'+ req.url, e);
		pipe.write('error', e );
	});
//}}End
}
	
