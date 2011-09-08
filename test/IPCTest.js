var assert = require('assert');
var IPC = require('../IPCAgent.js');

var TESTS_parseMsg = [
	{
		testcase: '$cmd1:param::{"apdx1":45678}',
		target: {cmds: ['cmd1'], param: 'param', appendix: {apdx1:45678}},
		message: '正常的一层cmd,有参数,有附加信息'
	},
	{
		testcase: '$cmd1:$cmd2:param::{"apdx1":45678}',
		target: {cmds: ['cmd1', 'cmd2'], param: 'param', appendix: {apdx1:45678}},
		message: '多个cmd,有参数,有附加信息'
	},
	{
		testcase: '$cmd1:$cmd2:param',
		target: {cmds: ['cmd1', 'cmd2'], param: 'param', appendix: null},
		message: '多个cmd,有参数,有附加信息'
	},
	{
		testcase: '$cmd1',
		target: {cmds: ['cmd1'], param: null, appendix: null},
		messgae: '只有一个cmd,没有参数'
	}
];

TESTS_parseMsg.forEach(function(v, i){
	console.log('<testcase> ', v.testcase);
	var rs = IPC.parseMsg(v.testcase);
	console.log('<result> ', rs);
	assert.deepEqual( rs , v.target, v.message);
});

var TESTS_buildMsg = [
	{
		testcase: {cmds: ['cmd1'], param: 'world', appendix: 'abcdefg'},
		target: '$cmd1:world::abcdefg',
		message: '全都有,appendix是字符串'
	},
	{
		testcase: {cmds: ['cmd1'], param: null, appendix: {apx1:123, apx2:'456'}},
		target: '$cmd1::{"apx1":123,"apx2":"456"}',
		message: '全都有,appendix是JSON'
	},
	{
		testcase: {cmds: ['cmd1', 'cmd2'], param: null, appendix: null},
		target: '$cmd1:$cmd2',
		message: '只有两个cmd'
	}
];

TESTS_buildMsg.forEach(function(v, i){
	console.log('<testcase> ', v.testcase);
	var rs = IPC.buildMsg(v.testcase);
	console.log('<result> ', rs);
	assert.deepEqual( rs , v.target, v.message);
});

console.log('可以啦!');
