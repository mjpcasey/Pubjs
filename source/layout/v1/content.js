define(function(require,exports) {
	var $ = require('jquery');
	var pubjs = require('pubjs');
	var util = require('util');
	var view = require('@base/view');


	// 替换语言标记
	var lang_pattern = /\{\% (.+?) \%\}/g;
	function lang_replace(full, text){
		return LANG(text);
	}

	/** ----    列表     ---- **/

	// 无侧边栏列表页
	var Base = view.container.extend({
		init: function(config, parent){
			this.$config = pubjs.conf(config, {
			});
			this.Super('init', arguments);
		},
		build: function(noAfterBuild){
			this.Super('build', arguments);

			this.$el.addClass('G-frameBodyContainer');
			this.updateHeight();
			return self;
		},
		updateHeight: function(){
			// 总高度
			var frame = $(window).height();
			// 头部高度
			var header = $('.G-frameHeadWrapper').height();

			this.$el.outerHeight(frame-header);

			return this;
		}
	});
	exports.base = Base;

	// 两列布局，附带侧边栏
	var SidebarContainer = view.container.extend({
		init: function(config, parent){
			var self = this;

			self.$config = pubjs.conf(config, {
				'class': 'M-containerSidebar'
			});

			self.$el = null;
			self.$sidebar = null;
			self.$container = null;

			self.$menuHide = false;		// 左侧菜单栏是否隐藏
			self.$sidebarHide = false;	// 右侧工具栏是否隐藏

			self.build();
		},
		build: function(){
			var self = this;
			var c = self.getConfig();

			var el = self.$el = $('<div></div>').appendTo(c.target);

			// 设置初始属性
			if (c.attr){
				el.attr(c.attr);
			}
			if (c.css){
				el.css(c.css);
			}
			var cls = c['class'];
			if (cls){
				el.addClass(
					util.isArray(cls) ? cls.join(' ') : cls
				);
			}
			if (c.html){
				el.html(c.html);
			}else if (c.text){
				el.text(c.text);
			}

			self.$container = $('<div class="G-frameBodyContainer"/>').appendTo(el);
			self.$sidebar = $([
				'<div class="G-frameBodySidebar">',
					'<div class="G-frameBodySidebarFlex">',
						'<i class="G-frameBodySidebarIcon  angle_double_right"/>',
					'</div>',
					'<div class="G-frameBodySidebarWrapper">',
						'<div class="G-frameBodySidebarContent"/>',
					'</div>',
				'</div>'
			].join('')).appendTo(el);

			self.$sidebarFlex = self.$sidebar.find('.G-frameBodySidebarFlex');

			self.uiBind(document, 'mousemove mouseout','eventToggleFlexBtn');
			self.uiBind(self.$sidebarFlex, 'click', 'eventToggleSideBar');

			// self.$sidebar.height($(window).height()-50);
			self.$container.width(self.$container.width()-200);

			// 绝对定位，保持内容区是填满状态
			self.$container.css({
				position: 'absolute',
				bottom: 0,
				top: self.$container.get(0).offsetTop
			});

			return self;
		},
		// 鼠标经过时显示或隐藏侧边栏
		eventToggleFlexBtn: function(evt, elm){
			var self = this;
			var x = evt.pageX;
			var y = evt.pageY;
			var w = $(window).width();
			var headHeight = 50; //@todo 获取platform 的header高度。doms.head.height();

			var toolsFlexWidth = self.$sidebarFlex.width();
			var toolsWidth = self.$sidebar.width();

			// 显隐右侧flex
			self.$sidebarFlex.toggleClass('act', (w - x <= toolsFlexWidth && y > headHeight) ? true : false);

			// 是否同时显示工具栏
			if(self.$sidebarHide){
				if(w - x <= toolsFlexWidth){
					self.$sidebar.toggleClass('act', false);
				}else if(w - x > toolsWidth){
					self.$sidebar.toggleClass('act', true);
				}
			}
		},
		// 切换侧边栏
		eventToggleSideBar: function(evt, elm){
			var self = this;

			self.$sidebar.toggleClass('act', !self.$sidebarHide);
			self.$sidebarFlex.toggleClass('act', !self.$sidebarHide);
			self.$sidebarFlex.find('i').toggleClass('pin', !self.$sidebarHide);
			self.$sidebar.find('.G-frameBodySidebarContent').toggleClass('act_right', !self.$sidebarHide);


			// 更新状态
			self.$sidebarHide = !self.$sidebarHide;

			this.updateWidth();
			this.cast('toolsToggle');
			return false;
		},
		// 更新宽度
		updateWidth: function(){
			var sidebar = 200 *2;	// 左右侧栏宽度
			var padding = 20*2;		// 内边距
			var w = $(window).width()-sidebar-padding;

			w = this.$sidebarHide ? w+200: w;
			w = this.$menuHide ? w+200: w;
			this.$container.width(w);
		},
		// 创建业务模块
		createBusiness: function(name, uri, param, callback){
			if(util.isFunc(param)){
				callback = param;
				param = null;
			}

			var mod = this.get(name);
			if(!mod){
				var config = $.extend({}, {
					target: this.getContainer(),
					targetSidebar: this.getSidebar()
				}, param);

				this.createAsync(name, uri, config, function(mod){
					if(util.isFunc(callback)){
						callback(mod, false);
					}
				});
			}else{
				if(util.isFunc(callback)){
					callback(mod, true);
				}
			}
		},
		getConfig: function(name){
			return this.$config.get(name);
		},
		setConfig: function(name, value){
			this.$config.set(name, value);
			return this;
		},
		append: function(){
			var el = this.$el;
			if (el){
				el.append.apply(el, arguments);
			}
			return this;
		},
		/**
		 * 把当前容器插入到指定的容器中
		 * @param  {Object} target 容器实例或者jQuery对象实例
		 * @return {Object}        Container实例
		 */
		appendTo: function(target){
			if (target){
				if (util.isString(target)){
					this.$el.appendTo(target);
				}else {
					this.$el.appendTo(target.jquery ? target : target.getDOM());
				}
			}
			return this;
		},
		getContainer: function(){
			return this.$container;
		},
		getDOM: function(){
			return this.$container;
		},
		getSidebar: function(){
			return this.$sidebar.find('.G-frameBodySidebarContent');
		},
		onSYSResize: function(ev){
			this.updateWidth();
		},
		onMenuToggle: function(ev){
			this.$menuHide = ev.param;
			this.updateWidth();
			this.cast('menuToggle');
			return false;
		}
	});
	exports.sidebar = SidebarContainer;

	// 选项卡切换容器和侧边栏
	var TabSidebarContainer = SidebarContainer.extend({
		init: function(config, parent){
			this.$config = pubjs.conf(config, {
				'class': 'M-containerTabSidebar'
			});

			this.$first = true;		// 首个创建的tab有act状态
			this.$current = '';		// 保存当前激活模块名
			this.$data = {};		// 数据，分别按组保存了两个容器

			this.Super('init', arguments);
		},
		build: function(){
			var self = this;
			var c = self.getConfig();

			var el = self.$el = $('<div></div>').appendTo(c.target);

			var cls = c['class'];
			if (cls){
				el.addClass(
					util.isArray(cls) ? cls.join(' ') : cls
				);
			}

			self.$tabCon = $('<ul class="G-frameBodyTab uk-tab">').appendTo(el);
			self.$container = $('<div class="G-frameBodyContainer"/>').appendTo(el);
			self.$sidebar = $([
				'<div class="G-frameBodySidebar">',
					'<div class="G-frameBodySidebarFlex">',
						'<i class="G-frameBodySidebarIcon  angle_double_right"/>',
					'</div>',
					'<div class="G-frameBodySidebarWrapper">',
						'<div class="G-frameBodySidebarContent"/>',
					'</div>',
				'</div>'
			].join('')).appendTo(el);

			self.$sidebarFlex = self.$sidebar.find('.G-frameBodySidebarFlex');

			self.uiBind(document, 'mousemove mouseout','eventToggleFlexBtn');
			self.uiBind(self.$sidebarFlex, 'click', 'eventToggleSideBar');

			// self.$sidebar.height($(window).height()-50);
			self.$container.width(self.$container.width()-200);

			// 绝对定位，保持内容区是填满状态
			self.$container.css({
				bottom: 0,
				position: 'absolute',
				top: self.$container.get(0).offsetTop
			});

			return self;
		},
		createBusiness: function(name, uri, param, callback){
			if(util.isFunc(param)){
				callback = param;
				param = null;
			}

			// 已经存在,直接调用callback
			if(this.$data[name]){
				var mod = this.get(name);
				if(util.isFunc(callback)){
					callback(mod, true);
				}
				return false;
			}

			// 创建容器
			var item = this.buildContainers(name, param, this.$first);

			// 返回给业务模块双容器
			var config = $.extend({}, {
				target: item.container,		// 主内容容器
				targetSidebar: item.sidebar // 侧边栏容器
			}, param);

			// 创建业务模块
			this.createAsync(name, uri, config, function(mod){
				if(util.isFunc(callback)){
					callback(mod, false);
				}
			});
		},
		// 创建选项卡和容器
		buildContainers: function(name, param, first){
			var dom = this.$tabCon;

			// 创建选项卡
			var el = $('<li data-name="'+name+'"><a>'+param.tabText+'</a></li>').appendTo(dom);
			this.uiBind(el, 'click', 'eventSwitchTab');

			// 创建容器
			var conContent = $('<div/>').appendTo(this.$container).hide();
			var conSidebar = $('<div/>').appendTo(this.$sidebar.find('.G-frameBodySidebarContent')).hide();

			// 保存数据
			this.$data[name] = {
				container: conContent,
				sidebar: conSidebar
			};

			// 对首项目设置激活状态
			if(first){
				this.$first = false;
				this.setActived(name);
			}

			return this.$data[name];
		},
		setActived: function(name){
			var dom = this.$tabCon.find('li[data-name="'+name+'"]');

			// 更新tab激活状态
			dom.addClass('uk-active');

			// 显示新模块容器
			var mod = this.$data[name];
			mod.container.show();
			mod.sidebar.show();

			// 更新最新模块名
			this.$current = name;
		},
		eventSwitchTab: function(ev, dom){
			dom = $(dom);

			// 如果已经是激活状态，不切换
			var activated = dom.hasClass('uk-active');

			// 切换容器
			if(!activated){

				// 隐藏旧模块
				var old = this.$current;
				var mod = this.$data[old];
				mod.container.hide();
				mod.sidebar.hide();

				// 清除旧项目的激活样式
				dom.siblings().removeClass('uk-active');

				// 为新项目设置激活状态
				var name = dom.attr('data-name');
				this.setActived(name);

				this.cast('tabChange')
			}

			return false;
		}
	});
	exports.tabSidebar = TabSidebarContainer;


	// 超过屏幕高度时有滚动条 -表单
	var Scroll = view.container.extend({
		init: function(config, parent){
			this.$config = pubjs.conf(config, {
			});
			this.Super('init', arguments);
		},
		updateHeight: function(){
			// 总高度
			var frame = $(window).height();
			// 头部高度
			var header = $('.G-frameHeadWrapper').height();
			// 边距值
			var padding = 20;

			this.$el.height(frame-header);

			return this;
		},
		getDOM: function(){
			return this.$doms.container;
		},
		getContainer: function(){
			return this.$doms.container;
		},
		build: function(noAfterBuild){
			var self = this;
			var c = this.getConfig();

			// 外部容器
			var wrapper = this.$el = $('<div class="M-containerScroll"></div>');

			// 内部容器
			var container = $('<div class="content" />').appendTo(wrapper);

			// 表单标题
			var title = $('<div class="M-containerScrollTitle"/>').appendTo(container);


			// 滚动条
			self.createAsync('scroller', '@base/common/base.scroller', {
				'dir': 'V',
				'watch': 200,
				'target': wrapper,
				'content': wrapper.find('.content')
			});

			this.$doms = {
				container: container,
				title: title
			};

			// 外部容器设置初始属性
			if (c.attr){
				wrapper.attr(c.attr);
			}
			if (c.css){
				wrapper.css(c.css);
				wrapper.css({'position': 'relative'});
			}
			var cls = c['class'];
			if (cls){
				wrapper.addClass(
					util.isArray(cls) ? cls.join(' ') : cls
				);
				wrapper.addClass('M-containerScroll');
			}


			// 内部容器 MVVM
			if (c.view_model) {
				if (!pubjs.MVVM) {
					pubjs.log('the plugin mvvm is not require');
				}
				container.removeAttr('ms-skip');
				// 给vm添加命名空间
				container.attr('ms-controller', this._.uri);
				// 定义vm
				var $vm = pubjs.MVVM.define(this._.uri, function(vm){
					util.each(c.view_model, function(vm_value, vm_field) {
						if (util.isFunc(vm_value)) {
							vm[vm_field] = function() {
								vm_value.apply(self, arguments);
							}
						} else {
							vm[vm_field] = util.clone(vm_value);
						}
					});
				});
				self.vm = pubjs.MVVM.buildVMCtrl(this._.uri, $vm, c.view_model, self);
			} else {
				// 非MVVM模块禁止扫描
				container.attr('ms-skip', 1);
			}

			function _build() {
				// 插入元素到目标容器
				if (wrapper && c.target){
					wrapper.appendTo(c.target);
				}
				// 调用后续构建函数
				if (!noAfterBuild && util.isFunc(self.afterBuild)){
					self.afterBuild();
				}
				if (c.view_model) {
					pubjs.MVVM.scan(container[0], pubjs.GlobalVM);
				}

				self.updateHeight();
			}


			// 加载模板
			if (c.tplFile) {
				pubjs.sync();
				pubjs.data.loadFile(c.tplFile, function(err, tpl) {
					if (err) {
						pubjs.log('load template [[' + c.tplFile + ']] error');
					} else {
						container.append(tpl.replace(lang_pattern, lang_replace));
					}
					_build();
					pubjs.sync(true);
				});
				return self;
			}else{
				if (c.text){
					container.text(c.text);
				}

				if (c.html){
					container.html(c.html);
				}
				_build();
			}

			return self;
		},
		setCrumbs: function(text){
			if(util.isArray(text)){
				text = text.join('/');
			}
			this.$doms.title.text(text);
		}
	});
	exports.scroll = Scroll;

});


