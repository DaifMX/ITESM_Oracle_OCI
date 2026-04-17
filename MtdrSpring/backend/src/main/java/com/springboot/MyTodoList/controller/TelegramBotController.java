package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.config.BotProps;
import com.springboot.MyTodoList.repository.EmployeeRepository;
import com.springboot.MyTodoList.service.DeepSeekService;
import com.springboot.MyTodoList.service.ProjectService;
import com.springboot.MyTodoList.service.SprintService;
import com.springboot.MyTodoList.service.TaskService;
import com.springboot.MyTodoList.util.BotActions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.client.okhttp.OkHttpTelegramClient;
import org.telegram.telegrambots.longpolling.BotSession;
import org.telegram.telegrambots.longpolling.interfaces.LongPollingUpdateConsumer;
import org.telegram.telegrambots.longpolling.starter.AfterBotRegistration;
import org.telegram.telegrambots.longpolling.starter.SpringLongPollingBot;
import org.telegram.telegrambots.longpolling.util.LongPollingSingleThreadUpdateConsumer;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.generics.TelegramClient;

/**
 * Telegram bot for agile project management (Jira-like).
 *
 * Commands:
 *   /start           — show main menu
 *   /help            — list all commands
 *   /mytasks         — tasks assigned to you (matched by telegramChatId)
 *   /sprint          — your active sprint info
 *   /done <taskId>   — mark a task as done
 *   /newproject      — interactive project creation wizard
 *   /listprojects    — list all projects
 *   /newsprint <projectId> <name> — create a sprint for a project
 *   /hide            — hide keyboard
 */
@Component
public class TelegramBotController implements SpringLongPollingBot, LongPollingSingleThreadUpdateConsumer {

    private static final Logger logger = LoggerFactory.getLogger(TelegramBotController.class);

    private final BotProps botProps;
    private final TelegramClient telegramClient;
    private final TaskService taskService;
    private final SprintService sprintService;
    private final ProjectService projectService;
    private final EmployeeRepository employeeRepository;
    private final DeepSeekService deepSeekService;

    @Value("${telegram.bot.token}")
    private String telegramBotToken;

    public TelegramBotController(
            BotProps botProps,
            TaskService taskService,
            SprintService sprintService,
            ProjectService projectService,
            EmployeeRepository employeeRepository,
            DeepSeekService deepSeekService) {
        this.botProps = botProps;
        this.taskService = taskService;
        this.sprintService = sprintService;
        this.projectService = projectService;
        this.employeeRepository = employeeRepository;
        this.deepSeekService = deepSeekService;
        this.telegramClient = new OkHttpTelegramClient(getBotToken());
    }

    @Override
    public String getBotToken() {
        if (telegramBotToken != null && !telegramBotToken.trim().isEmpty()) {
            return telegramBotToken;
        }
        return botProps.getToken();
    }

    @Override
    public LongPollingUpdateConsumer getUpdatesConsumer() {
        return this;
    }

    @Override
    public void consume(Update update) {
        logger.info("Bot update received: hasMessage={}, hasText={}",
                update.hasMessage(),
                update.hasMessage() && update.getMessage().hasText());

        if (!update.hasMessage() || !update.getMessage().hasText()) return;

        String messageText = update.getMessage().getText();
        long chatId = update.getMessage().getChatId();
        logger.info("Bot processing message '{}' from chatId={}", messageText, chatId);

        try {
            BotActions actions = new BotActions(
                    telegramClient,
                    taskService,
                    sprintService,
                    projectService,
                    employeeRepository,
                    deepSeekService
            );
            actions.setRequestText(messageText);
            actions.setChatId(chatId);
            actions.dispatch();
        } catch (Exception e) {
            logger.error("Error processing update from chatId={}: {}", chatId, e.getMessage(), e);
        }
    }

    @AfterBotRegistration
    public void afterRegistration(BotSession botSession) {
        logger.info("TelegramBotController registered, running: {}", botSession.isRunning());
        logger.info("Bot token prefix: {}...", getBotToken() != null && getBotToken().length() > 10
                ? getBotToken().substring(0, 10) : "(empty/null)");
    }
}
