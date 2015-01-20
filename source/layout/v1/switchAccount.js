define(function(require,exports){
	var $ = require("jquery");
	var pubjs = require('pubjs');
	var view	= require('@base/view');
	var util = require('util');

	//切换用户账号模块
	var list = view.container.extend({
		init:function(config){
			config = pubjs.conf(config,{
				urlGetAccount:'',
				'view_model':{
					'keyword':'',
					'accountList':[],
					'accountListShow':[],
					evOnInput:this.eventOnInput,
					evSelectAccount:this.eventSelectAccount,
					evClearInput:this.eventClearInput,
				},
				//TODO:需要配置
				'urlSwitchAccount':'',

			});

			this.Super('init',arguments);

		},
		afterBuild:function(){
			var el = this.getDOM();
			var c = this.getConfig();

			el.append([
				//插入html代码
				'<div class="M-switchAccountPanel">',
					'<div class="M-accountSearch">',
						'<div class="wrapper">',
							'<input tpye="text" ms-duplex-string="keyword" class="M-accountInput">',
							'<em class="uk uk-close" ms-click="evClearInput()"></em>',
						'</div>',
					'</div>',
					'<div class="M-accountBoxContainer">',
						'<ul class="M-accountBox">',
							'<li class="M-accountBoxItem" ms-repeat-account="accountList" ms-visible="!account.hide" ms-click="evSelectAccount(account)" ms-html="account.renderHtml">',
									'<strong ms-text="account.renderName"></strong><br />',
									'<span class="M-accountEmail" ms-text="account.renderEmail"></span>',
							'</li>',
						'</ul>',
					'</div>',
				'</div>',

			].join(''));


			var self = this;
			
				// 滚动条
			self.createAsync('sideScroller', '@base/common/base.scroller', {
				"target": $('.M-accountBoxContainer', el),
				"content": $('.M-accountBox', el),
				"dir": 'V',
				"size": 3,
				'pad': false,
				"watch": 200,
				'offset': 5
			});


			//test~
			setTimeout(function(){
						var data = [
						{name:'小明',email:'12231321@dddd.com',hide:true},

						{name:'Egoist',email:'12231321@dddd.com',},
						{name:'守护中二病协会',email:'papapapa.cn',},
						{name:'大天使之贱',email:'blabla.cn',},
						{name:'37wan',email:'blabla@dsfs.com',},
						{name:'37wandddsdfwer',email:'blabla@dsfs.com',},
					];
				self.setData({accountList:data});
				self.accountFilter();
			},1000);

			//监听keyword
			var self = this;
			this.vm.watch('keyword',function(newval,oldval){
				self.accountFilter(newval);

			});
		
		},

		load:function(){
			//加载账号数据
			// this.setData();
			return this;
		},	
		getData:function(){

		},
		setData:function(data){
			
			this.vm.setData(data);
			return this;
		},
		reset:function(){
			this.vm.reset();			
			return this;
		},
		//清空账号搜索
		eventClearInput:function(){
			this.setData({keyword:''});
		},
		eventSelectAccount:function(account){
			
			this.switchAccount(account);
		},
		accountFilter:function(keyword){
			//优化搜索提示
			var list = this.vm.$.accountList;
			for (var i = 0; i < list.length; i++) {
				this.renderAccount(list[i],keyword);
			}
			this.setData({accountList:list});
		
		},

		renderAccount:function(account,keyword){
			keyword = keyword || '';
		
			//处理关键字中正则的特殊字符
			keyword = keyword.replace(/(\*|\.|\?|\+|\$|\^|\[|\]|\(|\)|\{|\}|\||\\|\/)/g, function(str){
				return '\\' + str;
			});

			//设定 hide 字段，hide字段决定是否显示，renderHtml渲染
			account.hide = false;//先设置为全部可显示

			var regS = new RegExp(keyword , "gi");
			function wrapTag(str,keyword){
				return keyword && str ? str.replace(regS,function(str){return '<strong>' + str + '</strong>';}):str;
			}
			if (regS.test(account.name) || regS.test(account.email)) {
				  account.renderHtml = '<p>' + wrapTag(account.name,keyword) + '</p>' + wrapTag(account.email,keyword);
			} else {
				account.hide = true;
			}		
		},
		switchAccount:function(account){
			//请求后台切换账号
			var url = this.getConfig('urlSwitchAccount');
			pubjs.mc.send(url,{},function(){
				window.reload();//重刷页面
			});
		}


	});

	exports.main = list;


});