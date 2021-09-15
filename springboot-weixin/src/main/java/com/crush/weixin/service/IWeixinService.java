package com.crush.weixin.service;

import com.crush.weixin.commons.Result;
import com.crush.weixin.entity.WXAuth;
import com.crush.weixin.entity.Weixin;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 * <p>
 *  服务类
 * </p>
 *
 * @author crush
 * @since 2021-09-14
 */
public interface IWeixinService extends IService<Weixin> {

    String getSessionId(String code);

    Result authLogin(WXAuth wxAuth);
}
