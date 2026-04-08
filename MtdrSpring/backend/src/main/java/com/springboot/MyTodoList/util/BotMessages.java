package com.springboot.MyTodoList.util;

public enum BotMessages {

    WELCOME("👋 Welcome to the Project Manager Bot!\nType /help to see all commands or use the keyboard below."),
    BOT_REGISTERED("Bot registered and started successfully!"),
    BYE("👋 Keyboard hidden. Type /start to show it again.");

    private final String message;

    BotMessages(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }
}
