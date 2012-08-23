var path = require('path'),
	fs = require('fs');

exports.serve = function(req, res, vector){
	var pipe = vector.pipe;  //输出的管道
	var match = vector.match.pop();  //取出patten里面最后一个*号匹配的那段字符串

	if(vector.file){
		var filepath = vector.file;

	}else if(vector.root){
		var apath = vector.uri.replace(/\?.*$/, '');  //去掉末尾的?查询字串
		var filepath = path.join(vector.root, apath);
	}else if(vector.folder){
		var url = req.url;
		var relpath = url.substr( url.indexOf(match) );  //url里面被*号匹配的直到串尾的字串(相对路径)
		relpath = relpath.replace(/\?.*$/, '');  //去掉末尾的?查询字串

		var filepath = path.join(vector.folder, relpath);

	}else{
		//啥也没指定????
		//直接404!!
	}
	console.log2('local要取这个本地文件', filepath);

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
			res.write("Dproxy: 404 Not Found\n");
			res.end();

			appendix.status = 404;
			pipe.write('response', appendix);
			return;
		}
		
		console.log2('local准备读取文件');
		fs.readFile(filepath, "binary", function(err, file) {
			console.log2('local终于读到了这个文件');
			if(err) {
				res.writeHeader(500, {"Content-Type": "text/plain"});
				res.write(err + "\n");
				res.end();

				appendix.status = 500;
			}else{
				res.writeHeader(200, headers);
				res.write(file, "binary");
				console.log2('local文件write完成');
				res.end();

				appendix.status = 200;
			}
			pipe.write('response', appendix);
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
	var ext = path.extname( fpath );  //最后一个.号后面的不包含.号和/号的字符串
	if(!ext){
		return 'text/plain';
	}
	ext = ext.substr(1);
	//ext = ext[0].substr(1);
	
	//ext = ext[0].substr(1);
	return mime_type[ ext ];
}
