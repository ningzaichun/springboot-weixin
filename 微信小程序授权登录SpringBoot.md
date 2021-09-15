# 微信小程序授权登录和后端SpringBoot交互

> 你好，我是博主`宁在春`，一起学习吧！！！
>
> 写这篇文章的原因，主要是因为最近在写毕业设计，用到了小程序，这中间曲曲折折，一言难尽啊。毕业设计真的让人麻脑阔😂。唉
>
> 最近在持续更新，每天推送完代码，遇到的问题都记下来，希望对大家也能有所帮助。

在网上找了很多很多，看了不下几十篇，说实话，有些给出了核心代码，添上一个微信官方的那张流程图就结束了，会的人一下就懂了。但是说实话，真的不适合入门学者，浪费很多时间都不一定能解决问题，将**代码复制完不是少这就是少那，或者就是不齐**，不知道看到这篇文章的你有没有遇到过这样的问题。

所以我自己将踩坑的经历写下来了，希望能够帮助到大家，开源进步，交流进步，一起学习！！！

[微信官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html)

## 一、微信小程序官方登录流程图

![img](https://gitee.com/crushlxb/typora/raw/master/img/api-login.2fcc9f35.jpg)

`个人理解`：

1. 调用wx.login() 获取`code`，这个code的作用是实现微信临时登录的`url`中的一个非常重要的参数。

   - 微信授权的url="https://api.weixin.qq.com/sns/jscode2session?appid={0}&secret={1}&js_code={2}&grant_type=authorization_code"
   - `js_code`所用到的值就是 获取到的code。

2. 把获取到的`code`传给我们自己的`SpringBoot`后端，由我们后端向微信接口服务发送请求。

   - 

     ```java
     String url = "https://api.weixin.qq.com/sns/jscode2session?appid={0}&secret={1}&js_code={2}&grant_type=authorization_code";
     String replaceUrl = url.replace("{0}", appid).replace("{1}", secret).replace("{2}", code);
     String res = HttpUtil.get(replaceUrl);//后面有代码的，莫急
     ```

   - `appid`：应用ID，`secret`：应用密钥，`js_code`：前台传给我们的`code`

   - `secret`获取方式：

     1. 进入[微信公众平台](https://mp.weixin.qq.com/)
     2. 左侧菜单选择【开发管理】
     3. 右侧tab选择【开发设置】
     4. AppSecret栏右侧点击重置会弹出一个二维码，需要开发者扫描二维码才可以重置AppSecret。出现AppSecret后点击复制，并保存你的AppSecret。
     5. 没保存就只能重新生成了。

3. 后端发送请求后获取到的返回信息：

   ```cmd
   {"session_key":"...","openid":"o25L2...."}
   ```

4. 按照官方文档所讲：自定义登录态与`openid和session_key`关联，有很多方式可以实现的，如：

   - 第一种方式：我们可以将`openid和session_key`存进redis中，前端来访问的时候带上就能够访问了。
   - 第二种方式：利用`jwt`方式生成`Token`返回给前端，让前端下次请求时能够带上，就能允许他们访问了。

5. 前端将`token`存入`storage`

6. 前端在`wx.request()`发起业务请求携带自定义登录态，后端进行请求头的检查就可以了。

7. 后端返回业务数据

==上述就是官方的方式，但是在现在的时代，数据是非常重要的，不可能说不将用户数据持久化的，所以这个流程会稍稍多一些操作的。==



## 二、个人实现登录流程图

![image-20210915094137005](https://gitee.com/crushlxb/typora/raw/master/img/image-20210915094137005.png)

## 三、小程序端

先说一下，这里只是测试的Demo，是分开测试的。

我本地没有微信的编程坏境是拿小伙伴的测试的。

### 2.1、调用`wx.login()`

```javascript
wx.login({
    success:function(res){
        if(res.code){
            console.log(res.code);
        }
    }
})
```

就是这样的一个字符串：

![image-20210914210516147](https://gitee.com/crushlxb/typora/raw/master/img/image-20210914210516147.png)

我们将这个返回的`code`,先保存起来，稍后我们在后端测试中会用上的。

### 2.2、调用`getUserInfo()`

```html
<button open-type="getUserInfo" bindgetuserinfo="userInfoHandler"> Click me <tton>
```

```javascript
// 微信授权
wx.getUserInfo({
    success: function(res) {
		console.log(res);
    }
})
```

打印出来是这样的一些数据。

![image-20210915104220420](https://gitee.com/crushlxb/typora/raw/master/img/image-20210915104220420.png)

我们需要保存的是

1. `encrytedData`：包括敏感数据在内的完整用户信息的加密数据（即可以通过反解密，获取出用户数据），详见 [用户数据的签名验证和加解密](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/signature.html#加密数据解密算法)
2. `iv`：加密算法的初始向量，详见 [用户数据的签名验证和加解密](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/signature.html#加密数据解密算法)

至此，我们需要在前台获取的数据，已经结束了，接下来就用我们获取到的数据一起来看后端吧！！！

----

## 四、SpringBoot后端

为了将代码精简，我这边只是把获取到的数据输出出来，并未真实的保存到数据中。业务操作用注释在文中展示。

项目结构：

![image-20210914211642298](https://gitee.com/crushlxb/typora/raw/master/img/image-20210914211642298.png)

### 3.1、相关jar

创建一个SpringBoot项目，或者maven项目都可以。

```xml
  <parent>
        <artifactId>spring-boot-starter-parent</artifactId>
        <groupId>org.springframework.boot</groupId>
        <version>2.5.2</version>
        <relativePath/>
    </parent>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-redis</artifactId>
        </dependency>
        <dependency>
            <groupId>org.apache.commons</groupId>
            <artifactId>commons-pool2</artifactId>
        </dependency>
        <dependency>
            <groupId>com.alibaba</groupId>
            <artifactId>fastjson</artifactId>
            <version>1.2.72</version>
        </dependency>

        <!--使用hutool中对http封装工具类 调用 HTTP 请求-->
        <dependency>
            <groupId>cn.hutool</groupId>
            <artifactId>hutool-all</artifactId>
            <version>5.6.5</version>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
        </dependency>
    </dependencies>
```

### 3.2、yml配置文件

```yml
server:
  port: 8081
spring:
  application:
    name: springboot-weixin
  redis:
    database: 0
    port: 6379
    host: localhost
    password:
weixin:
  appid: 'appid'
  secret: '应用密钥'
```

### 3.3、公共类

就是一常量

```java
public class RedisKey {
    public static final String WX_SESSION_ID = "wx_session_id";
}
```



```java
/**
 * 统一响应结果集
 * @author crush
 */
@Data
public class Result<T> {

    //操作代码
    Integer code;

    //提示信息
    String message;

    //结果数据
    T data;

    public Result() {
    }

    public Result(ResultCode resultCode) {
        this.code = resultCode.code();
        this.message = resultCode.message();
    }

    public Result(ResultCode resultCode, T data) {
        this.code = resultCode.code();
        this.message = resultCode.message();
        this.data = data;
    }

    public Result(String message) {
        this.message = message;
    }

    public static Result SUCCESS() {
        return new Result(ResultCode.SUCCESS);
    }

    public static <T> Result SUCCESS(T data) {
        return new Result(ResultCode.SUCCESS, data);
    }

    public static Result FAIL() {
        return new Result(ResultCode.FAIL);
    }

    public static Result FAIL(String message) {
        return new Result(message);
    }
}
```



```java

/**
 * 通用响应状态
 */
public enum ResultCode {

    /* 成功状态码 */
    SUCCESS(0, "操作成功！"),

    /* 错误状态码 */
    FAIL(-1, "操作失败！"),

    /* 参数错误：10001-19999 */
    PARAM_IS_INVALID(10001, "参数无效"),
    PARAM_IS_BLANK(10002, "参数为空"),
    PARAM_TYPE_BIND_ERROR(10003, "参数格式错误"),
    PARAM_NOT_COMPLETE(10004, "参数缺失"),

    /* 用户错误：20001-29999*/
    USER_NOT_LOGGED_IN(20001, "用户未登录，请先登录"),
    USER_LOGIN_ERROR(20002, "账号不存在或密码错误"),
    USER_ACCOUNT_FORBIDDEN(20003, "账号已被禁用"),
    USER_NOT_EXIST(20004, "用户不存在"),
    USER_HAS_EXISTED(20005, "用户已存在"),

    /* 系统错误：40001-49999 */
    FILE_MAX_SIZE_OVERFLOW(40003, "上传尺寸过大"),
    FILE_ACCEPT_NOT_SUPPORT(40004, "上传文件格式不支持"),

    /* 数据错误：50001-599999 */
    RESULT_DATA_NONE(50001, "数据未找到"),
    DATA_IS_WRONG(50002, "数据有误"),
    DATA_ALREADY_EXISTED(50003, "数据已存在"),
    AUTH_CODE_ERROR(50004, "验证码错误"),


    /* 权限错误：70001-79999 */
    PERMISSION_UNAUTHENTICATED(70001, "此操作需要登陆系统！"),

    PERMISSION_UNAUTHORISE(70002, "权限不足，无权操作！"),

    PERMISSION_EXPIRE(70003, "登录状态过期！"),

    PERMISSION_TOKEN_EXPIRED(70004, "token已过期"),

    PERMISSION_LIMIT(70005, "访问次数受限制"),

    PERMISSION_TOKEN_INVALID(70006, "无效token"),

    PERMISSION_SIGNATURE_ERROR(70007, "签名失败"),

    //操作代码
    int code;
    //提示信息
    String message;

    ResultCode(int code, String message) {
        this.code = code;
        this.message = message;
    }

    public int code() {
        return code;
    }

    public String message() {
        return message;
    }

    public void setCode(int code) {
        this.code = code;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
```



```java
package com.crush.mybatisplus.config;

import cn.hutool.core.lang.Assert;
import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.parser.ParserConfig;
import com.alibaba.fastjson.serializer.SerializerFeature;
import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.databind.type.TypeFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.data.redis.RedisProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.cache.RedisCacheWriter;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.SerializationException;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * redis 配置类
 *
 * @author crush
 */
@EnableCaching
@Configuration
@ConditionalOnClass(RedisOperations.class)
@EnableConfigurationProperties(RedisProperties.class)
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory redisConnectionFactory) {
        RedisTemplate<String, Object> redisTemplate = new RedisTemplate<>();
        StringRedisSerializer stringRedisSerializer = new StringRedisSerializer();
        //key hasKey的序列化
        redisTemplate.setKeySerializer(stringRedisSerializer);
        redisTemplate.setHashKeySerializer(stringRedisSerializer);

        redisTemplate.setConnectionFactory(redisConnectionFactory);
        redisTemplate.afterPropertiesSet();
        return redisTemplate;
    }

    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory redisConnectionFactory) {
        StringRedisTemplate stringRedisTemplate = new StringRedisTemplate();
        stringRedisTemplate.setConnectionFactory(redisConnectionFactory);
        return stringRedisTemplate;
    }
}
```

### 3.4、Controller

```java
import com.crush.weixin.commons.Result;
import com.crush.weixin.entity.WXAuth;
import com.crush.weixin.service.IWeixinService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 *
 * @author crush
 * @since 2021-09-14
 */
@Slf4j
@RestController
@RequestMapping("/weixin")
public class WeixinController {

    @Autowired
    IWeixinService weixinService;

    //这个就是那个使用传code进来的接口
    @GetMapping("/sessionId/{code}")
    public String getSessionId(@PathVariable("code") String code){
        return  weixinService.getSessionId(code);
    }

    @PostMapping("/authLogin")
    public Result authLogin(@RequestBody WXAuth wxAuth) {
        Result result = weixinService.authLogin(wxAuth);
        log.info("{}",result);
        return result;
    }
}
```





### 3.5、service层

```java
public interface IWeixinService extends IService<Weixin> {

    String getSessionId(String code);

    Result authLogin(WXAuth wxAuth);
}
```



```java
import cn.hutool.core.lang.UUID;
import cn.hutool.http.HttpUtil;
import com.alibaba.fastjson.JSON;
import com.crush.weixin.commons.RedisKey;
import com.crush.weixin.commons.Result;
import com.crush.weixin.entity.WXAuth;
import com.crush.weixin.entity.Weixin;
import com.crush.weixin.entity.WxUserInfo;
import com.crush.weixin.mapper.WeixinMapper;
import com.crush.weixin.service.IWeixinService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;


/**
 * @author crush
 * @since 2021-09-14
 */
@Slf4j
@Service
public class WeixinServiceImpl extends ServiceImpl<WeixinMapper, Weixin> implements IWeixinService {


    @Value("${weixin.appid}")
    private String appid;

    @Value("${weixin.secret}")
    private String secret;

    @Autowired
    StringRedisTemplate redisTemplate;

    @Autowired
    WxService wxService;


    @Override
    public String getSessionId(String code) {
        String url = "https://api.weixin.qq.com/sns/jscode2session?appid={0}&secret={1}&js_code={2}&grant_type=authorization_code";
        String replaceUrl = url.replace("{0}", appid).replace("{1}", secret).replace("{2}", code);
        String res = HttpUtil.get(replaceUrl);
        String s = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(RedisKey.WX_SESSION_ID + s, res);
        return s;
    }

    @Override
    public Result authLogin(WXAuth wxAuth) {
        try {
            String wxRes = wxService.wxDecrypt(wxAuth.getEncryptedData(), wxAuth.getSessionId(), wxAuth.getIv());
            log.info("用户信息："+wxRes);
       		//用户信息：{"openId":"o2ttv5L2yufc4-sVoSPhTyUnToY60","nickName":"juana","gender":2,"language":"zh_CN","city":"Changsha","province":"Hunan","country":"China","avatarUrl":"头像链接","watermark":{"timestamp":1631617387,"appid":"应用id"}}
            WxUserInfo wxUserInfo = JSON.parseObject(wxRes,WxUserInfo.class);
            // 业务操作：你可以在这里利用数据 对数据库进行查询， 如果数据库中没有这个数据，就添加进去，即实现微信账号注册
            // 如果是已经注册过的，就利用数据，生成jwt 返回token，实现登录状态
            return Result.SUCCESS(wxUserInfo);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return Result.FAIL();
    }
}
```

牵扯到用户信息解密的方法，想要了解，可以去微信官方文档中进行了解，我对此没有深入。

```java
import cn.hutool.core.codec.Base64;
import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.crush.weixin.commons.RedisKey;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.spec.AlgorithmParameterSpec;
import java.util.Random;

@Slf4j
@Component
public class WxService {
    @Autowired
    private StringRedisTemplate redisTemplate;

    public String wxDecrypt(String encryptedData, String sessionId, String vi) throws Exception {
        // 开始解密
        String json =  redisTemplate.opsForValue().get(RedisKey.WX_SESSION_ID + sessionId);
        log.info("之前存储在redis中的信息："+json);
        //之前存储在redis中的信息：{"session_key":"G59Evf\/Em54X6WsFsrpA1g==","openid":"o2ttv5L2yufc4-VoSPhTyUnToY60"}
        JSONObject jsonObject = JSON.parseObject(json);
        String sessionKey = (String) jsonObject.get("session_key");
        byte[] encData = cn.hutool.core.codec.Base64.decode(encryptedData);
        byte[] iv = cn.hutool.core.codec.Base64.decode(vi);
        byte[] key = Base64.decode(sessionKey);
        AlgorithmParameterSpec ivSpec = new IvParameterSpec(iv);
        Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        SecretKeySpec keySpec = new SecretKeySpec(key, "AES");
        cipher.init(Cipher.DECRYPT_MODE, keySpec, ivSpec);
        return new String(cipher.doFinal(encData), "UTF-8");
    }
}
```

最后写个启动类就可以开始测试了。

```java
@SpringBootApplication
public class SpringBootWeixin {
    public static void main(String[] args) {
        SpringApplication.run(SpringBootWeixin.class);
    }
}
```

## 五、测试

写完后端，接下来，可以利用我们之前收集的那些小程序中获取到的数据啦。

1、先发送第一个请求：

`code`：就是之前我们获取到的数据。

```http
http://localhost:8081/weixin/sessionId/{code}  
```

会返回一个`sessionId`回来，在第二个请求中需要携带。

2、再发送第二个请求

```http
http://localhost:8081/weixin/authLogin
```

请求方式：post

`data`：json格式数据

```json
{
    "encryptedData":"sYiwcAM73Ci2EB3y9+C6.....",
    "iv": "xZGOj6RwaOS==",
    "sessionId":"我们上一个请求获取到sessionId"
}
```

请求成功是下面这样的。

![image-20210914214348638](C:\Users\ASUS\Desktop\宁在春的学习笔记\毕业设计所遇到过的问题\微信小程序授权登录SpringBoot.assets\image-20210914214348638.png)

我们把我们需要的存储到数据库持久化即可啦。



## 六、自言自语

这只是一个小demo，在使用中大都会结合`security`安全框架和`Jwt`一起使用，周末吧，周末比较有空，有空就会更新出来。

----

> 你好，我是博主`宁在春`，有问题可以留言评论或者私信我，大家一起交流学习！
>
> 不过都看到这里啦，点个赞吧👩‍💻

![366](https://gitee.com/crushlxb/typora/raw/master/img/366.png)



