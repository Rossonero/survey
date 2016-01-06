var oVal = {
    TOKENLOGIN: "($Token)",
    sNext: $.getUrlParameter("next"),
    bRefresh: $.getUrlParameter("refresh"),
    sUserId: "",
    sQueType: ""//问卷类型，入参123789
};
var SENDURL = TZT.REQ.XML + 'action=25002&';
var bReturnUrl = $.getUrlParameter("returnUrl");
var sHref = location.href;
var returnUrl = sHref.substr(sHref.indexOf('returnUrl=') + 10);
$(function () {
    initialize();
});

var oPerson = {};
oPerson.Timer = 500;
function initialize() {
    analyzeQues();
    $('#j_question').height($('body').height() - 150);
};
/*
 *@name analyzeQues {fn} 解析问题和答案信息
 *@prop aQues {array} 问卷信息
 */
function analyzeQues(aQues) {

    ansewrEvent();
    //scrollEvent();
    goNext();
};

/*
 *@name goNext {fn} 给下一步绑定事件
 基金的风险测评：1--低风险；2--中风险；3--高风险
 如果客户的风险等级高于或等于产品的风险等级，就没有风险提示，客户可以直接购买
 */
function goNext() {
    var JbtnNext = $("#btn-next"),
        JQues = $(".subject"),
        JQuesBox = $("#j_question"),
        bType;
    oPerson.HeightMax = 0;
    JbtnNext.on("click", function () {

        JQuesBox.submit();
    });
};
function alertRun(JQuesBox, sLevel) {
    var oLevel = {'1': '低风险', '2': '中风险', '3': '高风险'},
        oDepos = {
            "mesg": '',
            fnClose: function () {
            },
            "btnMesg": [
                {
                    "name": "确定",
                    "type": "",
                    "fn": function () {
                        if (oVal.sNext == "visit") {
                            changeURL("/action:1964?url=" + TZT.BASEVAR.FOLDER + "/reg/visit.html");
                            return;
                        } else {
                            if (oVal.bRefresh) {
                                changeURL("/action:1964/?url=" + TZT.BASEVAR.FOLDER + "/more/exam.html?show=1");
                            } else {
                                //风险测评过期失效
                                if (bReturnUrl && returnUrl) {
                                    changeURL("/action:1964/?url=" + returnUrl);
                                } else {
                                    changeURL("/action:10002/?");
                                }
                            }
                        }
                    },
                    "autoTime": 0
                },
                {
                    "name": "重新测试",
                    "type": "",
                    "fn": function () {
                        window.location.href = window.location.href;
                    },
                    "autoTime": 0
                }
            ]
        };
    if (sLevel) {
        oDepos.mesg = '<p>温馨提示：您的风险等级：' + oLevel[sLevel] + '</p>';//<p>您确定是否确定购买?</p>
    }
    OVERLAY(oDepos);
};
/*
 *@name ansewrEvent {fn} 给答案选项绑定事件

 MobileCode	String	Y	      手机号
 Token	String	Y	          时间戳
 Reqno	Int	Y	              请求标识
 PAPERANSWER	String	Y         试卷答案(逗号分隔同一选题的答案，分号分隔选题。例如：290,1;291,;292,3;)(恒生06)
 试卷答案(大标题,小标题,得分; 例如: 0,1,5,;0,2,3,;)(金证)

 */
function ansewrEvent() {
    var JAnsewr = $(".ansewrList li");
    var nSeq = 0;
    var nLength = $('#j_question').find('.subject').length;
    JAnsewr.each(function (index, obj) {
        var oThisDom = $(obj);
        oThisDom.on("click", function () {
            var $this = $(this);
            var $subject = $this.parents('.subject');
            oThisDom.find("b").addClass("cur").parents("li").siblings().find("b").removeClass("cur");
            oThisDom.find('.risk-radio').attr('checked', 'checked');
            var jTHISLI = oThisDom,
                nLilength = jTHISLI.siblings().length,
                nThisIndex = jTHISLI.index();
            if (nThisIndex == 0) {
                oThisDom.find(".cur").css("border-radius", "4px 0 0 0");
            } else if (nThisIndex == nLilength && jTHISLI.height() < 37) {
                oThisDom.find(".cur").css("border-radius", "0 0 0 4px");
            }
            setTimeout(function () {
                if ($subject.next('.subject').length) {
                    nSeq++;
                    $subject.addClass('hide');
                    $subject.next('.subject').removeClass('hide');
                    $('#btn-pre').removeClass('btn-disabled').addClass('blueBtn').removeAttr('disabled');
                    $('#risk-prog').html(nSeq + 1 + '/' + nLength);
                } else {
                    $('#btn-next').removeClass('btn-disabled').addClass('blueBtn').removeAttr('disabled');
                }
            }, 100);
        });
    });
    $('#btn-pre').on('click', function () {
        if (nSeq > 0) {
            var $current = $('.subject').eq(nSeq);
            $current.addClass('hide');
            $current.prev('.subject').removeClass('hide');
            nSeq--;
            $('#risk-prog').html(nSeq + 1 + '/' + nLength)
            if (nSeq == 0) {
                $('#btn-pre').addClass('btn-disabled').removeClass('blueBtn').attr('disabled', 'disabled');
            } else {
                $('#btn-pre').removeClass('btn-disabled').addClass('blueBtn').removeAttr('disabled');
            }
        }
    });
};
/*
 *@name findIndex {fn} 查找对应的索引所在的位置
 *@prop arrIndex {array} 索引要查找的列表
 *@prop sIndex {string} 索引要查找的字段名
 *@prop sResult {string} 返回的索引id
 */
function findIndex(sGrid, sIndex) {
    var aIndex = null,
        sResult;
    aIndex = sGrid.split("|");
    for (var i = 0, sLen = aIndex.length; i < sLen; i++) {
        if (aIndex[i] == sIndex) {
            sResult = i;
            break;
        }
    }
    return sResult;
};
