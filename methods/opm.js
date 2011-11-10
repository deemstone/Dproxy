var fastcgi = require("./node-fastcgi");

//TODO: Fastcgi服务没开?? 超时??

var options = {
	port: "8080",
	host: "127.0.0.1",
	root: "/Users/Lijicheng/htdocs/xn.static/",
	server: {
		host: "127.0.0.1",
		port: 8124
	}
};

var agent = new fastcgi.Agent(4, options);
var reqs = 0;
var resps = 0;

agent.on("error", function(err) {
	console.log1("client.error", err);
});

exports.serve = function (req, res) {
	console.log1('new opm request');
	agent.request(req, res, function(err, response) {
		if(err) console.log1(err);
	});
};
