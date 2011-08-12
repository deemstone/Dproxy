var path = require('path'),
	fs = require('fs');

exports.serve = function(req, res, vector){
	var local = vector.handler.asset;
	if(local[ local.length-1 ] == '/'){  //目录

		var filepath = vector.path || '';  //handler的路径 + 请求过来url后面一段路径
		filepath = local + filepath;

	}else{  //直接返回这个文件
		var filepath = local;
	}
	console.log("<-- : [Local] ", filepath);

	path.exists(filepath, function(exists) {
		if(!exists) {
			res.writeHeader(404, {"Content-Type": "text/plain"});
			res.write("404 Not Found\n");
			res.end();
			return;
		}
		
		fs.readFile(filepath, "binary", function(err, file) {
			if(err) {
				res.writeHeader(500, {"Content-Type": "text/plain"});
				res.write(err + "\n");
				res.end();
				return;
			}
			res.writeHeader(200, {"Content-Type": "text/html"});
			res.write(file, "binary");
			res.end();
		});
	});
}
