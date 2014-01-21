define(function(require, exports){
	var $ = require('jquery'),
		pubjs = require('../../core/pub'),
		util = require('../../core/util'),
		view = require("../view"),
		tip = require('../tip'),
		input = require('./input');

	var STORE = null;

	// 功能模块代码
	var DateBar = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				"groups":{
					// 只进行单次操作的
					"single":[
						{
							// 显示的文字
							"text":LANG("今天"),
							// 开始的偏移量
							"begin":0,
							// 结束的偏移量
							"end":0
							// 特殊指定操作类型
							// 偏移量与特殊类型操作暂时不能共存
							// 当前支持currentMonth，有其他特殊类型需要自行添加
							// "type":"currentMonth"
						},
						{
							"text":LANG("昨天"),
							"begin":-1,
							"end":-1
						},
						{
							"text":LANG("前天"),
							"begin":-2,
							"end":-2
						},
						{
							"text":this.getLastWeekDay(),
							"begin":-7,
							"end":-7
						},
						{
							"text":LANG("最近7天"),
							"begin":-7,
							"end":-1
						},
						{
							"text":LANG("最近30天"),
							"begin":-30,
							"end":-1
						},
						{
							"text":LANG("本月"),
							// 特殊指定操作类型
							"type":"currentMonth"
						}
					],
					// 会在当前值进行累加操作的
					"accum":[
						{
							"text":LANG("前一天"),
							"type":"prevDay"
						},
						{
							"text":LANG("后一天"),
							"type":"nextDay"
						}
					]
				},
				// 要显示的功能按钮
				"buttons":[
					// {
					// 	"name":LANG("历史累计"),
					// 	"type":"button",
					// 	"cls":"uk-button total",
					// 	"action":"toggleCountType",
					// 	"pos":1
					// },
					{
						"name":LANG("查询"),
						// 按钮的类型
						"type":"button",
						"cls":"uk-button uk-button-primary ml10",
						// 按钮执行的实例自身事件
						// 或需要执行的函数
						"action":"gotoQuery"
					}
				],
				"dateFormat":"Y-m-d"
			});
			var self = this;

			// 类型按钮实例合集
			self.types = {};

			// 功能类型按钮实例合集
			self.buttons = {};

			// 一天
			self.aDay = 86400;
			self.endDay = 86399;

			// 现在的时间。
			self.nowDate = {};

			// 现在时间对应的时间戳
			self.nowTimestamp = {};

			// 统计类型 0 - 历史累计, 1 - 时段统计
			self.countType = 1;

			// 弹出日历是否已经选择
			self.calendarSelected = 0;

			if (!STORE){
				STORE = pubjs.getDateStorage();
			}

			self.Super('init', arguments);
			self.setDate(
				STORE.getBegin(),
				STORE.getEnd(),
				STORE.getMode(),
				true
			);
		},
		afterBuild: function(){
			var self = this;
			var c = self.getConfig();
			var doms = self.$doms = {};
			var dom, item, n;

			self.addClass('M-dateBar');

			// 生成分组
			var groups = c.groups;
			for(n in groups){
				item = n+"Gropu";
				self.create(item, input.buttonGroup, {
					tag:'span',
					no_state: (n === 'accum'),
					items: groups[n]
				});
			}
			//添加两个三角形
			// var $buttons = self.el.find(".G-buttonGroup").eq(1);
			// $($buttons).prepend("<div class='left'></div>");
			// $($buttons).append("<div class='right'></div>");

			// 日期显示input的外部容器
			self.create('date', DateRange, {'tag': 'span'});

			// 前方的按钮区域
			var front = doms.frontButtonsArea = $('<span />').hide();
			// 按钮外框对象
			var end = doms.endButtonsArea = $('<span/>');

			self.append(front, end);
			self.uiProxy(front, 'input[data-action]', 'click', 'eventClick');
			self.uiProxy(end, 'input[data-action]', 'click', 'eventClick');

			// 生成按钮
			groups = c.buttons;
			for(n = 0;n<groups.length;n++){
				item = groups[n];
				dom = $('<input/>').attr({
					"type":"button"
					,"value":item.name
					,"class":item.cls
					,"data-action":item.action
				});

				if(item.pos){
					front.css('display', 'inline');
					dom.appendTo(front);
				}else{
					dom.appendTo(end);
				}
			}
		}
		/**
		 * 更新显示状态
		 * @return {Undefined} 无返回值
		 */
		,updateState:function(){
			var self = this;
			// 更新时间段
			self.$.date.setData(self.nowDate);
			// 更新按钮状态
			self.toggleClass('M-dateBarTotal', !self.countType);
			// 更新按钮组状态
			var list = self.getConfig('groups/single');
			var group = self.$.singleGropu;
			if (self.countType){
				var today = self.today();
				var end = today + self.endDay;
				var ts = self.nowTimestamp;
				var item, b, e, now;
				for (var i=0; i<list.length; i++){
					item = list[i];
					if (item.type === 'currentMonth'){
						now = (new Date()).getDate();
						b = today - (now - 1) * self.aDay;
						e = today + self.endDay;
						if (now > 1){
							// 数据库查询不能跨今天
							e -= self.aDay;
						}
					}else {
						b = today + item.begin * self.aDay;
						e = end + item.end * self.aDay;
					}
					if (b === ts.begin && e == ts.end){
						break;
					}
				}
				if (i === list.length){ i = null; }
				group.setData(i);
			}else {
				group.setData(null);
			}
			// 更新上周同期的按钮显示
			var newItem = list[3];
			newItem.text = self.getLastWeekDay();
			group.setItem(3, newItem);
			return self;
		}
		// 窗口切换时同步时间过滤参数
		,eventWindowFocus: function(){
			this.onChannelChange();
		}
		/**
		 * 频道改变的响应函数
		 * @param  {Object}    ev 消息对象
		 * @return {Undefined}    无返回值
		 */
		,onChannelChange:function(ev){
			// 更新字符串格式日期
			var eventFired = this.setDate(
				STORE.getBegin(),
				STORE.getEnd(),
				STORE.getMode()
			);

			// 默认频道切换需要刷新
			if(!eventFired && ev && (!ev.param || !ev.param.silence)){
				this.triggerEvent();
			}
			// 下层实例无需响应
			return false;
		}
		/**
		 * 时间段模式按钮切换
		 */
		,onChangeButton:function(ev){
			var item = ev.param.item;
			var today = this.today();
			var ts = this.nowTimestamp;
			var b = ts.begin,e = ts.end;
			var oneDay = this.aDay;

			switch (item.type){
				case 'currentMonth':
					var now = (new Date()).getDate();
					b = today - (now - 1) * oneDay;
					e = today + this.endDay;
					if (now > 1){
						e -= oneDay;
					}
				break;
				case 'prevDay':
					b -= oneDay;
					e -= oneDay;
					if ((e-b)>oneDay && b<today && e>=today){
						// 跨度大于1天, 不允许包含今天
						return false;
					}
				break;
				case 'nextDay':
					b += oneDay;
					e += oneDay;
					if (b > today || ((e-b)>oneDay && b<today && e>=today)){
						// 时间跨一天, 不允许包含今天
						return false;
					}
				break;
				default:
					// 偏移量处理
					b = today + item.begin * oneDay;
					e = today + item.end * oneDay + this.endDay;
				break;
			}
			this.setDate(b, e, 1);
			return false;
		}
		/**
		 * 日历选择时间段事件
		 */
		,onDateRangeChange: function(ev){
			var date, begin, end;
			date = util.toDate(ev.param.begin);
			begin = Math.floor(date.getTime() / 1000);
			date = util.toDate(ev.param.end);
			end = Math.floor(date.getTime() / 1000);
			this.setDate(begin, end, 1);
			return false;
		}
		/**
		 * 普通按钮点击事件
		 */
		,eventClick: function(evt, elm){
			var act = $(elm).attr('data-action');
			act = 'action' + util.ucFirst(act);
			if (this[act]){ this[act](); }
		}
		/**
		 * 切换统计类型
		 * @return {Undefined} 无返回值
		 */
		,actionToggleCountType:function(val){
			// 切换统计类型
			this.setDate(null, null, this.countType?0:1);
		}
		/**
		 * 返回今天的时间戳
		 */
		,today: function(){
			var tmp = new Date();
			tmp.setHours(0);
			tmp.setMinutes(0);
			tmp.setSeconds(0);
			return Math.floor(tmp.getTime() / 1000);
		}
		/**
		 * 设置控件日期范围
		 * @param {Number} begin   开始时间戳
		 * @param {Number} end     结束时间戳
		 * @param {Bool}   noEvent 是否触发变更事件
		 * @return {Bool}  返回是否触发通知事件
		 */
		,setDate: function(begin, end, type, noEvent){
			var update = false;

			if (begin !== null || end !== null){
				var c = this.getConfig();

				// 初始化时间戳
				var today = this.today();
				var oneDay = this.aDay;
				var diff = today % oneDay;
				if (begin){
					begin -= (begin - diff) % oneDay;
				}else {
					begin = today;
				}
				if (end){
					end -= (end - diff) % oneDay;
					if (end < begin){ end = begin; }
				}else {
					end = begin;
				}
				end += this.endDay;

				if ((end-begin)>oneDay && begin<today && end>=today){
					// 不能跨今天多天查询
					end = today - 1;
				}

				// 更新变量
				var ts = this.nowTimestamp;
				if (begin != ts.begin || end != ts.end){
					ts.begin = begin;
					ts.end = end;
					ts = this.nowDate;
					ts.begin = util.date(c.dateFormat,begin);
					ts.end = util.date(c.dateFormat,end);

					// 更新Cookie
					STORE.setTime(begin, end);
					update = true;
				}
			}

			if ((type === 0 || type === 1) && type != this.countType) {
				this.countType = type;
				STORE.setMode(type);
				update = true;
			}

			if (update){
				// 更新显示状态
				this.updateState();

				// 发送更新通知
				if (!noEvent){
					this.triggerEvent();
					return true;
				}
			}
			return false;
		}
		/**
		 * 触发父模块广播日期修改事件
		 */
		,triggerEvent: function(){
			var p = this.parent();
			if (!p){ return false; }
			var date,item = this.getNowType();
			if (this.countType){
				// 不启用历史统计
				date = {
					"nowDate":this.nowDate
					,"nowTimestamp":this.nowTimestamp
					,"item":item
				}
			}else{
				date = {
					"stastic_all_time":1
					,"item":item
				}
			}
			item = null;
			return p.cast("changeDate",date);
		}
		/**
		 * 获取当前激活的日期类型
		 * @return {Object} 日期对象数据对象
		 */
		,getNowType:function(){
			var type, group = this.$.singleGropu;

			type = group && group.getData(1) || null;
			if(type && type.id !== undefined && type.text){
				type = {
					"id":type.id
					,"text":type.text.text
				}
			}else{
				type = null;
			}
			group = null;
			return type;
		}
		,onChangeDate: function(){
			return false;
		}
		/**
		 * 获取今天是星期几
		 * @param  String pre 前缀
		 * @return String    结果字符串
		 */
		,getLastWeekDay: function() {
			var dayList = [LANG('日'), LANG('一'), LANG('二'), LANG('三'), LANG('四'), LANG('五'), LANG('六')];
			var day  = new Date().getDay();
			return LANG("上周") + dayList[day];
		}
		// 手动查询按钮
		,actionGotoQuery: function(){
			this.triggerEvent();
		}
	});
	exports.datebar = DateBar;


	// 弹出表情日期选择模块
	var DateDialog = tip.base.extend({
		init: function(config){
			var self = this;
			config = pubjs.conf({
				'class': 'M-datePicker',
				'autoHide': 'click_body',
				"hasArrow": false,
				"autoShow": 0,

				'numberOfMonths': 2,
				'stepMonths': 1,
				'week_name':['日', '一', '二', '三', '四', '五', '六'],
				'week_start': 0,

				'max': 0, // 可以选择的最大日期
				'min': 0, // 可以选择的最小日期

				'single': 0, // 只选择一天
				'begin': 0,
				'end': 0
			});

			// 当前选择状态
			// 0-未选, 1-选开始, 2-选范围
			self.$mode = 0;
			self.$begin = 0;
			self.$end = 0;
			self.$cur = 0;
			self.$max = 0;
			self.$min = 0;
			self.$dom_days = null;
			self.$cals = [];

			self.$show_year = 0;
			self.$show_month = 0;

			self.$chMonthTimer  = 0;
			self.$chMonthDir    = 0;
			self.eventChangeMonth = self.eventChangeMonth.bind(self);

			// 继续初始化模块构造
			self.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			self.Super('afterBuild', arguments);
			var c = self.getConfig();

			// 生成主体布局
			var doms = self.$doms;
			var body = doms.body = $('<div class="M-datePickerBody" />').appendTo(doms.content);
			doms.buttons = $('<div class="M-datePickerButtons" />').appendTo(doms.content);

			// 月份切换
			var prev = $('<div class="date-ctrl prev"><i/></div>').appendTo(body);
			var next = $('<div class="date-ctrl next"><i/></div>').appendTo(body);

			// 生成日历
			for (var i=0; i<c.numberOfMonths; i++){
				self.buildMonth();
			}

			// 监听事件
			self.uiBind(prev, 'mousedown mouseup mouseleave', -1, 'eventMonthButton');
			self.uiBind(next, 'mousedown mouseup mouseleave', 1, 'eventMonthButton');
			self.uiProxy(body, '.date-head span', 'click', 'eventSelectYearMonth');
			self.uiProxy(body, 'a', 'click mouseenter mouseleave mousedown', 'eventDay');
			self.uiProxy(doms.buttons, 'button[data-action]', 'click', 'eventButtons');
		},
		/**
		 * 更新配置
		 * @param  {Object} config 新配置对象
		 * @return {Module}        返回对象实例
		 */
		update: function(config){
			var self = this;

			// 定位锚点对象
			var anchor = $(config.anchor);
			self.$anchor = anchor.length ? anchor : null;
			self.extendConfig(config);

			// 修改显示月份数量
			var i=self.$cals.length, num = config.numberOfMonths;
			if (num){
				var j = Math.min(i, num);
				while (j--){
					self.$cals[j].container.show();
				}
				for (; i<num; i++){
					self.buildMonth();
				}
				for (; i>num;){
					self.$cals[--i].container.hide();
				}
			}

			// 如果界面已显示, 立即更新一次界面
			self.updatePosition();
			return self;
		},
		/**
		 * 构建月份日历
		 */
		buildMonth: function(){
			var self = this;
			var con = $('<div class="date-container"/>').appendTo(self.$doms.body),
				head = $('<div class="date-head"/>').appendTo(con),
				week = $('<div class="date-week"/>').appendTo(con),
				cal = $('<div class="date-cal"/>').appendTo(con);

			var item = {
				'container':con,// 容器对象
				'head':head,	// 头部容器
				'week':week,	// 星期显示容器
				'body':cal,		// 日历日期容器
				'year':$('<span class="date-year" />').appendTo(head),  // 头部年份
				'month':$('<span class="date-month" />').appendTo(head),// 头部月份
				'days':[],	// 1-31号容器容器
				'base':0,	// 日期ID基础
				'pad':null	// 日期开头站位容器
			};
			var i, c = self.getConfig();
			// 生成星期
			for (i=0; i<7; i++){
				$('<b/>').text(c.week_name[(i+c.week_start)%7]).appendTo(week);
			}

			// 开始日期占位
			item.pad = $('<em/>').appendTo(cal);

			// 生成日期
			for (i=1; i<=31; i++){
				item.days.push($('<a/>').text(i).appendTo(cal));
			}

			head.attr('data-pos', self.$cals.length);
			self.$cals.push(item);

			return self;
		},
		/**
		 * 计算显示日期位置
		 */
		showDay: function(){
			var self = this;
			var c = self.getConfig();
			var month = self.$show_month;
			var year  = self.$show_year;
			var max   = self.$max;
			var min   = self.$min;
			var date  = new Date(year, month, 1);
			var item, week, days, k, a, cl, id;

			if (month < 0){
				self.$show_year = year += Math.floor(month / 12);
				self.$show_month = month = 12 + (month % 12);
			}else if (month >= 12){
				self.$show_year = year += Math.floor(month / 12);
				self.$show_month = month %= 12;
			}

			for (var i=0; i<c.numberOfMonths;i++){
				item = self.$cals[i];
				// 开始周
				week = (date.getDay() - c.week_start) % 7;

				// 到月末
				date.setMonth(++month);
				date.setDate(0);
				// 月份天数
				days = date.getDate();


				// 更新年月
				item.year.text(year + '/');
				item.month.text(util.fix0(month,2) + LANG('月'));
				// 时间ID
				item.base = year * 10000 + month * 100;
				// 到下月1日
				date.setDate(days+1);
				if (month == 12){
					year++;
					month = 0;
				}
				// 生成日期
				item.pad.attr('class', 'w'+week);
				for (k=0; k<31; k++){
					a = item.days[k];
					if (k < days){
						id = item.base + k + 1;
						a.attr('date-id', id);
						cl = (max && id>max || min && id<min)?'disabled':'';
					}else {
						a.removeAttr('date-id');
						cl = 'hide';
					}
					a.attr('class', cl);
				}
			}
			self.updateSelected();

			return self;
		},
		/**
		 * 更新显示选中的时间段
		 */
		updateSelected: function(){
			var self = this;
			var start = self.$begin, end, i;
			switch (self.$mode){
				case 1: // 选择中
					end = self.$cur;
				break;
				case 2: // 已选择
					end = self.$end;
				break;
				default:
				return false;
			}
			if (start > end){
				i = start;
				start = end;
				end = i;
			}

			var item, k, a, id, nums = self.getConfig('numberOfMonths');
			for (i=0; i<nums; i++){
				item = self.$cals[i];
				for (k=0; k<31;){
					a = item.days[k++];
					id = item.base + k;
					a.toggleClass('sel', (id >= start && id <= end));
				}
			}
			return self;
		},
		/**
		 * 切换月份按钮事件
		 */
		eventMonthButton: function(evt){
			var self = this;
			switch (evt.type){
				case 'mousedown':
					self.$chMonthDir = evt.data * self.getConfig('stepMonths');
					self.$chMonthTimer = self.$chMonthTimer || setInterval(self.eventChangeMonth, 500);
					self.eventChangeMonth();
					return false;
				case 'mouseup':
				case 'mouseleave':
					if (self.$chMonthTimer){
						clearInterval(self.$chMonthTimer);
						self.$chMonthTimer = 0;
					}
					return false;
			}
		},
		eventChangeMonth: function(){
			var self = this;
			self.$show_month += self.$chMonthDir;
			self.showDay();
		},
		/**
		 * 日期块鼠标事件
		 */
		eventDay: function(evt, elm){
			var self = this;
			elm = $(elm);
			var id = +elm.attr('date-id');
			if (elm.hasClass('disabled')){
				elm.removeClass('hov');
				return false;
			}
			switch(evt.type){
				case 'mouseenter':
					elm.addClass('hov');
					if (self.$mode === 1){
						self.$cur = id;
						self.updateSelected();
					}
				break;
				case 'mouseleave':
					elm.removeClass('hov');
				break;
				case 'click':
					self.eventSelect(id, elm);
				break;
			}
			return false;
		},
		/**
		 * 日期选择事件处理
		 */
		eventSelect: function(date, elm){
			var self = this;
			if (self.getConfig('single')){
				// 单日期选择模式
				self.$begin = self.$end = self.$cur = date;
				self.fire('selectDate', self.getData());
				self.hide();
			}else {
				// 时间段选择模式
				switch (self.$mode){
					case 0: // 选择开始日期
					case 2: // 重新开始选择
						self.$cur = self.$begin = date;
						self.$end = 0;
						self.$mode = 1;
					break;
					case 1: // 选择结束日期
						if (date < self.$begin){
							self.$end = self.$begin;
							self.$begin = date;
						}else {
							self.$end = date;
						}
						self.$mode = 2;
						self.fire('selectDateRange', self.getData());
						self.hide();
					break;
					default:
					return false;
				}
			}
			self.updateSelected();
		},
		// 选择年月
		eventSelectYearMonth: function(evt, elm){
			// todo: 直接选择年份和月份
		},
		// 点击功能按钮
		eventButtons: function(evt, elm){
			var name = $(elm).attr('data-action');
			var btn = util.find(this.getConfig('buttons'), name, 'name');
			if (btn){
				this.fire('dateButtonClick', btn);
			}
		},
		/**
		 * 重写显示函数
		 */
		show: function(option){
			var self = this;
			if (option){
				self.update(option);
			}

			var c = self.getConfig();
			var b = util.toDate(c.begin);
			var e = util.toDate(c.end);
			if (b > e){
				var t = b;
				b = e;
				e = t;
			}
			if (c.begin && c.end){
				self.$mode = 2;
				self.$begin = +util.date('Ymd', b);
				self.$end = +util.date('Ymd', e);
			}else {
				self.$mode = 0;
				self.$begin = self.$end = 0;
			}
			if (!e){ e = new Date(); }
			self.$show_year  = e.getFullYear();
			self.$show_month = e.getMonth() - c.numberOfMonths + 1;

			self.$max = c.max && +util.date('Ymd', c.max) || 0;
			self.$min = c.min && +util.date('Ymd', c.min) || 0;

			// 生成底部按钮
			var con = self.$doms.buttons;
			if (c.buttons){
				con.empty().show();
				util.each(c.buttons, function(btn){
					$('<button/>').text(btn.text)
						.addClass(btn.cls || 'uk-button')
						.attr('data-action', btn.name)
						.appendTo(con);
				});
			}else {
				con.hide();
			}

			// 显示日期
			self.showDay();

			self.Super('show');
		},
		getData: function(){
			var self = this;
			var b, e;
			b = self.$begin.toString();
			b = b.substr(0,4) + '-' + b.substr(4,2) + '-' + b.substr(6,2);

			if (self.getConfig('single')){
				return b;
			}
			if (self.$mode != 2){
				return null;
			}

			e = self.$end.toString();
			e = e.substr(0,4) + '-' + e.substr(4,2) + '-' + e.substr(6,2);

			return {'begin': b, 'end': e};
		},
		onSwitchPage: function(){
			this.hide();
			return false;
		}
	});
	exports.date = DateDialog;


	/**
	 * 创建日期选择弹出模块
	 */
	var DATE_DIALOG_INSTANCE = null;
	function _createDateDialog(mod){
		if (!DATE_DIALOG_INSTANCE){
			DATE_DIALOG_INSTANCE = pubjs.core.create('SYSTEM_DATE_PICKER', DateDialog);
		}
		return DATE_DIALOG_INSTANCE;
	}


	// 单日期选择框
	var DatePicker = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'tag':'span',
				'months': 1,
				'value': 0,
				'max': 0,
				'min': 0,
				'format': 'Y-m-d',
				'no_date': '',
				'buttons': null,
				'disabled': false,
				'pos': 'bL',
				'width': 80
			});

			this.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			var c = self.getConfig();

			// 建立DOM对象
			var date = $('<input type="input" class="M-dateSingle" />').prop('readonly', true);
			self.append(date);
			if (c.disabled){
				date.prop('disabled', true);
			}
			date.width(c.width).mousedown(util.blockEvent);
			self.uiBind(date, 'click', 'eventSelectDate');

			self.$doms = {'date':date};
			self.showData();
		},
		showData: function(){
			var c = this.getConfig();
			// 设置初始值
			this.$doms.date.val(c.value ? util.date(c.format, c.value) : c.no_date);
			return this;
		},
		eventSelectDate: function(){
			var self = this;
			var date = _createDateDialog.call(self);
			if (!date){ return false; }

			var c = self.getConfig();
			var input = self.$doms.date;
			date.unbind();
			date.bind('selectDate', self);
			date.bind('clickDateButton', self);

			// 显示弹出界面
			date.update({
				'begin': c.value, 'end': c.value,
				'max':c.max, 'min':c.min,
				'numberOfMonths':c.months, 'single':1,
				'buttons': c.buttons,
				'anchor': input,
				'offsetY':2, 'offsetX':0,
				'pos':c.pos
			}).show();
			return false;
		},
		onSelectDate: function(ev){
			this.setData(ev.param);
			this.fire('dateChange', ev.param);
			return false;
		},
		onDateButtonClick: function(ev){
			this.fire('dateButton', ev.param);
			return false;
		},
		setup: function(config){
			this.extendConfig(config);
			return this;
		},
		setData: function(data){
			this.setConfig('value', data || 0);
			this.showData();
			return this;
		},
		getData: function(){
			var c = this.getConfig();
			return c.value ? util.date(c.format, c.value) : null;
		}
	});
	exports.datePicker = DatePicker;

	/**
	 * 日期段选择
	 */
	var DateRange = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'tag':'span',
				'months': 2,
				'begin': 0,
				'end':0,
				'max':0,
				'min':0,
				'buttons': null,
				// 不根据参照物自动计算，改为固定在选择容器的下方出现
				'pos':'bR',
				'width': 0
			});

			// config.begin = util.date('Y-m-d', config.begin);
			// config.end = util.date('Y-m-d', config.end);

			this.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			var c = self.getConfig();

			// 建立DOM对象
			var date = $('<input type="input" class="M-dateRange btn" />').prop('readonly', true);
			date.mousedown(util.blockEvent);
			if (c.width){
				date.width(c.width)
			}
			self.$doms = {'date': date};

			self.append(date);
			self.uiBind(date, 'click', 'eventSelectDate');

			self.showData();
		},
		showData: function(){
			var c = this.getConfig();
			// 设置初始值
			var text = util.date('Y-m-d', c.begin) + ' -- ' + util.date('Y-m-d', c.end);
			this.$doms.date.val(text);
			return this;
		},
		eventSelectDate: function(){
			var date = _createDateDialog.call(this);
			if (!date){ return false; }

			var c = this.getConfig();
			var input = this.$doms.date;
			date.unbind();
			date.bind('selectDateRange', this);
			date.bind('clickDateButton', this);

			// 显示弹出界面
			date.update({
				'begin': c.begin, 'end': c.end,
				'max':c.max, 'min':c.min,
				'numberOfMonths':c.months, 'single':0,
				'buttons': c.buttons,
				'anchor': input, 'offsetY':2, 'offsetX':0, 'pos':c.pos
			}).show();
			return false;
		},
		onSelectDateRange: function(ev){
			this.setData(ev.param);
			this.fire('dateRangeChange', ev.param);
			return false;
		},
		setup: function(config){
			this.extendConfig(config);
			return this;
		},
		setData: function(data){
			var c = this.getConfig();
			c.begin = data.begin;
			c.end = data.end;
			this.showData();
			return this;
		},
		getData: function(){
			var c = this.getConfig();
			return {
				begin: c.begin,
				end: c.end
			};
		}
	});
	exports.dateRange = DateRange;

});