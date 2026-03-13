package com.springboot.MyTodoList.dto;

public class LoginRequest {
    private String phonenumber;
    private String password;

    public String getPhonenumber() { return phonenumber; }
    public void setPhonenumber(String phonenumber) { this.phonenumber = phonenumber; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
