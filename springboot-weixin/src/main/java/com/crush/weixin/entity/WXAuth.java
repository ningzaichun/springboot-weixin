package com.crush.weixin.entity;

import lombok.Data;
import lombok.experimental.Accessors;

/**
 * @Author: crush
 * @Date: 2021-09-14 16:42
 * version 1.0
 */
@Data
@Accessors(chain = true)
public class WXAuth {

    private String encryptedData;
    private String iv;
    private String sessionId;
}
