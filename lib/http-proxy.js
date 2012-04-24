/*
 * 通用http代理模块
 * 
 * 提供http/https/websocket兼容的接口
 */
var events = require('events'),
http = require('http'),
util = require('util');
url = require('url');

//
// ### function HttpProxy (options)
// #### @options {Object} Options for this instance.
// Constructor function for new instances of HttpProxy responsible
var HttpProxy = exports.HttpProxy = function() {
	var self = this;

	events.EventEmitter.call(this);

};

// Inherit from events.EventEmitter
util.inherits(HttpProxy, events.EventEmitter);

//
// ### function proxyRequest (req, res, [port, host, paused])
// #### @req {ServerRequest} Incoming HTTP Request to proxy.
// #### @res {ServerResponse} Outgoing HTTP Request to write proxied data to.
// #### @opt {Object} 定制这一次代理请求.
//
HttpProxy.prototype.proxyRequest = function(req, res, opt) {
	var self = this,
	errState = false,
	//outgoing = new(this.target.base),
	outgoing = {},
	reverseProxy;

	//TODO: 根据opt的指定,配置本次请求的options
	//
	// Setup outgoing proxy with relevant properties.
	//
	var t = url.parse( req.url );

	outgoing.host = opt.host || t.host;
	outgoing.port = opt.port || t.port;

	outgoing.path = t.path;
	outgoing.method = req.method;
	outgoing.headers = req.headers;
	//outgoing.hostname = t.hostname;  这个字段会覆盖host的效果

	//
	// Add common proxy headers to the request so that they can
	// be availible to the proxy target server. If the proxy is 
	// part of proxy chain it will append the address:
	//
	// * `x-forwarded-for`: IP Address of the original request
	// * `x-forwarded-proto`: Protocol of the original request
	// * `x-forwarded-port`: Port of the original request.
	//
	//if (this.enable.xforward && req.connection && req.socket) {
	if (req.headers['x-forwarded-for']) {
		var addressToAppend = "," + req.connection.remoteAddress || req.socket.remoteAddress;
		req.headers['x-forwarded-for'] += addressToAppend;
	}
	else {
		req.headers['x-forwarded-for'] = req.connection.remoteAddress || req.socket.remoteAddress;
	}

	if (req.headers['x-forwarded-port']) {
		var portToAppend = "," + req.connection.remotePort || req.socket.remotePort;
		req.headers['x-forwarded-port'] += portToAppend;
	}
	else {
		req.headers['x-forwarded-port'] = req.connection.remotePort || req.socket.remotePort;
	}

	if (req.headers['x-forwarded-proto']) {
		var protoToAppend = "," + req.connection.pair ? 'https': 'http';
		req.headers['x-forwarded-proto'] += protoToAppend;
	}
	else {
		req.headers['x-forwarded-proto'] = req.connection.pair ? 'https': 'http';
	}
	//}
	//
	// Emit the `start` event indicating that we have begun the proxy operation.
	//
	this.emit('start', req, res, this.target);
	if(opt.onStart){
		try{ opt.onStart(outgoing); }catch(e){};
	}
	//
	// Open new HTTP request to internal resource with will act 
	// as a reverse proxy pass
	// 修改为暂时只支持http
	//
	reverseProxy = http.request(outgoing, function(response) {
		if(opt.onResponse){
			try{ opt.onResponse(response) }catch(e){};
		}
		//
		// Process the `reverseProxy` `response` when it's received.
		//
		if (response.headers.connection) {
			if (req.headers.connection) {
				response.headers.connection = req.headers.connection
			}
			else {
				response.headers.connection = 'close'
			}
		}

		// Remove `Transfer-Encoding` header if client's protocol is HTTP/1.0
		if (req.httpVersion === '1.0') {
			delete response.headers['transfer-encoding'];
		}

		//if ((response.statusCode === 301) || (response.statusCode === 302)) {
		//  if (self.source.https && !self.target.https) {
		//    response.headers.location = response.headers.location.replace(/^http\:/, 'https:');
		//  }
		//  if (self.target.https && !self.source.https) {
		//    response.headers.location = response.headers.location.replace(/^https\:/, 'http:');
		//  }
		//}
		// Set the headers of the client response
		res.writeHead(response.statusCode, response.headers);

		// If `response.statusCode === 304`: No 'data' event and no 'end'
		if (response.statusCode === 304) {
			try {
				res.end()
			} catch(ex) {
				console.error("res.end error: %s", ex.message)
				opt.onError(ex);
			}
			//通知调用者,完成请求
			if (opt.onEnd) {
				try{ opt.onEnd('304'); }catch(e){};
			}
			return;
		}

		//
		// For each data `chunk` received from the `reverseProxy`
		// `response` write it to the outgoing `res`.
		// If the res socket has been killed already, then write()
		// will throw. Nevertheless, try our best to end it nicely.
		//
		var paused = false;
		response.on('data', function(chunk) {
			if (req.method !== 'HEAD' && res.writable) {
				try {
					var flushed = res.write(chunk);
				}
				catch(ex) {
					console.error("res.write error: %s", ex.message);

					try {
						res.end()
					}
					catch(ex) {
						console.error("res.end error: %s", ex.message)
					}

					opt.onError(ex);
					return;
				}

				if (!flushed && ! paused) {
					paused = true;
					response.pause();
					res.once('drain', function() {
						paused = false;
						try {
							response.resume()
						}
						catch(er) {
							console.error("response.resume error: %s", er.message)
						}
					});

					//
					// Force the `drain` event in 100ms if it hasn't
					// happened on its own. 
					//          
					setTimeout(function() {
						res.emit('drain');
					},
					100);
				}
			}
		});

		//
		// When the `reverseProxy` `response` ends, end the
		// corresponding outgoing `res` unless we have entered
		// an error state. In which case, assume `res.end()` has
		// already been called and the 'error' event listener
		// removed.
		//
		var ended = false
		response.on('close', function() {
			if (!ended) {
				response.emit('end')
				if(opt.onEnd){
					try{ opt.onEnd('Closed By Target Server') }catch(e){};
				}
			}
		})
		response.on('end', function() {
			ended = true
			if (!errState) {
				reverseProxy.removeListener('error', proxyError);

				try {
					res.end()
				}
				catch(ex) {
					console.error("res.end error: %s", ex.message)
					//opt.onError(ex);
				}

				// Emit the `end` event now that we have completed proxying
				self.emit('end', req, res);
				if(opt.onEnd){
					try{ opt.onEnd() }catch(e){};
				}
			}
		});
	});

	//
	// Handle 'error' events from the `reverseProxy`.
	//
	reverseProxy.once('error', proxyError);

	//
	// For each data `chunk` received from the incoming
	// `req` write it to the `reverseProxy` request.
	//
	req.on('data', function(chunk) {

		if (!errState) {
			var flushed = reverseProxy.write(chunk);
			if (!flushed) {
				req.pause();
				reverseProxy.once('drain', function() {
					try {
						req.resume()
					}
					catch(er) {
						console.error("req.resume error: %s", er.message)
					}
				});

				//
				// Force the `drain` event in 100ms if it hasn't
				// happened on its own. 
				//
				setTimeout(function() {
					reverseProxy.emit('drain');
				},
				100);
			}
		}
	});

	//
	// When the incoming `req` ends, end the corresponding `reverseProxy`
	// request unless we have entered an error state.
	//
	req.on('end', function() {
		if (!errState) {
			reverseProxy.end();
		}
	});

	//
	// If `req` is aborted, we abort our `reverseProxy` request as well.
	//
	req.on('aborted', function() {
		reverseProxy.abort();
		if(opt.onEnd){
			try{ opt.onEnd('Aborted By Browser'); }catch(e){}
		}
	});


	//Aborts reverseProxy if client aborts the connection.
	req.on('close', function() {
		if (!errState) {
			reverseProxy.abort();
			if(opt.onEnd){
				try{ opt.onEnd('Closed By Browser'); }catch(e){}
			}
		}
	});

	//
	// If we have been passed buffered data, resume it.
	//
	//if (buffer) {
	//	return ! errState ? buffer.resume() : buffer.destroy();
	//}

	// 其他辅助函数
	//
	// #### function proxyError (err)
	// #### @err {Error} Error contacting the proxy target
	// Short-circuits `res` in the event of any error when
	// contacting the proxy target at `host` / `port`.
	//
	function proxyError(err) {
		errState = true;

		//
		// Emit an `error` event, allowing the application to use custom
		// error handling. The error handler should end the response.
		//
		opt.onError(err);
		if (self.emit('proxyError', err, req, res)) {
			return;
		}

		res.writeHead(500, {
			'Content-Type': 'text/plain'
		});

		if (req.method !== 'HEAD') {
			//
			// This NODE_ENV=production behavior is mimics Express and
			// Connect.
			//
			//if (process.env.NODE_ENV === 'production') {
			//  res.write('Internal Server Error');
			//}
			//else {
			res.write('Dproxy: An error has occurred: ' + JSON.stringify(err));
			//}
		}

		try {
			res.end()
		}
		catch(ex) {
			console.error("res.end error: %s", ex.message)
		}
	}
};

