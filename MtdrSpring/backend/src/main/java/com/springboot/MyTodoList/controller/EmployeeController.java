package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.repository.EmployeeRepository;
import com.springboot.MyTodoList.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for Employee CRUD operations.
 */
@RestController
@RequestMapping("/employees")
public class EmployeeController {

    @Autowired
    private UserService userService;

    @Autowired
    private EmployeeRepository employeeRepository;

    @GetMapping
    public ResponseEntity<List<Employee>> getAllEmployees() {
        return ResponseEntity.ok(userService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Employee> getEmployeeById(@PathVariable int id) {
        try {
            ResponseEntity<Employee> response = userService.getEmployeeById(id);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<?> addEmployee(@RequestBody Employee employee) throws Exception {
        String callerRole = getCallerRole();
        if ("developer".equals(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Developers cannot create accounts"));
        }
        String targetRole = employee.getRole() != null ? employee.getRole() : "developer";
        if ("manager".equals(callerRole) && !"developer".equals(targetRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Managers can only create developer accounts"));
        }
        Employee saved = userService.addEmployee(employee);
        HttpHeaders headers = new HttpHeaders();
        headers.set("location", String.valueOf(saved.getEmployeeId()));
        headers.set("Access-Control-Expose-Headers", "location");
        return ResponseEntity.ok().headers(headers).build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Employee> updateEmployee(@PathVariable int id, @RequestBody Employee employee) {
        try {
            Employee updated = userService.updateEmployee(id, employee);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEmployee(@PathVariable int id) {
        try {
            String callerEmail = SecurityContextHolder.getContext().getAuthentication().getName();
            Employee caller = employeeRepository.findByEmail(callerEmail).orElse(null);
            if (caller == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Unauthorized"));
            }

            // Nobody can delete themselves
            if (caller.getEmployeeId() == id) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You cannot delete your own account"));
            }

            ResponseEntity<Employee> targetRes = userService.getEmployeeById(id);
            if (targetRes.getBody() == null) {
                return ResponseEntity.notFound().build();
            }
            Employee target = targetRes.getBody();
            String targetRole = target.getRole() != null ? target.getRole() : "developer";
            String callerRole = caller.getRole() != null ? caller.getRole() : "developer";

            // Developers cannot delete anyone
            if ("developer".equals(callerRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Developers cannot delete accounts"));
            }
            // Managers can only delete developers
            if ("manager".equals(callerRole) && !"developer".equals(targetRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Managers can only delete developer accounts"));
            }

            boolean deleted = userService.deleteEmployee(id);
            if (!deleted) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }
            return ResponseEntity.ok(deleted);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(false);
        }
    }

    private String getCallerRole() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return employeeRepository.findByEmail(email)
                .map(e -> e.getRole() != null ? e.getRole() : "developer")
                .orElse("developer");
    }
}
