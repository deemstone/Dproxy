/*
 * 调用build编译工程文件
 */
//var builder = require('D:/Tools/build/');

//暂时不支持配置
try{
var builder = require('/Users/Lijicheng/works/build');
}catch(e){
var builder = {};
}
var path = require('path');

exports.serve = function(req, res, vector){
	var pipe = vector.pipe;  //输出的管道
	var prefix = vector.prefix;  // /webpager/
	var pkgroot = vector.root;
	
	var entry = vector.uri.replace( prefix, '');
	//entry = path.join(path.dirname(entry), path.basename(entry, '.js')); 
	//vector中需要提供的信息:
	//href: 完整链接
	//uri: 去掉域名的部分
	//match: 通配符匹配
	//

	//bundle过程参数
	var options = {
		prefix: 'webpager',  //所有模块命名的id前缀(objectjs中的域概念)
		wrapper: 'objectjs',  //适配浏览器端环境
		root: pkgroot,  //pkg根目录
		src: './src',
		domains: { //管理代码的域
			'shared': '../shared',  //基于src目录的相对路径
			'tpl': '../tpl_build'
		}
	};

//这里只能提供访问路径,具体定位到工程中的哪个入口文件,只有了解工程结构才能计算出来

	
	res.writeHeader(200, {'Content-type': 'text/javascript'});
	res.end( builder.bundle(entry, options) );
	pipe.write('response', {status: 200});
};
