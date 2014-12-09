define(function(require,exports){
	var	DOC = document,
		app = require("pubjs"),
		util = require('util'),
		$ = require("jquery"),
		content = require('@layout/v1/content');

	var Platform = app.Module.extend({
		init: function(config){
			var self = this;
			self.$config = app.conf(config, {
				'target': 'body',
				'modules': [ /** {name:'模块名', uri:'模块路径', target: '目标位置', config:配置} **/ ] // 子模块配置
			});

			self.$activeScenes = null;
			self.$delayUpdate = false;
			self.$containers = {};
			// self.$channelLink = []; // 保存uri的值

			self.$menuHide = false; // 是否隐藏菜单

			self.$headHeight = 50; // 页面头部header高度
			self.$bodyContentPadding = 40; //页面padding上下合计高度

			self.$timeoutId = null;

			self.build();
		},
		build: function(){
			var self = this;

			// 构建框架模块
			var html = [
				'<div id="SCENES_MAIN" class="G-frameScenes">',
					'<div class="G-frameWrapper">',
						'<div class="G-frameHeadWrapper">',
							'<div class="G-frameHead">',
								'<div class="G-frameHeadLogo">',
									'<a href="/"><img border="0"/></a>',
								'</div>',
								'<ul class="G-frameHeadMenu"/>',
								'<div class="G-frameHeadAdminSwitch" />',
								'<div class="G-frameHeadToolbar"/>',
								'<div class="G-frameHeadLanguage">',
									'<a href="#i18n/zhCN" title="中文" class="G-frameHeadLanguageCN"/>',
									'<a href="#i18n/enUS" title="English" class="G-frameHeadLanguageEN"/>',
								'</div>',
							'</div>',
						'</div>',
						'<div class="G-frameBody G-frameBodyFull">',
							'<div class="G-frameBodyMenu">',
								'<div class="G-frameBodyMenuFlex" data-type="menu">',
									'<i class="G-frameBodyMenuFlexIcon uk-icon-angle-double-left" ></i>',
								'</div>',
								'<div class="G-frameBodyMenuListWrapper">',
									'<div class="G-frameBodyMenuList"/>',
								'</div>',
								'<div class="G-frameBodyMenuFooter"/>',
							'</div>',
							'<div class="G-frameBodyContent">',
								'<div class="G-frameBodyContentWrapper">',
									// '<div class="G-frameBodyTitle">',
									// 	'<div class="G-frameBodyTitleText"/>',
									// 	'<div class="G-frameBodyTitleCrumbs"/>',
									// '</div>',
								'</div>',
							'</div>',
						'</div>',
					'</div>',
				'</div>',
				'<div id="SCENES_POPUP" class="G-frameScenes" />',
				'<div id="SCENES_LOGIN" class="G-frameScenes">',
					'<div class="G-frameLoginContainer" />',
				'</div>',
				'<div id="SCENES_PRELOADER"><b/><a/><em/><i/></div>'
			].join('');

			var body = self.$target = $(self.$config.get('target')).append(html);
			var doms = self.$doms = {
				'wrapper': $('.G-frameWrapper', body),
				'logo': $('.G-frameHeadLogo', body),
				'head': $('.G-frameHead', body),
				'toolbar': $('.G-frameHeadToolbar', body),
				'body': $('.G-frameBody', body),
				'titleCon': $('.G-frameBodyTitle', body),
				'title': $('.G-frameBodyTitleText', body),
				'menu': $('.G-frameBodyMenu', body),
				'menuFlex': $('.G-frameBodyMenuFlex', body),
				'menuFlexIcon': $('.G-frameBodyMenuFlexIcon', body),
				'menuListWrapper': $('.G-frameBodyMenuListWrapper', body),
				'menuList': $('.G-frameBodyMenuList', body),
				'footer': $('.G-frameBodyMenuFooter', body),
				'content': $('.G-frameBodyContent', body),
				'container': $('.G-frameBodyContentWrapper', body),
				'login_container': $('.G-frameLoginContainer', body),
				'SCENES_MAIN': $('#SCENES_MAIN'),
				'SCENES_POPUP': $('#SCENES_POPUP'),
				'SCENES_LOGIN': $('#SCENES_LOGIN')
			};

			// 初始化动态内容
			var C = app.config;
			// body.toggleClass('G-frameWideScreen', (WIN.screen.availWidth > 1024));

			// self.setTitle(app.config('login_title'));

			// 依次创建子模块
			var mods = self.$config.get('modules');
			var mod;
			for (var i = 0; i < mods.length; i++) {
				mod = mods[i];
				util.extend(mod.config, { target: self.getDOM(mod.target)})
				self.createAsync(mod.name, mod.uri, mod.config);
			}

			// 顶部信息设置
			doms.logo.find('a').attr('title', LANG(C('app_logo/title')))
				.find('img').attr('src', C('app_logo/small'));

			// self.create('toolbar', UserToolbar, {target: doms.toolbar});

			doms.footer.html(C('app_footer'));

			self.uiProxy(body, '.G-frameHeadLanguage > a', 'click', 'eventSwitchLang');

			self.uiBind(document, 'mousemove mouseout','eventToggleFlexBtn');
			self.uiBind(doms.menuFlex, 'click', 'eventToggleMenu');

			self.uiBind(window, 'resize.platform', 'eventResizeSyncHeight');

			// 预加载图标文件, 2秒后删除
			setTimeout(function(){
				$('#SCENES_PRELOADER', body).remove();
			}, 2000);

			// 监听logout登出
			self.userLogout();
		},
		// 同步菜单与内容区域高度
		syncHeight: function(){
			var self = this;
			var doms = self.$doms;
			var h = $(window).height();
			var headHeight = self.$headHeight;

			doms.menuListWrapper.height(h-headHeight);
			doms.content.height(h-headHeight);
			// doms.toolsContentWrapper.height(h-headHeight);
			return this;
		},
		// 更新模块状态
		update: function(mod, act){
			var self = this;
			self.$delayUpdate = (self.$activeScenes !== 'MAIN');
			if (!self.$delayUpdate){
				if(this.$.menu){
					this.$.menu.updateMenu(mod, act);
				}
				// self.updateMenu(mod, act);
			}else {
				self.$delayUpdate = [mod, act];
			}
			return self;
		},
		// 切换场景
		switchScenes: function(name){
			var self = this;
			var body = self.$target;

			name = name.toUpperCase();
			body.removeClass('appScenesLogin appScenesMain');
			switch (name){
				case 'MAIN':
					body.addClass('appScenesMain');
					break;
				case 'LOGIN':
					body.addClass('appScenesLogin');
					break;
				default:
					return self;
			}

			self.$activeScenes = name;
			if (name === 'MAIN' && self.$delayUpdate){
				self.update.apply(self, self.$delayUpdate);
			}

			return self;
		},
		// 设置窗口标题
		setTitle: function(title){
			DOC.title = title + ' - ' + app.config('app_title');
			return this;
		},
		// 设置头部标题
		setHeaderTitle: function(text){
			if(text){
				this.$doms.title.text(text);
				this.$doms.title.parent().show();
			}else{
				this.$doms.title.parent().hide();
			}
			return this;
		},
		// 获取容器DOM对象
		getDOM: function(name){
			if (name === 'popup'){
				name = 'SCENES_POPUP';
			}
			if (!name || !this.$doms[name]){
				name = 'container';
			}
			return this.$doms[name];
		},
		getContainer: function(name, scenes, no_create, type){
			if (!name){ name = 'container'; }

			var self = this;
			var list = self.$containers;
			var cont = list[name];
			if (!cont){
				if (no_create){
					return null;
				}

				var uri = '';
				switch(type){
					case 'scroll':
						uri = content.scroll;
					break;
					case 'sidebar':
						uri = content.sidebar;
					break;
					case 'tabSidebar':
						uri = content.tabSidebar;
					break;
					default:
						uri = content.base;
					break;
				}

				cont = list[name] = self.create(uri, {
					target: self.getDOM(scenes + '_container'),
					attr: {'container-name': name}
				});

			}else {
				if (scenes){
					cont.appendTo(self.getDOM(scenes + '_container'));
				}
			}
			return cont;
		},
		onSysUserLogin: function(){
			// 登录成功后，得到了用户权限信息，才能创建完整的菜单列表
			if(this.$.menu){
				this.$.menu.afterBuild();
			}
		},
		userLogout: function(){
			var self = this;
			app.mc.on('/logout',function(err,data){
				if (err){
					if (err.message){
						app.alert(err.message);
					}
					app.error(err);
					// 退出失败, 返回上一步地址
					app.controller.navigate(-1);
				}else {
					// 退出登录成功, 跳转到登陆接口
					var last_user = app.getUser();
					app.core.cast('sysUserLogout', last_user);
					app.setUser(null);
					self.setTitle(app.config('login_title'));
					app.controller.navigate(app.config('site_base'));

				}
			});
		},
		// 语言切换响应事件
		eventSwitchLang: function(evt, elm){
			var lang = $(elm).attr('href').substr(6);
			app.i18n.load(lang);
			location.reload();
			return false;
		},
		// 窗口大小改变更新高度
		eventResizeSyncHeight: function(evt, elm){
			var self = this;

			clearTimeout(self.$timeoutId);
			self.$timeoutId = setTimeout(function(){
				// 更新高度
				self.syncHeight();
				// 改变窗体大小，发送消息
				app.core.cast('sYSResize');
			}, 100);

			return false;
		},
		onSYSResize: function(ev){
			// 窗口改变时隐藏部分popup
			app.DEFAULT_POPUP_CONTAINER.find('.M-tooltip').hide();
			app.DEFAULT_POPUP_CONTAINER.find('.M-tableCustomColumn').hide();
		},
		// 鼠标经过时显示或隐藏两侧固定组件条
		eventToggleFlexBtn: function(evt, elm){
			var self = this;
			var doms = self.$doms;
			var x = evt.pageX;
			var y = evt.pageY;
			// var w = $(window).width();
			var headHeight = doms.head.height();

			var menuFlexWidth = doms.menuFlex.width();
			var menuWidth = doms.menu.width();

			// 显隐左侧flex
			doms.menuFlex.toggleClass('act', (x <= menuFlexWidth && y > headHeight) ? true : false);

			// 是否同时显示菜单栏
			if(this.$menuHide){
				if(x <= menuFlexWidth){
					doms.menu.toggleClass('act', false);
				}else if(x > menuWidth){
					doms.menu.toggleClass('act', true);
				}
			}

		},
		// 切换左右两侧栏
		eventToggleMenu: function(evt, elm){
			var self = this;
			var doms = self.$doms;
			// var type = $(elm).attr('data-type');

			doms.menu.toggleClass('act', !self.$menuHide);
			doms.menuFlex.toggleClass('act', !self.$menuHide);
			doms.menuFlexIcon.toggleClass('uk-icon-anchor', !self.$menuHide);
			doms.content.toggleClass('act_left', !self.$menuHide);

			// 更新状态
			self.$menuHide = !self.$menuHide;

			// app.core.cast('toggleMenu');
			app.core.cast('menuToggle', self.$menuHide);
			return false;
		},
		// 切换左侧菜单显示状态
		toggleMenu: function(show){
			this.$doms.body.toggleClass(
				'G-frameBodyFull',
				(show === undefined) ? show : !show
			);
			return this.syncHeight();
		}
	});
	exports.base = Platform;




});