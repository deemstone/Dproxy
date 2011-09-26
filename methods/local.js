var path = require('path'),
	fs = require('fs');

exports.serve = function(req, res, vector){
	var pipe = vector.pipe;  //输出的管道

	var local = vector.argument;
	if(local[ local.length-1 ] == '/'){  //目录
		var filepath = vector.path || '';  //handler的路径 + 请求过来url后面一段路径
		filepath = local + filepath;
	}else{  //直接返回这个文件
		var filepath = local;
	}

	var headers = {
		'Cache-Control': 'no-cache',
		'Content-Type': getMIME(filepath)
	};

	//准备向pipe写入的附加信息
	var appendix = {
		file: filepath,
		headers: headers
	};
	//console.log("<-- : [Local] ", filepath);

	path.exists(filepath, function(exists) {
		if(!exists) {
			res.writeHeader(404, {"Content-Type": "text/plain"});
			res.write("404 Not Found\n");
			res.end();

			appendix.status = 404;
			pipe.write('response', appendix);
			return;
		}
		
		fs.readFile(filepath, "binary", function(err, file) {
			if(err) {
				res.writeHeader(500, {"Content-Type": "text/plain"});
				res.write(err + "\n");
				res.end();

				appendix.status = 500;
			}else{
				res.writeHeader(200, {"Content-Type": "text/html"});
				res.write(file, "binary");
				res.end();

				appendix.status = 200;
			}
			pipe.write('reponse', appendix);
		});
	});
};

//判断请求文件的mime类型 只处理几个常用的类型
var mime_type = {
	'html': 'text/html',
	'htm': 'text/html',
	'css': 'text/css',
	'js': 'text/javascript',

	'gif': 'image/gif',
	'png': 'image/x-png',
	'jpeg': 'image/jpeg',
	'jpg': 'image/jpeg'
};
function getMIME(fpath){
	var ext = fpath.match( /\.[^\.\/]+$/ );  //最后一个.号后面的不包含.号和/号的字符串
	if(!ext){
		return 'text/plain';
	}
	ext = ext[0].substr(1);
	return mime_type[ ext ];
}
