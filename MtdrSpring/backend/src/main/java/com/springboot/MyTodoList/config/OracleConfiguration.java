package com.springboot.MyTodoList.config;

import oracle.jdbc.pool.OracleDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.sql.SQLException;

/*
 * Resolves DB connection for both local dev and k8s production:
 *
 * In k8s (production): the pod spec injects env vars db_url, db_user,
 *   dbpassword, driver_class_name — those take priority.
 *
 * Locally: those env vars don't exist, so Spring falls back to
 *   spring.datasource.url / .username / .password from application.properties.
 */
@Configuration
public class OracleConfiguration {

    Logger logger = LoggerFactory.getLogger(OracleConfiguration.class);

    @Value("${db_url:${spring.datasource.url:}}")
    private String dbUrl;

    @Value("${db_user:${spring.datasource.username:}}")
    private String dbUser;

    @Value("${dbpassword:${spring.datasource.password:}}")
    private String dbPassword;

    @Value("${driver_class_name:${spring.datasource.driver-class-name:oracle.jdbc.OracleDriver}}")
    private String driverClassName;

    @Bean
    public DataSource dataSource() throws SQLException {
        logger.info("Using Driver: {}", driverClassName);
        logger.info("Using URL:    {}", dbUrl);
        logger.info("Using User:   {}", dbUser);

        OracleDataSource ds = new OracleDataSource();
        ds.setDriverType(driverClassName);
        ds.setURL(dbUrl);
        ds.setUser(dbUser);
        ds.setPassword(dbPassword);
        return ds;
    }
}
