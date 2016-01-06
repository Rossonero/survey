<%@ page contentType="text/html;charset=GBK" %>
<%@ page import="rewin.transaction.*" %>
<%@ page import="rewin.ECSN.util.ActiveUser.*" %>
<%@ page import="java.util.Map" %>
<%@ page import="java.util.HashMap" %>
<%@ page import="java.util.List" %>
<%@ page import="java.util.ArrayList" %>
<%@page import="com.hx.web.mvc.Exception.CallException" %>
<%@page import="com.hx.web.mvc.RequestContext" %>
<%@page import="com.hx.web.mvc.Constants" %>
<%@page import="com.hx.kcbpcall.vo.Operator" %>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>风险测评</title>
    <meta name="viewport"
          content="initial-scale=1.0,maximum-scale=1.0,minimum-scale=1.0,user-scalable=no,target-densitydpi = medium-dpi">
    <meta name="format-detection" content="telephone=no">
    <meta name="apple-touch-fullscreen" content="YES">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black">
    <link rel="stylesheet" type="text/css" href="/hxzq/order/styles/surveybase.css">
    <link rel="stylesheet" href="/hxzq/order/styles/risktest.css">
    <link rel="stylesheet" type="text/css" href="/hxzq/order/styles/overlay.css">
</head>
<%
    TradeSession tradeSession = (TradeSession) session.getAttribute("tradeSession");
//tradeSession.userCacheValue.account="10000023456";
//tradeSession.userCacheValue.branchID="100";
//tradeSession.userCacheValue.customerId="10000023456";
//tradeSession.userCacheValue.passwd="";
    String token = null;
    Operator oper = null;
    RequestContext requestContext = (RequestContext) request
            .getAttribute(Constants.RCONTEXT);
    if (requestContext != null)
        oper = requestContext.getOperator();
    if (tradeSession == null) {

        if (oper == null) {
            return;
        }
        tradeSession = new TradeSession(request, session);
        tradeSession.userCacheValue.account = oper.getZjhm();
        tradeSession.userCacheValue.branchID = oper.getYybbh();
        tradeSession.userCacheValue.customerId = (String) oper.getResult().get("custid");
        tradeSession.userCacheValue.passwd = oper.getGymm();
        token = oper.getToken();
    }
    if (oper != null && "9988".equals(oper.getYybbh())) {
        throw new CallException("-1", "您是体验客户,暂不支持风险测评。");
    }
    StockTrade stockTrade = new StockTrade(tradeSession);


    String strMsg = "";
    char COMDIV = 0x01;
    int funcID = 0;
    StringBuffer sbuf = null;
    String custid = tradeSession.getCustomerId();//getAccount();
    String yybdm = tradeSession.getDeptID();
    String riskkind = "1";

    //得到题目
    funcID = 30005;
    String Sno = "1";
    String SubSno = "-1";
    sbuf = new StringBuffer();
    sbuf.append(String.valueOf(Sno)).append(COMDIV);
    sbuf.append(String.valueOf(SubSno)).append(COMDIV);
    //out.println(sbuf.toString());
    String quesAns = stockTrade.submitEx(funcID, sbuf.toString());
    //out.println("ans:=" + quesAns);

    //得到选项
    funcID = 30006;
    String Result = "";
    sbuf = new StringBuffer();
    sbuf.append(String.valueOf(Sno)).append(COMDIV);
    sbuf.append(String.valueOf(SubSno)).append(COMDIV);
    sbuf.append(String.valueOf(Result)).append(COMDIV);
    String choiceAns = stockTrade.submitEx(funcID, sbuf.toString());
    //out.println(choiceAns);
    FixParser fixChoice = new FixParser();
    fixChoice.parse(choiceAns);
    //sret = fix.getFieldValue("ret_code", 0);
    HashMap choiceListMap = new HashMap();
    int iChoiceRows = fixChoice.getRecordCount();
    for (int i = 0; i < iChoiceRows; i++) {
        Integer id = new Integer(i + 1);
        Integer subsno = new Integer(fixChoice.getFieldValue("subsno", i));
        String result = fixChoice.getFieldValue("result", i);
        Integer score = new Integer(fixChoice.getFieldValue("score", i));
        String content = fixChoice.getFieldValue("content", i);
        Map choiceInfo = new HashMap();
        choiceInfo.put("id", id);
        choiceInfo.put("subsno", subsno);
        choiceInfo.put("result", result);
        choiceInfo.put("score", score);
        choiceInfo.put("content", content);

        if (choiceListMap.containsKey(subsno)) {
            List choiceList = (List) choiceListMap.get(subsno);
            choiceList.add(choiceInfo);
        } else {
            List choiceList = new ArrayList();
            choiceList.add(choiceInfo);
            choiceListMap.put(subsno, choiceList);
        }
    }

    String op = request.getParameter("op") == null ? "" : request.getParameter("op");
    if (op.equals("submit")) {
		/*准备风险调查信息*/
        boolean riskCheck = true;
        String[] riskArray = new String[]{
                "risk1",
                "risk2",
                "risk3",
                "risk4",
                "risk5",
                "risk6",
                "risk7",
                "risk8",
                "risk9",
                "risk10",
                "risk11"

        };
        List riskParamList = new ArrayList();
        for (int i = 0; i < riskArray.length; i++) {
            String valueTmp = request.getParameter(riskArray[i]) == null ? "" : request.getParameter(riskArray[i]);
            if (valueTmp.length() == 0)
                riskCheck = false;
            riskParamList.add(valueTmp);
        }

        HashMap scoreMapMap = new HashMap();
        iChoiceRows = fixChoice.getRecordCount();
        for (int i = 0; i < iChoiceRows; i++) {
            Integer subsno = new Integer(fixChoice.getFieldValue("subsno", i));
            String result = fixChoice.getFieldValue("result", i);
            Integer score = new Integer(fixChoice.getFieldValue("score", i));
            String content = fixChoice.getFieldValue("content", i);
            if (scoreMapMap.containsKey(subsno)) {
                Map scoreMap = (Map) scoreMapMap.get(subsno);
                scoreMap.put(result, score);
            } else {
                Map scoreMap = new HashMap();
                scoreMap.put(result, score);
                scoreMapMap.put(subsno, scoreMap);
            }
        }

		/*写入风险调查答题信息*/
        funcID = 30009;
        int riskvalue = 0;
        String sno = "1";
        for (int i = 0; i < riskParamList.size(); i++) {
            //out.println(i);
            Integer iSubSno = new Integer(i + 1);
            //out.println("iSubSno:=" + iSubSno.toString());
            String sAnswer = (String) riskParamList.get(i);
            Integer iScore = (Integer) ((Map) scoreMapMap.get(iSubSno)).get(sAnswer);
            riskvalue = riskvalue + iScore.intValue();
            String sScore = iScore.toString();
            sbuf = new StringBuffer();
            sbuf.append(String.valueOf(custid)).append(COMDIV);
            sbuf.append(String.valueOf(yybdm)).append(COMDIV);
            sbuf.append(String.valueOf(sno)).append(COMDIV);
            sbuf.append(String.valueOf(iSubSno.toString())).append(COMDIV);
            sbuf.append(String.valueOf(sAnswer)).append(COMDIV);
            sbuf.append(String.valueOf(sScore)).append(COMDIV);
            //out.println("sbuf:=" + sbuf.toString());
            String riskAns = stockTrade.submitEx(funcID, sbuf.toString());
            //out.println("riskAns:=" + riskAns);
        }

		/*查询投资人风险承受能力结果*/
        funcID = 30001;
        sbuf = new StringBuffer();
        sbuf.append(String.valueOf(custid)).append(COMDIV);
        sbuf.append(String.valueOf(yybdm)).append(COMDIV);
        sbuf.append(String.valueOf(yybdm)).append(COMDIV);
        sbuf.append(String.valueOf(riskkind)).append(COMDIV);
        String riskLevelAns = stockTrade.submitEx(funcID, sbuf.toString());
        FixParser fixRiskLevel = new FixParser();
        fixRiskLevel.parse(riskLevelAns);
        String retRiskLevel = fixRiskLevel.getFieldValue("risklevel", 0);
        //out.println("retRiskLevel:=" + retRiskLevel);

        funcID = 30002;
        sbuf = new StringBuffer();
        String title = "华西证券客户风险评估问卷";
        String risklevel = "1";
        if (riskvalue < 30) {
            risklevel = "1";
        } else if (riskvalue >= 70) {
            risklevel = "3";
        } else {
            risklevel = "2";
        }
        String action = "A";
        if (retRiskLevel != null && retRiskLevel.length() > 0)
            action = "U";
        sbuf.append(String.valueOf(custid)).append(COMDIV);
        sbuf.append(String.valueOf(yybdm)).append(COMDIV);
        sbuf.append(String.valueOf(yybdm)).append(COMDIV);
        sbuf.append(String.valueOf(riskkind)).append(COMDIV);
        sbuf.append(String.valueOf(title)).append(COMDIV);
        sbuf.append(String.valueOf(risklevel)).append(COMDIV);
        sbuf.append(String.valueOf(riskvalue)).append(COMDIV);
        sbuf.append(String.valueOf(action)).append(COMDIV);
        if (token != null)
            sbuf.append(String.valueOf(token)).append(COMDIV);
        //out.println( sbuf.toString());
        String riskInfoAns = stockTrade.submitEx(funcID, sbuf.toString());
        //out.println(riskInfoAns);
		/*查询投资人风险承受能力结果*/
        //risklevel=3,
        //holdtime=
        funcID = 30001;
        sbuf = new StringBuffer();
        sbuf.append(String.valueOf(custid)).append(COMDIV);
        sbuf.append(String.valueOf(yybdm)).append(COMDIV);
        sbuf.append(String.valueOf(yybdm)).append(COMDIV);
        sbuf.append(String.valueOf(riskkind)).append(COMDIV);
        String riskLevelAns2 = stockTrade.submitEx(funcID, sbuf.toString());
        FixParser fixRiskLevel2 = new FixParser();
        fixRiskLevel2.parse(riskLevelAns2);
        String retSubitemname = fixRiskLevel2.getFieldValue("subitemname", 0);
        retRiskLevel = fixRiskLevel2.getFieldValue("risklevel", 0);
        if (retRiskLevel != null && retRiskLevel.length() == 1 && oper != null) {
            oper.setRinkLevel(new Integer(retRiskLevel).intValue());
            String returnurl = request.getParameter("returnurl");
            if (returnurl != null && returnurl.length() != 0) {
                out.println("<script>alert('风险承受能力级别：" + retSubitemname + "\r\n特别说明：风险承受能力评估结果有效期为2年，请在结果失效前及时更新您的评估信息，此评估仅供投资我司产品之用，其内容并未包含所有影响风险承受能力的因素。');</script>");
                return;
            }
        }

        out.println("<body><h2 style='padding:3px;'>风险承受能力级别：" + retSubitemname + "<br/>特别说明：风险承受能力评估结果有效期为2年，请在结果失效前及时更新您的评估信息，此评估仅供投资我司产品之用，其内容并未包含所有影响风险承受能力的因素。</h2></body></html>");

        return;
    }
%>


<body>
<div class="risk-tips">
    正确评估投资风险，选择最合适自己的投资方式！此次评估大约花费您一分钟时间。
    <p class="risk-prog">当前进度为<span id="risk-prog">1/11</span></p>
</div>
<form class="risk" id="j_question" name="frm_jj_survey" method="post">
    <input type="hidden" id="order" name="order" value="jj_survey">
    <input type="hidden" id="op" name="op" value="submit">
    <input type="hidden" id="returnurl" name="returnurl" value="">
    <%
        FixParser fixQues = new FixParser();
        fixQues.parse(quesAns);
        int iQuesRows = fixQues.getRecordCount();
        StringBuffer htmlBuf = new StringBuffer();
        for (int i = 0; i < iQuesRows; i++) {
            String sQuesId = fixQues.getFieldValue("subsno", i);
            if (i == 0) {
                htmlBuf.append("<div class='subject' data-queid='1' data_id='" + sQuesId + "'>");
                htmlBuf.append("<p>" + sQuesId + " " + fixQues.getFieldValue("content", i) + "</p>");
            } else {
                htmlBuf.append("<div class='subject hide' data-queid='1' data_id='" + sQuesId + "'>");
                htmlBuf.append("<p>" + fixQues.getFieldValue("content", i) + "</p>");
            }
            htmlBuf.append(" <ul class='ansewrList'>");
            List choiceList = (List) choiceListMap.get(new Integer(sQuesId));
            for (int j = 0; j < choiceList.size(); j++) {
                Map choiceInfo = (Map) choiceList.get(j);
                String content = (String) choiceInfo.get("content");
                htmlBuf.append("<li data_id='" + sQuesId + "' data-proid='" + choiceInfo.get("result") + "' data_score='0'><b>" + (char) ('A' + j) + "</b><span>" + content + "</span><input name='risk" + choiceInfo.get("subsno") + "' type='radio' class='risk-radio' value='" + choiceInfo.get("result") + "' /></li>");
            }
            htmlBuf.append(" </ul>");
            htmlBuf.append(" </div>");
        }
        out.println(htmlBuf.toString());
    %>
</form>
<div class="foot  foot-risk">
    <input id="btn-pre" type="button" class="nextBtn btn-risk blueBtn" href="javascript:;" value="上一题">
    <input id="btn-next" type="button" disabled="" class="nextBtn btn-disabled btn-risk" href="javascript:;" value="提交">
</div>
<script src="/hxzq/order/scripts/jquery-1.8.3.min.js"></script>
<script src="/hxzq/order/scripts/common-min.js"></script>
<script type="text/javascript" src="/hxzq/order/scripts/overlay.js"></script>
<script src="/hxzq/order/scripts/riskTest.js"></script>
</body>
</html>