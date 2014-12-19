/**
 * Created by Administrator on 14-10-29.
 */
/**
 * 消息中心模块插件
 *   实现与服务器的WebSocket 消息发送与接收
 */
define(function(require, exports, module){
	// 将金额字符串转为正体格式的方法
	var _getStandarAmount, _getStandarAmountWithoutUnit;
	var standardizedMap = {
		0: "零",
		1: "壹",
		2: "贰",
		3: "叁",
		4: "肆",
		5: "伍",
		6: "陆",
		7: "柒",
		8: "捌",
		9: "玖"
	};

	var levels = [
		["亿", 100000000],
		["万", 10000],
		["仟", 1000],
		["佰", 100],
		["拾", 10],
		["", 1]
	];

	function parse2Standar(charge) {
		if (charge === 0) {
			return '';
		}
		var hasBegin = false;
		var isOver = false,
			hasZero = false,
			result = '';
		while (!isOver) {
			var i, len;
			for (i = 0, len = levels.length; i < len; i++) {
				var currentLevel = levels[i],
					currentLevelNum = currentLevel[1],
					currentLevelWord = currentLevel[0];

				// 整除
				var currentByte = Math.floor(charge/currentLevelNum);
				if(currentByte > 0) {
					if (hasBegin === false) {
						hasBegin = true;
					}
					if (i < 2) {
						// 亿级和万级的情况
						result += parse2Standar(currentByte) + currentLevelWord;
						charge -= currentByte * currentLevelNum;
					} else if (currentByte < 10) {
						// 万级以下
						result += standardizedMap[currentByte] + currentLevelWord;
						charge -= currentByte * currentLevelNum;

						hasZero = false;
					}
					if (charge <= 0) {
						// 不再有值时直接退出
						break;
					}
				} else {
					// 等于零的情况
					if (!hasBegin) {
						// 先判断是否已开始
						continue;
					}
					if (!hasZero) {
						// 判断是否已存在零
						result += standardizedMap[0];
						hasZero = true;
					}
				}
			}
			if (charge <= 0) {
				isOver = true;
			}
		}

		return result;
	}

	// 该方法用于转换小数点后的，传入的number应为一个小数
	function parseCent2Standar(number) {
		if (number === 0) {
			return '';
		}

		var result = '';
		number = Math.round(number*100);

		// 角
		var hair = Math.floor(number / 10);
		if (hair > 0) {
			result += standardizedMap[hair] + '角';
			number -= hair*10;
		}

		// 分
		var cent = Math.floor(number);
		if (cent > 0) {
			result += standardizedMap[cent] + '分';
		}

		return result;
	}

	// 不带单位，纯数字
	function parseCent2StandarWithoutUnit(number) {
		if (number === 0) {
			return '';
		}

		var result = '';
		number = Math.round(number*100);

		result += '点';

		//小数点后一位
		var hair = Math.floor(number / 10);
		if (hair > 0) {
			result += standardizedMap[hair] + '';
			number -= hair*10;
		}else if(hair === 0){
			result += '零';
		}

		//小数点后两位
		var cent = Math.floor(number);
		if (cent > 0) {
			result += standardizedMap[cent] ;
		}

		return result;
	}

	var getStandar = function(input) {
		// 得到input的int形式
		var originCharge = parseFloat(input.replace(/-/, '')),
			chargeIntPart = Math.floor(originCharge),
			chargeCentPart = originCharge - chargeIntPart,
			result;
		// 合法数字正则
		var re = /^-?(0|[1-9]\d*)(\.\d+)?$/;

		if (input === '') {
			result = '';
		} else if (!re.test(input)) {
			result = '输入非法！'
		}else {
			// 加上单位
			result = parse2Standar(chargeIntPart);
			if (result !== '') {
				result += '元';
			}
			var centPart = parseCent2Standar(chargeCentPart)
			if (centPart) {
				result += centPart;
			} else {
				if(originCharge === 0){
					result += '零元整';
				}else{
					result += '整';
				}
			}
			// 是负数加一个减号
			if (/^-(0|[1-9]\d*)(\.\d+)?$/.test(input)){
				result = '负' + result;
			}
		}

		return result;
	}

	var getStandarWithoutUnit = function(input) {
		// 得到input的int形式
		var originCharge = parseFloat(input.replace(/-/, '')),
			chargeIntPart = Math.floor(originCharge),
			chargeCentPart = originCharge - chargeIntPart,
			result;
		// 合法数字正则
		var re = /^-?(0|[1-9]\d*)(\.\d+)?$/;

		if (input === '') {
			result = '';
		} else if (!re.test(input)) {
			result = '输入非法！'
		}else {
			// 加上单位
			result = parse2Standar(chargeIntPart);
			if (result !== '') {
				result += '';
			}
			var centPart = parseCent2StandarWithoutUnit(chargeCentPart)
			if (centPart) {
				result += centPart;
			} else {
				if(originCharge === 0){
					result += '零';
				}else{
					result += '';
				}
			}
			// 是负数加一个减号
			if (/^-(0|[1-9]\d*)(\.\d+)?$/.test(input)){
				result = '负' + result;
			}
		}

		return result;
	};

	// 导出方法，带人民币单位
	_getStandarAmount = getStandar;
	// 不带人民币单位，纯数字
	_getStandarAmountWithoutUnit = getStandarWithoutUnit;

	// 插件初始化方法
	exports.plugin_init = function(pubjs, next){
		pubjs.standarNumber = getStandar;
		pubjs.standarNumberWithoutUnit = getStandarWithoutUnit;
		next();
	}
});
