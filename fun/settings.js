/*
 * 管理所有选项
 * 支持可视化的打印所有信息
 * 支持改变某选项之后执行特定任务
 * 支持配置的持久化存储和读取
 *
 * 内容:
 * {
 *    config: 用户手动配置的信息
 *    paths: 程序所处的路径
 * }
 */
var options = process.options;  //在options-parser中的结果
var path = require('path');
var fs = require('fs');
var Config = require('../lib/RParser.js');

//0.6版本的node 没有这个属性
path.sep = path.join('x', 'x')[1];
//将路径转换为unix标准正斜杠形式
path.toUnix = function(p){
	return p.replace(/\\/g, '/');
};

var config = {};  //配置文件的数据结构

//准备一些常用路径
var dir_base = path.resolve( __dirname + '/../');  //程序根目录
var paths = {
	base: dir_base,
	conf: path.resolve( dir_base + '/conf'),
	rule: path.resolve( dir_base + '/conf/rule')
};

/*
 * 关于配置文件路径:
 *
 * 对于dproxy,配置文件是一整个目录结构, 目录下有dproxy.conf配置文件 和 rule目录
 * 指定配置目录的方式有两种: 默认位置, 命令行参数指定
 * 默认位置有两个: 程序所在目录, 个人家目录的.dproxy目录
 * 命令行参数: dproxy会从指定的字符串中提取出路径作为配置路径
 * 所有命令行参数的优先级最高,如果想要使用同一个rule目录,在不同的端口开启多个服务,可以用port参数指定不同端口实现
 *
 * 优先级顺序 : 命令行参数 > .dproxy目录 > 程序所在目录 > 默认值
 */

//开始处理配置文件路径
var cfilepath = path.join(paths.conf , 'dproxy.conf');

//命令行指定的配置文件优先级最高
if(options.config){
	cfilepath = options.config;
	paths.conf = path.dirname(cfilepath);
	paths.rule = path.resolve(paths.conf + '/rule');
}else{
	//查看$HOME/.dproxy是否存在;从这里查找配置文件
	var home_dproxy = path.resolve(process.env['HOME'] + '/.dproxy');
	//如果还没有.dproxy就mkdir一个新的
	if( !fs.existsSync(home_dproxy) ){
		require('child_process').exec('cp -R '+ paths.base +'/conf ~/.dproxy');
	}
	var filepath = path.resolve(home_dproxy +'/dproxy.conf');
	if( !fs.existsSync(filepath) ){
		console.info();
		console.info('第一次使用，先看一下~/.dproxy目录');
		console.info('用sample创建一个dproxy.conf文件');
		console.info();
		console.info('  ^_^');
		console.info();
		process.exit(1);
	}
	paths.conf    = home_dproxy;
	cfilepath     = filepath;
	//接着判断这目录下面是否有个rule目录
	var home_rule = path.resolve(home_dproxy + '/rule');
	paths.rule   = home_rule;
}

//读取指定配置文件的内容,解析成键值对象
function readConfigFile(filepath){
	//console.log2('settings准备读取dproxy.conf文件');
	var content = fs.readFileSync(filepath, "utf8");
	var table = Config.parseTable(content);
	var config = {};

	//把键值对解析出来
	table.forEach(function(line){
		if( 'string' == typeof line ){
			//这是一行配置,不是一个块
			line = line.split(/\s+/);
			var key = line.shift();
			config[key] = line[0];  //暂时先只取一个字串吧  // (line.length > 1) ? line : line[0];
		}
	});

	//定义了一些全局handler
	if(table['handler']){
		config['handler'] = Config.buildHandlerList(table['handler']);
	}
	return config;
}

//输出结果
if(cfilepath){
	config = readConfigFile(cfilepath);
	//用命令行参数覆盖configfile的设置
	if( options.port ) config.port = options.port;
	if( options.editor ) config.editor = options.editor;
}
paths.configfile = cfilepath;

//用分组名字拼出该.rule文件的完整路径
exports.getRpath = function( groupname ){
	return paths.rule +'/'+ groupname +'.rule';
};

exports.config = config;
exports.paths = paths;  //统一文件路径变量
//console.log( config, paths);
