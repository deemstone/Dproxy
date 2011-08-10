var path = require('path'),
	fs = require('fs');

exports.serve = function(req, res, filepath){
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
			res.writeHeader(200, {"Content-Type": "text/plain"});
			res.write(file, "binary");
			res.end();
		});
	});
}
