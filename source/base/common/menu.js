define(function( require, exports ){
	var $ = require('jquery');
	var pubjs = require('pubjs');
	var util  = require('util');
	var view  = require('@base/view');

	// 下拉菜单面板
	var Menu = view.container.extend({
		init: function( config ) {
			config = pubjs.conf( config, {
				'target': pubjs.DEFAULT_POPUP_CONTAINER,
				'trigger': null,		// 模块创建触发源
				'algin': 'left-bottom',	// 对齐方式
				// 'width': 0,		        // 选项宽度(暂无默认宽度)
				'height': 30,			// 选项高度
				'scroll_height': 0,		// 有滚动条时整个菜单的<自定义>高度
				'offsetTop': 0,			// 顶部偏移量(用于调整位置)
				'offsetLeft': 0,		// 左侧偏移量
				'space': 5,				// 弹出菜单与触发元素的间距
				'line_space': 5,		// 分割线与选项的间距
				'hasGroup': false,		// 是否进行菜单分组
				'groupKey': 'group',	// 菜单分组字段依据
				'pageX': 0,				// 自定义菜单横坐标
				'pageY': 0,				// 自定义菜单纵坐标
				'options': null,		// 自定义选项<数组形式>
				'option_render': null,	// 选项渲染函数
				'multi': false,			// 是否支持多选(checkbox)
				'auto_destroy': false,	// <单选>情况下,选项点击后销毁模块
				'url': null,			// 选项数据拉取地址
				'key': 'id',			// 选项 关键字 字段名
				'name': 'name',			// 选项 显示文字 字段名
				'skey': 'subs',			// 选项 子项关键字 字段名
				'sub_dir': 'right',		// 子菜单的展开方向<只能是right或left>
				'param': null,			// 拉取数据时的参数
				'auto_load': true,		// 自动拉取数据
				'search': false,		// 是否含有搜索框,如果有设置为keyup或者button
				'callback': null,		// 选中数据后的回调函数
				'relate_elm': null,		// 关联元素
				'data_set': null,		// 设置菜单展开后的选中数据
				'auto_send': false,		// 拉取数据后自动发消息
				'reqType': 'ajax',		// 默认通信方式使用ajax，可选websocket
				'z': 10000				// 菜单zindex
			});
			this.$subArr = [];			// 存放下一级子菜单
			this.$subMenuSelected = {};	// 存放子菜单的选中数据
			this.$count = 0;			// 含有子菜单的选项计数(sub-id属性)
			this.$data = {};			// 选项数据缓存
			this.$fmod = {};			// 父选项信息缓存
			this.$timeStamp = 0;		// 记录事件发生时间戳
			this.$doms = {};			// DOM缓存
			this.Super( 'init', arguments );
		},
		afterBuild: function() {
			var self = this;
			var C = self.getConfig();
			self.$el = self.getDOM();
			// 设置选项数据
			if( C.url && C.auto_load ) {
				self.load();
			}
			else {
				self.setData( C.options );
			}
		},

		/**
		 * [setData 设置整个菜单的选项数据]
		 * @param {[type]} options [数据选项<数组>]
		 */
		setData: function( options ) {
			var self = this;
			var C = self.getConfig();
			self.createPanel( options );
			self.$data = C.options = options;
		},

		/**
		 * [getData 整个菜单的选项数据]
		 * @param {[type]} options [数据选项<数组>]
		 */
		getData: function() {
			return this.$data;
		},

		/**
		 * [getValue 返回菜单选中的数据]
		 */
		getValue: function() {
			var options = this.$doms.options.find('.option');
			var data = [];
			for( var i = 0, len = options.length; i < len; i++ ) {
				var checkBox = options.eq(i).find('.M-MenuCheckBox');
				var elma = options.eq(i).find('a');
				if( checkBox.hasClass('M-MenuChecked') ) {
					data.push({
						'id': elma.attr('data-id'),
						'text': elma.text()
					});
				}
			}
			return data;
		},

		/**
		 * [setValue 设置菜单展开后的选中数据]
		 * @param {[Array]} sets [数据选项<数组>]
		 */
		setValue: function( sets ) {
			var self = this;
			var C = self.getConfig();
			var options = this.$doms.options;
			if( !util.isArray( sets ) || sets.length === 0 || !sets[0] ) {
				return;
			}
			util.each( sets, function( item, idx ) {
				// 多选情况下的设置
				if( C.multi ) {
					options
					.find('a[data-id='+ item.id +']')
					.find('.M-MenuCheckBox')
					.addClass('M-MenuChecked');
				}
				// 单选情况下的设置
				else {
					options
					.find('a[data-id='+ item[C.key] +']')
					.parent('.option')
					.addClass('act');
				}
			});
		},

		/**
		 * [load 拉取数据]
		 * @param  {[type]} param [参数]
		 */
		load: function( param ) {
			pubjs.sync();
			var C = this.getConfig();
			if( param ) {
				C.param = $.merge( C.param, param );
			}
			if( C.reqType === 'ajax' ) {
				pubjs.data.get( C.url, C.param, this );
			}
			else if( C.reqType === 'websocket' ) {
				pubjs.mc.send(
					C.url,
					$.extend({}, C.param ),
					this.onData.bind( this )
				);
			}
		},

		/**
		 * [onData 拉取数据回调]
		 * @param  {[type]} error [错误对象]
		 * @param  {[type]} data  [返回数据]
		 */
		onData: function( error, data ) {
			pubjs.sync(true);
			var self = this;
			var C = self.getConfig();
			if( error ) {
				pubjs.error( error.message );
				return;
			}
			self.setData( data.items );
			if( C.auto_send ) {
				self.fire( 'menuDataLoaded', {'data': self.$data});
			}
		},

		/**
		 * [groupDataFormat 分组数据格式化]
		 * @param  {[Array]} data [需要格式化的选项数组]
		 */
		groupDataFormat: function( data ) {
			var C = this.getConfig();
			var key = C.key, groupKey = C.groupKey, retArr = [];
			util.each( data, function( item, idx ) {
				retArr.push( item );
				if( item[key] === groupKey ) {
					retArr.push('-');
				}
			});
			return retArr;
		},

		/**
		 * [createPanel 创建菜单选项面板]
		 * @param  {[Array]} options [需要构建的选项数组]
		 */
		createPanel: function( options ) {
			var self = this;
			var opts = options;
			var C = self.getConfig();
			var elm = C.trigger;
			// 选项和分割线数目
			self.$itemSum = 0;
			self.$lineSum = 0;
			// 创建菜单外层面板
			self.$el.addClass('M-Menu');
			self.$doms.options = $('<ul class="M-MenuOptions"/>').appendTo( self.$el );
			// 创建选项
			if( C.hasGroup ) {
				opts = this.groupDataFormat( opts );
			}
			if( util.isArray( opts ) ) {
				util.each( opts, self.buildItems, self );
			}
			// 渲染选项样式
			self.renderItems().setZindex( C.z );

			// 定位菜单的出现位置
			if( $(elm).hasClass('hasSub') && $(elm).attr('sub-id') ) {
				self.setSubMenuPosition( elm );
			}
			else {
				self.setMenuPosition( elm );
			}

			// 如果有搜索框
			if( C.search == 'keyup' || C.search == 'button' ) {
				self.addSearch( C.search );
			}

			// 如果有多选需求
			if( C.multi ) {
				self.addConfirm();
			}
		},

		/**
		 * [buildItems 在each循环中创建选项]
		 * @param  {[type]} item [选项对象]
		 * @param  {[type]} idx  [数组下标]
		 */
		buildItems: function( item, idx ) {
			var self = this;
			var C = self.getConfig();
			var li = $('<li class="option"/>');
			var anchor, lyt;
			// 如果是分割线
			if( item === '-' ) {
				li.removeClass('option').addClass('option-line').css('margin', C.line_space + 'px 0');
				self.$lineSum++;
			}
			// 正常选项
			else {
				// 标题
				if( item[C.key] === C.groupKey ) {
					li.removeClass('option').addClass('option-title').text( item[C.name] );
				}
				// 选项
				else {
					anchor = $('<a href="#" data-id="'+ item[C.key] +'"/>');
					if( util.isFunc( C.option_render ) ) {
						lyt = C.option_render( idx, item, anchor ) || '';
					}
					else {
						lyt = item[C.name];
					}
					// 如果为多选则加上选择按钮
					if( C.multi ) {
						lyt = '<i class="M-MenuCheckBox"></i>' + lyt;
					}
					anchor.html( lyt );
					anchor.appendTo( li );
					// 含有子项，添加箭头
					if( item[C.skey] ) {
						li.addClass('hasSub')
						.attr( 'sub-id', self.$count++ )
						.append('<b class="M-MenuOptionsMore"/>');
						// 缓存子菜单
						self.$subArr.push( item[C.skey] );
					}
					self.$itemSum++;
				}
			}
			// 选项插入到ul中
			li.appendTo( self.$doms.options );
		},

		/**
		 * [renderItems 创建完选项后渲染选项样式]
		 */
		renderItems: function() {
			var self = this;
			var C = self.getConfig();
			var uh = C.height + 'px';
			// 设置菜单面板宽度
			if( C.width ) {
				self.$el.width( C.width );
				self.$menuWidth = C.width;
			}
			else {
				self.$menuWidth = self.$doms.options.width();
			}
			// 设置选项高度
			self.$el.find('.option').css({
				'height': uh,
				'line-height': uh
			});
			// 如果需要设置选中数据
			if( util.isArray( C.data_set ) && C.data_set.length !== 0 ) {
				self.setValue( C.data_set );
			}
			// 选项li的鼠标移入事件
			self.uiBind( self.$el.find('.option'), 'mouseenter', self.eventItemMouseEnter, self );
			// 选项点击事件
			if( C.multi ) {
				self.uiBind( self.$el.find('.option'), 'click', self.eventMultiItemSelect, self );
			}
			else {
				self.uiBind( self.$el.find('.option'), 'click', self.eventItemSelect, self );
			}
			// 点击模块内部不消失
			self.uiBind( self.$el, 'mouseup', self.eventClickModule, self );
			// 点击空白处移除模块
			self.uiBind( $('body'), 'mouseup', self.eventClickBlank, self );
			// 点击关联元素不消失
			if( C.relate_elm ) {
				self.uiBind( C.relate_elm, 'mouseup', self.eventClickModule, self );
			}
			return self;
		},

		/**
		 * [getSrcPosition 获取触发元素的位置]
		 * @param  {[type]} elm   [触发元素]
		 * @return {[Object]}     [包含left和top属性]
		 */
		getSrcPosition: function( elm ) {
			return $(elm).offset();
		},

		/**
		 * [getSrcSize 获取触发元素的宽高]
		 * @param  {[type]} elm   [触发元素]
		 * @return {[Object]}     [包含width和height]
		 */
		getSrcSize: function( elm ) {
			return {
				'width': $(elm).outerWidth(),
				'height': $(elm).outerHeight()
			}
		},

		/**
		 * [setMenuPosition 设置一级菜单的弹出位置]
		 * @param  {[type]} elm   [触发元素]
		 */
		setMenuPosition: function( elm ) {
			var self = this;
			var C = self.getConfig();
			var mLeft, mTop;
			// 触发元素的位置和尺寸
			var pos = self.getSrcPosition( elm );
			var size = self.getSrcSize( elm );
			//var ih = document[document.compatMode === "CSS1Compat" ? "documentElement" : "body"].clientHeight;
			var ih = document[document.compatMode === "CSS1Compat" ? "documentElement" : "body"].offsetHeight;
			// 保留高度
			var remain = 0;
			// 菜单总高度
			var menuHeight = self.$itemSum * C.height + self.$lineSum * ( C.line_space * 2 + 1 ) + 2;
			var al = C.algin.split('-');
			var lb = ( al[0] === 'left' && al[1] === 'bottom' );
			var rb = ( al[0] === 'right' && al[1] === 'bottom' );
			var lt = ( al[0] === 'left' && al[1] === 'top' );
			var rt = ( al[0] === 'right' && al[1] === 'top' );
			// 自定义位置
			if( C.pageX || C.pageY ) {
				mLeft = C.pageX;
				mTop = C.pageY;
			}
			else {
				// 左下
				if( lb ) {
					mLeft = pos.left;
					mTop = pos.top + size.height + C.space;
					remain = ih - mTop;
				}
				// 右下
				if( rb ) {
					mLeft = pos.left - self.$menuWidth + size.width;
					mTop = pos.top + size.height + C.space;
					remain = ih - mTop;
				}
				// 左上
				if( lt ) {
					mLeft = pos.left;
					mTop = pos.top - C.space - menuHeight;
					remain = pos.top;
				}
				// 右上
				if( rt ) {
					mLeft = pos.left - ( self.$menuWidth - size.width );
					mTop = pos.top - C.space - menuHeight;
					remain = pos.top;
				}
			}
			// 菜单定位
			self.$el.css({'left': mLeft + C.offsetLeft - 1, 'top': mTop + C.offsetTop});

			// 高度超出可视区使用滚动条
			if( C.scroll_height || ( menuHeight > remain && remain !== 0 ) ) {
				if( C.scroll_height ) {
					remain = C.scroll_height;
				}
				self.$el.css( 'height', remain );
				// 定位在上方的要重新设置top值
				if( lt || rt ) {
					self.$el.css( 'top', pos.top - C.space - remain );
				}
				self.createAsync('scroll', '@base/common/base.scroller', {
					'target': self.$el,
					'content': self.$doms.options,
					'dir': 'V'
				});
			}
		},

		/**
		 * [eventItemMouseEnter 选项li的鼠标移入/出事件]
		 * @param  {[type]} evt [事件]
		 * @param  {[type]} elm [元素]
		 */
		eventItemMouseEnter: function( evt, elm ) {
			var self = this;
			var sid = $(elm).attr('sub-id');
			var sub = self.get('subMenu');
			if( evt.type == 'mouseenter' ) {
				// 子菜单注销
				if( sub && ( !sid || sid != self.$sid ) ) {
					$(elm).siblings('li').removeClass('act');
					sub.destroy();
				}
				if( sid ) {
					var elma = $(elm).find('a');
					self.$fmod = {
						fid: elma.attr('data-id'),
						txt: elma.text()
					};
					$(elm).addClass('act');
					self.createSubMenu( elm );
					// 标记当前展开的子模块
					self.$sid = sid;
				}
			}
		},

		/**
		 * [createSubMenu 创建子菜单]
		 * @param  {[type]} elm [父级Item]
		 */
		createSubMenu: function( elm ) {
			var self = this;
			var C = self.getConfig();
			var sid = +$(elm).attr('sub-id');
			var sub = self.get('subMenu');
			if( !sub ) {
				self.create('subMenu', Menu, {
					'trigger': elm,
					'width': C.width,
					'height': C.height,
					'space': C.space,
					'multi': C.multi,
					'auto_destroy': C.auto_destroy,
					'line_space': C.line_space,
					'key': C.key,
					'name': C.name,
					'skey': C.skey,
					'options': self.$subArr[sid],
					'option_render': C.option_render,
					'search': C.search,
					'sub_dir': C.sub_dir,
					'z': ++C.z
				});
			}
		},

		/**
		 * [setSubMenuPosition 设置子菜单的具体弹出位置]
		 * @param  {[type]} elm [父级菜单]
		 */
		setSubMenuPosition: function( elm ) {
			var self = this;
			var C = self.getConfig();
			var pos = self.getSrcPosition( elm );
			var size = self.getSrcSize( elm );
			var mLeft = 0, mTop = 0;
			// 菜单总高度
			var subHeight = self.$itemSum * C.height + self.$lineSum * ( C.line_space * 2 + 1 ) + 2;
			var ih = document[document.compatMode === "CSS1Compat" ? "documentElement" : "body"].clientHeight;
			var iw = document[document.compatMode === "CSS1Compat" ? "documentElement" : "body"].clientWidth;
			var remain = 0;
			// 确定子菜单的展开方向
			if( iw - pos.left - size.width - C.space < self.$menuWidth || C.sub_dir === 'left' ) {
				self.setConfig('sub_dir', 'left');
				mLeft = pos.left - self.$menuWidth + C.space;
				mTop = pos.top;
			}
			else {
				self.setConfig('sub_dir', 'right');
				mLeft = pos.left + size.width + C.space;
				mTop = pos.top;
			}
			// 定位
			self.$el.css({'left': mLeft, 'top': mTop});
			// 超出高度滚动处理
			remain = ih - mTop;
			if( subHeight > remain && remain !== 0 ) {
				self.$el.css( 'height', remain );
				self.createAsync('scroll', '@base/common/base.scroller', {
					'target': self.$el,
					'content': self.$doms.options,
					'dir': 'V'
				});
			}
			return this;
		},

		/**
		 * [addSearch 添加搜索框]
		 * @param {[String]} type [搜索类型,keyup或者button]
		 */
		addSearch: function( type ) {
			var self = this;
			var sbox = $('<div class="M-MenuSearch"/>');
			var input = $('<input type="text" class="M-MenuSearchInput" placeholder="'+ LANG("请输入搜索内容") +'">').appendTo( sbox );
			var emClear = $('<em class="M-MenuSearchClearWord"/>').appendTo( sbox ).hide();
			var emBtn = $('<em class="M-MenuSearchBtnClick"/>').appendTo( sbox ).hide();
			// 搜索框插到选项ul之前
			sbox.insertBefore( self.$doms.options );
			input.focus();
			// DOM缓存
			self.$doms.searchInput = input;
			self.$doms.searchEmClear = emClear;
			self.$doms.searchEmBtn = emBtn;
			// 搜索类型
			switch( type ) {
				case 'keyup':
					emClear.show();
					self.uiBind( input, 'keyup', self.eventSearch, self );
				break;
				case 'button':
					emBtn.show();
					self.uiBind( emBtn, 'click', self.eventSearchBtnClick, self );
				break;
			}
			self.uiBind( emClear, 'click', self.eventSearchClear, self );
			// 鼠标移到搜索框上子菜单消失
			self.uiBind( sbox, 'mouseenter', self.eventSearchMouseEnter, self );
		},

		/**
		 * [eventSearch 搜索事件]
		 * @param  {[type]} evt   [事件类]
		 * @param  {[type]} input [事件源]
		 */
		eventSearch: function( evt, input ) {
			var self = this;
			var val = input === undefined ? '' : $(input).val().trim();
			self.searching( val );
		},

		/**
		 * [searching 搜索]
		 * @param  {[type]} val   [搜索词]
		 */
		searching: function( val ) {
			var self = this;
			var C = self.getConfig();
			var opts = C.options;
			var res = val === '' ? opts : self.filterOptions( val, opts );
			// 先清空选项 再创建
			self.$doms.options.empty();
			util.each( res, self.buildItems, self );
			self.renderItems();
		},

		/**
		 * [filterOptions 搜索中过滤选项]
		 * @param  {[type]} val  [搜索词]
		 */
		filterOptions: function( val, opts ) {
			var ret = [];
			var C = this.getConfig();
			opts = opts || C.options || [];
			var leng = opts.length;
			var isline = true;
			for( var i = 0; i < leng; i++ ) {
				if( opts[i] === '-' ) {
					if( isline ) {
						ret.push( opts[i] );
						isline = false;
					}
					continue;
				}
				var Name = opts[i][C.name].toLowerCase();
				if( Name.indexOf( val.toLowerCase() ) != -1 ) {
					ret.push( opts[i] );
					isline = true;
				}
			}
			// 开头和结尾不能有line
			if( ret[0] === '-' ) {
				ret.shift();
			}
			if( ret[ret.length-1] === '-' ) {
				ret.pop();
			}
			return ret;
		},

		/**
		 * [eventSearchClear 清除搜索框内容]
		 */
		eventSearchClear: function( evt, elm ) {
			var self = this;
			var C = self.getConfig();
			self.eventSearch();
			self.$doms.searchInput.val('').focus();
			if( C.search === 'button' ) {
				$(elm).hide();
				self.$doms.searchEmBtn.show();
			}
		},

		/**
		 * [eventSearchBtnClick 点击搜索按钮方式搜索]
		 */
		eventSearchBtnClick: function( evt, elm ) {
			var self = this;
			var opts = self.getConfig().options;
			var val = self.$doms.searchInput.val().trim();
			if( val === '' ) {
				self.$doms.searchInput.focus();
				return;
			}
			var res = self.filterOptions( val, opts );
			self.$doms.options.empty();
			util.each( res, self.buildItems, self );
			self.renderItems();
			$(elm).hide();
			self.$doms.searchEmClear.show();
		},

		/**
		 * [eventSearchMouseEnter 鼠标移到搜索框内也要消除子模块]
		 */
		eventSearchMouseEnter: function() {
			var self = this;
			var sub = self.get('subMenu');
			if( sub ) {
				sub.destroy();
			}
		},

		/**
		 * [addConfirm 菜单多选的情况下添加确认按钮]
		 */
		addConfirm: function() {
			var self = this;
			var cbox = $('<div class="M-MenuConfirm"/>');
			var btnConfirm = $('<input type="button" class="M-MenuConfirmButton" value="'+ LANG('确定') +'"/>').appendTo( cbox );
			self.uiBind( btnConfirm, 'click', self.eventClickConfirm, self );
			var btnAll = $('<input type="button" class="M-MenuConfirmAll" value="'+ LANG('全选') +'"/>').appendTo( cbox );
			var btnShift = $('<input type="button" class="M-MenuConfirmShift" value="'+ LANG('反选') +'"/>').appendTo( cbox );
			cbox.insertBefore( self.$doms.options );
			self.uiBind( btnAll, 'click', self.eventClickConfirmAll, self );
			self.uiBind( btnShift, 'click', self.eventClickConfirmShift, self );
		},

		/**
		 * [eventClickConfirmAll 多选情况下,点击全选按钮]
		 */
		eventClickConfirmAll: function() {
			this.$doms.options.find('.M-MenuCheckBox').addClass('M-MenuChecked');
		},

		/**
		 * [eventClickConfirmShift 多选情况下,点击反选按钮]
		 */
		eventClickConfirmShift: function( evt, elm ) {
			var options = this.$doms.options.find('.option');
			for( var i = 0, len = options.length; i < len; i++ ) {
				var checkBox = options.eq(i).find('.M-MenuCheckBox');
				if( checkBox.hasClass('M-MenuChecked') ) {
					checkBox.removeClass('M-MenuChecked');
				}
				else {
					checkBox.addClass('M-MenuChecked');
				}
			}
		},

		/**
		 * [eventClickConfirm 多选情况下,点击确定按钮]
		 * @param  {[type]} evt [事件类]
		 * @param  {[type]} elm [事件源]
		 */
		eventClickConfirm: function() {
			this.fire( 'multiMenuSelected', this.getValue() );
			this.destroy();
		},

		/**
		 * [eventMultiItemSelect 多选状态下,点击事件]
		 * @param  {[type]} evt [事件类]
		 * @param  {[type]} elm [事件源]
		 */
		eventMultiItemSelect: function( evt, elm ) {
			evt.preventDefault();
			evt.stopPropagation();
			// var elma = $(elm).find('a');
			var elmi = $(elm).find('i');
			// var hasSub = $(elm).hasClass('hasSub');
			$(elmi).toggleClass('M-MenuChecked');
		},

		/**
		 * [eventItemSelect 选项选中/点击事件]
		 * @param  {[type]} evt [事件类]
		 * @param  {[type]} elm [事件源]
		 */
		eventItemSelect: function( evt, elm ) {
			evt.preventDefault();
			evt.stopPropagation();
			elm = $(elm);
			// 有子菜单的不处理
			if ( elm.hasClass('hasSub') ) {
				return false;
			}
			var self = this;
			var elma = $(elm).find('a');
			var id = elma.attr('data-id');
			// 是标题的不处理
			if( id === this.getConfig('groupKey') ) {
				return false;
			}
			var fid = {
				elm: elm,
				key: id,
				data: util.find(self.getData(), id, self.getConfig('key')),
				name: elma.text()
			};
			self.fire( 'menuSelected', [fid] );
		},

		/**
		 * [onItemSelected fire 选项选中数据]
		 */
		onMenuSelected: function( ev ) {
			var self = this;
			var C = self.getConfig();
			// 接收子模块发的消息
			if( ev.from != self ) {
				ev.param.unshift({
					key: self.$fmod.fid,
					name: self.$fmod.txt
				});
			}
			// 如果配置有回调函数
			if( C.callback && util.isFunc( C.callback ) ) {
				C.callback.call( self, ev.param );
			}
			// 如果设置了自动销毁模块
			if( C.auto_destroy ) {
				setTimeout(function(){
					self.destroy();
				});
			}
		},

		/**
		 * [onMultiMenuSelected fire 一级菜单的选中数据(多选)]
		 */
		onMultiMenuSelected: function( ev ) {
			var self = this;
			var C = self.getConfig();
			// 如果配置有回调函数
			if( C.callback && util.isFunc( C.callback ) ) {
				C.callback.call( self, ev.param );
			}
		},

		/**
		 * [eventClickModule 点击模块内部]
		 * @param  {[type]} evt [事件源]
		 */
		eventClickModule: function( evt, elm ) {
			evt.stopPropagation();
			this.$timeStamp = evt.timeStamp;
		},

		/**
		 * [eventClickBlank 点击空白处移除模块]
		 * @param  {[type]} evt [事件源]
		 */
		eventClickBlank: function( evt ) {
			var self = this;
			if( self.$timeStamp != evt.timeStamp ) {
				self.destroy();
			}
		},

		/**
		 * [setZindex 设置Zindex,用于菜单重叠的情况]
		 * @param {[type]} z [值]
		 */
		setZindex: function( z ) {
			this.$el.css( 'z-index', z );
		}
	});
	exports.base = Menu;

	// 下拉菜单按钮
	var DropButton = view.container.extend({
		init: function( config ){
			config = pubjs.conf( config, {
				'height': 30,
				'Name': 'name',
				'Key': 'id',
				'name': '', // 显示值
				'id': null // 字段值
			});
			this.Super( 'init', arguments );
		},
		afterBuild: function() {
			var self = this;
			var C = self.getConfig();
			self.$el = self.getDOM();
			self.$el.addClass('M-MenuDrop');
			$([
				'<span class="M-MenuDropDom"/>',
				'<i class="M-MenuDropIcon"/>'
			].join('')).appendTo( self.$el );
			self.$doms = self.$el.find('.M-MenuDropDom');
			// 设置默认值
			self.$doms.attr( 'id', C.id ).text( C.name );
			self.$el.css({
				'height': C.height,
				'line-height': C.height + 'px'
			});
			self.uiBind( self.$el, 'click', self.eventButtonClick );
		},
		eventButtonClick: function() {
			this.fire('dropButtonClick', {
				'dom': this.$el
			});
			return false;
		},
		setValue: function( val ) {
			var c  = this.getConfig();
			this.$doms
			.attr('id', val[c.Key])
			.text( val[c.Name] );
		},
		getValue: function() {
			var c  = this.getConfig();
			var ret = {};
			ret[c.Key] = this.$doms.attr('id');
			ret[c.Name] = this.$doms.text();
			return ret;
		}
	});
	exports.button = DropButton;
});