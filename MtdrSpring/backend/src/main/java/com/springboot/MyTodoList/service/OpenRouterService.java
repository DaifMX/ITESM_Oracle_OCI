package com.springboot.MyTodoList.service;

import java.io.IOException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.CloseableHttpResponse;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class OpenRouterService{
    private final CloseableHttpClient httpClient;
    private final HttpPost httpPost;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${llm.model}")
    private String model;

    public OpenRouterService(CloseableHttpClient httpClient, HttpPost httpPost) {
        this.httpClient = httpClient;
        this.httpPost = httpPost;
    }

    public String generateText(String prompt) throws IOException, org.apache.hc.core5.http.ParseException {
        String requestBody = String.format("{\"model\": \"%s\",\"messages\": [{\"role\": \"user\", \"content\": \"%s\"}]}", model, prompt);

        try {
            httpPost.setEntity(new StringEntity(requestBody));
            CloseableHttpResponse response = httpClient.execute(httpPost);
            return EntityUtils.toString(response.getEntity());
        } catch (IOException e) {
            throw e;
        }
    }

    public String chat(String systemPrompt, String userMessage) throws IOException, org.apache.hc.core5.http.ParseException {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("model", model);

        ArrayNode messages = root.putArray("messages");

        ObjectNode sysMsg = messages.addObject();
        sysMsg.put("role", "system");
        sysMsg.put("content", systemPrompt);

        ObjectNode usrMsg = messages.addObject();
        usrMsg.put("role", "user");
        usrMsg.put("content", userMessage);

        String requestBody = objectMapper.writeValueAsString(root);
        httpPost.setEntity(new StringEntity(requestBody, java.nio.charset.StandardCharsets.UTF_8));
        CloseableHttpResponse response = httpClient.execute(httpPost);
        String responseBody = EntityUtils.toString(response.getEntity());

        // Extract the assistant's text from the response
        JsonNode json = objectMapper.readTree(responseBody);
        JsonNode choices = json.path("choices");
        if (choices.isArray() && !choices.isEmpty()) {
            return choices.get(0).path("message").path("content").asText("");
        }
        return responseBody;
    }
}
