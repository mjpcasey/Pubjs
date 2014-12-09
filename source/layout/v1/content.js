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

	// 固定高度 -列表
	var Base = view.container.extend({
		init: function(config, parent){
			this.$config = pubjs.conf(config, {
			});
			this.Super('init', arguments);
		},
		build: function(noAfterBuild){
			var self = this;
			if (self.$ready){ return self; }
			self.$ready = 1;

			var c = this.getConfig();
			var el = c.el;
			if (!el){
				if (c.tag === 'body'){
					el = $('body:first');
				}else {
					el = $('<'+c.tag+'/>');
				}
			}
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
			// 强制加上类名
			el.addClass('G-frameBodyContainer');

			// 保存元素
			self.$el = el;
			if (c.view_model) {
				if (!pubjs.MVVM) {
					pubjs.log('the plugin mvvm is not require');
				}
				el.removeAttr('ms-skip');
				// 给vm添加命名空间
				el.attr('ms-controller', this._.uri);
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
				el.attr('ms-skip', 1);
			}

			function _build() {
				// 插入元素到目标容器
				if (!c.el && el && c.tag !== 'body' && c.target){
					self.appendTo(c.target);
				}
				// 调用后续构建函数
				if (!noAfterBuild && util.isFunc(self.afterBuild)){
					self.afterBuild();
				}
				if (c.view_model) {
					pubjs.MVVM.scan(el[0], pubjs.GlobalVM);
				}

				self.syncHeight();

			}

			// 加载模板
			if (c.tplFile) {
				pubjs.sync();
				pubjs.data.loadFile(c.tplFile, function(err, tpl) {
					if (err) {
						pubjs.log('load template [[' + c.tplFile + ']] error');
					} else {
						el.append(tpl.replace(lang_pattern, lang_replace));
					}
					_build();
					pubjs.sync(true);
				});
				return self;
			}

			if (c.html){
				el.html(c.html);
			} else if (c.text){
				el.text(c.text);
			}

			_build();



			return self;
		},
		syncHeight: function(){
			var h = $(window).height();
			var header = 50+20;
			this.$el.height(h-header);

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
				top: self.$container.get(0).offsetTop,
				bottom: 20 // 下边据20px
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

			self.$tabCon = $('<ul class="G-frameBodyTab uk-tab mb20">').appendTo(el);
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
				top: self.$container.get(0).offsetTop,
				bottom: 20 // 下边据20px
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
			var self = this;
			self.$config = pubjs.conf(config, {
				// 容器元素 (可指定容器的DOM元素而不创建)
				'el': null,
				// 容器标签
				'tag': 'div',
				// 容器插入目标DOM对象
				'target': parent,
				// 容器文字内容
				'text': null,
				// 容器HTML内容 (HTML内容如果设置, 将覆盖文字内容)
				'html': null,
				// 对象CSS类
				'class': null,
				// 容器属性对象, 调用jQuery的attr方法直接设置
				'attr': null,
				// 容器Style属性对象, 调用jQuery的css方法直接设置
				'css': null,
				// 表单标题
				'title': '',

				// 模板路径
				'tplFile': ''
			});
			self.$el = null;

			// 构建元素
			self.build();
		},
		syncHeight: function(){
			var h = $(window).height();
			var header = 50+20+46;
			this.$el.height(h-header);

			return this;
		},
		getDOM: function(){
			return this.$content;
		},
		getContainer: function(){
			return this.$content;
		},
		build: function(noAfterBuild){
			var self = this;
			var c = this.getConfig();
			var wrap = this.$el = $('<div class="G-frameBodyContainer"><div class="content" /></div>');


			self.createAsync('scroller', '@base/common/base.scroller', {
				'target': wrap,
				'content': wrap.find('.content'),
				'dir': 'V',
				'watch': 200
			});

			// 设置初始属性
			if (c.attr){
				wrap.attr(c.attr);
			}
			if (c.css){
				wrap.css(c.css);
				wrap.css({'position': 'relative'});
			}
			var cls = c['class'];
			if (cls){
				wrap.addClass(
					util.isArray(cls) ? cls.join(' ') : cls
				);
				wrap.addClass('M-containerScroll');
			}

			// 保存元素
			var el = this.$content = wrap.find('.content');


			$('<div class="M-containerScrollTitle"/>').text(c.title).appendTo(el);


			this.$doms = {
				content: wrap.find('.content'),
				title: wrap.find('.M-containerScrollTitle')
			};

			if (c.view_model) {
				if (!pubjs.MVVM) {
					pubjs.log('the plugin mvvm is not require');
				}
				el.removeAttr('ms-skip');
				// 给vm添加命名空间
				el.attr('ms-controller', this._.uri);
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
				el.attr('ms-skip', 1);
			}

			function _build() {
				// 插入元素到目标容器
				if (wrap && c.target){
					wrap.appendTo(c.target);
				}
				// 调用后续构建函数
				if (!noAfterBuild && util.isFunc(self.afterBuild)){
					self.afterBuild();
				}
				if (c.view_model) {
					pubjs.MVVM.scan(el[0], pubjs.GlobalVM);
				}

				self.syncHeight();
			}


			// 加载模板
			if (c.tplFile) {
				pubjs.sync();
				pubjs.data.loadFile(c.tplFile, function(err, tpl) {
					if (err) {
						pubjs.log('load template [[' + c.tplFile + ']] error');
					} else {
						el.append(tpl.replace(lang_pattern, lang_replace));
					}
					_build();
					pubjs.sync(true);
				});
				return self;
			}else{
				if (c.text){
					el.text(c.text);
				}

				if (c.html){
					el.html(c.html);
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


