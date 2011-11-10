//sifter相关测试代码
//var sifter = require('../sifter.js');

//@test rewrite测试
function test_rewrite(){
	var rule = [/^\/[ab]?([0-9]+)\/(.*)/, "/$2" ];
	uri = '/a23078/n/core/base-all.js';
	//uri.match(rule[0]);
	//["/a23078/n/core/base-all.js", "23078", "n/core/base-all.js"]
	rewrite(uri, rule);

	rule = [/^\/[ab]?([0-9]+)\/(.*)/, "/$2/$1/lalal.js" ];
}


function test_matching(){
	var buildRegex = function(patten){
		var schar = ['.', '?'];
		schar.forEach(function(char){
			patten = patten.replace(new RegExp('\\'+ char, 'g'), '\\'+char)
		});

		var regex = new RegExp( patten.replace(/\*/g, '(.*)') +'$' );
		return regex;
	}

	var cases = [
		{
			patten: '/webpager*.css', 
			targets:[
				'/webpager/webpager-all-min.css',
				'/webpager/res/addbtn.png',
				'/webpager/im.js?v=5'
			]
		}
	];

	cases.forEach(function(cs, i){
		var reg = buildRegex(cs.patten);
		console.log(reg);
		cs.targets.forEach(function(url){
			var r = url.match(reg);
			if( ! r ){
				console.log('不能匹配这个URL : '+ url);
			}else{
				//r.shift();
				console.log(r.join(':'));
				console.log('ok: '+ url +' | path: '+ r[1]);
			}
		});
	});
}

test_matching();
