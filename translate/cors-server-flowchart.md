
## CORS服务器流程图

```graph-TB
cond1{请求是否有Origin头?}-->|no|e1(非法CORS请求)
cond1-->|yes|cond2{HTTP方法是否是OPTIONS?}
cond2-->|yes|cond3{是否有Access-Control-Request-Method头?}
cond2-->|no|sub1{真实请求}
cond3-->|no|sub1
cond3-->|yes|sub2[preflight请求]
sub1-->cond4{响应头需不需要暴露给客户端?}
cond4-->|yes|op1[设置Access-Control-Expose-Headers响应头]
sub2-->cond5{Access-Control-Request-Method头是否合法?}
cond5-->|no|e2(非法preflight请求)
cond5-->|yes|cond6{请求是否有Access-Control-Request-Header头?}
cond6-->|yes|cond7{Access-Control-Request-Header头是否合法?}
cond7-->|no|e2
cond7-->|yes|op2[设置Access-Control-Allow-Methods响应头]
cond6-->|no|op2
op2-->op3[设置Access-Control-Allow-Headers响应头]
op3-->op4["(可选)设置Access-Control-Max-Age响应头"]
op4-->op5[设置Access-Control-Allow-Origin响应头]
op5-->cond8{是否允许cookies?}
cond8-->|yes|op6[设置Access-Control-Allow-Credentials响应头]
op6-->cond9{是否是preflight请求?}
cond8-->|no|cond9
cond9-->|yes|e3("返回HTTP200响应，无响应内容")
cond9-->|no|e4(继续处理响应)
```

