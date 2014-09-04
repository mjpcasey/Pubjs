define(function(require, exports){
	var appCore;

	// 全局提示框
	var alertQueue = [];
	function popQueue(){
		alertQueue.shift();
		if (alertQueue.length){
			this.setData(alertQueue[0]);
		}
		return alertQueue.length;
	}
	function Alert(html, callback, alertType){
		if (!alertType){
			alertType = 'alert';
		}

		alertQueue.push({
			html: html,
			type: alertType,
			callback: callback,
			next: popQueue
		});

		if(alertQueue.length == 1){
			var c = alertQueue[0];

			if (!appCore){
				return false;
			}

			var win = appCore.get('SYSTEM_ALERT');
			if (!win){
				appCore.createAsync(
					'SYSTEM_ALERT',
					'@base/dialog.alert',
					{'data': c}
				);
			}else {
				win.setData(c).show();
			}
		}
	}
	function Confirm(html, callback){
		Alert(html, callback, 'confirm');
	}


	// 全局加载蒙板
	var MASK_INSTANCE = null;
	var MASK_SHOW_COUNT = 0;
	var SystemMask = {
		show: function(){
			MASK_SHOW_COUNT++;
			if (!MASK_INSTANCE){
				appCore.createAsync(
					'SYSTEM_MASK',
					'@base/common/base.loadingMask',
					{'target': 'body', 'z_index': 100},
					function(mask){
						MASK_INSTANCE = mask;
						if (MASK_SHOW_COUNT <= 0){
							mask.hide();
						}
					}
				);
			}else if (MASK_SHOW_COUNT > 0){
				MASK_INSTANCE.show();
			}
		},
		hide: function(){
			MASK_SHOW_COUNT--;
			if (MASK_SHOW_COUNT <= 0 && MASK_INSTANCE){
				MASK_INSTANCE.hide();
			}
		}
	};

	exports.plugin_init = function(pubjs){
		appCore = pubjs.core;
		pubjs.alert = Alert;
		pubjs.confirm = Confirm;
		pubjs.loading = SystemMask;
	}
})