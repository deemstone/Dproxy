/*
 * 读取配置文件,并监视这个文件
 * 对其他模块提供 判断是否有记录的方法
 */

var fs = require('fs');

var map = {};
//初始化,读取列表 并监视文件
exports.init = function(){
	var fp = './map.conf';
	var config = fs.readFileSync(fp);
	parseConfig(config);
	fs.watchFile(fp, function(c,p) { update_iplist(); });
}

function parseConfig(config){
	//按照格式解析配置 把结果的数据结构存储在全局的map里面 其他方法使用
	
	//匹配出所有块的声明行  localhost {}
	//
	//循环处理每个块
	//
	//存储到redis库里  localhost/jspro/base.js  xnimg.cn/jspro/base.js -> ip:uri
}

exports.testURL = function(url){
	
};
