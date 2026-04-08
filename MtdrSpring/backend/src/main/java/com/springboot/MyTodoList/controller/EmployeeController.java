package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for Employee CRUD operations.
 * Replaces the deprecated UserController.
 */
@RestController
@RequestMapping("/employees")
public class EmployeeController {

    @Autowired
    private UserService userService;

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
    public ResponseEntity<Void> addEmployee(@RequestBody Employee employee) throws Exception {
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
    public ResponseEntity<Boolean> deleteEmployee(@PathVariable int id) {
        try {
            boolean deleted = userService.deleteEmployee(id);
            return ResponseEntity.ok(deleted);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(false);
        }
    }
}
