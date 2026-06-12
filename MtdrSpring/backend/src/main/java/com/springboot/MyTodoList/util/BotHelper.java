package com.springboot.MyTodoList.util;

import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboardRemove;
import org.telegram.telegrambots.meta.generics.TelegramClient;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboardMarkup;

public class BotHelper {

	private static final Logger logger = LoggerFactory.getLogger(BotHelper.class);

	// Telegram rejects messages longer than 4096 characters; keep a safety margin.
	private static final int MAX_MESSAGE_LENGTH = 4000;

	public static void sendMessageToTelegram(Long chatId, String text, TelegramClient bot) {

		for (String chunk : splitMessage(text)) {
			try {
				SendMessage messageToTelegram =
						SendMessage
						.builder()
						.chatId(chatId)
						.text(chunk)
						.parseMode("MarkdownV2")
						.replyMarkup(new ReplyKeyboardRemove(true))
						.build()
					;
				bot.execute(messageToTelegram);
			} catch (Exception e) {
				logger.error("Failed to send message to chatId={}: {}", chatId, e.getLocalizedMessage(), e);
			}
		}
	}

	/**
	 * Split text into chunks that fit within Telegram's per-message limit.
	 * Splits on line boundaries so MarkdownV2 entities (which the bot keeps
	 * contained to a single line) stay balanced within each chunk.
	 */
	private static List<String> splitMessage(String text) {
		List<String> chunks = new ArrayList<>();
		if (text == null || text.length() <= MAX_MESSAGE_LENGTH) {
			chunks.add(text == null ? "" : text);
			return chunks;
		}

		StringBuilder current = new StringBuilder();
		for (String line : text.split("\n", -1)) {
			// +1 accounts for the newline that re-joins lines within a chunk.
			if (current.length() > 0 && current.length() + line.length() + 1 > MAX_MESSAGE_LENGTH) {
				chunks.add(current.toString());
				current.setLength(0);
			}
			// A single line longer than the limit must be hard-split.
			while (line.length() > MAX_MESSAGE_LENGTH) {
				chunks.add(line.substring(0, MAX_MESSAGE_LENGTH));
				line = line.substring(MAX_MESSAGE_LENGTH);
			}
			if (current.length() > 0) current.append("\n");
			current.append(line);
		}
		if (current.length() > 0) chunks.add(current.toString());
		return chunks;
	}

	public static void sendMessageToTelegram(Long chatId, String text, TelegramClient bot, ReplyKeyboardMarkup rk) {

		try {
			SendMessage messageToTelegram =
					SendMessage
					.builder()
					.chatId(chatId)
					.text(text)
					.parseMode("MarkdownV2")
					.replyMarkup(rk)
					.build()
				;
			bot.execute(messageToTelegram);
		} catch (Exception e) {
			logger.error("Failed to send message to chatId={}: {}", chatId, e.getLocalizedMessage(), e);
		}
	}

}
