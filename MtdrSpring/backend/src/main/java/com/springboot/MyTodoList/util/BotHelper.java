package com.springboot.MyTodoList.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboardRemove;
import org.telegram.telegrambots.meta.generics.TelegramClient;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboardMarkup;

public class BotHelper {

	private static final Logger logger = LoggerFactory.getLogger(BotHelper.class);

	public static void sendMessageToTelegram(Long chatId, String text, TelegramClient bot) {

		try {
			SendMessage messageToTelegram =
					SendMessage
					.builder()
					.chatId(chatId)
					.text(text)
					.parseMode("Markdown")
					.replyMarkup(new ReplyKeyboardRemove(true))
					.build()
				;
			bot.execute(messageToTelegram);
		} catch (Exception e) {
			logger.error("Failed to send message to chatId={}: {}", chatId, e.getLocalizedMessage(), e);
		}
	}

	public static void sendMessageToTelegram(Long chatId, String text, TelegramClient bot, ReplyKeyboardMarkup rk) {

		try {
			SendMessage messageToTelegram =
					SendMessage
					.builder()
					.chatId(chatId)
					.text(text)
					.parseMode("Markdown")
					.replyMarkup(rk)
					.build()
				;
			bot.execute(messageToTelegram);
		} catch (Exception e) {
			logger.error("Failed to send message to chatId={}: {}", chatId, e.getLocalizedMessage(), e);
		}
	}

}
