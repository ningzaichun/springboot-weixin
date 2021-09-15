package com.crush.weixin.controller;


import com.crush.weixin.commons.Result;
import com.crush.weixin.entity.WXAuth;
import com.crush.weixin.service.IWeixinService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * <p>
 *  前端控制器
 * </p>
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

