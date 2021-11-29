import { request } from "../../request/index.js"
Page({
  data: {
    encryptedData: "",
    iv: "",
    sessionId:""
  },
  onLoad: function (options) {
  },
  getUserProfile(e) {
    const that = this;
    //  获得 encryptedData & iv
    wx.getUserProfile({
      desc: '业务需要',
      success: res => {
        this.setData({ encryptedData: res.encryptedData, iv: res.iv })
        // 获得 sessionId
        wx.login({
          success: async (res) =>{
            const code = res.code;
            if(res.code){
              const res = await request({ url: '/weixin/sessionId/' + code })
              if( res.statusCode == 200 ){
                that.setData({ sessionId: res.data.data })
                const {encryptedData, iv, sessionId} = this.data;
                // 带着 encryptedData, iv, sessionId 去获得 token
                const res2 = await request({ 
                  url: '/weixin/authLogin',
                  method: "POST",
                  data: {
                    "encryptedData": encryptedData,
                    "iv": iv,
                    "sessionId": sessionId
                  }
                })
                if( res2.data.code == 200 ){
                  const userInfo = res2.data.data;
                  const token = res2.data.data.token;
                  wx.setStorageSync('userInfo', userInfo);
                  wx.setStorageSync('token', token);
                  wx.navigateBack({
                    delta: 1,
                  });
                }else{
                  console.log(res2.errMsg);
                  wx.showToast({
                    title: '登录失败！',
                    icon: 'error',
                  })
                }
              }else{
                console.log(res.data.message);
                wx.showToast({
                  title: '登录失败！',
                  icon: 'error',
                })
                return;
              }
            }else{
              console.log("获取用户登录状态失败!" + res.errMsg);
            }
          }
        })
      }
    })
  },
  handleCancel(){
    wx.navigateBack({
      delta: 1,
    });
  }
})
