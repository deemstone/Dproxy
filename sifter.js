/*
 * 管理路由列表
 * 负责列表的操作和url的匹配
 */

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

	var unid;
	for(unid in rules){  //逐个添加到routeList中
		addToRoutelist(unid);
	}
	//TODO: domain的配置 rewrite
};
//停用一个分组
//把该组规则逐个从routeList删除
//TODO: 把配置删除
var disableGroup = exports.disableGroup = function(gname){
	if( !ruleGroups[gname] ){
		return false;  //没这个分组
	}
	var rules = ruleGroups[gname].rules || {};

	var unid;
	for(unid in rules){  //逐个添加到routeList中
		delFromRoutelist(unid);
	}
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


/*  辅助函数 */

//rule的 运行时唯一ID
//把rule添加到rules列表中,返回unid
var unid = 0;
function getUnid(rule){
	var i = ++unid;
	rule.unid = i;
	//TODO: 没有*通配符的优化
	rule.regex = buildRegex(rule.patten),
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

	var regex = new RegExp( patten.replace(/\*/g, '\.*') +'$' );
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
		rules.unshift(rule);  //添加到队列的头部
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
		for(var i; i<rules.length; i++){
			if(rules[i].unid == unid){
				rules.splice(i, 1);  //逐个查找,找到了就删除这个元素
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
var Config = require('./RParser.js');  //配置文件解析器

//定义一些常用目录
var dir_base = __dirname;  //程序根目录
var dir_conf = path.join(dir_base, '/conf');
var dir_rule = path.join(dir_conf, '/rule');
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
function loadGroupFile(filename){
	var name = path.basename(filename, '.rule');
	var fpath = path.join( dir_rule , filename);

	var content = fs.readFileSync(fpath, 'utf8');
	try{
		var group = Config.parse(content);
	}catch(e){
		console.error('配置文件解析出错: ', content);
		return -1;
	}


	//开始处理这个分组的信息
	var records = group.rules;
	group.rules = {};
	if(records){  //如果有这些项目
		records.forEach(function(rule){
			rule['groupname'] = name;
			var id = getUnid(rule);
			group.rules[id] = rule;
		});
	}
	ruleGroups[name] = group;
	
	//添加到文件列表 监视这个文件
	if( fileList.indexOf(filename) < 0 ){
		fileList.push(filename);
		if(process.platform.toLowerCase() != 'win32'){  //TODO: 目前windows版本的nodejs还不支持这个功能
			var fpath = path.join(dir_rule, filename);
			fs.watchFile(fpath, function(curr, prev){
				//console.info(curr, prev);
				if( Number(curr.mtime) == Number(prev.mtime) ) return;  //没有被modified,不用处理
				//---^ 这个Number将Date转换成整数来比较, 要不然两个object总是不相等
				reloadGroup(name);
			});
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
	var e = ruleGroups[groupname].isEnabled;
	disableGroup(groupname);
	//加载
	loadGroupFile( filename +'.rule' );
	//重新启用分组
	if(e) enableGroup(groupname);
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

//重写以后的初始化程序
var gHandlers = {
	'jicheng-static': {
		method: 'remote',
		ip: '10.2.16.123'
	},
	'chuanye-static': {
		method: 'remote',
		ip: '10.2.74.111'
	}
};

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

	//挨个匹配host中的规则
	var handler = false,
		r, g;
	var rules = routeList[url.host];
	for(var i=0; i<rules.length; i++){
		if( rules[i].regex.test(uri) ){
			r = rules[i];
			g = ruleGroups[r.groupname];
			if( r.handler in g.handlers ){  //是否在分组的handler里
				handler = g.handlers[ r.handler ];
			}else{
				handler = gHandlers[ r.handler ];
			}
			break;
		}
	}
	if( !handler ) return false; //没找到,返回false

	//如果匹配成功,找到对应的handler数据,并返回
	return handler;

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
function rewrite(uri, rule){

	var rs = uri.match( rule[0] );
	if(rs){
		uri = rule[1].replace(/\$\d/g, function(n){
			return rs[ n[1] ];  //n是$2类似的字符串
		});
	}

	return uri;
}
