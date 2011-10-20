//routeList测试
//
var routeList = require('../routeList.js');

console.log( routeList.routeList );
console.log( routeList.rules );

console.log( routeList.listGroups() );

//测试buildRegex
console.log( routeList.buildRegex('/a*/jspro/xn.app.*.js') );
console.log( routeList.buildRegex('/a*/webpager/*.js') );
console.log( routeList.buildRegex('/a20457/webpager/xn.app.webpager.js') );
