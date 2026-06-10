package com.springboot.MyTodoList.dto;

/**
 * A single prior turn of the chat conversation, sent by the frontend so the
 * agent can resolve follow-ups ("yes, do it", "the second one") statelessly.
 */
public class ChatMessage {
    private String role;    // "user" or "assistant"
    private String content;

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
