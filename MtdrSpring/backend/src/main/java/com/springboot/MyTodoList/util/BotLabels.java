package com.springboot.MyTodoList.util;

/**
 * Keyboard button labels for the Telegram bot.
 */
public enum BotLabels {

    SHOW_MAIN_SCREEN("Show Main Screen"),
    HIDE_MAIN_SCREEN("Hide Main Screen");

    private final String label;

    BotLabels(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
