define(function(require,exports){
	var $ = require("jquery"),
		util = require('util'),
		pubjs = require("pubjs"),
		view = require('@base/view'),
		tip = require('@base/tip'),
		common = require('@base/common/base');


	// 用户工具栏模块
	var UserToolbar = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'class': 'M-userInfoDetail',
				'view_model': {
					'email': ''
				}
			});

			this.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			var c = self.getConfig();
			var el = self.getDOM();
			var doms = self.$doms = {};

			// 账号区
			$([
				'<div class="M-userToolbarCon">',
					'<div class="M-userToolbarConBox">',
						'<div class="btnCon">',
							'<i class="uk-icon-caret-down"/>',
						'</div>',
						'<div class="resultCon">',
							'<span class="email">{{email}}</span>',
						'</div>',
					'</div>',
				'</div>'
			].join('')).appendTo(el);

			doms.box = el.find('.M-userToolbarConBox');

			// 构建弹层
			if (!self.get('tooltip')){
				doms.tooltipCon = self.create('tooltip', tip.tooltip, {
					'anchor': doms.box
					,'autoShow': true
					,'pos': 'bR' // 定位模式
					,'width': 380
					,'height': 460
					,'offsetY': -10
					,'offsetX': 0
					,'arrowAlign': 'right'
					,'autoHide': 'click_body click_anchor'
				}).getContainer();
			}

			// 弹层内容区
			$([
				'<div class="M-userToolbarCon">',
					'<div class="M-userToolbarConUserInfo"></div>',
					'<div class="M-userToolbarConAmount"></div>',
					'<div class="M-userToolbarConUserlist"></div>',
				'</div>'
			].join('')).appendTo(doms.tooltipCon);

			doms.userInfo = $('.M-userToolbarConUserInfo', doms.tooltipCon);
			doms.amount = $('.M-userToolbarConAmount', doms.tooltipCon);
			doms.userlist = $('.M-userToolbarConUserlist', doms.tooltipCon);


			self.create('userInfo', UserInfoDetail, {
				'target': doms.userInfo
			});

			self.create('amount', AmountDetail, {
				'target': doms.amount
			});

			self.create('userlist', UserlistDetail, {
				'target': doms.userlist
			});


			// 绑定事件
			self.uiBind(doms.box, 'click', 'eventBoxClick');

			self.setData();
		},
		setData: function(){
			var user = pubjs.getUser().current;
			this.vm.$.email = user && user.Name || LANG('未登录');
			return this;
		},
		focus: function(){
			if(this.get('userlist')){
				this.get('userlist').focus();
			}
		},
		// 点击用户名
		eventBoxClick: function(){
			var self = this;
			self.$.tooltip.show();
			self.$doms.box.toggleClass('act', true);
			self.focus();
			return false;
		},
		//用户登录后的响应函数
		onSysUserLogin:function(ev){
			this.setData();
			return false;
		},
		// 用户退出后的响应函数
		onSysUserLogout:function(ev){
			this.setData();
			return false;
		},
		// 弹层隐藏后的响应函数
		onTooltipHide: function(ev){
			this.$doms.box.toggleClass('act', false);
		}
	});
	exports.base = UserToolbar;

	// 账号详情
	var UserInfoDetail = view.container.extend({
		init:function(config){
			config = pubjs.conf(config, {
				'class': 'M-userInfoDetail',
				'list': pubjs.config('app_user_toolbar'),
				'view_model': {
					'userName': LANG('广州舜飞信息科技有限公司'),
					'email': LANG(''),
					'companyName': '',
					'companyId': ''
				}
			});

			this.Super('init', arguments);
		},
		afterBuild:function(){
			var self = this;
			var el = self.getDOM();
			var c = self.getConfig();
			var doms = self.$doms = {};
			var user = pubjs.getUser();

			// 构建界面
			$([
				'<div class="M-userInfoDetailCon">',
					'<div>',
						'<strong>{{userName}}</strong>',
						'<em>{{email}}</em>',
						'<span>{{companyName}}</span>',
						'<b>{{companyId}}</b>',
					'</div>',
					'<ul class="opList"></ul>',
				'</div>'
			].join('')).appendTo(el);

			doms.opList = el.find('.opList');
			util.each(c.list, function(item){
				doms.opList.append([
					'<li>',
						'<a href="'+item.link+'" title="'+LANG(item.text)+'">',
							util.html(LANG(item.text)),
						'</a>',
					'</li>'
				].join(''));
			});

			console.log(this.vm.$.userName);
			console.log(user);
			if(user.current){
				this.vm.$.userName = user.current.Name;
				this.vm.$.email = user.login.email;
				this.vm.$.companyName = LANG('所属公司：')+user.login.name;
				this.vm.$.companyId = '(ID:'+user.login.userId+')';
			}


		},
		// 设置名字相关信息
		setData:function(data){
			if(data.company){
				var doms = this.doms;
				var user = data;
				var company = user.company;
				var isFake = (user.company_id != user.origin_company_id || user.userid == company.UserId);

				doms.userName.text(isFake ? company.UserName : user.nickname);
				doms.email.text(isFake ? company.Name : user.username);
				doms.companyName.text(LANG('所属公司：') + company.UserName);
				doms.companyId.text('(ID:'+company.UserId+')');
			}
		},
		reset: function(){
			this.vm.reset();
		}
	});

	// 金额信息
	var AmountDetail = view.container.extend({
		init:function(config){
			config = pubjs.conf(config, {
				'class': 'M-amountDetail',
				'view_model': {
					'rest': '',
					'used': '',
					'allowAdCredit': ''
				}
			});

			this.Super('init', arguments);
		},
		afterBuild:function(){
			var self = this;
			var el = self.getDOM();
			var c = self.getConfig();
			var doms = self.$doms = {};

			// 构建界面
			$([
				'<div class="M-amountDetailCon">',
					'<ul class="amountList">',
						'<li>',
							LANG('账户余额：'),
							'<p>',
								'<span>{{rest}}</span>',
								'<em>'+LANG(' 元')+'</em>',
							'</p>',
						'</li>',
						'<li>',
							LANG('今日消费：'),
							'<p>',
								'<span>{{used}}</span>',
								'<em>'+LANG(' 元')+'</em>',
							'</p>',
						'</li>',
						'<li>',
							LANG('可用额度：'),
							'<p>',
								'<span>{{allowAdCredit}}</span>',
								'<em>'+LANG(' 元')+'</em>',
							'</p>',
						'</li>',
					'</ul>',
				'</div>'
			].join('')).appendTo(el);


			this.vm.$.rest = this.formatCurrency(6105533.54);
			this.vm.$.used = this.formatCurrency(0);
			this.vm.$.allowAdCredit = this.formatCurrency(0);
			// this.vm.watch('rest', function(v) {
			// 	this.vm.$.isRedClass = v > 0;
			// });



		},
		// 设置名字相关信息
		setData:function(data){
			if(data){

				var vm = this.vm.$;

				if(data.cp_rest_amount < 0){

				}

				doms.rest.text(
					this.formatCurrency(data.cp_rest_amount)
				).css('color', data.cp_rest_amount < 0 ? '#c30': '');

				doms.used.text(
					this.formatCurrency(data.cp_today_cost)
				);

				// 如果账号余额小于0
				var tmp_credit = data.company.AllowAdCredit;
				if(data.cp_rest_amount < 0){
					tmp_credit += data.cp_rest_amount;
					tmp_credit = tmp_credit < 0 ? 0 : tmp_credit;
				}
				doms.allowAdCredit.text(
					this.formatCurrency(tmp_credit)
				);


			}
		},
		// 格式化数字
		formatCurrency:function(val){
			return util.numberFormat(
				util.round0(val,2)
			);
		},
		// 消息变化通知事件
		onMessageUpdateCount: function(ev){
			var el = this.doms.message;
			el.text(
				el.attr('title') + (ev.param ? '('+ev.param+')' : '')
			);
			return false;
		},
		// 余额变化通知事件
		onBalanceFetch:function(ev){
			this.setData($.extend(app.getUser(), ev.param));
		},
		// 重置
		reset:function(){

		}
	});

	// 切换网站列表
	var UserlistDetail = view.container.extend({
		init:function(config){
			config = pubjs.conf(config, {
				'class': 'uk-form M-userlistDetail',
				'view_model': {
					'keyword': '',
					'userlist': [
						// {name: '37wan', email: 'admin@37wan.com', userId: 34750, id:1},
						// {name: '37wan创速', email: 'dsp@37wan.com', userId: 34221, id:2},
						// {name: 'ad2@37wan.com', email: 'ad2@37wan.com', userId: 36852, id:3},
						// {name: '4399', email: 'admin@4399.com', userId: 32112, id:4},
						// {name: '65游戏平台', email: 'admin@65.com', userId: 39785, id:5},
						// {name: '大黑游戏平台', email: 'admin@dahei.com', userId: 35353, id:6}
					],
					'eventListClick': this.changeUser
				}
			});

			// 方向键操作序号
			this.$index = -1;

			this.Super('init', arguments);
		},
		afterBuild:function(){
			var self = this;
			var el = self.getDOM();

			$([
				'<div class="M-userlistDetailCon">',
					'<div class="searchCon">',
						'<input tpye="text" ms-duplex="keyword" class="input"/>',
						'<i class="uk-icon-search do" ms-visible="!keyword"/>',
						'<i class="cancel" ms-visible="keyword">×</i>',
					'</div>',
					'<div class="listCon">',
						'<ul>',
							'<li ms-repeat-item="userlist" ms-attr-title="item._id" ms-attr-data-id=item._id ms-visible="!keyword" ms-click="eventListClick(item._id)">',
								'<strong ms-text="item.Name"/>',
								'<br/>',
								'ID: {{item._id}}',
							'</li>',
						'</ul>',
					'</div>',
				'</div>'
			].join('')).appendTo(el);

				// 滚动条
			self.create('scroller', common.scroller, {
				"target": el.find('.listCon'),
				"content": el.find('ul'),
				"dir": 'V',
				"size": 3,
				'pad': false,
				"watch": 200,
				'offset': 0
			});

			// 绑定事件
			self.uiBind(el.find('.cancel'), 'click', 'eventEmptyInput');
			self.uiBind(el.find('.input'),'keyup','eventInput');
			//self.uiProxy(el,'li', 'click', 'eventListClick');

			self.load();
		},
		// 拉取账号列表
		load: function(){
			this.showLoading();
			pubjs.mc.send('user/switchList', this.onLoad.bind(this));
		},
		onLoad: function(err, data){
			this.hideLoading();
			if (err){
				pubjs.alert(err.message);
				return false;
			}

			this.setData(data);
		},
		setData: function(data){
			this.vm.$.userlist = data;
			return this;
		},
		eventEmptyInput: function(evt, elm){
			this.vm.$.keyword = '';
			return false;
		},
		//用户列表点击处理
		changeUser: function(id){
			pubjs.mc.send('user/switchUser', {'id': id}, this.onChangeUser.bind(this))
			return this;
		},
		onChangeUser: function(err, data){
			if (err){
				pubjs.alert(err.message);
				return false;
			}
		},
		eventInput: function(evt, elm){
			var visCon = $(".listCon ul li:visible").removeClass('hoverClass');
			var max = visCon.length;
			var elm;

			switch(evt.keyCode){
				case 38:							// 向上方向键
					this.$index--;

					// 向上已到顶部
					if(this.$index < 0){
						this.$index = max -1;
					}
					this.move(visCon);
				break;
				case 40:							// 向下方向键
					this.$index++;

					// 向下已到底部
					if(this.$index >= max){
						this.$index = 0;
					}

					this.move(visCon);
				break;
				case 13:							// 回车键
					if(this.$index == -1){
						this.$index = 0;
					}
					elm = visCon.eq(this.$index);
					if(!elm.hasClass('act')){
						elm.addClass('act').siblings('.act').removeClass('act');
						var id = +elm.attr('data-id');
						this.changeUser(id);
					}
				break;
				case 27:							// Esc键
					this.vm.$.keyword = '';
				break;
				default:
					// 重置变量
					this.$index = -1;

					// 过滤列表数据
					var val = this.vm.$.keyword.toLowerCase();
					var doms = this.getDOM().find('ul').children('li');
					var idx = 0;
					util.each(this.vm.$.userlist, function(item){
						var dom = doms.eq(idx);
						if (dom.attr('data-id') != item.id){ return; }
						var name = (item.name || '').toLowerCase();
						var email = (item.email || '').toLowerCase();
						var userId = String((item.userId || '')).toLowerCase();
						dom.toggle(name.indexOf(val)>=0 || email.indexOf(val)>=0 || userId.indexOf(val)>=0);
						idx++;
					});
				break;
			}
		},
		move: function(dom){
			// 高度
			var height = $(".listCon ul li:visible").first().outerHeight();
			// 滚动条跟随移动
			this.$.scroller.scrollTo( -(this.$index - 2) *height);
			// 按键选中状态
			dom.eq(this.$index).addClass('hoverClass');
		},
		reset: function(){

		},
		focus: function(){
			this.getDOM().find('.input').select();
			return this;
		},
		showLoading: function(){
			console.log();
			var el = this.getDOM().find('.listCon');
			var loading = $('<div class="M-tableListLoading"/>').appendTo(el);
			loading.css({
				width: 380,
				height: el.height()
			}).show();
		},
		hideLoading: function(){
			this.getDOM().find('.M-tableListLoading').hide();
		}
	});
});