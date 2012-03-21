var net = require("net");
var fastcgi = require("../lib/fastcgi");
var dns = require("dns");
var events = require("events");
var url = require("url");
var inherits = require("util").inherits;
var HTTPParser = process.binding("http_parser").HTTPParser;
var __i = 0;

/*
* support X-SendFile
*/
var gid = 0;

function client(host, port) {
	var _fastcgi = this;
	var connection = new net.Stream();
	var htparser = new HTTPParser("response");
	var queue = [];
	var reqid = 0;
	var requests = {};
	var stats = {
		connections: 0
	}
	_fastcgi.stats = stats;

	var port = port;  //fastcgi服务的端口号,这里是opm服务监听的端口号
	var host = host;  //opm地址
	//以上两行信息在connect()方法中用到
	var shost,  //前端web服务器的ip
		sport,
		sname,
		keepalive = false,
		sredirectstatus = null;

	
	connection.params = [
		["SERVER_PROTOCOL", "HTTP/1.1"],
		["GATEWAY_INTERFACE", "CGI/1.1"],
		["SERVER_SOFTWARE", "node.js"],
		["SERVER_NAME", "_"]
	];

	//var phprx = new RegExp("Status: (\\d{3}) (.*?)\\r\\n");
	var _current = null;
	
	connection.setNoDelay(true);
	connection.setTimeout(0);
	connection.writer = new fastcgi.writer();
	connection.parser = new fastcgi.parser();
	connection.parser.encoding = "binary";
	connection.writer.encoding = "binary";
	
	connection.parser.onHeader = function(header) {
		_current = requests[header.recordId];
	}
	
	connection.parser.onBody = function(buffer, start, len) {
		if(!_current.fcgi.body) {
			//_current.fcgi.headers = {};

			//准备输出相关配置信息
			var opts = connection.options
			var responseText = buffer.toString('ascii', start, len);

			//临时只把状态码取出来  临时解决!!!!
			var rgx_status = /Status: (\d+)/; 
			var rgx_type = /Content-Type: (.+)$/m ; 

			var r = responseText.match(rgx_status)[1];
			var status = r || '500';  //如果没有指定状态码,认为是opm内部出错了

			//其他header字段
			var headers = {};
			var t = responseText.match(rgx_type);
			if(t){ //例如404的请求没有content-type
				headers["Content-Type"] = t[1];
			//var content_type = t || 'text/html';
			}

			_current.resp.writeHeader(status, headers);
			
			//method的标准输出
			var opts = connection.options
			_current.cb(false, {status: status, opm: {host:host, port:port, root: opts.root}});
			
			try {
				_current.resp.write(buffer.slice(start, start + len));
			}
			catch(ex) {
				_current.cb(ex);
			}
			_current.fcgi.body = true;  //标示下一次onBody事件得到的数据是HTTP的body
		} else {
			try {
				  var output = new Buffer(len);  //为了解决那个代码乱续的问题,buffer这个变量会重用的,所以必须copy出来用于输出
				  buffer.copy(output, 0, start, start + len);  //更本质的问题是,这两个stream的读写(fastcgi连接和web服务连接)是异步的
				  _current.resp.write(output);
			}
			catch(ex){
				_current.cb(ex);
			}
		}
	}
		
	connection.parser.onRecord = function(record) {
		//console.log('record : ', record);
		var recordId = parseInt(record.header.recordId);
		var request = requests[recordId];
		switch(record.header.type) {
			case fastcgi.constants.record.FCGI_END:
				request.fcgi.status = record.body;
				if(record.body.status == 0 && record.body.protocolStatus == 0) {
					request.resp.end();
					delete requests[recordId];
					request.cb(null, record);
				}
				else {
					// error from fastcgi app - return 500;
					// if we want to use this (php doesn't) we need to buffer the whole response and wait to inspect this before sending any headers. that's just nasty!!
				}
				if(keepalive && queue.length > 0){
					next();
				}
				break;
			default:
				break;
		}
	};
	
	connection.parser.onError = function(err) {
		_fastcgi.emit("error", err);
	};
	
	if(sredirectstatus) {
		connection.params.push(["REDIRECT_STATUS", sredirectstatus.toString()]);
	}

	connection.ondata = function (buffer, start, end) {
		connection.parser.execute(buffer, start, end);
	};
	
	connection.addListener("connect", function() {
		connection.fd = true;  //标识这个socket处于连接状态
		stats.connections++;
		if(queue.length > 0) {
			next();
		}
	});
	
	connection.addListener("timeout", function() {
		connection.end();
	});
	
	connection.addListener("end", function() {
		connection.fd = false;  //标识这个socket没有连接
		if(queue.length > 0) {
			process.nextTick(_fastcgi.connect);
		}
	});
	
	connection.addListener("error", function(err) {
	//TODO: 稳定性,连接出错应该同时断开浏览器的连接
		_fastcgi.emit("error", err);
		connection.end();
	});
	
	this.connect = function() {
		if(!connection.fd) connection.connect(port, host);
	}
	
	this.end = function() {
		connection.end();
	}
	
	function next() {
		var request = queue.shift();
		var req = request.req;
		var options = req.options;  //每个req都伴随一个options,每次请求都不一样
		
		connection.options = options;
		req.url = url.parse(req.url);
		shost = options.server.host || "127.0.0.1";  //webServer Info
		sport = options.server.port || 80;
		sname = options.server.name || "localhost";

		req.resume();
		var params = connection.params.slice(0);
		params.push(["DOCUMENT_ROOT", options.root]);
		params.push(["SERVER_ADDR", shost.toString()]);
		params.push(["SERVER_PORT", sport.toString()]);
		params.push(["REMOTE_ADDR", req.connection.remoteAddress]);
		params.push(["REMOTE_PORT", req.connection.remotePort.toString()]);
		params.push(["SCRIPT_FILENAME", options.root + options.filename]);
		params.push(["QUERY_STRING", req.url.query || ""]);
		params.push(["REQUEST_METHOD", req.method]);
		params.push(["SCRIPT_NAME", req.url.pathname]);
		params.push(["REQUEST_URI", req.url.pathname + (req.url.query || "")]);
		params.push(["DOCUMENT_URI", req.url.pathname]);

		params.push(["REQUEST_FILENAME", options.root + options.filename]);  //rewrite重写后的uri

		//TODO: probably better to find a generic way of translating all http headers on request into PHP headers
		if("referer" in req.headers){
			params.push(["HTTP_REFERER", req.headers["referer"]]);
		}
		if("user-agent" in req.headers) {
			params.push(["HTTP_USER_AGENT", req.headers["user-agent"]]);
		}
		if("accept-encoding" in req.headers) {
			params.push(["HTTP_ACCEPT_ENCODING", req.headers["accept-encoding"]]);
		}
		if("cookie" in req.headers) {
			params.push(["HTTP_COOKIE", req.headers["cookie"]]);
		}
		if("connection" in req.headers) {
			params.push(["HTTP_CONNECTION", req.headers["connection"]]);
		}
		if("accept" in req.headers) {
			params.push(["HTTP_ACCEPT", req.headers["accept"]]);
		}
		if("host" in req.headers) {
			params.push(["HTTP_HOST", req.headers["host"]]);
		}
		if("content-type" in req.headers) {
			params.push(["CONTENT_TYPE", req.headers["content-type"]]);
		}
		if("content-length" in req.headers) {
			params.push(["CONTENT_LENGTH", req.headers["content-length"]]);
		}

		console.log2('<fast-cgi params>', params);
		//console.log2('<fastcgi-req>', req.headers);

		try {
			connection.writer.writeHeader({
				"version": fastcgi.constants.version,
				"type": fastcgi.constants.record.FCGI_BEGIN,
				"recordId": request.id,
				"contentLength": 8,
				"paddingLength": 0
			});
			connection.writer.writeBegin({
				"role": fastcgi.constants.role.FCGI_RESPONDER,
				"flags": keepalive?fastcgi.constants.keepalive.ON:fastcgi.constants.keepalive.OFF
			});
			connection.write(connection.writer.tobuffer());
			connection.writer.writeHeader({
				"version": fastcgi.constants.version,
				"type": fastcgi.constants.record.FCGI_PARAMS,
				"recordId": request.id,
				"contentLength": fastcgi.getParamLength(params),
				"paddingLength": 0
			});
			connection.writer.writeParams(params);
			connection.write(connection.writer.tobuffer());
			connection.writer.writeHeader({
				"version": fastcgi.constants.version,
				"type": fastcgi.constants.record.FCGI_PARAMS,
				"recordId": request.id,
				"contentLength": 0,
				"paddingLength": 0
			});
			connection.write(connection.writer.tobuffer());
			switch(req.method) {
				case "GET":
					connection.writer.writeHeader({
						"version": fastcgi.constants.version,
						"type": fastcgi.constants.record.FCGI_STDIN,
						"recordId": request.id,
						"contentLength": 0,
						"paddingLength": 0
					});
					connection.write(connection.writer.tobuffer());
					break;
				case "PUT":
					request.cb(new Error("not implemented"));
					break;
				case "POST":
					req.on("data", function(chunk) {
						connection.writer.writeHeader({
							"version": fastcgi.constants.version,
							"type": fastcgi.constants.record.FCGI_STDIN,
							"recordId": request.id,
							"contentLength": chunk.length,
							"paddingLength": 0
						});
						connection.writer.writeBody(chunk);
						connection.write(connection.writer.tobuffer());
					});
					req.on("end", function() {
						connection.writer.writeHeader({
							"version": fastcgi.constants.version,
							"type": fastcgi.constants.record.FCGI_STDIN,
							"recordId": request.id,
							"contentLength": 0,
							"paddingLength": 0
						});
						connection.write(connection.writer.tobuffer());
					});
					break;
				case "DELETE":
					request.cb(new Error("not implemented"));
					break;
			}
		}
		catch(ex) {
			console.log('fastcgi返回错误:', ex);
			connection.end();
			request.cb(ex);
		}
	}
	
	this.request = function(req, resp, cb) {
		requests[reqid] = {
			"id": reqid,
			"req": req,
			"resp": resp,
			"cb": cb,
			"fcgi": {}
		};
		queue.push(requests[reqid]);
		reqid++;
		if(reqid == 65535) {
			reqid = 0;
		}
		if(!connection.fd) {  //fd这个属性在新版的Node中没有了...手动加了一个
			req.pause();
			_fastcgi.connect();
		}
		//queue长度为1时,也可能正在处理前一个一个请求
		//else if(keepalive && queue.length == 1){
		//	next();
		//}
	}
}
inherits(client, events.EventEmitter);

function agent(nc) {
	var _agent = this;
	this.pool = {};  // key -> clients

	function createClients(ip, port){
		var i = nc;
		var worker = {
			current : 0,
			clients : []
		};

		while(i--) {
			var c = new client(ip, port);  //options参数改为每次请求的时候传入
			c.on("error", function(err) {
				_agent.emit("error", err);
			});
			worker.clients.push(c);
		}
		return worker;
	}

	//现在改成options每次都由opm模块传入
	this.request = function(req, resp, options, cb) {
		
		//首先判断指向的这个ip-port是否已经有workers了
		var host = options.host;
		var port = options.port;

		var key = host +'-'+ port;
		if(!this.pool[key]){
			this.pool[key] = createClients(host, port);
		}

		var worker = this.pool[key];
		var client = worker.clients[worker.current];

		//client.setParams(options);  //手动配置client这次请求的各种参数
		req.options = options;
		client.request(req, resp, cb);
		//console.log(req);

		if(worker.current == nc - 1) {
			worker.current = 0;
		}
		else {
			worker.current++;
		}
	}
}
inherits(agent, events.EventEmitter);

exports.Client = client;
exports.Agent = agent;
