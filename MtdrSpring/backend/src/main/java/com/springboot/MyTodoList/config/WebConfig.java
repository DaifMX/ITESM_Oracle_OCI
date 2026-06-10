package com.springboot.MyTodoList.config;

import java.io.IOException;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * Wires together the single-page-app contract:
 *
 *  1. Every {@code @RestController} is exposed under {@code /api/**} via a path
 *     prefix, so the JSON API never collides with the React Router paths
 *     (e.g. the page {@code /projects} vs the API {@code /api/projects}).
 *
 *  2. Any request that is NOT an API call and does NOT map to a real static
 *     file is served {@code index.html}, letting the browser-history router
 *     handle deep links and hard reloads (e.g. reloading {@code /dashboard}).
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        configurer.addPathPrefix("/api", c -> c.isAnnotationPresent(RestController.class));
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource requested = location.createRelative(resourcePath);
                        if (requested.exists() && requested.isReadable()) {
                            return requested;          // a real asset (JS, CSS, images, index.html)
                        }
                        if (resourcePath.startsWith("api/")) {
                            return null;                // unknown API path -> let it 404, don't mask as the app
                        }
                        return new ClassPathResource("/static/index.html");  // SPA fallback
                    }
                });
    }
}
