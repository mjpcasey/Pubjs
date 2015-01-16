define(function(require, exports){
	var $ = require('jquery');
	var pubjs = require('@core/pub');
	var view = require('@base/view');
	var common = require('@base/common/base');
	var util = require('util');
	var dialog = require('@base/dialog');

	var menu = require('@base/common/menu');

	var labels = require('modules/labels');
	// var format = labels.format;
	labels = labels.labels;


	/**
	 *	参数说明 -@todo
	 *		@cols					主列（左侧）定义，
	 *		@metrics				副列（右侧），通常是指标列
	 *			@sort					默认是为true
	 *			@render					渲染函数，支持字符串和函数
	 *			@headerRender			标题渲染函数
	 *		@tab						tab 配置，如果没有就使用缺省配置；
	 *			{
	 *				"组名": true,			// 只传true时，以缺省配置补全
	 *				"组名":{Object 具体配置}
	 *			}
	 *		@操作列
	 *				支持cols中设置，也支持参数hasMenu
	 *				cols{ type: 'op'}}
	 *		@$sysParam:
	 *			metrics
	 *			page
	 *			limit
	 *			begindate、enddate
	 *			stastic_all_time
	 *
	 */
	var HighGrid = view.container.extend({
		init: function(config, parent){
			config = pubjs.conf(config, {
				'target': parent,
				'class': 'M-HighGrid',

				'cols': [],				// 列定义,type:op,index,id
				'metrics': [],			// 要显示的指标列，支持'{组名}'的形式过滤; 若不填，默认为tab参数中的cols的并集
				'tab': null,			// 指标分组配置信息；{'组名':{"text":"String", "cols":[]}}
				'subs': null,			// 子表格配置，eg: ['campaign', 'sweety']
				'url': null,			// 远程数据地址
				'param': {},			// 远程数据请求参数
				'data': null,			// 静态数据
				'default_metrics': [],	// 指标分组中属于默认组的指标，支持'{组名}'的形式过滤; 若不填，默认为metrics参数的值
				// 'default_sort': true,	// 默认栏目排序

				'hasSelect':false,		// 是否有多选列
				'hasMenu': false,		// 是否有操作列
				'hasSwitch': false,		// 是否有"切换到对比表格"功能
				'hasBatch': false,		// 是否有批量操作功能
				'hasExport': true,		// 是否有导出控件
				'hasRefresh': true,		// 是否有刷新控件
				'hasAutoRefresh': false,// 是否有自动刷新控件
				'hasAmount': true,		// 是否有总计模块
				'hasPager': true,		// 是否有分页模块
				'hasSubGrid': true,		// 是否有子表格模块
				'hasTab': true,			// 是否有指标分组模块

				'key': pubjs.config('grid/key')||'_id',
				"reqMethod":"get",		// 数据获取方式
				"reqType": "ajax",		// 默认通信方式使用ajax，可选websocket
				'subFilter': null,		// 子表格过滤函数
				'subField': '',			// 用于子表格作为父行的标识，如果没有设置此值，缺省使用gridName作为父行标识
				'auto_load': true,		// 自动加载数据
				'eventDataLoad': false, // 是否冒泡数据已加载完成事件
				'refreshTime': 10,		// 刷新间隔
				'refreshAuto': 0,		// 自动刷新中
				'pager': null,			// 分页模块配置信息
				'gridName': '',			// 本地缓存标识符，用于自定义默认指标、报表导出

				'style': {
					'selected': 'M-HighGridListRowSelected',	// 选中样式
					'highlight': 'M-HighGridListRowHighlight'	// 高亮样式
				},

				'wrapperClass': 'G-frameBodyContainer'			// 参照物标识符，计算高宽时使用
			});

			this.$data = config.get('data');

			this.$sort = '';					// 排序，impressions|-1

			this.$selects = [];
			this.$highlights = [];

			// 参数
			this.$sysParam = {};						// 系统参数
			this.$customParam = config.get('param');	// 自定义参数

			// 初始化 tab 参数配置
			this.initTabConfig(config);

			// 初始化 metrics 参数配置
			this.initMetricsConfig(config);

			this.Super('init', arguments);
		},
		// 初始化tab参数配置
		initTabConfig: function(config){
			var c = config.get();
			var customValue = c.tab;
			var defaultValue = pubjs.config('default_tab_cols');

			// 如果没有tab参数，使用缺省值代替
			if(!customValue || !util.isObject(customValue)){
				config.set('tab', defaultValue);
			}
			// 有tab参数，针对每组进行补全（即没有传具体组配置时，以缺省值补全）
			else{
				var tab = {};
				for (var i in customValue) {
					//
					if(customValue[i] === true){
						tab[i] = defaultValue[i];
					}else{
						tab[i] = customValue[i];
					}
				}
				config.set('tab', tab);
			}
		},
		// 初始化 metrics 参数配置
		initMetricsConfig: function(config){
			// 若无metrics 参数，则以tab参数("tab/组名/cols")下的并集作为默认值
			var c = config.get();
			if(c.hasTab && (!c.metrics || !c.metrics.length)){
				var metrics = [];
				var tab = c.tab;
				for (var e in tab) {
					metrics = metrics.concat(tab[e].cols);
				}
				config.set('metrics', metrics);
			}
		},
		/** ---------------- 创建 ---------------- **/
		afterBuild: function(){
			var c = this.getConfig();
			var el = this.getDOM();

			this.append($([
				'<div class="M-HighGridSubgrid"></div>',
				'<div class="M-HighGridHeader">',
					'<div class="M-HighGridHeaderLeft fl"></div>',
					'<div class="M-HighGridHeaderRight fr"></div>',
				'</div>',
				'<div class="M-HighGridList cl"></div>',
				'<div class="M-HighGridPager pt10 tr"></div>',
				'<div class="M-tableListLoading"></div>'
			].join('')));
			var con = el.find('.M-HighGridHeaderLeft');

			// 批量操作
			if(c.hasBatch){
				this.create('batch', Batch, {
					'target': con,
					'grid': this
				});
			}
			// 刷新控件
			if (c.hasRefresh){
				this.create('refresh', Refresh, {
					'target': con,
					'hasAuto': c.hasAutoRefresh,
					'refreshTime': c.refreshTime,
					'refreshAuto': c.refreshAuto
				});
			}

			// 导出控件
			if (c.hasExport){
				this.createAsync(
					'excel', '@base/highGrid.excelExport',
					util.extend(c.excelExport, {'target': con})
				);
			}

			// 切换对比栏
			if (c.hasSwitch){
				var gridSwitch = $('<div class="mr10 fl M-HighGridSwitch" title="'+LANG('对比报表')+'"><em/></div>').appendTo(con);
				this.uiBind(gridSwitch, 'click', 'eventSwitch');
			}

			// 指标分组
			if(c.hasTab){
				this.create('tab', Tab, {
					'tab': c.tab,
					'metrics': c.metrics,
					'gridName': c.gridName,
					'default_metrics': c.default_metrics,
					'target': el.find('.M-HighGridHeaderRight')
				});

				// 更新指标分组配置
				var custom = pubjs.storage('customTab/'+c.gridName);
				this.setConfig('metrics', custom ? custom.split(',') : this.getMetrics());
			}

			if (!c.data && c.auto_load && c.url){
				// 如果当前模块是隐藏状态，放入队列，等显示时候再加载数据 --eg:选项卡情况
				var isShowing = pubjs.checkDisplay(this, 'highgrid', this.load.bind(this));
				if(isShowing){
					// 更新列表数据
					this.reload();
				}
			}else{
				this.buildTable(); // 开始构建表格
			}
		},
		buildTable: function(){
			var c = this.getConfig();

			var el = this.getDOM();

			var hasMetrics = c.metrics && c.metrics.length;
			var layout = $([
				'<div class="'+(hasMetrics?'fl':'')+' M-HighGridListLayoutLeft">',
					'<div class="M-HighGridListCorner"></div>',
					'<div class="M-HighGridListSidebar"></div>',
				'</div>',
				'<div class="M-HighGridListLayoutRight">',
					'<div class="M-HighGridListHeader"></div>',
					'<div class="M-HighGridListContent"></div>',
				'</div>'
			].join('')).appendTo(el.find('.M-HighGridList'));

			var doms = this.$doms = {
				corner: layout.find('.M-HighGridListCorner'),
				header: layout.find('.M-HighGridListHeader'),
				sidebar: layout.find('.M-HighGridListSidebar'),
				content: layout.find('.M-HighGridListContent')
			}
			this.buildTableCorner().appendTo(doms.corner);
			this.buildTableHeader().appendTo(doms.header);
			this.buildTableSidebar().appendTo(doms.sidebar);
			this.buildTableContent().appendTo(doms.content);

			// 创建滚动条
			this.create('scrollerV', common.scroller, {
				dir: 'V',
				pad: false, // 取消滚动条间隔，使之浮在内容的上面
				target: doms.content,
				content:  doms.content.find('table')
			});
			this.create('scrollerH', common.scroller, {
				dir: 'H',
				size: 4,
				pad: false,
				wheel: false,
				target: doms.content,
				content:  doms.content.find('table')
			});


			// 分页模块
			if(c.hasPager && c.url){
				var data = this.$data;
				this.createAsync(
					'pager', '@base/common/base.pager',
					util.extend(c.pager, {'target': el.find('.M-HighGridPager')}),
					function(mod){
						mod.setup({
							'total': data.total,
							'size': (data.size || undefined),
							'page': (data.page || undefined)
						});
					}
				);
			}

			// 模拟鼠标hover行事件
			this.uiBind(doms.content.find('tr'), 'mouseenter', 'eventTrMouseenter');
			this.uiBind(doms.sidebar.find('tr'), 'mouseenter', 'eventTrMouseenter');
			this.uiBind(doms.content.find('tr'), 'mouseleave', 'eventTrMouseleave');
			this.uiBind(doms.sidebar.find('tr'), 'mouseleave', 'eventTrMouseleave');
			// 鼠标移除时，销毁子表格模块
			this.uiBind(el, 'mouseleave', 'destroySubgrid');
			this.uiBind(doms.header, 'mouseenter', 'destroySubgrid');
			this.uiBind(doms.corner, 'mouseenter', 'destroySubgrid');

			// 绑定点击触发排序事件
			this.uiBind(el.find('.sortable'), 'click', 'eventSort');

			// 计算表格宽高
			this.calculate();

			// 更新滚动条
			this.updateScroller();
		},
		buildTableCorner: function(){
			var c = this.getConfig()
			var cols = c.cols;

			// 自动根据hasSelect参数插入选择列
			// 如果已有自定义的select，则不会重复添加
			var repeat = util.find(c.cols, 'select', 'type');
			if(c.hasSelect && !repeat){
				cols.unshift({"type":"select","name":"sel"});
			}

			// 自动根据hasMenu参数插入操作列
			// 如果已有自定义的op，则不会重复添加
			repeat = util.find(c.cols, 'op', 'type');
			if(c.hasMenu && !repeat){
				cols.unshift({"type":"op","name":"op"});
			}

			var dom = $([
				'<table cellspacing="0" cellpadding="0">',
					'<tr class="M-HighGridListCornerTitle"></tr>',
					'<tr class="M-HighGridListCornerAmount">',
						(c.hasAmount && c.metrics && c.metrics.length) ? '<td colspan="'+cols.length+'">汇总</td>' : '',
					'</tr>',
				'</table>'
			].join(''));

			var td = [];
			var el, html, column;
			for (var i = 0; i < cols.length; i++) {
				column = cols[i];

				column = this.extendColConfig(column);

				// 选择列
				if(column.type == 'select'){
					html = '<input type="checkbox" />';
				}

				// 序号列
				if(column.type == 'id'){
					column.text = column.text || LANG('序号');
				}

				el = this.buildTd({
					'text': column.text,
					'html': html,
					'sort': column.sort || false,
					'name': column.field || column.name
				})
				td.push(el);

				// 清除变量
				html = '';
			}
			dom.find('.M-HighGridListCornerTitle').append(td);
			// 绑定全选框事件
			this.uiBind(dom.find('input[type="checkbox"]'), 'click', 'eventSelectAll');
			return dom;
		},
		buildTableHeader: function(){
			var c = this.getConfig()
			var metrics = c.metrics;
			var data = this.$data && this.$data.amount || null;

			var html = $([
				'<table cellspacing="0" cellpadding="0">',
					'<tr class="M-HighGridListHeaderTitle"></tr>',
					'<tr class="M-HighGridListHeaderAmount"></tr>',
				'</table>'
			].join(''));

			var title = [];
			var amount = [];
			var elTitle, elAmount;
			var metric;
			var name;
			for (var i = 0; i < metrics.length; i++) {
				metric = metrics[i];

				if(util.isString(metric)){
					// 从 tab 参数中读取配置
					metric = this.getMetricFromTab(metric);
					// 支持从labels.js中读取配置
					if(util.isString(metric)){
						name = metric; // 保存指标名
						metric = labels.get(metric);
						metric.name = name;
						metric.sort = true; // 只是给字符串的情况，默认是可排序的
					}
				}

				// 渲染函数
				var render = metric.headerRender;
				var renderedValue;
				if(render){
					if (util.isFunc(render)) {
						renderedValue = render(i, metric.text, metrics[i], metric);
					}
					if(util.isString(render)&& util.isFunc(this[render])){
						renderedValue = this[render](i, metric.text, metrics[i], data);
					}
				}

				elTitle = this.buildTd({
					'text': metric.text || '-',
					'sort': metric.sort || false,
					'name': metric.name,
					'html': renderedValue || ''
				});
				title.push(elTitle);

				// 总计模块
				if(c.hasAmount){
					var value;
					// 有数据
					if(data){

						// 格式化数值
						if(util.isString(metric)){

							metric = this.getMetricFromTab(metric);
							// 从tab参数中读取配置
							if( !util.isString(metric)){
								value = data[metric.name];
							}else{
								// 从 labels.js中读取配置
								value = data[metric];
								metric = labels.get(metric);
							}
						}else{
							value = data[metric.name];
						}

						if(metric.format && util.isFunc(metric.format)){
							value = metric.format(value)
						}

						elAmount = this.buildTd({
							'text': value || '-'
						});

					}else{
						// 无数据
						elAmount = '<td>-</td>';
					}
					amount.push(elAmount);
				}
			}
			html.find('.M-HighGridListHeaderTitle').append(title);

			// 总计模块
			if(c.hasAmount){
				html.find('.M-HighGridListHeaderAmount').append(amount);
			}

			return html;
		},
		buildTableSidebar: function(){
			var datas = this.$data && this.$data.items || null;
			var c = this.getConfig();
			var cols = c.cols;

			var dom = $('<table cellspacing="0" cellpadding="0"/>');

			var i;
			if(datas){
				var tr, td;
				var data;
				var html, width, isIndexCol, title, type, column, hasDataType;
				var className = '';

				for (i = 0; i < datas.length; i++) {
					data = datas[i];

					tr = this.buildTr({
						'dataId': data[c.key],
						'class': (i%2!==0) ? 'M-HighGridListSidebarName' : 'M-HighGridListSidebarName even'
					});

					for (var ii = 0; ii < cols.length; ii++) {
						column = cols[ii];

						column = this.extendColConfig(column);

						isIndexCol = column.type == 'index';

						switch(column.type){
							case 'id':			// 序号列
								html = '<span>'+(i+1)+'</span>';
								className += ' tc';
								hasDataType = true;
							break;
							case 'select':		// 选择列
								html = '<input type="checkbox"/>';
								className += ' tc';
								hasDataType = true;
							break;
							// @todo 换成hasMenu方式
							case 'op':			// 操作列
								className += ' tc';
								hasDataType = true;
							break;

							case 'index':		// 主列
								hasDataType = true;
							break;
							default:
							break;
						}

						var value = data[column.field || column.name];

						var render = column.render;
						if(render){
							var renderMethod;

							// 函数
							if(util.isFunc(render)){
								renderMethod = render;
							}
							// 字符串
							else if(util.isString(render)){
								// 自定义函数
								if(util.isFunc(this[render])){
									renderMethod = this[render];
								}
								// 从label.js文件中获取渲染函数
								else{
									renderMethod = labels[render] || false;
								}
							}

							html = renderMethod && renderMethod.call(this, ii, value, data, column);
						}

						if(column.width){
							width = column.width;
						}
						if(column.align){
							className += ' '+ column.align;
						}


						if(isIndexCol){
							width = width || 150;
							className += ' '+ 'uk-text-truncate tl';
							title = value;
							type = 'index';
						}
						td = this.buildTd({
							'html': html,
							'type': type,
							'width': width,
							'title': title,
							'class': className,
							'text': value,
							'dataType': hasDataType ? column.type : null
						});
						tr.append(td);

						// 清除变量
						html = width = className = type= title = hasDataType= '';
					}
					dom.append(tr);
				}
			}else{
				// 无数据
				var tds = [];
				for (i = 0; i < cols.length; i++) {
					tds.push('<td>-</td>');
				}
				dom.append($('<tr class="M-HighGridListSidebarName even"></tr>').append(tds));
			}
			// 绑定选择框事件
			this.uiProxy(dom, 'input[type="checkbox"]', 'click', 'eventCheckboxClick');
			// 绑定菜单事件
			this.uiProxy(dom, '.M-HighGridListSidebarMenu', 'click', 'eventMenuClick');
			return dom;
		},
		buildTableContent: function(){
			var data =  this.$data && this.$data.items || null;
			var c = this.getConfig();
			var cols = c.metrics;

			var html = $('<table  cellspacing="0" cellpadding="0"/>');
			if(data){
				var tr, td;
				var metric, value;
				for (var i = 0; i < data.length; i++) {

					tr = this.buildTr({
						'dataId': data[i][c.key],
						'class': (i===0 )? 'M-HighGridListContentFirstTr even': ((i%2 === 0)?'even':'')
					});

					var render;
					for (var ii = 0; ii < cols.length; ii++) {
						metric = cols[ii];

						// 格式化数值
						if(util.isString(metric)){
							metric = this.getMetricFromTab(metric);
							// 从tab参数中读取配置
							if( !util.isString(metric)){
								value = data[i][metric.field||metric.name];
							}else{
								// 从 labels.js中读取配置
								value = data[i][metric];
								metric = labels.get(metric);
								// 修正
								if(metric.field && !value){
									value = data[i][metric.field];
								}
							}
						}else{
							value = data[i][metric.field||metric.name];
						}

						// 渲染函数
						render = metric.render;
						if(render){
							var renderMethod;

							// 函数
							if(util.isFunc(render)){
								renderMethod = render;
							}
							// 字符串
							else if(util.isString(render)){
								// 自定义函数
								if(util.isFunc(this[render])){
									renderMethod = this[render];
								}
								// 从label.js文件中获取渲染函数
								else{
									renderMethod = labels[render]
								}
							}

							value = renderMethod.call(this, i, value, data[i], metric);
						}

						// 格式化函数
						if(metric.format && util.isFunc(metric.format)){
							value = metric.format(value)
						}

						td = this.buildTd({
							'html': value || '-',
							'class': metric.align || ''
						});
						tr.append(td);
					}
					html.append(tr);
				}
			}else{
				// 无数据
				html.append('<tr class="even"><td class="tc" colspan="'+cols.length+'">无数据</td></tr>')
			}

			return html;
		},
		buildTd: function(c){
			var con, td;
			td = con = $('<td></td>');

			if(c.type == 'index' && !c.html){
				con = $('<div class="fl"></div>').width( (c.width || 150) - 20).appendTo(td);
			}

			if(c['class']){
				con.addClass(c['class']);
			}

			if(c.format){
				c.text = c.format(c.text);
			}

			if(c.text){
				con.append($('<span/>').text(c.text));
			}
			if(c.width){
				con.css('width', c.width);
			}
			if(c.title){
				con.attr('title', c.title);
			}
			if(c.html){
				con.html(c.html);
			}
			if(c.dataType){
				con.attr('data-type', c.dataType);
			}

			if(c.type == 'index'){
				if(this.getConfig('hasSubGrid')){
					var add = $('<a class="M-HighGrid-subgrid"/>').appendTo(td);
					this.uiBind(add, 'mouseenter mouseleave', 'eventActiveSubgrid')
				}
			}

			if(c.sort){
				con.addClass('cur_p sortable');
				con.append('<em/>');
				var sort = this.$sort && this.$sort.match(/(.+)\|(1|-1)/);
				if(sort && c.name == sort[1]){
					con.addClass((sort[2]==1) ? 'asc':'desc');
				}
			}

			if(c.name){
				con.attr('data-name', c.name);
			}

			if(c.dataType == 'op'){
				this.create(Menu, {
					target: td,
					grid: this
				});
			}

			return td;
		},
		buildTr: function(c){
			var tr = $('<tr></tr>');
			if(c.class){
				tr.addClass(c.class);
			}
			if(c.text){
				tr.text(c.text);
			}
			if(c.html){
				tr.html(c.html)
			}
			if(c.dataId){
				tr.attr('data-id', c.dataId);
			}
			return tr;
		},
		// 扩展默认列属性
		extendColConfig: function(col){
			if (util.isString(col)){
				col = {'name': col};
			}
			col = $.extend(
				{
					type: 'col',	// 列类型: col, id, index, select
					name: null,
					field: null,
					text: null,
					align: null,
					width: 0,
					format: null,
					render: null
				},
				labels.get(col.name, 'type_'+col.type),
				col
			);

			return col;
		},
		// 更新滚动条
		updateScroller: function(){
			var mod = this.$;
			if(mod && mod.scrollerV){
				mod.scrollerV.update();
			}
			if(mod && mod.scrollerV){
				mod.scrollerH.update();
			}
		},
		// 获取列表左上角top坐标值
		getGridOffset: function(){
			var el = this.$el.get(0);
			var top = el.offsetTop;
			var current = el.offsetParent;

			while (current !== null && current !== document.body){
				top += current.offsetTop;
				current = current.offsetParent;
			}

			return top;
		},
		// 设置表格长宽
		calculate: function(isReset){
			var c = this.getConfig(),
				wrap = c.target || this.$el, // @优化todo
				data = this.$data || [];

				// 长度定义
				var datasLen = data.items && data.items.length || 0,
					indexLen = c.metrics.length,
					colsLen = c.cols.length;

				// DOM实例
				var header = wrap.find('.M-HighGridListHeader'),
					content = wrap.find('.M-HighGridListContent'),
					sidebar = wrap.find('.M-HighGridListSidebar'),
					corner = wrap.find('.M-HighGridListCorner');

				var sum = 0,		// 总数
					i,
					max,			// 最大值
					space,			// 间距
					elT, elD, elL, elR;	// DOM对象

				// 同步高度-头部
				elL = wrap.find('.M-HighGridListCornerTitle');
				elR = wrap.find('.M-HighGridListHeaderTitle');
				max = this._getMax(elL.height(), elR.height());
				elL.height(max);
				elR.height(max);


				// 同步高度-汇总模块
				elL = wrap.find('.M-HighGridListCornerAmount');
				elR = wrap.find('.M-HighGridListHeaderAmount');
				elL.height(elR.height());

				// 同步高度-下侧
				for (i = 0; i < datasLen; i++) {
					elL = sidebar.find('tr:eq('+i+')');
					elR = content.find('tr:eq('+i+')');
					max = this._getMax(elL.height(), elR.height());
					elL.height(max);
					elR.height(max);
				}

				// 以浏览器高度作为表格的高度
				var offset = this.$el.get(0).offsetTop;
				var outsideWapper = this.$el.parents('.'+c.wrapperClass);
				outsideWapper = outsideWapper.length ? outsideWapper: this.$el;
				// var extras = 20;	// 下边据
				var extras = 0;
				var border = 2+1;	// 边框
				var gridHeader = wrap.find('.M-HighGridHeader').outerHeight();
				var pager = wrap.find('.M-HighGridPager').outerHeight();
				var height = outsideWapper.height()- corner.height()- offset- pager- extras - gridHeader -border ;

				sidebar.height(height);
				content.height(height);

				// 同步宽度-左侧
				for (i = 0; i < colsLen; i++) {
					elT = wrap.find('.M-HighGridListCorner td:eq('+i+')');
					elD = wrap.find('.M-HighGridListSidebar td:eq('+i+')');
					max = this._getMax(elT.width(), elD.width());
					elT.width(max);
					elD.width(max);
				}
				// 设置主内容模块的左边距值
				var conLeftWidth = wrap.find('.M-HighGridListLayoutLeft').width();
				wrap.find('.M-HighGridListLayoutRight').css('margin-left', conLeftWidth);

				// 重置创建横向滚动条时min-width
				content.css('min-width', 0); // wrap.width()-conLeftWidth-2

				var className = '';
				// 清零
				if(isReset){
					$('.M-HighGridListLayoutLeft').removeClass('shadow'); // 清除滚动阴影
					header.find('table').css('width', 'inherit');
					content.find('table').css('width', 'inherit');
					header.css('min-width', 0);
					content.css('min-width', 0);
					header.css('width', wrap.width() - conLeftWidth- 2);
					content.css('width', wrap.width() - conLeftWidth - 2);
					content.css('min-height', 'inherit'); // 清除上一次由滚动条生成的min-height

					// 清零右侧宽度
					for (i = 0; i < indexLen; i++) {
						// 总计模块
						className = c.hasAmount ? 'M-HighGridListHeaderAmount' : 'M-HighGridListHeaderTitle';
						elT = wrap.find('.'+className).find('td:eq('+i+')');
						elD = wrap.find('.M-HighGridListContentFirstTr td:eq('+i+')');
						elT.css('width', 'auto');
						elD.css('width', 'auto');
					}
				}
				// 同步宽度-右侧
				for (i = 0; i < indexLen; i++) {
					// 总计模块
					className = c.hasAmount ? 'M-HighGridListHeaderAmount' : 'M-HighGridListHeaderTitle';
					elT = wrap.find('.'+className).find('td:eq('+i+')');
					elD = wrap.find('.M-HighGridListContentFirstTr td:eq('+i+')');

					space = elT.outerWidth() - elT.width();
					max = this._getMax(elT.width(), elD.width());
					elT.width(max);
					elD.width(max);

					// 不计算被隐藏的列
					if(elT.css('display') == 'none' && elD.css('display') == 'none'){max = 0; space = 0;}

					sum = sum + max + space;
				}
				// 更新表格宽度值，使每一列能以计算值呈现出来
				header.find('table').width(sum);
				content.find('table').width(sum);

				// 防止resize后重计算时，实际内容框挤出了外框。
				content.css('max-width',sum);
		},
		/** ---------------- 数据 ---------------- **/
		setData: function(data){
			this.reset();
			this.$data = data;
			this.buildTable();
			this.setStyles();
		},
		getData: function(id){
			var c = this.getConfig();
			if(id){
				return util.find(this.$data.items, id, c.key)
			}
			return this.$data;
		},
		reset: function(){
			this.$data = null;
			// 清除子实例
			var mod = this.$;
			if(mod){
				for(var i in mod){
					if(i != 'tab' && i!= 'refresh' && i!= 'excel' && i!= 'batch'){
						mod[i].destroy();
					}
				}
				// mod.pager.destroy();
				// mod.scrollerH.destroy();
				// mod.scrollerV.destroy();
			}

			// this.$.scrollerV
			this.$el.find('.M-HighGridList').empty();
			this.$panelShowing = false;
		},
		/**
		 * 设置选中数据
		 * @param {Object} selects: [], highlights: []
		 */
		setValue: function(value){
			// 更新选中/高亮值
			this.$selects = value && value.selects || [];
			this.$highlights = value && value.highlights || [];

			// 设置选中/高亮状态
			this.setStyles();
		},
		getValue: function(name){
			if(name){
				return this['$'+name] || '';
			}else{
				return {
					selects: this.$selects,
					highlights: this.$highlights
				}
			}
		},
		resetValue: function(){
			this.$selects = [];
			this.$highlights = [];
			this.resetStyles();
		},
		// 更新行样式
		setStyles: function(){
			this.resetStyles();

			var sidebar = this.$doms.sidebar;
			var content = this.$doms.content;

			var style = this.getConfig('style');
			var i, tr;

			var ids = this.$selects;
			for (i = 0; i < ids.length; i++) {
				tr = sidebar.find('tr[data-id="'+ids[i]+'"]').addClass(style.selected);
				tr.find('input[type="checkbox"]').prop('checked', true);
				content.find('tr[data-id="'+ids[i]+'"]').addClass(style.selected);
			}
			ids = this.$highlights;
			for (i = 0; i < ids.length; i++) {
				sidebar.find('tr[data-id="'+ids[i]+'"]').addClass(style.highlight);
				content.find('tr[data-id="'+ids[i]+'"]').addClass(style.highlight);
			}
		},
		// 清除行样式
		resetStyles: function(){
			// 清除样式
			var style = this.getConfig('style');
			var className = style.selected +' '+style.highlight;
			var doms = this.$doms;
			var trLeft = doms.sidebar.find('tr');
			var trRight = doms.content.find('tr');
			trLeft.removeClass(className);
			trRight.removeClass(className);
			// 清除勾选
			trLeft.find('input[type="checkbox"]').prop('checked', false);
			doms.corner.find('tr input[type="checkbox"]').prop('checked', false);
		},
		load: function(){
			var c = this.getConfig();
			if (!c.url){ return this; }

			// 自动刷新
			var mod = this.get('refresh');
			if (mod){
				mod._toggleRefresh(0);
				mod.$doms.button.prop('disabled', true).addClass('refing');
			}

			// 若有分页模块，发送分页初始值参数
			if(c.hasPager){
				if(!this.get('pager')){
					var pager = util.extend({
						page:1,
						size:20
					}, c.pager);

					util.extend(this.$sysParam, {
						page: pager.page,
						limit: pager.size
					});
				}
			}

			// 添加日期参数
			var date = pubjs.getDate();
			if(date){
				util.extend(this.$sysParam, {
					begindate: date.begindate,
					enddate: date.enddate,
					stastic_all_time: date.stastic_all_time || 0
				});
			}

			this.showLoading();

			// 发送指标参数
			if(!this.$sysParam.metrics){
				this.$sysParam.metrics = this.getMetrics();
			}

			var customParam = this.getParam();
			var param = util.extend({}, this.$sysParam, customParam);

			switch(c.reqType){
				case 'ajax':
					if(c.reqMethod == 'get'){
						this.$reqID = pubjs.data[c.reqMethod](c.url, param, this, 'onData');
					}else{
						this.$reqID = pubjs.data[c.reqMethod](c.url, customParam, this.$sysParam, this, 'onData');
					}
				break;
				case 'websocket':
					pubjs.mc.send(c.url, param, this.onData.bind(this));
				break;
			}

			return this;
		},
		onData: function(err, data){
			this.hideLoading();
			// 自动刷新
			var mod = this.get('refresh');
			if (mod){
				mod.$doms.button.prop('disabled', false).removeClass('refing');
				if (mod.getConfig('refreshAuto')){
					mod._toggleRefresh(1);
					// 自动拉取时, 错误不更新不提示错误
					if (err){ return; }
					// mod.$.list.showRefresh();
				}
			}

			if (err){
				pubjs.error('拉取数据错误', err);
				this.setData([]);
				return;
			}

			var c = this.getConfig();
			this.setData(data);
			if(c.eventDataLoad){
				this.fire("gridDataLoad",data);
			}
		},
		reload: function(param, url, page){
			var c = this.getConfig();
			if (url){
				c.url = url;
			}

			if (param){
				$.extend(this.$customParam, param);
			}

			util.extend(this.$sysParam, {
				page: page || 1
			});

			this.load();
		},
		setParam: function(param, replace){
			var cParam = replace ? param : $.extend(this.$customParam, param);
			// var cParam = replace ? param :util.extend(this.$customParam, param);
			this.setConfig('param', cParam);
			return this;
		},
		getParam: function(all){
			if(all){
				var c = this.getConfig();
				var ud;
				var param = util.extend(
					{},
					c.param,
					this.$sysParam,
					this.$customParam,
					{'page':ud, 'order':ud}
				);
				if (c.sub_exname){
					param.subex_name = c.sub_exname;
				}

				return param;
			}else{
				return this.$customParam;
			}
		},
		showLoading: function(){
			var el = this.getDOM();
			var loading = el.find('.M-tableListLoading');
			loading.css({
				width: el.width(),
				height: el.height()
			}).show();
		},
		hideLoading: function(){
			this.getDOM().find('.M-tableListLoading').hide();
		},
		/** ---------------- 交互 ---------------- **/
		// 排序
		eventSort: function(ev, dom){
			dom = $(dom);
			var name = dom.attr('data-name');

			this.$sort = name + (dom.hasClass('desc') ? '|1' : '|-1');

			this.reload({sort: this.$sort});

			return false;
		},
		// 复选框点击事件
		eventCheckboxClick: function(ev, dom){
			var c = this.getConfig();

			var trLeft = $(dom).parents('tr');
			var id = trLeft.attr('data-id');
			var trRight = this.$doms.content.find('tr[data-id="'+id+'"]');

			// 添加行选中样式
			var className = c.style.selected;
			var beforeToggleStatus = trLeft.hasClass(className); // 原状态
			var toggleClass = beforeToggleStatus ? 'removeClass' : 'addClass';
			trLeft[toggleClass](className);
			trRight[toggleClass](className);

			// 更新选中值
			this.updateSelectedValue(!beforeToggleStatus, id);


			// return false; // 会阻止了checkbox的默认勾选事件
		},
		// 全选框点击事件
		eventSelectAll: function(ev, dom){
			var c = this.getConfig();

			var doms = this.$doms;
			var trLeft = doms.sidebar.find('tr');
			var trRight = doms.content.find('tr');

			$(dom).toggleClass('checked');

			var isSelected = $(dom).hasClass('checked')? true: false;
			var toggleClass = isSelected ? 'addClass' : 'removeClass';

			var className = c.style.selected;
			trLeft[toggleClass](className);
			trRight[toggleClass](className);
			trLeft.find('input[type="checkbox"]').prop('checked', isSelected);

			// 更新选中值
			this.updateSelectedValue(isSelected);

			// return false; // 会阻止了checkbox的默认勾选事件
		},
		// 更新选中值
		updateSelectedValue: function(add, value){
			var c = this.getConfig();

			// var data = value ? [{'id':value}] :(this.$data&&this.$data.items||[]);
			// @优化todo , 'id'变成可配置项
			var obj = {}
			obj[c.key] = value;
			var data = value ? [obj] :(this.$data&&this.$data.items||[]);

			for (var i = 0; i < data.length; i++) {
				var index = util.index(this.$selects, data[i][c.key]);
				// 增加
				if(add){
					if(index == null){
						this.$selects.push(data[i][c.key]);
					}
				}else{
				// 清除
					if(index != null){
						this.$selects.splice(index, 1);
					}
				}
			}
		},
		// 表格切换
		eventSwitch: function(ev){
			var c = this.getConfig();
			pubjs.showSubgrid({
				type: c.gridName
			});
			return false;
		},
		// 批量操作
		eventBatch: function(ev, dom){
			this.fire('batch', [this.$selects, dom]);
			return false;
		},
		eventTrMouseenter: function(ev, dom){
			var c = this.getConfig();
			var id = $(dom).attr('data-id');
			var el = this.getDOM();

			// 添加行hover状态
			el.find('tr[data-id="'+id+'"]').addClass('M-HighGridListRowHover');

			// 子表格
			if(c.hasSubGrid && c.subs){
				if(this.$subgridId != id){
					// 销毁旧模块
					var mod = this.get('subgrid');
					if(mod){
						mod.destroy();
					}

					// 创建新模块
					var filter = c.subFilter;
					var subTarget = el.find('tr[data-id="'+id+'"] a.M-HighGrid-subgrid');
					this.create('subgrid', Subgrid, {
						subs: c.subs,
						parentTarget: el,
						childTarget:subTarget,
						data: this.getData(id),
						target: el.find('.M-HighGridSubgrid'),
						subFilter: util.isString(filter) ? this[filter]: filter,
						offset: this.$scrollerVLen || 0
					});
				}
			}

			return false;
		},
		eventTrMouseleave: function(ev, dom){
			var id = this.$subgridId = $(dom).attr('data-id');

			// 去除行hover状态
			var el = this.getDOM();
			el.find('tr[data-id="'+id+'"]').removeClass('M-HighGridListRowHover');

			return false;
		},
		// 销毁子表格模块
		destroySubgrid: function(ev, dom){
			var mod = this.get('subgrid');
			if(mod){
				mod.destroy();
			}
			this.$subgridId = false;

			return false;
		},
		// 激活子表格样式
		eventActiveSubgrid: function(ev, dom){
			var subgrid = this.get('subgrid');
			if(subgrid){
				subgrid.toggleActive((ev.type == 'mouseenter'));
			}
			return false;
		},
		/**
		 * 显示/隐藏 指定列
		 * @param  {String} name    列名
		 * @param  {Boolean} bool 显示还是隐藏，默认是隐藏
		 * @param  {String} type    主列还是副列，默认是主列
		 */
		toggleColumn: function(name, bool, type){
			var doms = this.$doms;
			var c = this.getConfig();
			var display = bool ? 'show': 'hide';
			var isMain = !type || type == 'main';
			var head = isMain ? doms.corner: doms.header;
			var body = isMain ? doms.sidebar: doms.content;
			var headElms = head.find('tr:first td'); // 头部

			function _toggleColumn(name){
				var elm = head.find('tr td[data-name="'+name+'"]');
				if(elm && elm.length){
					elm[display]();
					var index = headElms.index(elm);

					// 汇总栏隐藏
					if(!isMain && c.hasAmount){
						var amountElm = head.find('tr').eq(1).find('td');
						amountElm.eq(index)[display]();
					}

					var bodyElm = body.find('tr');
					if(bodyElm && bodyElm.length){
						for (var i = 0; i < bodyElm.length; i++) {
							$(bodyElm[i]).find('td').eq(index)[display]();
						}
					}
				}else{
					pubjs.error('参数错误，查找不到名称为'+name+'的列');
					return false;
				}
			}

			if(!doms){
				pubjs.error('调用错误，HighGrid还未构建完成');
				return false;
			}

			// 字符串
			if(util.isString(name)){
				_toggleColumn(name);
			}
			// 数组
			if(util.isArray(name)){
				for (var i = 0; i < name.length; i++) {
					_toggleColumn(name[i]);
				}
			}

			// 重新计算
			this.calculate(true);
		},
		/** ---------------- 响应 ---------------- **/
		// 滚动条响应事件
		onScroll: function(ev){
			var scrollerH = this.$.scrollerH;
			var scrollerV = this.$.scrollerV

			var header = this.$el.find('.M-HighGridListHeader');
			var sidebar = this.$el.find('.M-HighGridListSidebar');

			var left = scrollerH.getScrollPos();
			var top = scrollerV.getScrollPos();

			header.scrollLeft(left);
			sidebar.scrollTop(top);

			var el = $('.M-HighGridListLayoutLeft');
			if(left){
				el.addClass('shadow');
			}else{
				el.removeClass('shadow');
			}

			// 滚动事件触发时，销毁子表格模块
			this.destroySubgrid();
			this.$scrollerVLen = this.$.scrollerV.getScrollPos(); // 竖滚动条偏移值

			return false;
		},
		// 分页切换事件
		onChangePage: function(ev){
			if (this.$.pager){
				util.extend(this.$sysParam, {
					page: ev.param.page,
					limit: ev.param.size
				});
				this.load();
			}
			return false;
		},
		// 浏览器窗口大小变化响应事件
		onSYSResize: function(ev){
			var self = this;

			// @todo 把同步高度和同步宽度分开，先同步高度。去掉滚动条。
			this.calculate(true);

			// 跳出JS执行线程，让浏览器线程先渲染
			setTimeout(function(){
				self.updateScroller();
			}, 0);

			// 再同步宽度 @todo

			// return false;
		},
		// 主菜单状态变动响应事件
		onMenuToggle: function(ev){
			this.calculate(true);
			this.updateScroller();
			return false;
		},
		// 右侧工具栏状态变动响应事件
		onToolsToggle: function(ev){
			this.calculate(true);
			this.updateScroller();
			return false;
		},
		// 响应指标组切换事件
		onMetricsTabChange: function(ev){
			var data = ev.param;
			this.setConfig('metrics', data);

			/**
			 * 说明
			 *	原来的方式：
			 *		一开始就已得到全部的指标，根据显示指标来创建指标列，不需要重新拉取数据；
			 *		this.setData(this.$data);
			 *	现在修改为：
			 *		发送要显示的指标参数给后端，得到想要的指标，然后创建。
			 *	暂时存在的问题：
			 *		SSP的后端没配合这种处理，切指标组时候相当于做了无用的load操作
			 */

			this.$sysParam.metrics = data;
			this.load();

			return false;
		},
		// 响应选项卡事件
		onTabChange: function(ev){
			this.calculate(true);
			if(this.$){
				this.updateScroller();
			}
			return false;
		},
		// 响应手动刷新事件
		onRefreshManual: function(ev){
			this.load();
			return false;
		},
		// 响应自动刷新事件
		onRefreshAuto: function(ev){
			if (this.getDOM().width() > 0){
				// 表格正常显示, 刷新自己
				this.load();
			}else {
				// 表格隐藏, 拦截事件不刷新
				return false;
			}
			// 让子表格刷新，可删？
			this.cast('autoRefresh');
			return false;
		},
		/**
		 * 导出按钮点击事件
		 * @param  {Object} ev 事件变量
		 * @return {Bool}     返回false拦截事件冒泡
		 */
		onExcelExport: function(ev){
			var param = this.getParam(true);
			delete param.format;

			ev.returnValue = {
				'type': this.getConfig('gridName'),
				'param': param
			};
			return false;
		},
		// 响应日期条事件
		onDateRangeChange: function(ev){
			var isShowing = pubjs.checkDisplay(this, ev.type, this.load.bind(this));
			if(isShowing){
				// 更新列表数据
				this.reload();
			}
			return false;
		},
		// 子表格图标点击事件
		onSubgridIconClick: function(ev){
			var data = ev.param.data;
			var type = ev.param.type;

			var c = this.getConfig();
			var key = c.subField || c.gridName;
			var currentParam = {};
			currentParam[key] = data._id;

			var condition = this.getConfig('param/condition')|| [];
			condition.push(currentParam);

			/**
			 * config 说明
			 * @property {String}   type            subgrid类型  在config app/subgrid中配置
			 * @property {String}   name     [可选] 模块名称(传入相同名称在多次调用时不会创建新的模块)
			 * @property {Object}   param    [可选] 模块参数
			 * @property {String}   title    [可选] 菜单标题  可在subgrid配置中获取
			 * @property {Object}   config   [可选] 模块配置
			 * @property {Function} callback [可选] 模块回调
			 */
			pubjs.showSubgrid({
				type: type,
				title: data.Name+ '/' +ev.param.text,
				param: {
					'condition': condition
				}
			});

			return false;
		},

		/** ---------------- 内部函数 ---------------- **/
		// 获取过滤后的要显示的指标集
		getMetrics: function(){
			var c = this.getConfig();
			var tab = c.tab || pubjs.config('default_tab_cols');

			// 若无default_metrics 参数，则以 metrics 值作为默认值
			var defMetrics = c.default_metrics;
			var metrics = (defMetrics && defMetrics.length) ? defMetrics: c.metrics;

			var name;
			var arr = [];
			for (var i = 0; i < metrics.length; i++) {
				if(util.isString(metrics[i])){
					// 支持"{组名}"过滤
					var abbr = metrics[i].match(/{(.+)}/);
					if(abbr){
						name = tab[abbr[1]];
						if(util.isObject(name)){
							arr = arr.concat(name.cols);
						}
					}else{
						arr.push(metrics[i]);
					}

				}else{
					// 对象
					arr.push(metrics[i]);
				}
			}
			return arr;
		},
		// 获取tab/cols 参数中的值
		getMetricFromTab: function(name){
			var tab = this.getConfig('tab');
			// 把tab 配置中的cols的合并成一个数组
			var cols = [];
			for (var e in tab) {
				cols = cols.concat(tab[e].cols);
			}

			for (var i = 0; i < cols.length; i++) {
				if(util.isObject(cols[i])){
					if(cols[i].name == name){
						// 返回对象
						return cols[i];
					}
				}
			}
			// 返回原值
			return name;
		},
		// 获取两者间的最大值
		_getMax: function(a, b){
			return a>b ? a : b;
		}
	});
	exports.base = HighGrid;

	// 刷新模块
	var Refresh  = view.container.extend({
		init: function(config, parent){
			config = pubjs.conf(config, {
				'target': null,
				'hasAuto': false,
				'refreshTime': 10,		// 刷新间隔
				'refreshAuto': 0,		// 自动刷新中
				'class': 'M-HighGridRefresh fl mr10'
			});

			// 自动刷新Timeout ID
			this.$refreshTimeId = 0;

			this.Super('init', arguments);
		},
		afterBuild: function(){
			var c = this.getConfig();
			var el = this.getDOM();

			// 读取记录的配置
			c.refresh_id = 'grid_refresh' + this._.uri;
			if (c.refreshAuto){
				c.refreshAuto = (pubjs.storage(c.refresh_id) !== '0');
			}
			if(c.hasAuto){
				this.append('<span data-type="0" class="M-HighGridRefreshAuto" ><i></i>'+LANG("自动刷新")+'</span>');
			}
			this.append('<button title="'+LANG('刷新报表')+'" class="uk-button refNormal"><em /></button>');

			var doms = this.$doms = {
				check: el.find('.M-HighGridRefreshAuto'),
				button: el.find('button')
			};
			this.refreshCallBack = this.refreshCallBack.bind(this);
			if (c.refreshAuto){
				doms.check.find('i').addClass('act');
				doms.check.attr('data-type', 1);
			}
			this.uiBind(doms.check, 'click', 'eventRefreshMode');
			this.uiBind(doms.button, 'click', 'eventRefreshManual');
		},
		eventRefreshMode: function(evt, elm){
			this.setConfig('refreshAuto', +$(elm).attr("data-type"));
			this.toggleRefresh();
		},
		eventRefreshManual: function(ev){
			this.fire('refreshManual');
			return false;
		},
		toggleRefresh: function(mode){
			var self = this;
			var c = self.getConfig();
			if (mode === undefined){
				mode = !c.refreshAuto;
			}else {
				mode = !!mode;
			}
			c.refreshAuto = mode;
			self._toggleRefresh(mode);
			self.$doms.check
				.attr("data-type",mode?1:0);

			self.$doms.check.find('i').toggleClass("act",mode);
			pubjs.storage(c.refresh_id, +mode);
			return self;
		},
		refreshCallBack: function(mode){
			if (this.getDOM().width() > 0){
				this.fire('refreshAuto');
			}else {
				this.$refreshTimeId = 0;
				this._toggleRefresh(1);
			}
		},
		_toggleRefresh: function(mode){
			var self = this;
			if (mode){
				if (!self.$refreshTimeId){
					self.$refreshTimeId = setTimeout(
						self.refreshCallBack,
						self.getConfig().refreshTime * 1000
					);
				}
			}else {
				if (self.$refreshTimeId){
					clearTimeout(self.$refreshTimeId);
					self.$refreshTimeId = 0;
				}
			}
			return self;
		}
	});
	exports.refresh = Refresh;

	// 指标组模块
	var Tab = view.container.extend({
		init: function(config, parent){
			config = pubjs.conf(config, {
				'tab': null,
				'metrics': [],
				'gridName': '',
				'target': null,
				'default_metrics': [],
				'class': 'M-HighGridTab',
				'style': {
					'tabItem': 'M-HighGridTabItem',				// 指标分组项目样式
					'tabActive': 'M-HighGridTabActive'			// 指标分组激活样式
				}
			});

			this.Super('init', arguments);
		},
		afterBuild: function(){
			var c = this.getConfig();

			// 更新tab值
			var data = this.getTabData();
			this.setConfig('tab', data);

			var ul = $('<ul></ul>');
			$('<li data-name="default" class="'+c.style.tabItem+' '+c.style.tabActive+'">'+LANG('默认')+'<i class="uk-icon-caret-down"/></li>').appendTo(ul);
			for (var i in data){
				// 去除为null的情况
				if(data[i]){
					$('<li class="'+c.style.tabItem+'"/>').attr('data-name', i).text(data[i].text).appendTo(ul);
				}
			}
			this.append(ul);

			// 绑定指标组事件
			this.uiBind(ul.find('li'), 'click', 'eventClickTab');
			this.uiBind(ul.find('li i'), 'click', 'eventTogglePanel');
		},
		// getIntersection
		getTabData: function(){
			// 优先级覆盖
			var tabGrid = this.getConfig('tab');	// grid本身配置的tab参数
			var tabGlobal = pubjs.config('default_tab_cols');// config.js文件中配置的全局tab参数
			var data = tabGrid ? tabGrid : tabGlobal;

			var filter = this.getConfig('metrics'); // 可显示的列
			// 与data取交集
			if(filter){
				var obj = {};
				var cols;
				for (var name in data){
					var group = util.find(filter, '{'+name+'}');
					if(group){
						obj[name] = data[name];
					}else{
						obj[name] = {
							text: data[name].text,
							cols : []
						};
						cols = data[name].cols
						for (var i = 0; i < cols.length; i++) {
							// 字符串
							if(util.isString(cols[i])){
								if(util.find(filter, cols[i])){
									obj[name].cols.push(cols[i]);
								}
							}else{
								// 对象
								if(util.find(filter, cols[i].name, 'name')){
									obj[name].cols.push(cols[i]);
								}
							}
						}
						if(!obj[name].cols.length){
							obj[name] = null;
						}
					}
				}
				return obj;
			}else{
				return data;
			}
		},
		// 切换指标组
		eventClickTab: function(ev, elm){
			var c = this.getConfig();

			elm = $(elm);
			var act = c.style.tabActive

			if(elm.hasClass(act)){
				return false;
			}

			elm.siblings().removeClass(act);
			elm.addClass(act);

			var type = elm.attr('data-name');
			var cols;
			if(type == 'default'){
				var custom = pubjs.storage('customTab/'+c.gridName);
				cols = custom ? custom.split(',') : this.getDefaultMetrics();
			}else{
				cols = c.tab[type].cols;
			}

			if(this.get('tabPanel')){
				this.$.tabPanel.destroy();
				this.$panelShowing = false;
			}

			this.fire('metricsTabChange', cols);

			return false;
		},
		// 获取显示的默认值
		getDefaultMetrics: function(){
			// 如果用户没设置default_metrics，则以metrics值作为默认显示值
			var allMetrics = this.getConfig('metrics');
			var defaultMetrics = this.getConfig('default_metrics');
			var metrics = (defaultMetrics && defaultMetrics.length) ? defaultMetrics: allMetrics;

			var tab = this.getConfig('tab');
			var arr = [];
			var name;

			for (var i = 0; i < metrics.length; i++) {
				if(util.isString(metrics[i])){
					var abbr = metrics[i].match(/{(.+)}/)
					if(abbr){
						name = tab[abbr[1]];
						if(util.isObject(name)){
							arr = arr.concat(name.cols);
						}
					}else{
						arr.push(metrics[i]);
					}
				}else{
					arr.push(metrics[i]);
				}
			}

			return arr;
		},
		// 触发自定义指标设置面板
		eventTogglePanel: function(ev){
			var c = this.getConfig();
			this.$panelShowing = !this.$panelShowing;

			// 若没有配置default_metrics 参数，使用metrics代替
			var metrics = (c.default_metrics && c.default_metrics.length) ? c.default_metrics : c.metrics;

			if(this.$panelShowing){
				// 创建popwin
				this.create('tabPanel', TabPanel, {
					'gridName': c.gridName,
					'tab': c.tab,
					'default_metrics': metrics,
					'position':{
						'mode': 'bottom, right',
						'element': $(ev.target).parents('.M-HighGridTab')
						// 'left': this._getElementLeft(elm[0]), // 右角对齐
						// 'top': this._getElementTop(elm[0])
					}
				});
			}else{
				// 销毁popwin
				if(this.$.tabPanel){ // 防止多次点击的情况
					this.$.tabPanel.destroy();
				}
			}
			return false;
		},
		// 响应面板隐藏事件
		onPanelHide: function(ev){
			if(this.$.tabPanel){
				this.$.tabPanel.destroy();
				this.$panelShowing = false;
			}
			return false;
		},
		// 响应面板保存事件
		onPanelSave: function(ev){
			var value = ev.param;
			this.fire('metricsTabChange', value);
			return false;
		}
	});
	exports.tab = Tab;

	// 指标组弹框
	var TabPanel = dialog.base.extend({
		init: function(config, parent){
			config = pubjs.conf(config, {
				'gridName': '',
				'tab': null,
				'default_metrics': [],

				'module': '@base/dialog.base',
				'mask': 0,
				'autoShow': true,
				'showClose': false,
				'showFoot': false,
				'showHead': false,
				'width': 'auto',
				'position':null,
				'style':{
					'layoutClass':'M-HighGridTabCustom'
				}
			});

			this.Super('init', arguments);
		},
		afterBuild: function(){
			this.Super('afterBuild', arguments);

			var data = this.getConfig('tab');
			var el = this.getContainer();

			// 创建弹框
			var popwin = $([
				'<div>',
					'<table><tr></tr></table>',
					'<div class="M-HighGridTabCustomFooter pd10">',
						'<input type="button" data-type="all" value="'+LANG('全选')+'"  class="uk-button"/>',
						'<input type="button" data-type="inverse" value="'+LANG('反选')+'"  class="ml5 uk-button"/>',
						'<input type="button" data-type="default" value="'+LANG('默认')+'" class="ml5 uk-button"/>',
						'<input type="button" data-type="save" value="'+LANG('确认')+'" class="ml5 fr uk-button-success uk-button"/>',
						'<input type="button" data-type="cancel" value="'+LANG('取消')+'" class="ml5 fr uk-button"/>',
					'</div>',
				'</div>'
			].join(''));

			var td, cols, metric;
			for (var e in data) {
				if(e != 'default' && data[e]){
					td = $('<td/>').appendTo(popwin.find('table tr'));
					cols = data[e].cols;
					$('<strong>'+data[e].text+'</strong>').appendTo(td);
					for (var i = 0; i < cols.length; i++) {
						metric = cols[i];

						// 支持直接传字符串形式，从lables.js中读取对应配置
						if(util.isString(cols[i])){
							metric = labels.get(cols[i]);
						}

						$('<label><input type="checkbox" data-name="'+(metric.name||cols[i])+'"/>'+metric.text+'</label>').appendTo(td);
					}
				}
			}
			popwin.appendTo(el);

			// 绑定弹框按钮事件
			this.uiBind(popwin.find('.M-HighGridTabCustomFooter input[type="button"]'), 'click', 'eventButtonClick');

			// 设置弹框勾选值
			this.setValue();
			this.update();

			// this.fire('panelBuildSuccess');
		},
		eventButtonClick: function(ev, elm){
			var type = $(elm).attr('data-type');

			var list = this.getDOM().find('table tr');
			var unsels, sels;
			switch(type){
				case 'all':
					unsels = list.find('input:not(:checked)');
					list.find(':checkbox').prop('checked', Boolean(unsels.length));
				break;
				case 'inverse':
					sels = list.find('input:checked');
					unsels = list.find('input:not(:checked)');
					sels.prop('checked', false);
					unsels.prop('checked', true);
				break;
				case 'default':
					this.setValue(this.getDefaultMetrics());
				break;
				case 'save':
					this.save();
				break;
				case 'cancel':
					this.hide();
				break;
			}
			return false;
		},
		getDefaultMetrics: function(){
			var metrics = this.getConfig('default_metrics');
			var tab = this.getConfig('tab');
			var arr = [];
			var name;

			for (var i = 0; i < metrics.length; i++) {
				// 字符串
				if(util.isString(metrics[i])){
					// 组名匹配
					var abbr = metrics[i].match(/{(.+)}/)

					if(abbr){
						name = tab[abbr[1]];
						if(util.isObject(name)){
							arr = arr.concat(name.cols);
						}
					}else{
						arr.push(metrics[i]);
					}
				}else{
					// 对象
					arr.push(metrics[i]);
				}
			}
			return arr;
		},
		setValue: function(value){
			if(!value){
				var defaults = this.getDefaultMetrics();
				var custom = this.getCustom();
				value = custom?custom.split(','):defaults;
			}

			var inputs = this.getDOM().find('table input');
			var item;
			for (var i = 0; i < inputs.length; i++) {
				item = $(inputs[i]);
				// value 中可能是对象也可能是字符串
				var checked = util.find(value, item.attr('data-name')) || util.find(value, item.attr('data-name'), 'name');
				// var checked = util.find(value, item.attr('data-name'));
				item.prop('checked', Boolean(checked));
			}
		},
		getValue: function(){
			var input = this.getDOM().find('table input:checked');
			var data = [];
			for (var i = 0; i < input.length; i++) {
				data.push($(input[i]).attr('data-name'));
			}
			return data;
		},
		hide: function(){
			this.Super('hide', arguments);
			this.fire('panelHide');
		},
		save: function(){
			var value = this.getValue();
			this.setCustom(value);
			this.fire('panelSave', value);
		},
		getCustom: function(){
			var name = this.getConfig('gridName');
			return pubjs.storage('customTab/'+name);
		},
		setCustom: function(data){
			var name = this.getConfig('gridName');
			pubjs.storage('customTab/'+name, data.join());
			// @todo 同时也要保存在远端服务器
		},
		resetCustom: function(){
			var name = this.getConfig('gridName');
			pubjs.storage('customTab/'+name, null);
		}
	});
	exports.tabPanel = TabPanel;

	// 子表格
	var Subgrid = view.container.extend({
		init: function(config, parent){
			config = pubjs.conf(config, {
				'subs': [],
				'data': [],
				'target': null,
				'subFilter': null,
				'childTarget': null,
				'parentTarget': null,
				'offset': 0,
				'style': {
					'act': 'M-HighGridSubgridAct'				// 激活样式
				}
			});

			this.Super('init', arguments);
		},
		afterBuild: function(){
			var el = this.getDOM();
			el.append('<a class="M-HighGrid-subgridArrow"/>');

			var sub,lab,btn;
			var c = this.getConfig();
			var doms = this.$doms = {};
			var prefix = 'M-HighGrid-';
			if(c.subs){
				for (var i = 0; i < c.subs.length; i++) {
					sub = c.subs[i];

					if (util.isString(sub)){

						// 命名兼容：highgrid_ 和 grid_
						var nameAsHighgrid = 'highgrid_' + sub;
						var nameAsGrid = 'grid_' + sub;

						if(labels.has(nameAsHighgrid)){
							lab = labels.get(nameAsHighgrid);
						}else if( labels.has(nameAsGrid) ){
							lab = labels.get(nameAsGrid);
						}else{
							pubjs.error('SubGrid Config Not Found - ' + sub);
							continue;
						}

						sub = util.extend({'type':sub}, lab);
					}else {
						pubjs.error('SubGrid Config Not Found - ', sub);
						continue;
					}
					var param = c.subs[i] = sub;
					btn = doms[sub.type] = sub.iconBtn = $('<a/>');
					btn.attr({
						'class': sub['class'] || (prefix + sub.type),
						'title': sub.text || '',
						'data-index': i
					});
					el.append(btn);

					this.uiBind(btn, 'click', param, 'eventSubItemClick');
				}
			}

			// 执行自定义过滤函数
			if(c.subFilter && util.isFunc(c.subFilter)){
				c.subFilter(c.subs, c.data);
			}

			// 定位
			var position = util.offset(c.childTarget, c.parentTarget);
			var iconLen = 20; // 图标长宽
			el.parent().css({
				top: position.top -iconLen -c.offset,
				left: position.left +iconLen
			});

			// 绑定样式激活事件
			this.uiBind(el, 'mouseenter', 'eventIconMouseenter');
			this.uiBind(el, 'mouseleave', 'eventIconMouseleave');
		},
		eventSubItemClick: function(ev){
			var data = this.getConfig('data');

			this.fire('subgridIconClick', {
				type: ev.data.type,
				text: ev.data.text,
				data:data
			});

			return false;
		},
		eventIconMouseenter: function(ev, dom){
			this.toggleActive(true);
			return false;
		},
		eventIconMouseleave: function(ev, dom){
			this.toggleActive(false);
			return false;
		},
		toggleActive: function(isAdd){
			var el = this.getDOM();
			var style = this.getConfig('style/act');
			var toggle = isAdd ? 'addClass': 'removeClass';
			el.parents('.M-HighGridSubgrid')[toggle](style);
		}
	});
	exports.subgrid = Subgrid;

	// 批量操作
	var Batch = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'grid': null,
				'text': LANG('批量操作'),
				'class': 'mr10 M-HighGridBatch fl'
			});
			this.Super('init', arguments);
		},
		afterBuild: function(){
			this.append($('<i class="ml5 uk-icon-caret-down"/>'));
			this.uiBind(this.getDOM(), 'click', 'eventButtonClick');
		},
		eventButtonClick: function(ev, dom){
			if(!this.get('menu')){
				var ids = this.getConfig('grid').getValue('selects');
				this.fire('batchShow', ids,'afterFire');
				// return false;
			}else{
				this.hide();
			}
			return false;
		},
		hide: function(){
			this.$.menu.destroy();
		},
		afterFire: function(evt){
			var data = evt.returnValue;

			var el = this.getDOM();

			// 创建下拉弹框
			this.create('menu', menu.base, {
				// width: 84,
				trigger: el,
				options: data,
				relate_elm: el,
				algin: 'left-bottom'
			});
		},
		// 响应菜单选中事件
		onMenuSelected: function(ev){
			var len = ev.param.length;
			var data = ev.param[len -1];
			var ids = this.getConfig('grid').getValue('selects');
			this.fire('batchSelect', [data, ids]);
			this.hide();
			return false;
		}
	});
	exports.batch = Batch;

	// 操作菜单
	var Menu = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'grid': null,
				'class': 'M-HighGridListSidebarMenu'
			});
			this.Super('init', arguments);
		},
		afterBuild: function(){
			this.uiBind(this.getDOM(), 'click', 'eventButtonClick');
		},
		eventButtonClick: function(ev, dom){
			if(!this.get('menu')){
				var id = this.getDOM().parents('tr').attr('data-id');
				var value = this.getConfig('grid').getData(id);
				this.fire('operateMenuShow', value, 'afterFire');
				// return false;
			}else{
				this.hide();
			}
			return false;
		},
		hide: function(){
			this.$.menu.destroy();
		},
		afterFire: function(evt){
			var data = evt.returnValue;

			var el = this.getDOM();

			// 创建下拉弹框
			this.create('menu', menu.base, {
				trigger: el,
				options: data,
				relate_elm: el
			});
		},
		// 响应菜单选中事件
		onMenuSelected: function(ev){
			var op = ev.param[0];
			var id = this.getDOM().parents('tr').attr('data-id');
			var value = this.getConfig('grid').getData(id);
			this.fire('operateMenuSelect', [op, value]);
			this.hide();
			return false;
		}
	});
	exports.menu = Menu;

	// 报表导出
	var ExcelExport = common.excelExport.extend({
		init: function(config, parent){
			config = pubjs.conf(config, {
				'data': null,
				'title': LANG('导出报表'),
				"url": '/api/dsp/export/',
				'class': 'M-HighGridExport fl mr10'
			});
			this.Super('init', arguments);
		},
		afterBuild: function(){
			var el = this.getDOM();
			this.append($('<em title="'+this.getConfig('title')+'"/>'));
			this.uiBind(el, 'click', 'eventButtonClick');
		},
		eventButtonClick: function(ev){
			this.fire('excelExport',this.getConfig('data'),'afterFire');
			return false;
		},
		afterFire: function(ev){
			var data = ev.returnValue;

			if (ev.count > 0 && data){
				var url = this.getConfig('url')+data.type;
				window.location.href = pubjs.data.resolve(url, data.param);
			}
		}
	});
	exports.excelExport = ExcelExport;

});