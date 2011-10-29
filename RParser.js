/*
 * 规则配置文件解析
 * 将字符串解析成程序内部可用的数据结构
 * 解析后的结构保存注释信息
 * 写回配置文件时带上原有的注释信息
 */

exports.parse = function(cStr){
	//解析出来的数据放在这里
	var obj = {
		enabled: false,
		handlers: {},
		settings: {},
		rules: {}
	};

	//建立一些常用的正则对象
	var RegExp_COMMENT = /(^|\s+)#.*/; //匹配所有注释(配置文件中的某一行) 可以用这个正则去掉所注释
	var RegExp_BLOCK = /\s*(.*)\s*{\s*$/;  //检测是否是一个Block开头 {符号前后可以有多个空格,一定是本行的结束
	var RegExp_BLOCK_OPEN = /^\s*{\s*$/;  //独占一行 BLOCK的开始
	var RegExp_BLOCK_END = /^\s*}\s*$/; //检测Block结束 一定独占一行
	var RegExp_BLANKLINE = /\s*/;  //空行

	var orig = cStr.split('\n');  //拆成一行一行的
	var path = [];  //正在解析的一行配置 所在的层级 path[0]就是当前正在解析的列表名
	var table = [];
	
	var i = 0;  //循环标示

	//实现方案(保留注释)
	//直接从配置文件生成sifter分组表格的初始结构
	//注释&空格信息 统一存储到一个列表中,按行号存储
	//每条记录都要对应的行号
	//序列化的过程,按行号取得对应的空格和注释
	//最后连成字符串
	
	//初始中间变量

	//从orig的第i行开始解析一个块(把整个配置文件当做一个大的块!!!)
	function parseBlock(){
		var table = [];
		var line;  //当前行的内容
		var r;  //用于临时存放正则匹配结果

		//从第i行开始逐行扫描,过程中碰到block的话,递归调用
		do{
			line = null;
			line = orig[i].replace(RegExp_COMMENT, '');  //删除注释

			console.log('['+ i +']', line);

			if( line == '' ){  //空行 
				i++;
				continue;
			}

			if( RegExp_BLOCK_END.test(line) ){  //一个块的结束
				i++;
				return table;

			}else if( RegExp_BLOCK_OPEN.test(line) ){  //这才发现,原来上一行是个块
				path.unshift( table.pop() ); //进入一个块的解析
				i++;
				table[ path[0] ] = arguments.callee();
				path.shift(); //这个块处理完了

			}else if(r = line.match( RegExp_BLOCK ) ){  //立马就是一个块的开始
				//把新block的名字提取出来
				path.unshift( r[1] );
				i++;
				table[ path[0] ] = arguments.callee();
				path.shift();
				
			}else{  //属于当前block的一个条目
				//去除行首的所有空格和\t
				line = line.replace(/^\s*/, '');
				table.push(line);
				i++;
			}
		}
		while(i < orig.length);  //把所有行遍历完就被迫结束

		return table;
	}


	return parseBlock();
};
