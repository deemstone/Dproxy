/*
 * 管理路由列表
 * 负责列表的操作和url的匹配
 */
var env = require('./settings.js');
var config = env.config;
var paths = env.paths;

/* -- 规则表数据结构 -- */

//过滤请求的route总表
//一个请求过来,拿到url就是查这个表挨个匹配
var routeList = {};

//支持分组
//从配置文件加载上来并处理过的分组数据结构
// groupName -> group
var ruleGroups = {};

//TODO: 加载配置的时候需要把所有条目在这里建立索引
//方便通过unid直接获取一条rule的全部信息
// unid -> rule
var rules = {};

var sKeys = ['rewrite', 'default'];  //目前还没啥用
//rule的数据结构
//{unid: 3, groupname: 'wpi', domain: 'wpi.renren.com', patten: '', regex: '', handler: 'handler', on: true}

/* -- 对外借口定义 -- */

//启用一个分组
//把组内的规则逐个添加到routeList中
//把配置的rewrite写到routeList中
var enableGroup = exports.enableGroup = function(gname){
	if( !ruleGroups[gname] ){
		return false;  //没这个分组
	}
	var rules = ruleGroups[gname].rules || {};
	var settings = ruleGroups[gname].settings || {};

	var unid;
	for(unid in rules){  //逐个添加到routeList中
		addToRoutelist(unid);
	}
	for(unid in settings){
		addToRoutelist(unid);
	}
	ruleGroups[gname].enabled = true;
};
//停用一个分组
//把该组规则逐个从routeList删除
//TODO: 把配置删除
var disableGroup = exports.disableGroup = function(gname){
	if( !ruleGroups[gname] ){
		return false;  //没这个分组
	}
	var rules = ruleGroups[gname].rules || {};
	var settings = ruleGroups[gname].settings || {};

	var unid;
	for(unid in rules){  //逐个添加到routeList中
		delFromRoutelist(unid);
	}
	for(unid in settings){
		delFromRoutelist(unid);
	}
	ruleGroups[gname].enabled = false;
};
//启用一条规则
var enableRule = exports.enableRule = function(unid){
	//只是简单的更改rule里的enabled字段
	if(unid in rules){
		rules[unid].on = true;
	}
};
//停用一条规则
var disableRule = exports.disableRule = function(){
	if(unid in rules){
		rules[unid].on = false;
	}
};
//添加一条规则
//先取个号 unid
//添加到分组,
//如果分组正启用状态,添加到routeList
var addRule = exports.addRule = function(gname, record){
	if( !ruleGroups[gname] ){
		return false;  //没这个分组
	}
	var group = ruleGroups[gname];
	//组装这个rule
	var rule = {
		groupname: gname,
		domain: record.domain,
		patten: record.patten,
		handler: record.handler,
		on: true  //默认是启用状态
	};

	//取个号,添加到group中
	var unid = getUnid(rule);
	if(!group.rules) group.rules = {};
	group.rules[unid] = rule;

	//如果分组正启用,添加到routeList
	if(group.enabled){
		addToRoutelist(unid);
	}
};
//删除一条规则
//从routeList删除,从对应分组删除
var delRule = exports.delRule = function(unid){
	if(!rules[unid]) return false;
	var rule = rules[unid];
	var group = ruleGroups[rule.groupname];

	//如果分组正启用
	if(group.enabled){
		delFromRoutelist(unid);
	}
	//从分组中删除
	delete group.rules[unid];
};
//获取分组列表(包括启用状态)
var listGroups = exports.listGroups = function(){
	var list = {};
	for(var gname in ruleGroups){
		list[gname] = ruleGroups[gname].enabled;
	}
	return list;
};
//返回分组的详细信息
exports.getGroupContent = function(name){
	//TODO: clone一份新的
	return ruleGroups[name];
};
//返回routeList内容
exports.getRouteList = function(){
	//TODO: clone
	return routeList;
};


/*  辅助函数 */

//rule的 运行时唯一ID
//把rule添加到rules列表中,返回unid
var unid = 0;
function getUnid(rule){  //也可能是setting
	var i = ++unid;
	rule.unid = i;
	if(rule.key){  //这是一跳设置
		
	}else{
		//TODO: 没有*通配符的优化
		rule.regex = buildRegex(rule.patten);
	}
	rules[i] = rule;
	return i;
}
//从通配符的patten生成可以匹配的正则对象
//exp: /webpager/*
function buildRegex(patten){
	var schar = ['.', '?'];
	schar.forEach(function(char){
		patten = patten.replace(new RegExp('\\'+ char, 'g'), '\\'+char)
	});

	var regex = new RegExp( '^'+ patten.replace(/\*/g, '(.*)') +'$' );
	return regex;
}
exports.buildRegex = buildRegex;
// ----- routeList操作相关
//不管是不是已经有,取到域名
function getDomainRules(domain){
	if(!routeList[domain]){
		routeList[domain] = [];
	}

	return routeList[domain];
}
//设置一个域名的配置
function setDomainParam(domain, key, value){
	var rules = getDomainRules(domain);
	rules[key] = value;
}
//把一条记录添加到routeList指定域下
//通过参数unid从rules列表中取rule的数据结构
function addToRoutelist(unid){
	var rule = rules[unid];
	var domain = rule.domain.split(',');  //如果是多域名的配置
	domain.forEach(function(d){
		var rules = getDomainRules(d);
		if(rule.key){  //这是个设置,加入到对应域名下的key属性中
			rules[rule.key] = rules[rule.key] || [];
			rules[rule.key].unshift(rule);
		}else{
			rules.unshift(rule);  //添加到队列的头部
		}
	});
}
//从routeList中删除unid的记录
//依赖rules索引列表
//从rules中查到rule
function delFromRoutelist(unid){
	var rule = rules[unid];
	var domain = rule.domain.split(',');  //如果是多域名的配置

	//逐个domain的处理
	domain.forEach(function(d){
		var rules = getDomainRules(d);
		if(rule.key){  //要删除的是一条设置
			rules = rules[ rule.key ];  //让下面的for循环在key这个属性中查找
		}

		for(var i=0; i<rules.length; i++){
			if(rules[i].unid == unid){
				var s = rules.splice(i, 1);  //逐个查找,找到了就删除这个元素
				return; //然后结束for循环
			}
		}
	});
}

//遍历一个分组内的所有规则
//传入参数为  domain groupName unid rule{}
//function forEachRule(group, fun){
//}


//查看一个分组是否是启用状态
function isEnabled(group){
	return groups[group].isEnabled;
}


/* ---------- 配置文件处理和初始化 ------------- */
var fs = require('fs');
var path = require('path');
var Config = require('../lib/RParser.js');  //配置文件解析器

//定义一些常用目录
//var dir_conf = path.join( paths.conf );
var dir_rule = paths.rule;
var fileList = [];

//保存一个分组的规则到相应的文件
//function saveGroup(group){
//	var rules = groups[group];
//	//if( !rules.isModified ) return 0; //没有修改过的话不需要保存
//	//覆盖写入
//	var fpath = path.join(dir_rule, group +'.rule');
//	rules = JSON.stringify(rules, '', '\t'); //这里\t格式话输出的JSON
//	fs.writeFileSync( fpath, rules, 'utf8');
//}

//只负责加载指定的配置到groups中
//完全同步的函数
//@param filename{str} 带扩展名的文件名字符串
//@param enable{bool} 是否加载完成后启用分组
function loadGroupFile(filename, enable){
	var name = path.basename(filename, '.rule');
	var fpath = path.join( dir_rule , filename);

	var content = fs.readFileSync(fpath, 'utf8');
		console.log2('读取配置文件：', fpath);
	try{
		var group = Config.parse(content);
	}catch(e){
		console.error('配置文件解析出错: ', content);
		return -1;
	}

	console.log3('解析结果： ', group);
	//开始处理这个分组的信息
	var records = group.rules;  //处理rules列表
	group.rules = {};
	if(records){  //如果有这些项目
		records.reverse();
		//倒序遍历,因为enable的时候又倒了一遍,
		//为了保证配置里面的顺序在check的时候保持一样的顺序
		
		records.forEach(function(rule){
			rule['groupname'] = name;
			var id = getUnid(rule);
			group.rules[id] = rule;
		});
	}
	var settings = group.settings;  //处理settings列表
	group.settings = {};
	if(settings){  //如果有这些项目
		settings.forEach(function(s){
			s['groupname'] = name;
			var id = getUnid(s);
			group.settings[id] = s;
		});
	}
	ruleGroups[name] = group;

	if(group.enabled || enable) enableGroup(name);  //配置里写了启用 或者明确用参数指定启用
	
	//添加到文件列表 监视这个文件
	if( fileList.indexOf(filename) < 0 ){
		fileList.push(filename);

		function onFileEdit(curr, prev){
			//console.info(curr, prev);
			if( Number(curr.mtime) == Number(prev.mtime) ) return;  //没有被modified,不用处理
			//---^ 这个Number将Date转换成整数来比较, 要不然两个object总是不相等
			reloadGroup(name);
		}
		var fpath = path.join(dir_rule, filename);

		if(process.platform.toLowerCase() != 'win32'){  //TODO: 目前windows版本的nodejs得用这个特殊的函数
			fs.watchFile(fpath, onFileEdit);
		}else{
			fs.watch(fpath, onFileEdit);
		}
	}
}
//把指定分组保存到磁盘
//exports.save = function(group){
//	if(!group || group == '*'){  //保存所有分组
//		for(var i in groups){
//			saveGroup(i);
//		}
//		return;
//	}
//	if( !(group in groups)) return;
//	saveGroup(group);
//};

//重新加载一个分组文件的规则列表
var reloadGroup = exports.reloadGroup = function(groupname){
	//停用分组
	var e = ruleGroups[groupname].enabled;
	disableGroup(groupname);
	//加载
	loadGroupFile( groupname +'.rule' , e);
	//重新启用分组
	//if(e) enableGroup(groupname);
};

//初始化此模块时处理文件系统上的配置
//(function(){
//	//程序退出的时候保存groups的启用状态
//	process.on('exit', function(){
//		exports.save();
//		var usedGroups = [];
//		for(var i in groups){
//			if(groups[i].isEnabled) usedGroups.push(i);
//		}
//		conf.enabledGroups = usedGroups;
//		fs.writeFileSync(file_conf, JSON.stringify(conf), 'utf8');
//	});
//})();

//一些全局Handler
//var gHandlers = {
//	'jicheng-static': {
//		method: 'remote',
//		ip: '10.2.16.123'
//	},
//	'chuanye-static': {
//		method: 'remote',
//		ip: '10.2.74.111'
//	}
//};
var gHandlers = config.handler || {};

(function(){
	//从磁盘上加载分组配置 遍历每个分组完成初始化
	var rs = fs.readdirSync(dir_rule);
	rs.forEach(function(filename,i){
		if( ! /\.rule$/.test(filename) ) return;  //扩展名必须是rule的文件才是配置文件
		loadGroupFile(filename);
	});

	exports.routeList = routeList;
	exports.rules = rules;
})();


/*
 * 分发url
 * 如果没有匹配的规则,返回false
 * 找到匹配的规则,返回对应的handler数据
 * 参数,只关心url
 */
var URL = require('url');
exports.check = function(url){
	var url = URL.parse(url);
	var uri = url.href.replace(/http\:\/\/[^\/]+/,'');

	//查找host是否存在于routeList中
	if(!(url.host in routeList)) return false;

	//查看是否有rewrite
	var rewrite = routeList[url.host]['rewrite'];
	if( rewrite && rewrite[0]){
		uri = rewriteUri(uri, rewrite[0].param);  //用列表中最上面一条设置
	}

	//挨个匹配host中的规则
	var target = false;
	var r;  //中间变量,每次匹配结果
	var rules = routeList[url.host];
	for(var i=0; i<rules.length; i++){
		if( r = uri.match(rules[i].regex) ){
			target = rules[i];
			break;
		}
	}

	var group, handler = false;
	if( target ){  //上面匹配成功,找到了一条规则数据
		group = ruleGroups[target.groupname];
		handler = target.handler;
	}else{  //查看是否有default
		var proxy_pass = routeList[url.host]['default'];
		if(proxy_pass && proxy_pass[0]){  //也是取最上面一条
			group = ruleGroups[ proxy_pass[0].groupname ];
			handler = proxy_pass[0].param; //配置文件里返回的都是数组,临时这么用吧
			r = [uri];  //local需要的这个参数 match 如果是default的话,match就是整个uri 
		}
	}
	
	console.log1('匹配的结果 : ', handler);
	if(handler){  //用上一步得到的handler名字取到handler数据
		if( typeof handler == 'object'){
			
		}else if( handler in group.handlers ){  //是否在分组的handler里
			handler = group.handlers[ handler ];
		}else{
			handler = gHandlers[ handler ];
		}

		return {
			handler: handler,
			match: r,  //r就是上面匹配的match的结果,是个数组
			uri: uri  //rewrite之后的路径
		};
	}else{
		return false; //没找到,返回false
	}


	/*
	 * 最终传递给handler的vector结构
	 *
	 * {
	 *  	uri: ,
	 *  	path: ,
	 *  	handler: 'handler类型的名字',
	 *  	argument: '传递给handler的参数',
	 *  	pipe: '输出管道'
	 * }
	 */
};

//实现nginx类似的rewrite
function rewriteUri(uri, rule){

	var rs = uri.match( rule[0] );
	if(rs){
		uri = rule[1].replace(/\$\d/g, function(n){
			return rs[ n[1] ];  //n是$2类似的字符串
		});
	}

	return uri;
}
