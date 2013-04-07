/*
 * 不同版本nodejs的兼容性处理
 * 实现代码中应用最新的api，在此文件中对对老版本的node做兼容
 * 可以参考node官方：https://raw.github.com/joyent/node/v0.10.2/ChangeLog
 */
var mver = process.versions['node'].split('.').slice(0,2).join('');
mver = parseInt(mver);

if(mver < 8){
	require('fs').existsSync = require('path').existsSync;  //2012.01.23, Version 0.7.1 (unstable), a74354735ab5d5b0fa35a1e4ff7e653757d2069b
}
