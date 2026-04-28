package com.springboot.MyTodoList;

import com.springboot.MyTodoList.config.BotProps;
import com.springboot.MyTodoList.config.OpenRouterConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Import;

@SpringBootApplication
@EnableConfigurationProperties(BotProps.class)
@Import(OpenRouterConfig.class)
public class MyTodoListApplication {

	public static void main(String[] args) {
		SpringApplication.run(MyTodoListApplication.class, args);
	}

}
