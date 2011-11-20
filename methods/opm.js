var fastcgi = require("./node-fastcgi");

//TODO: Fastcgi服务没开?? 超时??


var agent = new fastcgi.Agent(4);  //每个fastcgi服务最多起几个连接
var reqs = 0;
var resps = 0;

agent.on("error", function(err) {
	console.log1("client.error", err);
});

exports.serve = function (req, res, vector) {
	console.log1('new opm request', vector);
	var options = {
		port: vector.port || '8080',
		host: vector.ip || '127.0.0.1',
		root: vector.root,
		filename: vector.uri,  //要重写后的uri
		server: {  //webServer的相关信息
			host: "127.0.0.1",
			port: '7070'
		}
	};
	agent.request(req, res, options, function(err, response) {
		if(err) console.log1(err);
	});
};
