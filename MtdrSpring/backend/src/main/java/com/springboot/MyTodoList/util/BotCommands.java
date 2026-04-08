package com.springboot.MyTodoList.util;

public enum BotCommands {

    START_COMMAND("/start"),
    HIDE_COMMAND("/hide"),
    HELP("/help"),

    // Task commands
    MY_TASKS("/mytasks"),
    DONE_TASK("/done"),

    // Sprint commands
    SPRINT("/sprint"),
    NEW_SPRINT("/newsprint"),

    // Project commands
    LIST_PROJECTS("/listprojects"),
    NEW_PROJECT("/newproject"),

    // AI
    LLM_REQ("/llm");

    private final String command;

    BotCommands(String command) {
        this.command = command;
    }

    public String getCommand() {
        return command;
    }
}
