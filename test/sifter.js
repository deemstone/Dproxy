//sifter相关测试代码

//@test rewrite测试
var rule = [/^\/[ab]?([0-9]+)\/(.*)/, "/$2" ];
uri = '/a23078/n/core/base-all.js';
//uri.match(rule[0]);
//["/a23078/n/core/base-all.js", "23078", "n/core/base-all.js"]
rewrite(uri, rule);

rule = [/^\/[ab]?([0-9]+)\/(.*)/, "/$2/$1/lalal.js" ];
