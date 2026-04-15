package com.springboot.MyTodoList.security;

import com.springboot.MyTodoList.exception.ElementNotFoundException;
import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserDetailsServiceImpl {

    @Autowired
    private EmployeeRepository employeeRepository;

    public UserDetails loadUserByUsername(String email) {
        Employee employee = employeeRepository.findByEmail(email)
                .orElseThrow(() -> new ElementNotFoundException("Employee not found: " + email));

        String role = employee.getRole() != null ? employee.getRole().toUpperCase() : "DEVELOPER";
        return new org.springframework.security.core.userdetails.User(
                employee.getEmail(),
                employee.getPasswordHash(),
                List.of(new SimpleGrantedAuthority("ROLE_" + role))
        );
    }
}
