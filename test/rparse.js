var fs = require('fs');
var assert = require('assert');

var Config = require('../RParser.js');

//要的就是这个结果!!!
var target = []; 
target['handler'] = [ 
		'huihua-static  remote {}',
		'wentao-static  remote {}',
		'jicheng-static  remote [ ip: 10.2.16.123; ]' 
	];
target['oneline'] = [ 
		'http://www.baidu.com  jicheng-static',
		'http://wentao.xnimg.cn/* wentao-static' 
	];
target['s.xnimg.cn,a.xnimg.cn'] = [ 
		'rewrite   ^/[ab]?([0-9]+)/(.*)   /$2',
		'default  jicheng-static',
	];
target['s.xnimg.cn,a.xnimg.cn']['location'] = [ 
		  '/jspro/xn.app.webpager.js   jicheng-static',
		  '/jspro/pager-channel6.js',
		  '/n/core/modules/webpager/webpager.css',
		  '/n/core/res/webpager/cssimg/webpager.css' 
		];
target['wpi.renren.com'] = [ 
		'/wtalk/ime.htm?v=5  jicheng-static' 
	];

var filepath = '../conf/rule/webpager.rule';
fs.readFile(filepath, "utf8", function(err, file) {
	if(!err) {

		var string = file;
		var rs = Config.parse( string );
		console.dir(rs);

		assert.deepEqual(rs, target, '还得再努力一下!!');
	}else{
		console.log(err);
	}
});
