define(function(require,exports){
	var pubjs = require("pubjs"),
		util = require('util'),
		$ = require("jquery"),
		// view = require('@base/view'),
		tip = require('@base/tip');


	/*
	 * 用户工具栏模块
	 * @param {Object}     config   导航设置
	 * @return {Undefined}          无返回值
	 */
	var UserToolbar = pubjs.Module.extend({
		init: function(config){
			var self = this;
			self.$config = pubjs.conf(config, {
				'target': 'body',
				'list': pubjs.config('app_user_toolbar')
			});

			self.$ready = false;
			self.$isShow = false;
			self.build();
		},
		build: function(){
			var self = this;
			if (self.$ready){ return self; }
			self.$ready = true;
			var c = self.$config.get();

			// 账号区
			var html = [
				'<div class="G-frameUserToolbar">',
					'<div class="G-frameUserToolbarBox">',
						'<div class="G-frameUserToolbarBoxBtn">',
							'<i class="uk-icon-caret-down"/>',
						'</div>',
						'<div class="G-frameUserToolbarBoxResult">',
							'<span class="G-frameUserToolbarBoxName"/>',
							'<span class="G-frameUserToolbarBoxSiteName"></span>',
						'</div>',
					'</div>',
				'</div>'
			].join('');

			var target = $(c.target);
			target.append(html);

			var doms = self.$doms = {
				'box': $('.G-frameUserToolbarBox', target),
				'name': $('.G-frameUserToolbarBoxName', target),
				'SiteName': $('.G-frameUserToolbarBoxSiteName', target),
				'button': $('.G-frameUserToolbarBoxBtn', target)
			};

			// 构建弹层
			if (!self.get('tooltip')){
				doms.tooltipCon = self.create('tooltip', tip.tooltip, {
					'anchor': doms.box
					,'autoShow': true
					,'pos': 'bR' // 定位模式
					,'width': 380
					,'height': 358
					,'offsetY': -10
					,'offsetX': 0
					,'arrowAlign': 'right'
					,'autoHide': 'click_body click_anchor'
				}).getContainer();
			}

			// 弹层内容区
			var html2 = [
				'<div class="G-frameUserToolbarCon">',
					'<div class="G-frameUserToolbarConUserInfo">',
						'<span class="G-frameUserToolbarConUserInfoName"/>',
						'<ul class="G-frameUserToolbarConUserInfoOp"/>',
					'</div>',
					'<div class="G-frameUserToolbarConUserFinance">',
						LANG('产品切换'),
					'</div>',
					'<div class="G-frameUserToolbarConSitelistCon">',
					'</div>',
				'</div>'
			].join('');
			doms.tooltipCon.html(html2);

			doms.userInfo = $('.G-frameUserToolbarConUserInfo', doms.tooltipCon);
			doms.username = $('.G-frameUserToolbarConUserInfoName', doms.tooltipCon);
			doms.opList = $('.G-frameUserToolbarConUserInfoOp', doms.tooltipCon);
			doms.finance = $('.G-frameUserToolbarConUserFinance', doms.tooltipCon);
			doms.sitelistCon = $('.G-frameUserToolbarConSitelistCon', doms.tooltipCon);


			// 生产功能列表
			util.each(c.list, function(item){
				doms.opList.append([
					'<li>',
						'<a href="'+item.link+'">',
							util.html(LANG(item.text)),
						'</a>',
					'</li>'
				].join(''));
			});

			// 根据弹层高度计算sitelist的高度
			// var height = +this.get('tooltip').getConfig('height') - doms.userInfo.outerHeight() - doms.finance.outerHeight();

			// 绑定事件
			self.uiBind(doms.box, 'click', 'eventButtonClick');

			self.update();
		},
		update: function(){
			// var user = pubjs.getUser().current;
			var user = pubjs.getUser();
			this.$doms.name.text(
				user && (user.Name || user.Email) || LANG('未登录')
			);
			this.$doms.username.text(
				user && (user.Name || user.Email) || LANG('未登录')
			);

			return this;
		},
		eventButtonClick: function(){
			var self = this;
			self.$.tooltip.show();
			self.$doms.box.toggleClass('act', true);

			return false;
		},
		/**
		 * 用户登录后的响应函数
		 * @param  {Object}  ev 消息对象
		 * @return {Boolean}    阻止广播
		 */
		onSysUserLogin:function(ev){
			this.update();
			return false;
		},
		/**
		 * 用户退出后的响应函数
		 * @param  {Object}  ev 消息对象
		 * @return {Boolean}    阻止广播
		 */
		onSysUserLogout:function(ev){
			this.update();
			return false;
		}
	});
	exports.base = UserToolbar;
});