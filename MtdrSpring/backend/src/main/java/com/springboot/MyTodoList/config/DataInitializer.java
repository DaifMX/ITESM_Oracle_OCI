package com.springboot.MyTodoList.config;

import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.repository.EmployeeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    private final EmployeeRepository employeeRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public DataInitializer(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void seedAdminUser() {
        if (employeeRepository.countByRole("admin") == 0) {
            Employee admin = new Employee();
            admin.setEmail("admin@oracle.com");
            admin.setFirstName("Ora");
            admin.setLastName("Admin");
            admin.setPasswordHash(passwordEncoder.encode("ADMIN"));
            admin.setRole("manager");
            employeeRepository.save(admin);
            logger.info("Default admin user created: admin@oracle.com");
        }
    }
}
