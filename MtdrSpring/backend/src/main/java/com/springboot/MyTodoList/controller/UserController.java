package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping(value = "/employees")
    public List<Employee> getAllEmployees() {
        return userService.findAll();
    }

    @GetMapping(value = "/employees/{id}")
    public ResponseEntity<Employee> getEmployeeById(@PathVariable int id) {
        try {
            ResponseEntity<Employee> responseEntity = userService.getEmployeeById(id);
            return new ResponseEntity<>(responseEntity.getBody(), HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PostMapping(value = "/employees")
    public ResponseEntity<Employee> addEmployee(@RequestBody Employee employee) throws Exception {
        Employee saved = userService.addEmployee(employee);
        HttpHeaders responseHeaders = new HttpHeaders();
        responseHeaders.set("location", "" + saved.getEmployeeId());
        responseHeaders.set("Access-Control-Expose-Headers", "location");
        return ResponseEntity.ok().headers(responseHeaders).build();
    }

    @PutMapping(value = "/employees/{id}")
    public ResponseEntity<Employee> updateEmployee(@RequestBody Employee employee, @PathVariable int id) {
        try {
            Employee updated = userService.updateEmployee(id, employee);
            return new ResponseEntity<>(updated, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping(value = "/employees/{id}")
    public ResponseEntity<Boolean> deleteEmployee(@PathVariable int id) {
        Boolean flag = false;
        try {
            flag = userService.deleteEmployee(id);
            return new ResponseEntity<>(flag, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(flag, HttpStatus.NOT_FOUND);
        }
    }
}
