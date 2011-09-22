//临时使用的一个数据格式

var staticServer = {
	descript: '',
	exact: {
		//'/a20933/n/core/base-all.js': 'local:/Users/Lijicheng/htdocs/xn.static/n/core/base-all.js',
		//'/a20933/jspro/xn.app.addFriend.js': 'local:/Users/Lijicheng/htdocs/xn.static/jspro/xn.app.addFriend.js',
		//'/a20993/jspro/base-old.js': 'http://s.xnimg.cn/a20993/jspro/base.js',
		//'/a20993/jspro/xn.app.addFriend.js': 'remote:10.2.16.161'
	},
	rewrite: ["^\/[ab]?([0-9]+)\/(.*)", "/$2" ],
	location: {
		//'/webpager/': 'remote:10.2.16.123'//,
		'/jspro/xn.app.webpager.js': 'remote:10.2.16.123',
		'/jspro/pager-channel6.js': 'remote:10.2.16.123'
		//'/apps/alumna/': 'local:/Users/Lijicheng/htdocs/xn.static/apps/alumna/',
		//'~ /apps/alumna/(.*)\.js': 'local:/Users/Lijicheng/htdocs/xn.static/apps/alumna/$1.js'  //还没有实现
	}//,
	//domain: 'remote:10.2.74.90'
};

module.exports = {
	'xnimg.cn': staticServer,
	's.xnimg.cn': staticServer,
	'wpi.renren.com': {
		exact: {
			'/wtalk/ime.htm?v=5': 'local:/Users/Lijicheng/htdocs/ime.htm'
		}
	},
	'test.cooer.net': {
		//domain: 'remote:10.2.16.123'
	},
	'share.renren.com': {
		//domain: 'remote:10.3.16.13'
	},
	'status.renren.com': {
		//domain: 'remote:10.3.18.206'
	}
};
