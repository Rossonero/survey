var
    getStyle = function (sUrl, fnSuccess, nTime) {
        var nTime = nTime || 3,
            bIsLoad = false,
            nTimeout = setTimeout(function () {
                fnSuccess & fnSuccess(false); //超时模式
            }, nTime * 1000);
        return $('<link href="' + sUrl + '" rel="stylesheet" />')
            .appendTo($("head"))
            .on("load", function () { //该Link标签的加载事件
                clearTimeout(nTimeout);
                fnSuccess && fnSuccess(true);//成功模式
            })
    },
    replaceString = function (sString, oData) {
        if (oData == null) {
            return sString;
        }
        for (x in oData) {
            sString = sString.replace(new RegExp("\\{" + x + "\\}", "g"), oData[x]);
        }
        return sString;
    };


/*
 *@author:YYY{ 1037159943@qq.com  13282131370}
 *@ALT:配置项说明:
 *@params titleText {string} //标题文字
 *@paramsicoType {String}//内容栏图标名称，{yes ,alt ,noIco} 三选其一，可扩展
 *@paramsmesg {String} //弹出的信息内容,可以传入HTML源码，涉及的class 可以在overlay.css 中定义，但是要以 .boxBody 作为父级
 *@paramsfnClose{Function}//关闭弹出层的回调函数
 *@paramsbtnMesg {objectArray}对象型数组 //定义底部按钮信息
 btnMesg 示例：[
 {"name":"按钮一","type":"","fn":function(){alert("我是按钮1的单击回调函数")},"autoTime":0},</p>
 {"name":"按钮二","type":"gray","fn":function(){alert("我是按钮2的单击回调函数")},"autoTime":2}</p>
 ]
 btnMesg对应的数组中，每一个对象值就代表一个按钮，其中
 name - String型 - 定义按钮中文字
 type - String型 - 定义按钮样式（不传或传空为粉红色，gray为灰色）
 fn  - Function型 - 定义单击该按钮之后的回调函数
 autoTime  - Number型 - 定义回调函数的延迟时间，单位：秒

 *@function  - 实例化对象后方法说明
 OVERLAY.closeOverlay  立即关闭弹出层
 OVERLAY.goEndtime(nTime ,fn)  - N秒后关闭弹出层，
 该方法有两个参数 nTime ,fn
 nTime - Number - 延迟关闭的时间，单位秒
 fn  - Function型 - 定义关闭弹出层之后的回调函数
 */
var oDefaultConfig = {
        "titleText": "温馨提示", //标题栏提示文字
        "icoType": "noIco",//标题图标类型,{yes ,alt ,noIco}
        "mesg": "提示", //显示文字
        "fnClose": function () {
        },
        "btnMesg": [
            {
                "name": "确定", "type": "", "fn": function () {
            }, "autoTime": 0
            }
        ]
    },

    bIsloadStyle = false, //样式文件加载状态
    CLOSE = "close",
    sOverlayMask = "overlayMask",
    sOverlayBox = "overlayBox",
    sBoxHead = "boxHead",
    sBoxBody = "boxBody",
    sBoxFoot = "boxFoot",
    OVERLAYMASK = '<div class="' + sOverlayMask + '"></div>',//基础遮罩层
//BOXHEAD  = '<div class="'+sBoxHead+'"><span class="titleICO {icoType}"></span><p>{titleText}</p><a href="javascript:void(\'close\')" class="'+CLOSE+'"></a></div>',
    BOXHEAD = '<div class="' + sBoxHead + '"><span class="titleICO {icoType}"></span><p>{titleText}</p></div>',
    BOXBODY = '<div class="' + sBoxBody + '">{mesg}</div>',
    BOXFOOT = '<div class="' + sBoxFoot + '">{btnCode}</div>',

    OVERLAYBOX = "",
    SETTIMEOUTID = 0,
/*OVERLAYBOX = '<div class="overlayBox">'
 + BOXHEAD
 + BOXBODY
 + BOXFOOT
 +'</div>',*/
    jOverlayMask = null, jOverlayBox = null, jBoxHead = null, jBoxBody = null, jBoxFoot = null, jBtns = null;
var OVERLAY = function (oConfig) {
// 后期优化点，无须页面载入CSS，方法调用时自动载入
    /*	if(	$("link[href*=overlay\\.css]").size() == 0){
     getStyle("css/overlay-min.css",function(){
     bIsloadStyle = true ;
     })
     }else{
     bIsloadStyle = true ;
     }

     var nSetIntervalID = 0,
     nSetTimeoutID = 0;*/
    $('.overlayBox').remove();
    //window.CONFIG = $.extend(oDefaultConfig1,oConfig || {});
    window.CONFIG = {
        titleText: oConfig.titleText || oDefaultConfig.titleText,
        icoType: oConfig.icoType || oDefaultConfig.icoType,
        mesg: oConfig.mesg || oDefaultConfig.mesg,
        fnClose: oConfig.fnClose || oDefaultConfig.fnClose,
        btnMesg: oConfig.btnMesg || oDefaultConfig.btnMesg
    };
    OVERLAY.prototype.creatDom();
    OVERLAY.closeOverlay = OVERLAY.prototype.closeOverlay;
    OVERLAY.goEndtime = OVERLAY.prototype.goEndtime;
}

OVERLAY.prototype = {
    //组装弹出层结构
    creatDom: function () {
        var aoBtnMesg = CONFIG.btnMesg, sBtnCode = "";
        for (var x = 0; x < aoBtnMesg.length; x++) {
            var oThis = aoBtnMesg[x];
            sBtnCode += '<a href="javascript:void(0);" class="' + oThis.type + '" data-autoTime="' + oThis.autoTime + '">' + oThis.name + '</a>'
        }
        CONFIG.btnCode = sBtnCode;
        OVERLAYBOX
            = replaceString(
            ('<div class="' + sOverlayBox + '">'
            + BOXHEAD
            + BOXBODY
            + BOXFOOT
            + '</div>'), CONFIG);
        $(OVERLAYBOX + OVERLAYMASK).prependTo($("body"));
        jOverlayMask = $("." + sOverlayMask);
        jOverlayBox = $("." + sOverlayBox);
        jBoxHead = $("." + sBoxHead);
        jBoxBody = $("." + sBoxBody);
        jBoxFoot = $("." + sBoxFoot);
        jBtns = jBoxFoot.find("a");
        OVERLAY.prototype.reviseStyle();
    },
    //校正相关节点对象的，宽度，高低，间距等样式
    reviseStyle: function () {
        var nScreenHeight = document.documentElement.clientHeight;
        var nScrollTop = document.body.scrollTop || document.documentElement.scrollTop;
        jOverlayMask.css("top", nScrollTop);
        jOverlayBox.css({"top": (nScreenHeight - jOverlayBox.height()) * 0.5 + nScrollTop});
        if (jBtns.length > 1) {
            var nBtnsWidth = 0, N = 0;
            $.each(jBtns, function (index, obj) {
                nBtnsWidth += $(obj).width(true);
                N += 1;
            })
            N += N;
            jBtns.css({
                "marginLeft": ($(".boxFoot").width() - nBtnsWidth) / N - 1,
                "marginRight": ($(".boxFoot").width() - nBtnsWidth) / N - 1,
            })
        }
        OVERLAY.prototype.bindEvent();
    },
    //给各个操作按钮绑定事件
    bindEvent: function () {
        var aoBtnMesg = CONFIG.btnMesg;
        //底部自定义按钮事件
        $.each(jBtns, function (index, obj) {
            $(obj).click(function () {
                var nAutoTime = Number($(this).attr("data-autoTime"));
                if (nAutoTime > 0) {
                    OVERLAY.prototype.goEndtime(nAutoTime, aoBtnMesg[index].fn)
                } else {
                    OVERLAY.prototype.closeOverlay(aoBtnMesg[index].fn);
                }
            })
        })
        //关闭按钮的事件绑定
        $("." + CLOSE) && $("." + CLOSE).click(function () {
            OVERLAY.prototype.closeOverlay(CONFIG.fnClose);
        })
    },
    //关闭弹出层公共方法（销毁DOM结构）
    closeOverlay: function (fn) {
        jOverlayMask.remove();
        jOverlayBox.remove();
        clearTimeout(SETTIMEOUTID);
        fn && fn();
    },
    //启动自动关闭弹出层
    goEndtime: function (nTime, fn) {
        var thisTime = nTime || 2;
        SETTIMEOUTID = setTimeout(function () {
            OVERLAY.prototype.closeOverlay(fn);
        }, thisTime * 1000)
    }
}